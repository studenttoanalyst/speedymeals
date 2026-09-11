"""
Phase 6 Step 1 — rider live location update tests.

Covers: valid location storage in Redis, invalid lat/lng rejection,
unauthenticated access, wrong role, rider isolation, correct Redis key,
stored data shape, and TTL existence. Follows the same service-level
+ route-level test pattern as test_wallet_payment.py and test_cart.py.
"""
import json
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.platform.auth.jwt_utils import create_access_token
from app.platform.wallet_payment import service
from app.platform.wallet_payment.routes import router as wallet_router


# --- helpers ---


@pytest.fixture
def rider2(db_session):
    """Second rider for isolation tests."""
    from app.platform.wallet_payment.models import Rider

    unique_suffix = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique_suffix}",
        name="Test Rider 2",
        cnic_number=f"cnic2-{unique_suffix}",
        approval_status="pending",
        wallet_balance=0,
        pending_cash_owed=0,
        is_online=False,
        country_code="+92",
        is_active=True,
    )
    db_session.add(r)
    db_session.commit()
    db_session.refresh(r)
    return r


@pytest.fixture
def location_client(db_session):
    app = FastAPI()
    app.include_router(wallet_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def _cleanup_location(rider_id):
    redis_client.delete(service._rider_location_key(rider_id))


# --- service-level tests ---


def test_update_location_stores_in_redis(db_session, rider):
    try:
        result = service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)

        assert result["rider_id"] == rider.id
        assert result["lat"] == 24.8607
        assert result["lng"] == 67.0011
        assert result["updated_at"] is not None

        # Verify Redis key exists and contains correct data
        key = service._rider_location_key(rider.id)
        raw = redis_client.get(key)
        assert raw is not None
        data = json.loads(raw)
        assert data["lat"] == 24.8607
        assert data["lng"] == 67.0011
        assert "updated_at" in data
    finally:
        _cleanup_location(rider.id)


def test_update_location_sets_ttl(db_session, rider):
    try:
        service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)

        key = service._rider_location_key(rider.id)
        ttl = redis_client.ttl(key)
        assert ttl > 0
        assert ttl <= service.LOCATION_TTL_SECONDS
    finally:
        _cleanup_location(rider.id)


def test_update_location_key_format(db_session, rider):
    try:
        service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)

        key = service._rider_location_key(rider.id)
        assert key == f"rider_location:{rider.id}"
    finally:
        _cleanup_location(rider.id)


def test_update_location_overwrites_previous(db_session, rider):
    try:
        service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)
        service.update_rider_location(db_session, rider.id, 25.0, 68.0)

        key = service._rider_location_key(rider.id)
        data = json.loads(redis_client.get(key))
        assert data["lat"] == 25.0
        assert data["lng"] == 68.0
    finally:
        _cleanup_location(rider.id)


def test_update_location_unknown_rider_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        service.update_rider_location(db_session, uuid.uuid4(), 24.8607, 67.0011)
    assert exc_info.value.status_code == 404


def test_update_location_boundary_values(db_session, rider):
    try:
        # Exact boundary values should be accepted
        result = service.update_rider_location(db_session, rider.id, -90.0, -180.0)
        assert result["lat"] == -90.0
        assert result["lng"] == -180.0

        result = service.update_rider_location(db_session, rider.id, 90.0, 180.0)
        assert result["lat"] == 90.0
        assert result["lng"] == 180.0
    finally:
        _cleanup_location(rider.id)


# --- schema validation tests ---


def test_schema_rejects_latitude_out_of_range():
    from pydantic import ValidationError
    from app.platform.wallet_payment.schemas import RiderLocationUpdateSchema

    with pytest.raises(ValidationError):
        RiderLocationUpdateSchema(latitude=91.0, longitude=67.0)

    with pytest.raises(ValidationError):
        RiderLocationUpdateSchema(latitude=-91.0, longitude=67.0)


