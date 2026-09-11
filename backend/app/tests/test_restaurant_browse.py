"""
Phase 5 Step 1 — customer restaurant browse tests.

Service-level tests (listing, radius, sorts, search, location errors)
follow the same pattern as Phase 4's test_food_delivery.py: real Postgres,
transaction rolled back after each test. Auth tests go through the actual
route via TestClient on an isolated app (only customer_router included,
get_db overridden to the test session) so the real JWT/require_role
dependency chain is exercised without importing app.main (whose startup
event would seed an admin row outside the test transaction).
"""
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.modules.food_delivery import service
from app.modules.food_delivery.models import MenuItem, Order, Rating, Restaurant
from app.modules.food_delivery.routes import customer_router
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address, User


@pytest.fixture
def customer(db_session):
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92320{unique}", name="Test Customer", country_code="+92")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_address(db_session, customer):
    address = Address(
        user_id=customer.id,
        label="Home",
        latitude=31.5204,
        longitude=74.3587,
        full_address="Test Street",
        is_default=True,
    )
    db_session.add(address)
    db_session.commit()
    db_session.refresh(address)
    return address


def _make_restaurant(db, name, latitude=None, longitude=None, status="active"):
    unique = uuid.uuid4().hex[:8]
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


def _make_rating(db, restaurant, customer, score):
    """Ratings FK-chain to orders, so build a minimal order row first
    (same required fields as Phase 4's _make_order helper)."""
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92321{unique}", name="Rater", country_code="+92")
    db.add(user)
    db.flush()
    address = Address(user_id=user.id, latitude=31.5, longitude=74.3)
    db.add(address)
    db.flush()
    order = Order(
        user_id=user.id,
        restaurant_id=restaurant.id,
        delivery_address_id=address.id,
        status="Delivered",
        payment_method="COD",
        food_subtotal=500,
        delivery_distance_km=3,
        delivery_fee=110,
        total_amount=610,
        commission_amount=50,
        restaurant_payable=450,
        rider_earning=110,
        country_code="+92",
        currency="PKR",
    )
    db.add(order)
    db.flush()
    rating = Rating(order_id=order.id, user_id=user.id, restaurant_rating=score)
    db.add(rating)
    db.commit()


# --- listing + radius ---


def test_listing_returns_active_restaurants_with_distance(db_session, customer, customer_address):
    near = _make_restaurant(db_session, "Pizza Palace", latitude=31.5300, longitude=74.3600)

    results = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "distance", 5.0
    )

    assert [r["id"] for r in results] == [near.id]
    row = results[0]
    assert row["name"] == "Pizza Palace"
    assert 1.0 <= row["distance_km"] <= 1.2
    assert row["avg_rating"] is None


def test_radius_filters_out_far_restaurants(db_session, customer, customer_address):
    near = _make_restaurant(db_session, "Pizza Palace", latitude=31.5300, longitude=74.3600)
    far = _make_restaurant(db_session, "Far Away", latitude=31.5800, longitude=74.4000)  # ~7.6 km

    within_5 = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "distance", 5.0
    )
    assert [r["id"] for r in within_5] == [near.id]

    within_15 = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "distance", 15.0
    )
    assert {r["id"] for r in within_15} == {near.id, far.id}
    assert next(r for r in within_15 if r["id"] == far.id)["distance_km"] > 5


def test_inactive_and_null_coordinate_restaurants_never_listed(db_session, customer, customer_address):
    _make_restaurant(db_session, "Inactive Spot", latitude=31.5300, longitude=74.3600, status="pending")
    _make_restaurant(db_session, "No Coords", latitude=None, longitude=None)

    results = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "distance", 5.0
    )
    assert results == []


# --- sorting ---


def test_distance_sort_nearest_first(db_session, customer, customer_address):
    far = _make_restaurant(db_session, "Far", latitude=31.5800, longitude=74.4000)
    near = _make_restaurant(db_session, "Near", latitude=31.5300, longitude=74.3600)
    closest = _make_restaurant(db_session, "Closest", latitude=31.5240, longitude=74.3600)

    results = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "distance", 15.0
    )
    assert [r["id"] for r in results] == [closest.id, near.id, far.id]


