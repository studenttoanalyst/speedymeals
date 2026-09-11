"""
Phase 5 Step 3 — multi-cart Redis foundation tests.

Cart state lives in Redis (NEVER a SQL carts table — deliberate Phase 1
decision). These tests hit the real configured Redis (same philosophy as
conftest.py using real Postgres) with unique uuid-suffixed keys and
explicit cleanup — Redis has no transaction rollback, so every test is
responsible for removing what it wrote.

Only the storage primitives are tested here; the cart CRUD endpoints
(ownership + menu-item validation) are Step 4.
"""
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.database import get_db
from app.modules.food_delivery import service
from app.modules.food_delivery.models import MenuItem
from app.modules.food_delivery.routes import customer_router
from app.modules.food_delivery.schemas import (
    CartAddItemSchema,
    CartItemSchema,
    CartSchema,
    CartUpdateItemSchema,
)
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import User


def _make_restaurant(db, name, latitude=None, longitude=None, status="active"):
    """Local copy of the Step 1 test helper — same required Restaurant
    fields (kept here so this file stays self-contained)."""
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


@pytest.fixture
def cart_ids():
    """Unique (customer_id, restaurant_id) pair + guaranteed key cleanup,
    so parallel runs never share state and nothing outlives the suite."""
    customer_id, restaurant_id = uuid.uuid4(), uuid.uuid4()
    yield customer_id, restaurant_id
    service.redis_client.delete(service._cart_key(customer_id, restaurant_id))


def _cart(restaurant_id, qty=2):
    return CartSchema(
        restaurant_id=restaurant_id,
        items=[CartItemSchema(item_id=uuid.uuid4(), qty=qty, variant={"size": "Large"})],
    )


def test_cart_key_format_matches_required_structure(cart_ids):
    customer_id, restaurant_id = cart_ids
    key = service._cart_key(customer_id, restaurant_id)
    assert key == f"cart:{customer_id}:{restaurant_id}"
    assert key.startswith("cart:") and len(key.split(":")) == 3


def test_cart_read_absent_returns_empty_not_error(cart_ids):
    customer_id, restaurant_id = cart_ids
    cart = service.get_cart(None, customer_id, restaurant_id)
    # JSON form: uuids serialize to strings (mode="json") — same as stored carts.
    assert cart == {"restaurant_id": str(restaurant_id), "items": []}


def test_cart_save_and_read_round_trip(cart_ids):
    customer_id, restaurant_id = cart_ids
    cart = _cart(restaurant_id)

    saved = service.save_cart(None, customer_id, restaurant_id, cart)
    assert saved["restaurant_id"] == str(restaurant_id)
    assert saved["items"][0]["qty"] == 2

    # Stored as the exact JSON structure required by the multi-cart design.
    import json

    raw = json.loads(service.redis_client.get(service._cart_key(customer_id, restaurant_id)))
    assert set(raw.keys()) == {"restaurant_id", "items"}
    assert set(raw["items"][0].keys()) == {"item_id", "qty", "variant"}

    assert service.get_cart(None, customer_id, restaurant_id) == saved


def test_cart_payload_restaurant_id_cannot_hijack_key(cart_ids):
    customer_id, restaurant_id = cart_ids
    forged = CartSchema(restaurant_id=uuid.uuid4(), items=[])

    saved = service.save_cart(None, customer_id, restaurant_id, forged)

    # Key stays under the requested restaurant; payload id is overwritten.
    assert saved["restaurant_id"] == str(restaurant_id)
    assert service.redis_client.exists(service._cart_key(customer_id, restaurant_id)) == 1


def test_cart_write_sets_seven_day_ttl(cart_ids):
    customer_id, restaurant_id = cart_ids
    service.save_cart(None, customer_id, restaurant_id, _cart(restaurant_id))
    ttl = service.redis_client.ttl(service._cart_key(customer_id, restaurant_id))
    assert 0 < ttl <= service.CART_TTL_SECONDS
    assert ttl > service.CART_TTL_SECONDS - 60  # freshly (re)started countdown


def test_cart_delete_removes_key(cart_ids):
    customer_id, restaurant_id = cart_ids
    service.save_cart(None, customer_id, restaurant_id, _cart(restaurant_id))
    service.delete_cart(None, customer_id, restaurant_id)
    assert service.redis_client.exists(service._cart_key(customer_id, restaurant_id)) == 0
    assert service.get_cart(None, customer_id, restaurant_id)["items"] == []


