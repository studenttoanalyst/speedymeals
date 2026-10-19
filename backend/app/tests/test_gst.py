"""
GST / tax-inclusive vs tax-exclusive pricing tests.

Pure math is tested directly (no DB). Checkout/placement tests follow the
test_checkout.py pattern: Postgres-backed, Maps mocked at the route boundary,
Redis carts cleaned up after each test.
"""
import uuid
from decimal import Decimal

import pytest

from app.core import maps_client
from app.modules.food_delivery import service
from app.modules.food_delivery.models import Order
from app.modules.food_delivery.schemas import CartAddItemSchema
from app.modules.food_delivery.tax import calculate_gst
from app.platform.users.models import Address, User


# --- pure math ---


def test_exclusive_adds_tax_on_top():
    r = calculate_gst(1000, 15, prices_include_gst=False)
    assert r["gst_amount"] == Decimal("150.00")
    assert r["net_subtotal"] == Decimal("1000.00")
    assert r["customer_food_total"] == Decimal("1150.00")


def test_inclusive_carves_tax_out():
    r = calculate_gst(1150, 15, prices_include_gst=True)
    assert r["gst_amount"] == Decimal("150.00")
    assert r["net_subtotal"] == Decimal("1000.00")
    assert r["customer_food_total"] == Decimal("1150.00")


def test_inclusive_net_plus_gst_always_equals_subtotal():
    for subtotal in ("99.99", "333.33", "1234.56", "0.01"):
        r = calculate_gst(subtotal, 13, prices_include_gst=True)
        assert r["net_subtotal"] + r["gst_amount"] == Decimal(subtotal)


def test_zero_rate_is_identical_in_both_modes():
    a = calculate_gst(500, 0, True)
    b = calculate_gst(500, 0, False)
    assert a["gst_amount"] == b["gst_amount"] == Decimal("0.00")
    assert a["customer_food_total"] == b["customer_food_total"] == Decimal("500.00")


def test_none_rate_treated_as_zero():
    assert calculate_gst(500, None, False)["gst_amount"] == Decimal("0.00")


def test_rounding_half_up_to_paisa():
    # 33.33 * 5% = 1.6665 -> 1.67
    assert calculate_gst("33.33", 5, False)["gst_amount"] == Decimal("1.67")


@pytest.mark.parametrize("rate", [-1, 30.01, 100])
def test_invalid_rate_rejected(rate):
    with pytest.raises(ValueError):
        calculate_gst(100, rate, False)


# --- checkout + placement ---