def test_rating_sort_highest_first_unrated_last(db_session, customer, customer_address):
    closest_unrated = _make_restaurant(db_session, "Closest Unrated", latitude=31.5240, longitude=74.3600)
    mid = _make_restaurant(db_session, "Mid Rated", latitude=31.5300, longitude=74.3600)
    top = _make_restaurant(db_session, "Top Rated", latitude=31.5250, longitude=74.3650)

    _make_rating(db_session, mid, customer, 4)
    _make_rating(db_session, mid, customer, 5)  # avg 4.5
    _make_rating(db_session, top, customer, 5)  # avg 5.0

    by_rating = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "rating", 5.0
    )
    assert [(r["name"], r["avg_rating"]) for r in by_rating] == [
        ("Top Rated", 5.0),
        ("Mid Rated", 4.5),
        ("Closest Unrated", None),
    ]

    # Distance sort ignores rating (proves the two orders differ).
    by_distance = service.list_restaurants_for_customer(
        db_session, customer.id, None, None, "distance", 5.0
    )
    assert [r["name"] for r in by_distance] == ["Closest Unrated", "Top Rated", "Mid Rated"]


# --- search ---


def test_name_search_case_insensitive(db_session, customer, customer_address):
    pizza = _make_restaurant(db_session, "Pizza Palace", latitude=31.5300, longitude=74.3600)
    _make_restaurant(db_session, "Burger Hub", latitude=31.5250, longitude=74.3650)
    pizza_point = _make_restaurant(db_session, "Pizza Point", latitude=31.5240, longitude=74.3600)

    results = service.list_restaurants_for_customer(
        db_session, customer.id, None, "PIZZA", "distance", 5.0
    )
    assert {r["id"] for r in results} == {pizza.id, pizza_point.id}

    assert service.list_restaurants_for_customer(
        db_session, customer.id, None, "sushi", "distance", 5.0
    ) == []


# --- location handling ---


def test_no_saved_address_rejected_400(db_session, customer):
    with pytest.raises(Exception) as exc_info:
        service.list_restaurants_for_customer(db_session, customer.id, None, None, "distance", 5.0)
    assert getattr(exc_info.value, "status_code", None) == 400


def test_another_customers_address_id_rejected_404(db_session, customer, customer_address):
    # A second customer owns an address; the first customer must not be able
    # to browse using it (IDOR check).
    other = User(phone_number=f"+92322{uuid.uuid4().hex[:8]}", name="Other", country_code="+92")
    db_session.add(other)
    db_session.flush()
    other_address = Address(
        user_id=other.id, latitude=31.53, longitude=74.36, full_address="Other Home"
    )
    db_session.add(other_address)
    db_session.commit()

    with pytest.raises(Exception) as exc_info:
        service.list_restaurants_for_customer(
            db_session, customer.id, other_address.id, None, "distance", 5.0
        )
    assert getattr(exc_info.value, "status_code", None) == 404


# --- auth (through the real route + dependency chain) ---


