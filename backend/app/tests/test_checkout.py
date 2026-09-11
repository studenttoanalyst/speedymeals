"""
Phase 5 Step 5 — checkout price preview tests.

Money math + Maps error policy are tested directly; the Maps HTTP call is
mocked at the module boundary (monkeypatching get_road_distance_km) — the
real network API is never called from tests, same philosophy as Phase 4's
S3 boundary mock. Redis carts use unique keys + explicit cleanup (no
rollback in Redis).
"""
import uuid
from decimal import Decimal

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core import maps_client
from app.core.database import get_db
from app.modules.food_delivery import service
from app.modules.food_delivery.models import MenuItem
from app.modules.food_delivery.schemas import CartAddItemSchema
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address


def _make_restaurant(db, name, latitude=None, longitude=None, status="active"):
    """Local copy of the shared test helper (self-contained file)."""
    unique = uuid.uuid4().hex[:8]
    from app.modules.food_delivery.models import Restaurant

    r = Restaurant(
        name=name,
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92300{unique}",
        commission_rate=10,
        status=status,
        latitude=latitude,
        longitude=longitude,
        country_code="+92",
        currency="PKR",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _make_menu_item(db, restaurant, name, price, is_available=True):
    from app.modules.food_delivery.models import MenuItem

    item = MenuItem(
        restaurant_id=restaurant.id, name=name, description=name, price=price,
        category="Main", photo_url=None, variants=None, is_available=is_available,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@pytest.fixture
def customer(db_session):
    from app.platform.users.models import User

    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92327{unique}", name="Checkout Customer", country_code="+92")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def address(db_session, customer):
    a = Address(
        user_id=customer.id, label="Home",
        latitude=31.5204, longitude=74.3587, full_address="Checkout Street",
    )
    db_session.add(a)
    db_session.commit()
    db_session.refresh(a)
    return a


@pytest.fixture
def track_carts():
    """Redis has no rollback — track (customer_id, restaurant_id) pairs the
    test created and delete their keys afterwards."""
    tracked = []

    def track(customer_id, restaurant_id):
        tracked.append((customer_id, restaurant_id))

    yield track
    for customer_id, restaurant_id in tracked:
        service.delete_cart(None, customer_id, restaurant_id)


def _seed_cart(db, customer, restaurant, item, qty=2, track=None):
    if track:
        track(customer.id, restaurant.id)
    return service.add_cart_item(
        db, customer.id, restaurant.id, CartAddItemSchema(item_id=item.id, qty=qty)
    )


# --- fee formula ---


def test_fee_3km_is_exactly_110():
    assert service.calculate_delivery_fee(3) == Decimal("110.00")


def test_fee_formula_matches_spec_examples():
    assert service.calculate_delivery_fee(0.5) == Decimal("60.00")
    assert service.calculate_delivery_fee(1) == Decimal("70.00")
    assert service.calculate_delivery_fee(5) == Decimal("150.00")
    assert service.calculate_delivery_fee(10) == Decimal("250.00")


def test_fee_keeps_decimal_precision():
    assert service.calculate_delivery_fee(Decimal("3.72")) == Decimal("124.40")


# --- distance extraction (meters -> km at the client boundary) ---


def test_maps_client_converts_meters_to_km(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"rows": [{"elements": [{"status": "OK", "distance": {"value": 3720}}]}]}

    class FakeHttpx:
        @staticmethod
        def get(*args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(maps_client.httpx, "get", FakeHttpx.get)
    assert maps_client.get_road_distance_km(31.5, 74.3, 31.6, 74.4) == 3.72


def test_maps_client_raises_maps_error_on_bad_element(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"rows": [{"elements": [{"status": "ZERO_RESULTS"}]}]}

    class FakeHttpx:
        @staticmethod
        def get(*args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(maps_client.httpx, "get", FakeHttpx.get)
    with pytest.raises(maps_client.MapsError):
        maps_client.get_road_distance_km(31.5, 74.3, 31.6, 74.4)


# --- checkout preview ---


def _fake_maps(monkeypatch, km):
    monkeypatch.setattr(maps_client, "get_road_distance_km", lambda *a: km)


def test_preview_happy_path_full_breakdown(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    karahi = _make_menu_item(db_session, restaurant, "Karahi", 900)
    cola = _make_menu_item(db_session, restaurant, "Cola", 120)
    _seed_cart(db_session, customer, restaurant, karahi, qty=2, track=track_carts)
    _seed_cart(db_session, customer, restaurant, cola, qty=1)
    _fake_maps(monkeypatch, 3.0)

    result = service.preview_checkout(db_session, customer.id, restaurant.id, address.id)

    assert result["food_subtotal"] == Decimal("1920.00")  # 2x900 + 120
    assert result["delivery_distance_km"] == Decimal("3.00")
    assert result["delivery_fee"] == Decimal("110.00")  # 50 + 3x20
    assert result["total"] == Decimal("2030.00")


def test_preview_rounds_maps_distance_to_2dp(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.71829)

    result = service.preview_checkout(db_session, customer.id, restaurant.id, address.id)

    assert result["delivery_distance_km"] == Decimal("3.72")
    assert result["delivery_fee"] == Decimal("124.40")
    assert result["total"] == result["food_subtotal"] + result["delivery_fee"]


def test_preview_other_customers_address_rejected_404(db_session, customer, address, track_carts, monkeypatch):
    from app.platform.users.models import User

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    other = User(phone_number=f"+92328{uuid.uuid4().hex[:8]}", name="Other", country_code="+92")
    db_session.add(other)
    db_session.flush()
    other_address = Address(user_id=other.id, latitude=31.5, longitude=74.3)
    db_session.add(other_address)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, restaurant.id, other_address.id)
    assert exc_info.value.status_code == 404


def test_preview_unknown_address_rejected_404(db_session, customer, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, restaurant.id, uuid.uuid4())
    assert exc_info.value.status_code == 404


def test_preview_unknown_restaurant_rejected_404(db_session, customer, address):
    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, uuid.uuid4(), address.id)
    assert exc_info.value.status_code == 404


def test_preview_inactive_restaurant_rejected_404(db_session, customer, address, monkeypatch):
    inactive = _make_restaurant(db_session, "Inactive", latitude=31.53, longitude=74.36, status="pending")
    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, inactive.id, address.id)
    assert exc_info.value.status_code == 404


def test_preview_restaurant_without_coordinates_rejected_400(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "No Coords", latitude=None, longitude=None)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, restaurant.id, address.id)
    assert exc_info.value.status_code == 400


def test_preview_empty_cart_rejected_400(db_session, customer, address, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, restaurant.id, address.id)
    assert exc_info.value.status_code == 400


def test_preview_stale_menu_item_rejected_400(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)

    # Item removed from the menu after being carted.
    db_session.delete(item)
    db_session.commit()
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, restaurant.id, address.id)
    assert exc_info.value.status_code == 400


