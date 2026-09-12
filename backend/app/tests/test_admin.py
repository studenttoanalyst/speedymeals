"""
Phase 8, Step 1 (dashboard summary) and Step 2 (restaurant management)
tests. Reuses the customer/restaurant/order helpers from
test_order_tracking.py rather than redefining them.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.modules.admin import service
from app.modules.admin.routes import router as admin_router
from app.modules.food_delivery.models import Restaurant
from app.platform.auth.jwt_utils import create_access_token
from app.platform.wallet_payment.models import CashDeposit, Rider
from app.tests.test_order_tracking import (
    _make_address,
    _make_customer,
    _make_order,
    _make_restaurant,
    _make_rider,
)


class _Payload:
    """Tiny attribute-bag standing in for a Pydantic schema instance, so
    service-level tests can call service functions directly without going
    through FastAPI request validation."""
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


@pytest.fixture
def admin_token():
    return create_access_token(uuid.uuid4(), "admin")


@pytest.fixture
def admin_client(db_session):
    app = FastAPI()
    app.include_router(admin_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


# --- Step 1: dashboard ---


def test_dashboard_counts_todays_orders_and_revenue(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    _make_order(db_session, customer, restaurant, address, order_status="Delivered")

    result = service.get_dashboard_summary(db_session)

    assert result["total_orders_today"] == 1
    assert result["gross_revenue_today"] == 1110
    # commission (100) + one Rs.10 wallet deduction for the Delivered order
    assert result["net_revenue_today"] == 110


def test_dashboard_includes_rider_wallet_and_cod_totals(db_session):
    unique = uuid.uuid4().hex[:8]
    rider = Rider(
        phone_number=f"+92302{unique}", name="Dash Rider", cnic_number=f"cnic-{unique}",
        approval_status="approved", wallet_balance=500, pending_cash_owed=200,
        is_online=True, country_code="+92", is_active=True,
    )
    db_session.add(rider)
    db_session.commit()

    result = service.get_dashboard_summary(db_session)

    assert result["total_rider_wallet_balance"] >= 500
    assert result["total_pending_cod_cash"] >= 200


def test_dashboard_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_dashboard_route_returns_200_for_admin(admin_client, admin_token):
    response = admin_client.get("/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert "total_orders_today" in response.json()


# --- Step 2: restaurant management ---


def test_create_restaurant_succeeds(db_session):
    unique = uuid.uuid4().hex[:8]
    payload = _Payload(
        name="New Cafe", email=f"new-{unique}@cafe.com", password="password123",
        phone_number=f"+92303{unique}", country_code="+92", address=None,
        latitude=None, longitude=None, commission_rate=10.0, currency="PKR",
    )

    restaurant = service.create_restaurant(db_session, payload)

    assert restaurant.status == "active"
    assert restaurant.commission_rate == 10.0
    assert restaurant.password_hash != "password123"  # actually hashed


def test_create_restaurant_rejects_duplicate_email(db_session):
    existing = _make_restaurant(db_session)
    unique = uuid.uuid4().hex[:8]
    payload = _Payload(
        name="Dup Cafe", email=existing.email, password="password123",
        phone_number=f"+92304{unique}", country_code="+92", address=None,
        latitude=None, longitude=None, commission_rate=10.0, currency="PKR",
    )

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.create_restaurant(db_session, payload)
    assert exc_info.value.status_code == 400


def test_set_restaurant_status_deactivate(db_session):
    restaurant = _make_restaurant(db_session)

    result = service.set_restaurant_status(db_session, restaurant.id, False)

    assert result.status == "inactive"


def test_update_restaurant_commission(db_session):
    restaurant = _make_restaurant(db_session)

    result = service.update_restaurant_commission(db_session, restaurant.id, 15.0)

    assert result.commission_rate == 15.0


def test_reset_credentials_updates_password_only(db_session):
    restaurant = _make_restaurant(db_session)
    old_hash = restaurant.password_hash
    payload = _Payload(new_password="brandnewpassword", new_email=None, new_phone_number=None)

    result = service.reset_restaurant_credentials(db_session, restaurant.id, payload)

    assert result.password_hash != old_hash
    assert result.email == restaurant.email  # untouched


def test_reset_credentials_rejects_email_clash(db_session):
    r1 = _make_restaurant(db_session)
    r2 = _make_restaurant(db_session)
    payload = _Payload(new_password=None, new_email=r2.email, new_phone_number=None)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.reset_restaurant_credentials(db_session, r1.id, payload)
    assert exc_info.value.status_code == 400


def test_restaurant_management_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/restaurants", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_create_restaurant_route_returns_201(admin_client, admin_token):
    unique = uuid.uuid4().hex[:8]
    response = admin_client.post(
        "/admin/restaurants",
        json={
            "name": "Route Cafe", "email": f"route-{unique}@cafe.com",
            "password": "password123", "phone_number": f"+92305{unique}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "active"


# --- Step 3: rider management ---


def _make_admin_rider(db, approval_status="pending", is_active=True):
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92306{unique}", name=f"Admin Test Rider {unique}",
        cnic_number=f"cnic-{unique}", approval_status=approval_status,
        wallet_balance=100, pending_cash_owed=0, is_online=False,
        country_code="+92", is_active=is_active,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def test_list_riders_filters_by_approval_status(db_session):
    _make_admin_rider(db_session, approval_status="pending")
    _make_admin_rider(db_session, approval_status="approved")

    result = service.list_riders(db_session, "pending")

    assert all(r.approval_status == "pending" for r in result)


def test_approve_rider(db_session):
    rider = _make_admin_rider(db_session, approval_status="pending")

    result = service.update_rider_approval(db_session, rider.id, "approved")

    assert result.approval_status == "approved"


def test_deactivate_rider_forces_offline(db_session):
    rider = _make_admin_rider(db_session, approval_status="approved")
    rider.is_online = True
    db_session.commit()

    result = service.set_rider_status(db_session, rider.id, False)

    assert result.is_active is False
    assert result.is_online is False


def test_rider_management_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/riders", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_rider_approval_route_returns_200(admin_client, db_session, admin_token):
    rider = _make_admin_rider(db_session, approval_status="pending")

    response = admin_client.patch(
        f"/admin/riders/{rider.id}/approval",
        json={"approval_status": "approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["approval_status"] == "approved"


# --- Step 4: order management ---


def test_list_orders_filters_by_status_and_restaurant(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order1 = _make_order(db_session, customer, restaurant, address, order_status="Accepted")
    other_restaurant = _make_restaurant(db_session)
    _make_order(db_session, customer, other_restaurant, address, order_status="Delivered")

    result = service.list_orders(db_session, "Accepted", restaurant.id, None, None)

    assert len(result) == 1
    assert result[0]["id"] == order1.id


def test_get_order_detail_has_distance_and_fee_breakdown(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, customer, restaurant, address)

    result = service.get_order(db_session, order.id)

    assert result["delivery_distance_km"] == 3
    assert result["delivery_fee"] == 110
    assert result["commission_amount"] == 100


def test_cancel_order_sets_status_and_reason(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, customer, restaurant, address, order_status="Preparing")

    result = service.cancel_order(db_session, order.id, "Restaurant unresponsive")

    assert result["status"] == "Cancelled"
    assert result["cancellation_reason"] == "Restaurant unresponsive"
    assert result["cancelled_by"] == "admin"


def test_cancel_delivered_order_rejected(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, customer, restaurant, address, order_status="Delivered")

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.cancel_order(db_session, order.id, "too late")
    assert exc_info.value.status_code == 400


def test_reassign_order_to_approved_rider(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, customer, restaurant, address, order_status="Ready for Pickup")
    new_rider = _make_admin_rider(db_session, approval_status="approved")

    result = service.reassign_order_rider(db_session, order.id, new_rider.id)

    assert result["rider_id"] == new_rider.id
    assert result["status"] == "Rider Assigned"


def test_reassign_order_to_unapproved_rider_rejected(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, customer, restaurant, address, order_status="Ready for Pickup")
    unapproved_rider = _make_admin_rider(db_session, approval_status="pending")

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.reassign_order_rider(db_session, order.id, unapproved_rider.id)
    assert exc_info.value.status_code == 400


def test_order_management_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/orders", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_cancel_order_route_returns_200(admin_client, db_session, admin_token):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, customer, restaurant, address, order_status="Accepted")

    response = admin_client.post(
        f"/admin/orders/{order.id}/cancel",
        json={"reason": "Customer requested"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Cancelled"


# --- Step 5: weekly restaurant settlement ---


def _period_around_today():
    from datetime import date, timedelta
    today = date.today()
    return today - timedelta(days=1), today + timedelta(days=1)


def test_generate_settlements_computes_totals(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    results = service.generate_settlements(db_session, period_start, period_end)

    assert len(results) == 1
    assert results[0]["restaurant_id"] == restaurant.id
    assert results[0]["total_sales"] == 1000
    assert results[0]["commission_deducted"] == 100
    assert results[0]["net_payable"] == 900
    assert results[0]["status"] == "Pending"


def test_generate_settlements_is_idempotent_and_skips_settled(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    first = service.generate_settlements(db_session, period_start, period_end)
    service.mark_settlement_paid(db_session, first[0]["id"])

    # A second Delivered order in the same period should NOT reopen the
    # already-settled row.
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    second = service.generate_settlements(db_session, period_start, period_end)

    assert len(second) == 1
    assert second[0]["status"] == "Settled"
    assert second[0]["total_sales"] == 1000  # unchanged, not recomputed


def test_mark_settlement_paid_rejects_already_settled(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()
    settlement = service.generate_settlements(db_session, period_start, period_end)[0]
    service.mark_settlement_paid(db_session, settlement["id"])

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.mark_settlement_paid(db_session, settlement["id"])
    assert exc_info.value.status_code == 400


def test_settlements_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/settlements", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_generate_settlements_route_returns_200(admin_client, db_session, admin_token):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    response = admin_client.post(
        "/admin/settlements/generate",
        json={"period_start": period_start.isoformat(), "period_end": period_end.isoformat()},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()[0]["net_payable"] == 900


# --- Step 6: weekly rider payout + cash reconciliation ---


def test_generate_rider_payouts_computes_totals(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    results = service.generate_rider_payouts(db_session, period_start, period_end)

    assert len(results) == 1
    assert results[0]["rider_id"] == rider.id
    assert results[0]["total_earning"] == 110
    assert results[0]["status"] == "Pending"


def test_generate_rider_payouts_is_idempotent_and_skips_paid(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    first = service.generate_rider_payouts(db_session, period_start, period_end)
    service.mark_rider_payout_paid(db_session, first[0]["id"])

    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    second = service.generate_rider_payouts(db_session, period_start, period_end)

    assert len(second) == 1
    assert second[0]["status"] == "Paid"
    assert second[0]["total_earning"] == 110  # unchanged, not recomputed


def test_mark_rider_payout_paid_rejects_already_paid(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()
    payout = service.generate_rider_payouts(db_session, period_start, period_end)[0]
    service.mark_rider_payout_paid(db_session, payout["id"])

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.mark_rider_payout_paid(db_session, payout["id"])
    assert exc_info.value.status_code == 400


def test_list_cash_discrepancies_flags_shortfall_only(db_session):
    rider = _make_rider(db_session)
    ok_deposit = CashDeposit(
        rider_id=rider.id, amount_submitted=1000, expected_amount=1000, discrepancy=0,
    )
    short_deposit = CashDeposit(
        rider_id=rider.id, amount_submitted=800, expected_amount=1000, discrepancy=-200,
    )
    db_session.add_all([ok_deposit, short_deposit])
    db_session.commit()

    results = service.list_cash_discrepancies(db_session)

    assert len(results) == 1
    assert results[0]["discrepancy"] == -200


def test_rider_payouts_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/rider-payouts", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_cash_discrepancies_route_returns_200(admin_client, db_session, admin_token):
    rider = _make_rider(db_session)
    short_deposit = CashDeposit(
        rider_id=rider.id, amount_submitted=800, expected_amount=1000, discrepancy=-200,
    )
    db_session.add(short_deposit)
    db_session.commit()

    response = admin_client.get(
        "/admin/cash-discrepancies", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


# --- Step 7: reports ---


def test_get_reports_computes_trends(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    result = service.get_reports(db_session, period_start, period_end)

    assert result["total_orders"] == 1
    assert result["total_revenue"] == 1110
    assert result["total_rider_payouts"] == 110
    assert result["average_delivery_distance_km"] == 3
    assert result["average_delivery_fee"] == 110
    assert len(result["top_restaurants"]) == 1
    assert result["top_restaurants"][0]["restaurant_id"] == restaurant.id
    assert result["top_restaurants"][0]["revenue"] == 1110


def test_get_reports_includes_cash_discrepancy_total(db_session):
    rider = _make_rider(db_session)
    deposit = CashDeposit(
        rider_id=rider.id, amount_submitted=800, expected_amount=1000, discrepancy=-200,
    )
    db_session.add(deposit)
    db_session.commit()
    period_start, period_end = _period_around_today()

    result = service.get_reports(db_session, period_start, period_end)

    assert result["cash_discrepancy_total"] == -200


def test_get_reports_zero_orders_no_division_error(db_session):
    period_start, period_end = _period_around_today()

    result = service.get_reports(db_session, period_start, period_end)

    assert result["total_orders"] == 0
    assert result["average_delivery_distance_km"] == 0.0
    assert result["average_delivery_fee"] == 0.0
    assert result["top_restaurants"] == []


def test_reports_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")
    period_start, period_end = _period_around_today()

    response = admin_client.get(
        "/admin/reports",
        params={"period_start": period_start.isoformat(), "period_end": period_end.isoformat()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_reports_route_returns_200(admin_client, db_session, admin_token):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Delivered")
    period_start, period_end = _period_around_today()

    response = admin_client.get(
        "/admin/reports",
        params={"period_start": period_start.isoformat(), "period_end": period_end.isoformat()},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["total_orders"] == 1