def test_cart_schema_rejects_zero_and_negative_qty():
    with pytest.raises(ValidationError):
        CartItemSchema(item_id=uuid.uuid4(), qty=0)
    with pytest.raises(ValidationError):
        CartItemSchema(item_id=uuid.uuid4(), qty=-1)


# --- Phase 5, Step 4: cart CRUD ---


@pytest.fixture
def cart_customer(db_session):
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92325{unique}", name="Cart Customer", country_code="+92")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _setup_restaurant_with_items(db, *, available=True, with_variants=False):
    restaurant = _make_restaurant(db, f"Cart Spot {uuid.uuid4().hex[:6]}", latitude=31.53, longitude=74.36)
    plain = MenuItem(
        restaurant_id=restaurant.id, name="Karahi", description="chicken", price=900,
        category="Main", photo_url=None, variants=None, is_available=available,
    )
    sized = MenuItem(
        restaurant_id=restaurant.id, name="Cola", description="drink", price=120,
        category="Drinks", photo_url=None,
        variants={"size": ["Regular", "Large"]} if with_variants else None,
        is_available=available,
    )
    db.add_all([plain, sized])
    db.commit()
    db.refresh(plain)
    db.refresh(sized)
    return restaurant, plain, sized


def test_add_item_and_view_cart(db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)

    saved = service.add_cart_item(
        db_session, cart_customer.id, restaurant.id,
        CartAddItemSchema(item_id=plain.id, qty=2),
    )
    assert [item["item_id"] for item in saved["items"]] == [str(plain.id)]
    assert saved["items"][0]["qty"] == 2

    viewed = service.get_cart(db_session, cart_customer.id, restaurant.id)
    assert viewed == saved


def test_add_same_item_same_variant_merges_qty(db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)

    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=plain.id, qty=1))
    saved = service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                                  CartAddItemSchema(item_id=plain.id, qty=2))

    assert len(saved["items"]) == 1
    assert saved["items"][0]["qty"] == 3


def test_add_same_item_different_variant_stays_separate_lines(db_session, cart_customer):
    restaurant, _, sized = _setup_restaurant_with_items(db_session, with_variants=True)

    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=sized.id, qty=1, variant={"size": "Regular"}))
    saved = service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                                  CartAddItemSchema(item_id=sized.id, qty=2, variant={"size": "Large"}))

    assert len(saved["items"]) == 2


def test_add_item_rejects_unavailable(db_session, cart_customer):
    restaurant, _, _ = _setup_restaurant_with_items(db_session, available=False)
    sold_out = (
        db_session.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant.id, MenuItem.name == "Karahi")
        .first()
    )

    with pytest.raises(HTTPException) as exc_info:
        service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                              CartAddItemSchema(item_id=sold_out.id, qty=1))
    assert exc_info.value.status_code == 400
    assert service.get_cart(db_session, cart_customer.id, restaurant.id)["items"] == []


def test_add_item_rejects_other_restaurants_item(db_session, cart_customer):
    restaurant, _, _ = _setup_restaurant_with_items(db_session)
    other, other_item, _ = _setup_restaurant_with_items(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                              CartAddItemSchema(item_id=other_item.id, qty=1))
    assert exc_info.value.status_code == 404
    # Cross-restaurant pollution must never reach the cart.
    assert service.get_cart(db_session, cart_customer.id, restaurant.id)["items"] == []
    assert service.get_cart(db_session, cart_customer.id, other.id)["items"] == []


def test_add_item_rejects_unknown_menu_item(db_session, cart_customer):
    restaurant, _, _ = _setup_restaurant_with_items(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                              CartAddItemSchema(item_id=uuid.uuid4(), qty=1))
    assert exc_info.value.status_code == 404


def test_add_item_rejects_unknown_restaurant(db_session, cart_customer):
    with pytest.raises(HTTPException) as exc_info:
        service.add_cart_item(db_session, cart_customer.id, uuid.uuid4(),
                              CartAddItemSchema(item_id=uuid.uuid4(), qty=1))
    assert exc_info.value.status_code == 404


def test_add_item_rejects_variant_on_plain_item(db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                              CartAddItemSchema(item_id=plain.id, qty=1, variant={"size": "Large"}))
    assert exc_info.value.status_code == 400


def test_update_item_qty_changes_line(db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)
    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=plain.id, qty=1))

    saved = service.update_cart_item(db_session, cart_customer.id, restaurant.id, plain.id, 5)
    assert saved["items"][0]["qty"] == 5