def test_preview_maps_failure_is_503_and_cart_untouched(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, qty=2, track=track_carts)

    def boom(*args):
        raise maps_client.MapsError("Distance lookup failed.")

    monkeypatch.setattr(maps_client, "get_road_distance_km", boom)

    with pytest.raises(HTTPException) as exc_info:
        service.preview_checkout(db_session, customer.id, restaurant.id, address.id)
    assert exc_info.value.status_code == 503

    # External failure must not mutate anything: the cart survives intact.
    cart = service.get_cart(db_session, customer.id, restaurant.id)
    assert len(cart["items"]) == 1 and cart["items"][0]["qty"] == 2


def test_preview_does_not_clear_cart(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, qty=2, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    service.preview_checkout(db_session, customer.id, restaurant.id, address.id)

    cart = service.get_cart(db_session, customer.id, restaurant.id)
    assert len(cart["items"]) == 1 and cart["items"][0]["qty"] == 2


# --- route-level auth ---


@pytest.fixture
def checkout_client(db_session):
    app = FastAPI()
    from app.modules.food_delivery.routes import customer_router

    app.include_router(customer_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def test_checkout_route_missing_token_rejected(checkout_client):
    response = checkout_client.get(
        f"/restaurants/{uuid.uuid4()}/cart/checkout-preview", params={"address_id": str(uuid.uuid4())}
    )
    assert response.status_code == 403


def test_checkout_route_wrong_role_rejected_403(checkout_client, db_session):
    restaurant = _make_restaurant(db_session, "Role Spot", latitude=31.53, longitude=74.36)
    token = create_access_token(restaurant.id, "restaurant")
    response = checkout_client.get(
        f"/restaurants/{restaurant.id}/cart/checkout-preview",
        params={"address_id": str(uuid.uuid4())},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_checkout_route_end_to_end(db_session, checkout_client, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Karahi", 900)
    _seed_cart(db_session, customer, restaurant, item, qty=2, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    token = create_access_token(customer.id, "customer")
    response = checkout_client.get(
        f"/restaurants/{restaurant.id}/cart/checkout-preview",
        params={"address_id": str(address.id)},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["food_subtotal"] == 1800.0
    assert body["delivery_distance_km"] == 3.0
    assert body["delivery_fee"] == 110.0
    assert body["total"] == 1910.0


# --- Phase 5, Step 6: place order ---


def test_place_order_spec_example_exact_numbers(db_session, customer, address, track_carts, monkeypatch):
    """Sec 11 example: Rs.1000 food, 3 km, COD -> fee 110, commission 100
    (10%), payable 900, rider earning 110, total 1110."""
    from app.modules.food_delivery.models import Order, OrderItem

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    result = service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")

    assert result["food_subtotal"] == Decimal("1000.00")
    assert result["delivery_distance_km"] == Decimal("3.00")
    assert result["delivery_fee"] == Decimal("110.00")
    assert result["commission_amount"] == Decimal("100.00")
    assert result["restaurant_payable"] == Decimal("900.00")
    assert result["rider_earning"] == Decimal("110.00")
    assert result["total_amount"] == Decimal("1110.00")
    assert result["status"] == "Accepted"
    assert result["payment_method"] == "COD"

    # Real rows, frozen values (re-read from the DB, not the return dict).
    order = db_session.query(Order).get(result["id"])
    assert order.user_id == customer.id and order.restaurant_id == restaurant.id
    assert order.delivery_address_id == address.id
    assert order.commission_amount == Decimal("100.00")
    assert order.rider_id is None  # rider assignment is Phase 6
    assert order.placed_at is not None
    items = db_session.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    assert len(items) == 1 and items[0].quantity == 1
    assert items[0].price_at_order == Decimal("1000.00")


def test_place_order_multiple_items_variants_quantities(db_session, customer, address, track_carts, monkeypatch):
    from app.modules.food_delivery.models import OrderItem

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    biryani = _make_menu_item(db_session, restaurant, "Biryani", 500)
    cola = MenuItem(
        restaurant_id=restaurant.id, name="Cola", description="drink", price=120,
        category="Drinks", photo_url=None, variants={"size": ["Regular", "Large"]},
        is_available=True,
    )
    db_session.add(cola)
    db_session.commit()
    db_session.refresh(cola)

    service.add_cart_item(db_session, customer.id, restaurant.id,
                          CartAddItemSchema(item_id=biryani.id, qty=2))
    service.add_cart_item(db_session, customer.id, restaurant.id,
                          CartAddItemSchema(item_id=cola.id, qty=3, variant={"size": "Large"}))
    track_carts(customer.id, restaurant.id)
    _fake_maps(monkeypatch, 1.0)

    result = service.place_order(db_session, customer.id, restaurant.id, address.id, "Digital")

    # 2x500 + 3x120 = 1360; fee 70; total 1430; 10% -> 136 / 1224; rider 70.
    assert result["food_subtotal"] == Decimal("1360.00")
    assert result["total_amount"] == Decimal("1430.00")
    assert result["commission_amount"] == Decimal("136.00")
    assert result["restaurant_payable"] == Decimal("1224.00")
    assert result["rider_earning"] == Decimal("70.00")

    rows = db_session.query(OrderItem).filter(OrderItem.order_id == result["id"]).all()
    by_name = {r.menu_item_id: r for r in rows}
    assert by_name[biryani.id].quantity == 2 and by_name[biryani.id].selected_variant is None
    assert by_name[cola.id].quantity == 3 and "Large" in by_name[cola.id].selected_variant
    assert by_name[cola.id].price_at_order == Decimal("120.00")


def test_place_order_invalid_payment_method_400(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant.id, address.id, "crypto")
    assert exc_info.value.status_code == 400
    # Cart untouched — nothing was created.
    assert len(service.get_cart(db_session, customer.id, restaurant.id)["items"]) == 1


def test_place_order_clears_cart_only_after_success(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")
    assert service.get_cart(db_session, customer.id, restaurant.id)["items"] == []


def test_place_order_cart_survives_maps_failure(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)

    def boom(*args):
        raise maps_client.MapsError("Distance lookup failed.")

    monkeypatch.setattr(maps_client, "get_road_distance_km", boom)
    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")
    assert exc_info.value.status_code == 503
    assert len(service.get_cart(db_session, customer.id, restaurant.id)["items"]) == 1


def test_place_order_cart_survives_sold_out_item(db_session, customer, address, track_carts, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    item.is_available = False  # sold out after being carted
    db_session.commit()
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")
    assert exc_info.value.status_code == 400
    assert len(service.get_cart(db_session, customer.id, restaurant.id)["items"]) == 1


def test_place_order_empty_cart_400(db_session, customer, address, monkeypatch):
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")
    assert exc_info.value.status_code == 400


def test_place_order_other_customers_address_404(db_session, customer, address, track_carts, monkeypatch):
    from app.platform.users.models import User

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    other = User(phone_number=f"+92329{uuid.uuid4().hex[:8]}", name="Other", country_code="+92")
    db_session.add(other)
    db_session.flush()
    other_address = Address(user_id=other.id, latitude=31.5, longitude=74.3)
    db_session.add(other_address)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant.id, other_address.id, "COD")
    assert exc_info.value.status_code == 404


def test_place_order_cross_restaurant_isolated_cart_400(db_session, customer, address, track_carts, monkeypatch):
    """Cart exists under restaurant A; checking out restaurant B (same
    customer) must not see or consume A's cart — multi-cart isolation."""
    restaurant_a = _make_restaurant(db_session, "Spot A", latitude=31.53, longitude=74.36)
    restaurant_b = _make_restaurant(db_session, "Spot B", latitude=31.53, longitude=74.36)
    item_a = _make_menu_item(db_session, restaurant_a, "Biryani", 1000)
    _make_menu_item(db_session, restaurant_b, "Pizza", 800)
    _seed_cart(db_session, customer, restaurant_a, item_a, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant_b.id, address.id, "COD")
    assert exc_info.value.status_code == 400
    # A's cart untouched, B's cart still absent.
    assert len(service.get_cart(db_session, customer.id, restaurant_a.id)["items"]) == 1
    assert service.get_cart(db_session, customer.id, restaurant_b.id)["items"] == []


def test_place_order_snapshot_frozen_against_commission_change(db_session, customer, address, track_carts, monkeypatch):
    """Historical snapshot: changing the restaurant's commission_rate AFTER
    placement must not alter the stored order values."""
    from app.modules.food_delivery.models import Order

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    result = service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")

    restaurant.commission_rate = 25  # rate change after placement
    db_session.commit()

    order = db_session.query(Order).get(result["id"])
    assert order.commission_amount == Decimal("100.00")
    assert order.restaurant_payable == Decimal("900.00")


def test_place_order_failed_creation_leaves_order_rows_absent_and_cart_intact(
    db_session, customer, address, track_carts, monkeypatch
):
    """Transaction behavior: if writing order_items blows up mid-creation,
    no order row is committed and the Redis cart survives."""
    from app.modules.food_delivery.models import Order

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    # Save ALL IDs BEFORE the failing operation — after an IntegrityError the
    # ORM instances' state can be confused; accessing .id on them may trigger
    # lazy loads that fail with ObjectDeletedError on the expired instance.
    customer_id = customer.id
    restaurant_id = restaurant.id

    # A REAL flush failure: quantity=None violates the NOT NULL constraint
    # at INSERT time (inside db.commit), so the whole transaction rolls
    # back — no partial order can survive.
    real_order_item = service.OrderItem

    def broken_order_item(*args, **kwargs):
        kwargs["quantity"] = None
        return real_order_item(*args, **kwargs)

    monkeypatch.setattr(service, "OrderItem", broken_order_item)
    with pytest.raises(IntegrityError):
        service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")

    db_session.rollback()
    assert db_session.query(Order).filter(Order.user_id == customer_id).count() == 0
    assert len(service.get_cart(db_session, customer_id, restaurant_id)["items"]) == 1


def test_place_order_route_end_to_end(db_session, customer, address, track_carts, monkeypatch):
    from app.modules.food_delivery.routes import customer_router
    from app.platform.auth.jwt_utils import create_access_token
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.core.database import get_db

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    app = FastAPI()
    app.include_router(customer_router)
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    token = create_access_token(customer.id, "customer")

    response = client.post(
        f"/restaurants/{restaurant.id}/cart/checkout",
        json={"address_id": str(address.id), "payment_method": "COD"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["food_subtotal"] == 1000.0
    assert body["delivery_fee"] == 110.0
    assert body["commission_amount"] == 100.0
    assert body["restaurant_payable"] == 900.0
    assert body["rider_earning"] == 110.0
    assert body["total_amount"] == 1110.0
    assert body["items"][0]["name"] == "Biryani"
    # Cart cleared after the successful order.
    assert service.get_cart(db_session, customer.id, restaurant.id)["items"] == []

    # Missing token / wrong role on the same route.
    assert client.post(f"/restaurants/{restaurant.id}/cart/checkout", json={}).status_code == 403
    wrong_role = create_access_token(restaurant.id, "restaurant")
    assert client.post(
        f"/restaurants/{restaurant.id}/cart/checkout",
        json={"address_id": str(address.id), "payment_method": "COD"},
        headers={"Authorization": f"Bearer {wrong_role}"},
    ).status_code == 403


# --- Phase 5, Step 7: payment method selection ---


def test_place_order_cod_has_no_payment_reference(db_session, customer, address, track_carts, monkeypatch):
    """COD: no gateway involved, no reference generated — cash is handled
    at delivery (Phase 6), not at placement (spec Sec 5)."""
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    result = service.place_order(db_session, customer.id, restaurant.id, address.id, "COD")

    assert result["payment_method"] == "COD"
    assert result["payment_reference"] is None


def test_place_order_digital_success_gets_payment_reference(
    db_session, customer, address, track_carts, monkeypatch
):
    """Digital: simulated gateway succeeds, order is created normally, and
    a fake reference is returned (not persisted — no DB column for it)."""
    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    result = service.place_order(db_session, customer.id, restaurant.id, address.id, "Digital")

    assert result["payment_method"] == "Digital"
    assert result["payment_reference"] is not None
    assert result["payment_reference"].startswith("STUB-DIGITAL-")
    assert result["status"] == "Accepted"
    assert result["total_amount"] == Decimal("1110.00")


def test_place_order_digital_gateway_failure_leaves_no_order_and_cart_intact(
    db_session, customer, address, track_carts, monkeypatch
):
    """Simulated gateway decline -> 402, and NOTHING is written: no order
    row, no order_items, cart survives untouched. Payment is checked
    before any db.add(), so failure here can never leave a partial write."""
    from app.modules.food_delivery.models import Order

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    def failing_gateway(customer_id, amount):
        raise service.DigitalPaymentError("simulated decline")

    monkeypatch.setattr(service, "_process_digital_payment", failing_gateway)

    with pytest.raises(HTTPException) as exc_info:
        service.place_order(db_session, customer.id, restaurant.id, address.id, "Digital")

    assert exc_info.value.status_code == 402
    assert db_session.query(Order).filter(Order.user_id == customer.id).count() == 0
    assert len(service.get_cart(db_session, customer.id, restaurant.id)["items"]) == 1


def test_place_order_digital_route_returns_reference_and_402_on_failure(
    db_session, customer, address, track_carts, monkeypatch
):
    from app.modules.food_delivery.routes import customer_router
    from app.platform.auth.jwt_utils import create_access_token
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.core.database import get_db

    restaurant = _make_restaurant(db_session, "Checkout Spot", latitude=31.53, longitude=74.36)
    item = _make_menu_item(db_session, restaurant, "Biryani", 1000)
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)
    _fake_maps(monkeypatch, 3.0)

    app = FastAPI()
    app.include_router(customer_router)
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    token = create_access_token(customer.id, "customer")

    ok = client.post(
        f"/restaurants/{restaurant.id}/cart/checkout",
        json={"address_id": str(address.id), "payment_method": "Digital"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok.status_code == 201
    assert ok.json()["payment_reference"].startswith("STUB-DIGITAL-")

    # Re-seed cart (previous checkout cleared it), then simulate a decline.
    _seed_cart(db_session, customer, restaurant, item, qty=1, track=track_carts)

    def failing_gateway(customer_id, amount):
        raise service.DigitalPaymentError("simulated decline")

    monkeypatch.setattr(service, "_process_digital_payment", failing_gateway)

    declined = client.post(
        f"/restaurants/{restaurant.id}/cart/checkout",
        json={"address_id": str(address.id), "payment_method": "Digital"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert declined.status_code == 402


def test_place_order_unauthorized_request_still_blocked_for_digital(checkout_client):
    """Same auth gate as COD (Step 6) applies regardless of payment_method
    — Step 7 does not add a bypass."""
    response = checkout_client.post(
        f"/restaurants/{uuid.uuid4()}/cart/checkout",
        json={"address_id": str(uuid.uuid4()), "payment_method": "Digital"},
    )
    assert response.status_code == 403
