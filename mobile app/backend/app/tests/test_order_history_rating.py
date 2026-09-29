"""
Phase 7, Step 3 (order history + reorder) and Step 4 (rating) tests.

Reuses the same fixtures/helpers as test_order_tracking.py (same module,
same ownership pattern) rather than redefining them.
"""
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.modules.food_delivery import service
from app.modules.food_delivery.models import MenuItem, Order, OrderItem, Rating
from app.modules.food_delivery.routes import customer_orders_router
from app.platform.auth.jwt_utils import create_access_token
from app.tests.test_order_tracking import (
    _make_address,
    _make_customer,
    _make_menu_item,
    _make_order,
    _make_restaurant,
)


@pytest.fixture
def customer(db_session):
    return _make_customer(db_session)


@pytest.fixture
def address(db_session, customer):
    return _make_address(db_session, customer)


@pytest.fixture
def restaurant(db_session):
    return _make_restaurant(db_session)


@pytest.fixture
def menu_item(db_session, restaurant):
    return _make_menu_item(db_session, restaurant)


@pytest.fixture
def orders_client(db_session):
    app = FastAPI()
    app.include_router(customer_orders_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


# --- Step 3: order history ---


def test_history_lists_only_own_orders_newest_first(db_session, customer, address, restaurant):
    order1 = _make_order(db_session, customer, restaurant, address)
    order2 = _make_order(db_session, customer, restaurant, address)
    other_customer = _make_customer(db_session)
    _make_order(db_session, other_customer, restaurant, address)

    result = service.list_customer_orders(db_session, customer.id)

    ids = [row["id"] for row in result]
    assert order1.id in ids and order2.id in ids
    assert len(result) == 2
    assert result[0]["restaurant_name"] == restaurant.name


def test_history_route_requires_customer_role(orders_client, restaurant):
    token = create_access_token(restaurant.id, "restaurant")
    response = orders_client.get("/orders", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


# --- Step 3: reorder ---


def test_reorder_adds_items_into_current_cart(db_session, customer, address, restaurant, menu_item):
    order = _make_order(db_session, customer, restaurant, address)
    db_session.add(OrderItem(
        order_id=order.id, menu_item_id=menu_item.id, quantity=2,
        selected_variant=None, price_at_order=1000,
    ))
    db_session.commit()

    result = service.reorder_order(db_session, customer.id, order.id)

    assert result["skipped_items"] == []
    assert len(result["cart"]["items"]) == 1
    assert result["cart"]["items"][0]["qty"] == 2


def test_reorder_skips_sold_out_item(db_session, customer, address, restaurant, menu_item):
    order = _make_order(db_session, customer, restaurant, address)
    db_session.add(OrderItem(
        order_id=order.id, menu_item_id=menu_item.id, quantity=1,
        selected_variant=None, price_at_order=1000,
    ))
    menu_item.is_available = False
    db_session.commit()

    result = service.reorder_order(db_session, customer.id, order.id)

    assert result["skipped_items"] == [menu_item.id]
    assert result["cart"]["items"] == []


def test_reorder_other_customers_order_is_404(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address)
    other_customer = _make_customer(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.reorder_order(db_session, other_customer.id, order.id)
    assert exc_info.value.status_code == 404


# --- Step 4: rating ---


def test_rating_succeeds_on_delivered_order(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, order_status="Delivered")

    rating = service.submit_rating(db_session, customer.id, order.id, 5, 4, "Great!")

    assert rating.restaurant_rating == 5
    assert rating.rider_rating == 4
    assert rating.comment == "Great!"


def test_rating_rejected_before_delivered(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, order_status="On the Way")

    with pytest.raises(HTTPException) as exc_info:
        service.submit_rating(db_session, customer.id, order.id, 5, None, None)
    assert exc_info.value.status_code == 400


def test_rating_rejected_when_both_ratings_missing(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, order_status="Delivered")

    with pytest.raises(HTTPException) as exc_info:
        service.submit_rating(db_session, customer.id, order.id, None, None, "no stars")
    assert exc_info.value.status_code == 400


def test_rating_rejected_second_time(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, order_status="Delivered")
    service.submit_rating(db_session, customer.id, order.id, 5, None, None)

    with pytest.raises(HTTPException) as exc_info:
        service.submit_rating(db_session, customer.id, order.id, 3, None, None)
    assert exc_info.value.status_code == 400


def test_rating_other_customers_order_is_404(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, order_status="Delivered")
    other_customer = _make_customer(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.submit_rating(db_session, other_customer.id, order.id, 5, None, None)
    assert exc_info.value.status_code == 404


def test_rating_route_returns_201(orders_client, db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, order_status="Delivered")
    token = create_access_token(customer.id, "customer")

    response = orders_client.post(
        f"/orders/{order.id}/rating",
        json={"restaurant_rating": 5, "rider_rating": 5, "comment": "Nice"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["restaurant_rating"] == 5