def _restaurant(db, gst_rate, include):
    from app.modules.food_delivery.models import Restaurant

    u = uuid.uuid4().hex[:8]
    r = Restaurant(
        name="GST Test", email=f"gst-{u}@t.com", password_hash="x",
        phone_number=f"+92300{u}", commission_rate=10, status="active",
        latitude=31.50, longitude=74.35, country_code="+92", currency="PKR",
        gst_rate=gst_rate, prices_include_gst=include,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _setup(db, monkeypatch, gst_rate, include, price=500, qty=2):
    from app.modules.food_delivery.models import MenuItem

    monkeypatch.setattr(
        maps_client, "get_route_details",
        lambda *a: {"distance_km": 3.0, "duration_mins": 10, "eta": None, "polyline": None},
    )
    rest = _restaurant(db, gst_rate, include)
    item = MenuItem(
        restaurant_id=rest.id, name="Burger", description="b", price=price,
        category="Main", photo_url=None, variants=None, is_available=True,
    )
    cust = User(phone_number=f"+92327{uuid.uuid4().hex[:8]}", name="C", country_code="+92")
    db.add_all([item, cust])
    db.commit()
    addr = Address(user_id=cust.id, label="Home", latitude=31.52, longitude=74.36, full_address="X")
    db.add(addr)
    db.commit()
    service.add_cart_item(db, cust.id, rest.id, CartAddItemSchema(item_id=item.id, qty=qty))
    return rest, cust, addr


def test_preview_exclusive_total_includes_gst(db_session, monkeypatch):
    rest, cust, addr = _setup(db_session, monkeypatch, 15, False)
    try:
        p = service.preview_checkout(db_session, cust.id, rest.id, addr.id)
        # food 1000 + gst 150 + delivery 175 + platform 15
        assert p["gst_amount"] == Decimal("150.00")
        assert p["total"] == Decimal("1340.00")
        assert p["prices_include_gst"] is False
    finally:
        service.delete_cart(None, cust.id, rest.id)


def test_preview_inclusive_total_does_not_add_gst(db_session, monkeypatch):
    rest, cust, addr = _setup(db_session, monkeypatch, 15, True, price=575)
    try:
        p = service.preview_checkout(db_session, cust.id, rest.id, addr.id)
        # food 1150 (incl 150 gst) + delivery 175 + platform 15
        assert p["gst_amount"] == Decimal("150.00")
        assert p["net_subtotal"] == Decimal("1000.00")
        assert p["total"] == Decimal("1340.00")
    finally:
        service.delete_cart(None, cust.id, rest.id)


def test_zero_rate_total_matches_legacy_formula(db_session, monkeypatch):
    rest, cust, addr = _setup(db_session, monkeypatch, 0, True)
    try:
        p = service.preview_checkout(db_session, cust.id, rest.id, addr.id)
        assert p["total"] == Decimal("1000.00") + Decimal("175.00") + Decimal("15.00")
    finally:
        service.delete_cart(None, cust.id, rest.id)


def test_place_order_freezes_snapshot_and_commission_on_net(db_session, monkeypatch):
    rest, cust, addr = _setup(db_session, monkeypatch, 15, False)
    placed = service.place_order(db_session, cust.id, rest.id, addr.id, "COD")
    order = db_session.query(Order).filter(Order.id == placed["id"]).one()
    assert order.gst_amount == Decimal("150.00")
    assert order.net_subtotal == Decimal("1000.00")
    assert order.prices_include_gst is False
    assert order.total_amount == Decimal("1340.00")
    # commission 10% of NET 1000 = 100; restaurant gets 1000 - 100 + 150 tax
    assert order.commission_amount == Decimal("100.00")
    assert order.restaurant_payable == Decimal("1050.00")

    # Merchant flips the toggle afterwards: placed order must not change.
    rest.prices_include_gst = True
    rest.gst_rate = 5
    db_session.commit()
    detail = service.get_restaurant_order(db_session, rest.id, order.id)
    assert detail["gst_amount"] == Decimal("150.00")
    assert detail["prices_include_gst"] is False
    assert detail["total_amount"] == Decimal("1340.00")


def test_legacy_order_without_gst_columns_reads_as_no_tax(db_session, monkeypatch):
    rest, cust, addr = _setup(db_session, monkeypatch, 0, True)
    placed = service.place_order(db_session, cust.id, rest.id, addr.id, "COD")
    order = db_session.query(Order).filter(Order.id == placed["id"]).one()
    order.gst_rate = order.gst_amount = order.net_subtotal = order.prices_include_gst = None
    db_session.commit()
    detail = service.get_restaurant_order(db_session, rest.id, order.id)
    assert detail["gst_amount"] == Decimal("0.00")
    assert detail["net_subtotal"] == order.food_subtotal


def test_place_order_rejects_when_expected_total_mismatches(db_session, monkeypatch):
    rest, cust, addr = _setup(db_session, monkeypatch, 15, False)
    # Expected total is 1340.00. Passing 1190.00 (e.g. from preview before GST was enabled) must 409.
    with pytest.raises(Exception) as excinfo:
        service.place_order(db_session, cust.id, rest.id, addr.id, "COD", expected_total=1190.00)
    assert excinfo.value.status_code == 409
    assert "Order total has changed" in excinfo.value.detail

    # Passing the matching total succeeds.
    placed = service.place_order(db_session, cust.id, rest.id, addr.id, "COD", expected_total=1340.00)
    assert placed["total_amount"] == Decimal("1340.00")