def test_schema_rejects_longitude_out_of_range():
    from pydantic import ValidationError
    from app.platform.wallet_payment.schemas import RiderLocationUpdateSchema

    with pytest.raises(ValidationError):
        RiderLocationUpdateSchema(latitude=24.0, longitude=181.0)

    with pytest.raises(ValidationError):
        RiderLocationUpdateSchema(latitude=24.0, longitude=-181.0)


def test_schema_accepts_valid_coordinates():
    from app.platform.wallet_payment.schemas import RiderLocationUpdateSchema

    loc = RiderLocationUpdateSchema(latitude=24.8607, longitude=67.0011)
    assert loc.latitude == 24.8607
    assert loc.longitude == 67.0011


# --- route-level tests ---


def test_route_missing_token_rejected(location_client):
    response = location_client.patch(
        "/wallet/location",
        json={"latitude": 24.8607, "longitude": 67.0011},
    )
    assert response.status_code == 403


def test_route_wrong_role_rejected(location_client, db_session):
    from app.modules.food_delivery.models import Restaurant

    unique = uuid.uuid4().hex[:8]
    restaurant = Restaurant(
        name="Role Test",
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92300{unique}",
        commission_rate=10,
        status="active",
        country_code="+92",
        currency="PKR",
    )
    db_session.add(restaurant)
    db_session.commit()

    token = create_access_token(restaurant.id, "restaurant")
    response = location_client.patch(
        "/wallet/location",
        json={"latitude": 24.8607, "longitude": 67.0011},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_route_customer_role_rejected(location_client, db_session):
    from app.platform.users.models import User

    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92319{unique}", name="Customer", country_code="+92")
    db_session.add(user)
    db_session.commit()

    token = create_access_token(user.id, "customer")
    response = location_client.patch(
        "/wallet/location",
        json={"latitude": 24.8607, "longitude": 67.0011},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_route_invalid_latitude_rejected(location_client, db_session, rider):
    token = create_access_token(rider.id, "rider")
    try:
        response = location_client.patch(
            "/wallet/location",
            json={"latitude": 91.0, "longitude": 67.0},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422
    finally:
        _cleanup_location(rider.id)


def test_route_invalid_longitude_rejected(location_client, db_session, rider):
    token = create_access_token(rider.id, "rider")
    try:
        response = location_client.patch(
            "/wallet/location",
            json={"latitude": 24.0, "longitude": 181.0},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422
    finally:
        _cleanup_location(rider.id)


def test_route_end_to_end(location_client, db_session, rider):
    token = create_access_token(rider.id, "rider")
    try:
        response = location_client.patch(
            "/wallet/location",
            json={"latitude": 24.8607, "longitude": 67.0011},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["rider_id"] == str(rider.id)
        assert body["lat"] == 24.8607
        assert body["lng"] == 67.0011
        assert body["updated_at"] is not None

        # Verify Redis
        key = service._rider_location_key(rider.id)
        raw = redis_client.get(key)
        assert raw is not None
        data = json.loads(raw)
        assert data["lat"] == 24.8607
        assert data["lng"] == 67.0011
    finally:
        _cleanup_location(rider.id)


def test_route_rider_isolation(location_client, db_session, rider, rider2):
    """Rider A's location must not appear under Rider B's key."""
    token_a = create_access_token(rider.id, "rider")
    token_b = create_access_token(rider2.id, "rider")
    try:
        location_client.patch(
            "/wallet/location",
            json={"latitude": 24.8607, "longitude": 67.0011},
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # Rider B updates their own location
        response_b = location_client.patch(
            "/wallet/location",
            json={"latitude": 25.0, "longitude": 68.0},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response_b.status_code == 200

        # Rider A's key is unchanged
        key_a = service._rider_location_key(rider.id)
        data_a = json.loads(redis_client.get(key_a))
        assert data_a["lat"] == 24.8607
        assert data_a["lng"] == 67.0011

        # Rider B's key has their own coordinates
        key_b = service._rider_location_key(rider2.id)
        data_b = json.loads(redis_client.get(key_b))
        assert data_b["lat"] == 25.0
        assert data_b["lng"] == 68.0
    finally:
        _cleanup_location(rider.id)
        _cleanup_location(rider2.id)


def test_route_missing_fields_rejected(location_client, db_session, rider):
    token = create_access_token(rider.id, "rider")
    response = location_client.patch(
        "/wallet/location",
        json={"latitude": 24.8607},  # missing longitude
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


# --- Phase 6, Step 2: rider assignment eligibility ---


def _setup_eligible_rider(db, rider):
    """Make a rider fully eligible: online, sufficient wallet, valid location."""
    service.recharge_wallet(db, rider.id, 1000, "bank_transfer")
    service.set_online_status(db, rider.id, True)
    service.update_rider_location(db, rider.id, 24.8607, 67.0011)


def test_eligible_online_sufficient_wallet_valid_location(db_session, rider):
    try:
        _setup_eligible_rider(db_session, rider)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is True
    finally:
        _cleanup_location(rider.id)


def test_not_eligible_offline(db_session, rider):
    try:
        # Recharge + push location, but stay offline
        service.recharge_wallet(db_session, rider.id, 1000, "bank_transfer")
        service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)
        # rider.is_online defaults to False from fixture
        assert service.rider_eligible_for_assignment(db_session, rider.id) is False
    finally:
        _cleanup_location(rider.id)


def test_not_eligible_insufficient_wallet(db_session, rider):
    try:
        # Go online + push location, but wallet_balance = 0 (below 500)
        # set_online_status would reject this, so set the field directly
        rider.is_online = True
        db_session.add(rider)
        db_session.commit()
        service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is False
    finally:
        _cleanup_location(rider.id)


def test_not_eligible_expired_location(db_session, rider):
    try:
        # Online + sufficient wallet, but no Redis location
        service.recharge_wallet(db_session, rider.id, 1000, "bank_transfer")
        service.set_online_status(db_session, rider.id, True)
        # No location push — key doesn't exist
        assert service.rider_eligible_for_assignment(db_session, rider.id) is False
    finally:
        _cleanup_location(rider.id)


def test_not_eligible_location_expired_via_ttl(db_session, rider):
    try:
        _setup_eligible_rider(db_session, rider)
        # Force-expire the location key
        key = service._rider_location_key(rider.id)
        redis_client.expire(key, 0)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is False
    finally:
        _cleanup_location(rider.id)


def test_eligible_after_reconnecting_location(db_session, rider):
    """Rider becomes ineligible when location expires, then eligible again
    after pushing a fresh location — confirms the check is live, not cached."""
    try:
        _setup_eligible_rider(db_session, rider)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is True

        # Expire the location
        key = service._rider_location_key(rider.id)
        redis_client.expire(key, 0)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is False

        # Push fresh location
        service.update_rider_location(db_session, rider.id, 25.0, 68.0)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is True
    finally:
        _cleanup_location(rider.id)


def test_eligible_unknown_rider_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        service.rider_eligible_for_assignment(db_session, uuid.uuid4())
    assert exc_info.value.status_code == 404


def test_eligibility_uses_existing_min_wallet_balance_constant(db_session, rider):
    """Verify the eligibility check reuses Phase 3's MIN_WALLET_BALANCE,
    not a separate duplicate constant."""
    assert service.MIN_WALLET_BALANCE == 500
    # Rider at exactly 500 wallet balance should be eligible (not < 500)
    try:
        service.recharge_wallet(db_session, rider.id, 500, "bank_transfer")
        service.set_online_status(db_session, rider.id, True)
        service.update_rider_location(db_session, rider.id, 24.8607, 67.0011)
        assert service.rider_eligible_for_assignment(db_session, rider.id) is True
    finally:
        _cleanup_location(rider.id)