def test_update_item_qty_rejects_item_not_in_cart(db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)
    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=plain.id, qty=1))

    with pytest.raises(HTTPException) as exc_info:
        service.update_cart_item(db_session, cart_customer.id, restaurant.id, uuid.uuid4(), 2)
    assert exc_info.value.status_code == 404


def test_update_item_qty_zero_rejected_by_schema(db_session, cart_customer):
    with pytest.raises(ValidationError):
        CartUpdateItemSchema(qty=0)


def test_remove_item_drops_only_that_line(db_session, cart_customer):
    restaurant, plain, sized = _setup_restaurant_with_items(db_session)
    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=plain.id, qty=1))
    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=sized.id, qty=2))

    saved = service.remove_cart_item(db_session, cart_customer.id, restaurant.id, plain.id)
    assert [item["item_id"] for item in saved["items"]] == [str(sized.id)]

    with pytest.raises(HTTPException) as exc_info:
        service.remove_cart_item(db_session, cart_customer.id, restaurant.id, plain.id)
    assert exc_info.value.status_code == 404


def test_clear_cart_only_clears_that_restaurant(db_session, cart_customer):
    restaurant_a, plain_a, _ = _setup_restaurant_with_items(db_session)
    restaurant_b, plain_b, _ = _setup_restaurant_with_items(db_session)

    service.add_cart_item(db_session, cart_customer.id, restaurant_a.id,
                          CartAddItemSchema(item_id=plain_a.id, qty=1))
    service.add_cart_item(db_session, cart_customer.id, restaurant_b.id,
                          CartAddItemSchema(item_id=plain_b.id, qty=1))

    service.delete_cart(db_session, cart_customer.id, restaurant_a.id)

    assert service.get_cart(db_session, cart_customer.id, restaurant_a.id)["items"] == []
    assert len(service.get_cart(db_session, cart_customer.id, restaurant_b.id)["items"]) == 1


def test_customers_carts_are_isolated(db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)
    other = User(phone_number=f"+92326{uuid.uuid4().hex[:8]}", name="Other Customer", country_code="+92")
    db_session.add(other)
    db_session.commit()

    service.add_cart_item(db_session, cart_customer.id, restaurant.id,
                          CartAddItemSchema(item_id=plain.id, qty=2))

    # The other customer's cart for the SAME restaurant is empty —
    # customer_id is part of the key, carts never leak across customers.
    assert service.get_cart(db_session, other.id, restaurant.id)["items"] == []


# --- Step 4 route-level auth (real dependency chain via TestClient) ---


@pytest.fixture
def cart_client(db_session):
    app = FastAPI()
    app.include_router(customer_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def test_cart_routes_missing_token_rejected(cart_client):
    rid = uuid.uuid4()
    assert cart_client.get(f"/restaurants/{rid}/cart").status_code == 403
    assert cart_client.post(f"/restaurants/{rid}/cart/items", json={}).status_code == 403
    assert cart_client.patch(f"/restaurants/{rid}/cart/items/{uuid.uuid4()}", json={}).status_code == 403
    assert cart_client.delete(f"/restaurants/{rid}/cart/items/{uuid.uuid4()}").status_code == 403
    assert cart_client.delete(f"/restaurants/{rid}/cart").status_code == 403


def test_cart_routes_wrong_role_rejected_403(cart_client, db_session):
    restaurant, _, _ = _setup_restaurant_with_items(db_session)
    token = create_access_token(restaurant.id, "restaurant")
    headers = {"Authorization": f"Bearer {token}"}

    assert cart_client.get(f"/restaurants/{restaurant.id}/cart", headers=headers).status_code == 403
    assert cart_client.post(f"/restaurants/{restaurant.id}/cart/items", json={"item_id": str(uuid.uuid4()), "qty": 1}, headers=headers).status_code == 403


def test_cart_add_route_end_to_end(cart_client, db_session, cart_customer):
    restaurant, plain, _ = _setup_restaurant_with_items(db_session)
    token = create_access_token(cart_customer.id, "customer")
    headers = {"Authorization": f"Bearer {token}"}

    response = cart_client.post(
        f"/restaurants/{restaurant.id}/cart/items",
        json={"item_id": str(plain.id), "qty": 2},
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["restaurant_id"] == str(restaurant.id)
    assert body["items"][0]["qty"] == 2

    # qty=0 rejected at the schema boundary -> 422
    bad = cart_client.post(
        f"/restaurants/{restaurant.id}/cart/items",
        json={"item_id": str(plain.id), "qty": 0},
        headers=headers,
    )
    assert bad.status_code == 422