@pytest.fixture
def client(db_session):
    app = FastAPI()
    app.include_router(customer_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def test_route_customer_token_lists_restaurants(client, db_session, customer, customer_address):
    near = _make_restaurant(db_session, "Pizza Palace", latitude=31.5300, longitude=74.3600)
    token = create_access_token(customer.id, "customer")
    response = client.get("/restaurants", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert [r["id"] for r in body] == [str(near.id)]
    assert body[0]["name"] == "Pizza Palace"
    assert "password_hash" not in body[0] and "commission_rate" not in body[0]


def test_route_missing_token_rejected(client):
    # HTTPBearer (existing shared scheme) rejects a missing token with 403 —
    # same behavior on every existing protected endpoint.
    assert client.get("/restaurants").status_code == 403


def test_route_invalid_token_rejected_401(client):
    response = client.get("/restaurants", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


def test_route_restaurant_role_rejected_403(client, db_session):
    restaurant = _make_restaurant(db_session, "Role Test", latitude=31.53, longitude=74.36)
    token = create_access_token(restaurant.id, "restaurant")
    response = client.get("/restaurants", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_route_invalid_sort_rejected_422(client, customer, customer_address):
    token = create_access_token(customer.id, "customer")
    response = client.get(
        "/restaurants", params={"sort": "bogus"}, headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422


# --- Phase 5, Step 2: customer menu view ---


def _make_menu_item(db, restaurant, name, category=None, price=500, is_available=True):
    item = MenuItem(
        restaurant_id=restaurant.id,
        name=name,
        description=f"{name} description",
        price=price,
        category=category,
        photo_url=None,
        variants=None,
        is_available=is_available,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def test_menu_groups_by_category_sorted_alphabetically(db_session, customer, customer_address):
    restaurant = _make_restaurant(db_session, "Menu Spot", latitude=31.53, longitude=74.36)
    _make_menu_item(db_session, restaurant, "Chicken Karahi", category="Main")
    _make_menu_item(db_session, restaurant, "Samosa", category="Starters")
    _make_menu_item(db_session, restaurant, "Cola", category="Drinks")

    menu = service.get_customer_menu(db_session, restaurant.id)

    assert [group["category"] for group in menu] == ["Drinks", "Main", "Starters"]
    assert [item["name"] for group in menu for item in group["items"]] == [
        "Cola",
        "Chicken Karahi",
        "Samosa",
    ]


def test_menu_items_without_category_grouped_last(db_session, customer, customer_address):
    restaurant = _make_restaurant(db_session, "Menu Spot", latitude=31.53, longitude=74.36)
    _make_menu_item(db_session, restaurant, "Mystery Dish", category=None)
    _make_menu_item(db_session, restaurant, "Samosa", category="Starters")

    menu = service.get_customer_menu(db_session, restaurant.id)

    assert [group["category"] for group in menu] == ["Starters", None]
    assert menu[1]["items"][0]["name"] == "Mystery Dish"


def test_menu_category_filter_case_insensitive(db_session, customer, customer_address):
    restaurant = _make_restaurant(db_session, "Menu Spot", latitude=31.53, longitude=74.36)
    _make_menu_item(db_session, restaurant, "Samosa", category="Starters")
    _make_menu_item(db_session, restaurant, "Karahi", category="Main")

    menu = service.get_customer_menu(db_session, restaurant.id, category=" starters ")

    assert len(menu) == 1
    assert menu[0]["category"] == "Starters"
    assert [item["name"] for item in menu[0]["items"]] == ["Samosa"]


def test_menu_includes_sold_out_items_flagged(db_session, customer, customer_address):
    restaurant = _make_restaurant(db_session, "Menu Spot", latitude=31.53, longitude=74.36)
    available = _make_menu_item(db_session, restaurant, "Samosa", category="Starters")
    sold_out = _make_menu_item(
        db_session, restaurant, "Karahi", category="Main", is_available=False
    )

    menu = service.get_customer_menu(db_session, restaurant.id)
    items = {item["name"]: item for group in menu for item in group["items"]}

    assert items["Samosa"]["is_available"] is True
    assert items["Karahi"]["is_available"] is False
    assert sold_out.id in {item["id"] for group in menu for item in group["items"]}


def test_menu_unknown_and_non_active_restaurant_404(db_session, customer, customer_address):
    inactive = _make_restaurant(
        db_session, "Pending Spot", latitude=31.53, longitude=74.36, status="pending"
    )

    with pytest.raises(HTTPException) as unknown:
        service.get_customer_menu(db_session, uuid.uuid4())
    assert unknown.value.status_code == 404

    with pytest.raises(HTTPException) as not_active:
        service.get_customer_menu(db_session, inactive.id)
    assert not_active.value.status_code == 404


def test_menu_route_full_flow_and_no_internal_leak(client, db_session, customer, customer_address):
    restaurant = _make_restaurant(db_session, "Menu Spot", latitude=31.53, longitude=74.36)
    _make_menu_item(db_session, restaurant, "Samosa", category="Starters", price=120)
    _make_menu_item(db_session, restaurant, "Karahi", category="Main", is_available=False)

    token = create_access_token(customer.id, "customer")
    response = client.get(
        f"/restaurants/{restaurant.id}/menu", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert [group["category"] for group in body] == ["Main", "Starters"]
    flat = [item for group in body for item in group["items"]]
    assert all(item["is_available"] is not None for item in flat)
    # Customer-facing fields only — no management-only fields leak.
    assert all("restaurant_id" not in item and "is_available" in item for item in flat)


def test_menu_route_missing_token_rejected(client):
    # HTTPBearer's existing behavior on every protected endpoint (403).
    assert client.get(f"/restaurants/{uuid.uuid4()}/menu").status_code == 403


def test_menu_route_wrong_role_rejected_403(client, db_session):
    restaurant = _make_restaurant(db_session, "Role Spot", latitude=31.53, longitude=74.36)
    token = create_access_token(restaurant.id, "restaurant")
    response = client.get(
        f"/restaurants/{restaurant.id}/menu", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
