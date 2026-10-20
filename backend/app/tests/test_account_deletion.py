"""
Account deletion tests (Google Play policy: in-app + web deletion).

Covers the full state machine and every rule in the change request:
  - rider request -> pending + account deactivated (+ 409 on active delivery)
  - cancel -> account reactivated (and what may no longer be cancelled)
  - daily job -> ready_for_review only, NEVER deletes anything, idempotent
  - admin approve with dues -> 409 + on_hold, with the reason recorded
  - admin approve clean -> completed, anonymised, sessions/devices revoked
  - KYC delete_now removes the stored files; retain_until keeps them private
  - purge-kyc deletes retained files and stamps kyc_purged_at
  - admin queue is gated by the `manage_deletion_requests` permission (403)
  - every admin action writes an audit row carrying the admin id
  - customer deletion is immediate; active/pending order -> 409, nothing deleted
  - an access token issued before deletion stops working afterwards

Runs against the real Postgres fixture from conftest.py (rolled back per test).
Object storage and FCM are mocked: the tests assert *what* would be deleted,
not that a live bucket/FCM endpoint exists.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import redis_client
from app.core.storage import _split_stored_document_url
from app.modules.admin_roles.models import AdminAuditLog
from app.modules.food_delivery.models import Order
from app.platform.account_deletion import models, service
from app.platform.account_deletion.routes import admin_router, public_router, user_router
from app.platform.auth import service as auth_service
from app.platform.auth.jwt_utils import create_access_token
from app.platform.auth.models import Admin, RefreshToken
from app.platform.notification.models import DeviceToken
from app.platform.users.models import Address
from app.platform.wallet_payment.models import Rider
from app.tests.test_order_tracking import (
    _make_address,
    _make_customer,
    _make_order,
    _make_restaurant,
)


def _unique() -> str:
    return uuid.uuid4().hex[:8]


def _local_phone() -> str:
    r"""A PK-format local number (10 digits, second digit 0-7) as digits only.

    The OTP endpoint validates `+923[0-7]\d{8}`, so hex UUID slices (which can
    contain a-f) would be rejected before the test's real subject is reached.
    """
    return f"30{uuid.uuid4().int % 10**8:08d}"


def _otp_for(phone_number: str) -> str:
    """Read the OTP straight out of Redis the way verify_otp() does (the same
    code the SMS gateway sent), instead of scraping the console log."""
    code = redis_client.get(auth_service._otp_key(phone_number))
    assert code is not None, "OTP was not stored - request it first"
    return code


def _make_rider(db, *, wallet=0, cash=0, active=True, kyc=True):
    """A rider with no dues by default - the state an approval needs.

    `kyc` attaches plausible private-bucket URLs so KYC handling is observable
    (they are the exact shape storage.upload_rider_document writes).
    """
    unique = _unique()
    rider = Rider(
        phone_number=f"+92{_local_phone()}",
        name=f"Rider {unique}",
        cnic_number=f"cnic-{unique}",
        approval_status="approved",
        wallet_balance=wallet,
        pending_cash_owed=cash,
        is_online=True,
        country_code="+92",
        is_active=active,
        cnic_photo_url=f"https://speedymeals-docs.s3.us-east-1.amazonaws.com/rider-docs/{unique}/cnic.webp"
        if kyc
        else None,
        license_photo_url=f"https://speedymeals-docs.s3.us-east-1.amazonaws.com/rider-docs/{unique}/license.webp"
        if kyc
        else None,
        vehicle_photo_url=f"https://speedymeals-docs.s3.us-east-1.amazonaws.com/rider-docs/{unique}/vehicle.webp"
        if kyc
        else None,
    )
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


def _session_for(db, subject_id, role="rider", status_="valid"):
    db.add(
        RefreshToken(
            subject_id=subject_id,
            role=role,
            token_hash=f"hash-{_unique()}",
            status=status_,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
    )
    db.add(
        DeviceToken(
            subject_id=subject_id,
            role=role,
            token=f"device-{_unique()}",
            platform="android",
        )
    )
    db.commit()


def _expired(rider, db):
    """Simulate the grace period ending: pending -> past its deadline."""
    req = service.get_latest_request(db, rider.id, "rider")
    req.grace_ends_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db.commit()
    db.refresh(req)
    return req


@pytest.fixture
def deletion_client(db_session):
    from app.core.redis_client import redis_client
    redis_client.flushdb()
    app = FastAPI()
    app.include_router(user_router)
    app.include_router(public_router)
    app.include_router(admin_router)
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    redis_client.flushdb()


@pytest.fixture
def admin(db_session):
    """A real admin row.

    Not optional: `reviewed_by` and AdminAuditLog.admin_id are foreign keys to
    admins.id, so an approval must name an admin that actually exists - the
    same constraint production hits, because real tokens always carry a real
    admin's id.
    """
    row = Admin(
        email=f"admin-{_unique()}@speedymeals.test",
        password_hash="x",
        role="admin",
        is_active=True,
    )
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)
    return row


@pytest.fixture
def admin_token(admin):
    return create_access_token(
        admin.id, "admin", permissions=["manage_deletion_requests"]
    )


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------- rider request


def test_rider_request_creates_pending_request_and_deactivates(db_session):
    rider = _make_rider(db_session)
    _session_for(db_session, rider.id)

    request = service.request_rider_deletion(db_session, rider)

    assert request.status == models.STATUS_PENDING
    assert request.role == "rider"
    assert request.requested_via == models.REQUESTED_VIA_APP
    assert settings.RIDER_DELETION_GRACE_DAYS == 7
    assert request.grace_ends_at > datetime.now(timezone.utc) + timedelta(days=6)

    db_session.refresh(rider)
    assert rider.is_active is False, "account must be deactivated immediately"
    assert rider.is_online is False, "dispatch must stop immediately"
    # Data is untouched: a request never deletes anything.
    assert rider.name != service.ANONYMIZED_NAME
    assert rider.cnic_photo_url is not None


def test_rider_request_with_active_delivery_is_409(db_session):
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    restaurant = _make_restaurant(db_session)
    rider = _make_rider(db_session)
    _make_order(
        db_session, customer, restaurant, address, rider=rider, order_status="Picked Up"
    )

    with pytest.raises(Exception) as exc:
        service.request_rider_deletion(db_session, rider)
    assert exc.value.status_code == 409
    assert "active delivery" in exc.value.detail

    db_session.refresh(rider)
    assert rider.is_active is True, "a refused request must not deactivate"


def test_rider_request_is_idempotent_while_open(db_session):
    rider = _make_rider(db_session)
    first = service.request_rider_deletion(db_session, rider)
    second = service.request_rider_deletion(db_session, rider)

    assert first.id == second.id
    count = (
        db_session.query(models.DeletionRequest)
        .filter(models.DeletionRequest.user_id == rider.id)
        .count()
    )
    assert count == 1


def test_rider_deletion_route_returns_grace_end_and_409(db_session, deletion_client):
    rider = _make_rider(db_session)
    token = create_access_token(rider.id, "rider")

    response = deletion_client.delete("/users/me", headers=_headers(token))
    assert response.status_code == 200
    body = response.json()
    assert body["request"]["status"] == "pending"
    assert body["request"]["grace_ends_at"]
    assert body["request"]["can_cancel"] is True
    assert "admin review" in body["message"] and "pending dues" in body["message"]

    # Second call while still open: same request, still 200 (idempotent).
    again = deletion_client.delete("/users/me", headers=_headers(token))
    assert again.status_code == 200

    # An active delivery makes it a 409 with an explanation.
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    restaurant = _make_restaurant(db_session)
    _make_order(
        db_session, customer, restaurant, address, rider=rider, order_status="On the Way"
    )
    blocked = deletion_client.delete("/users/me", headers=_headers(token))
    assert blocked.status_code == 409
    assert "active delivery" in blocked.json()["detail"]


# ------------------------------------------------------------------- cancel


def test_cancel_reactivates_account(db_session):
    rider = _make_rider(db_session)
    request = service.request_rider_deletion(db_session, rider)
    db_session.refresh(rider)
    assert rider.is_active is False

    cancelled = service.cancel_deletion_request(db_session, request)

    assert cancelled.status == models.STATUS_CANCELLED
    db_session.refresh(rider)
    assert rider.is_active is True, "cancelling must reactivate the account"
    assert rider.is_online is False, "reactivation does not force the rider online"


def test_cancel_allowed_from_ready_for_review_but_not_on_hold_or_completed(db_session):
    rider = _make_rider(db_session)
    ready = service.request_rider_deletion(db_session, rider)
    ready.status = models.STATUS_READY_FOR_REVIEW
    db_session.commit()
    assert service.cancel_deletion_request(db_session, ready).status == "cancelled"

    rider2 = _make_rider(db_session)
    held = service.request_rider_deletion(db_session, rider2)
    held.status = models.STATUS_ON_HOLD
    db_session.commit()
    with pytest.raises(Exception) as exc:
        service.cancel_deletion_request(db_session, held)
    assert exc.value.status_code == 409

    rider3 = _make_rider(db_session)
    done = service.request_rider_deletion(db_session, rider3)
    done.status = models.STATUS_COMPLETED
    db_session.commit()
    with pytest.raises(Exception) as exc:
        service.cancel_deletion_request(db_session, done)
    assert exc.value.status_code == 409


def test_cancel_route_reactivates_and_returns_status(db_session, deletion_client):
    rider = _make_rider(db_session)
    token = create_access_token(rider.id, "rider")
    deletion_client.delete("/users/me", headers=_headers(token))

    cancelled = deletion_client.post(
        "/users/me/deletion-request/cancel", headers=_headers(token)
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["request"]["status"] == "cancelled"

    db_session.refresh(rider)
    assert rider.is_active is True

    status = deletion_client.get("/users/me/deletion-request", headers=_headers(token))
    assert status.status_code == 200
    assert status.json()["request"]["status"] == "cancelled"


def test_status_route_returns_null_without_a_request(db_session, deletion_client):
    rider = _make_rider(db_session)
    token = create_access_token(rider.id, "rider")
    response = deletion_client.get("/users/me/deletion-request", headers=_headers(token))
    assert response.status_code == 200
    assert response.json() == {"request": None}


# ------------------------------------------------------------------ daily job


def test_job_moves_expired_pending_to_review_and_deletes_nothing(db_session):
    rider = _make_rider(db_session)
    service.request_rider_deletion(db_session, rider)
    _expired(rider, db_session)

    moved = service.mark_pending_ready_for_review(db_session)

    assert moved == 1
    request = service.get_latest_request(db_session, rider.id, "rider")
    assert request.status == models.STATUS_READY_FOR_REVIEW

    # NOTHING was deleted or anonymised by the job.
    db_session.refresh(rider)
    assert rider.name != service.ANONYMIZED_NAME
    assert rider.cnic_number.startswith("cnic-")
    assert rider.cnic_photo_url is not None
    assert rider.is_active is False, "deactivation still holds until approval"

    audit = (
        db_session.query(AdminAuditLog)
        .filter(
            AdminAuditLog.action == "DELETION_REQUEST_READY_FOR_REVIEW",
            AdminAuditLog.target_id == str(request.id),
        )
        .count()
    )
    assert audit == 1


def test_job_is_idempotent_and_skips_unexpired_requests(db_session):
    open_rider = _make_rider(db_session)
    service.request_rider_deletion(db_session, open_rider)  # grace still running

    assert service.mark_pending_ready_for_review(db_session) == 0
    assert (
        service.get_latest_request(db_session, open_rider.id, "rider").status
        == "pending"
    )

    due_rider = _make_rider(db_session)
    service.request_rider_deletion(db_session, due_rider)
    _expired(due_rider, db_session)

    assert service.mark_pending_ready_for_review(db_session) == 1
    # Re-run immediately: the row already left `pending`, so it moves nothing.
    assert service.mark_pending_ready_for_review(db_session) == 0
    assert (
        service.get_latest_request(db_session, due_rider.id, "rider").status
        == "ready_for_review"
    )


def test_job_module_runs_one_sweep_without_deleting(db_session, monkeypatch):
    """The scheduler entry point drives the same non-destructive function."""
    from types import SimpleNamespace

    from app.core import deletion_review_job

    rider = _make_rider(db_session)
    service.request_rider_deletion(db_session, rider)
    _expired(rider, db_session)

    class _TransactionBoundSession:
        """Hands the test session to the job but must never close it: the
        fixture owns the outer transaction that every test rolls back."""

        def __init__(self, session):
            self._session = session

        def close(self):  # noqa: D102 - no-op by design
            pass

        def __getattr__(self, name):
            return getattr(self._session, name)

    monkeypatch.setattr(
        deletion_review_job, "SessionLocal", lambda: _TransactionBoundSession(db_session)
    )
    # Deterministic lock: treat it as acquired so the sweep always runs.
    monkeypatch.setattr(
        deletion_review_job,
        "redis_client",
        SimpleNamespace(set=lambda *args, **kwargs: True),
    )

    assert deletion_review_job.sweep_once() == 1
    db_session.refresh(rider)
    assert rider.name != service.ANONYMIZED_NAME


# -------------------------------------------------------------- admin approve


def test_approve_with_dues_is_409_and_sets_on_hold(db_session, admin_token, deletion_client):
    rider = _make_rider(db_session, wallet=250)
    service.request_rider_deletion(db_session, rider)
    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)

    response = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/approve",
        json={"kyc_action": "delete_now", "admin_note": "checked"},
        headers=_headers(admin_token),
    )

    assert response.status_code == 409
    assert "unsettled dues" in response.json()["detail"]

    db_session.refresh(req)
    assert req.status == models.STATUS_ON_HOLD
    assert "wallet balance Rs. 250.00" in req.hold_reason

    db_session.refresh(rider)
    assert rider.name != service.ANONYMIZED_NAME, "dues can never be overridden"
    assert rider.cnic_photo_url is not None

    audit = (
        db_session.query(AdminAuditLog)
        .filter(
            AdminAuditLog.action == "DELETION_REQUEST_ON_HOLD",
            AdminAuditLog.target_id == str(req.id),
        )
        .one()
    )
    assert audit.admin_id is not None


def test_approve_with_active_delivery_is_409_and_sets_on_hold(db_session, admin_token, deletion_client):
    rider = _make_rider(db_session)
    service.request_rider_deletion(db_session, rider)  # request first...
    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)

    # ...then an order is assigned to them while the request waits for review.
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    restaurant = _make_restaurant(db_session)
    _make_order(
        db_session, customer, restaurant, address, rider=rider, order_status="On the Way"
    )

    response = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/approve",
        json={"kyc_action": "delete_now"},
        headers=_headers(admin_token),
    )

    assert response.status_code == 409
    assert "active delivery" in response.json()["detail"]
    db_session.refresh(req)
    assert req.status == models.STATUS_ON_HOLD
    db_session.refresh(rider)
    assert rider.is_active is False  # still deactivated, just not deleted


def test_approve_without_dues_completes_and_anonymises(db_session, admin_token, deletion_client):
    rider = _make_rider(db_session)
    _session_for(db_session, rider.id)
    service.request_rider_deletion(db_session, rider)
    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)

    response = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/approve",
        json={"kyc_action": "delete_now", "admin_note": "dues clear"},
        headers=_headers(admin_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["kyc_action"] == "delete_now"
    assert body["kyc_purged_at"] is not None
    assert body["subject_phone"] == "(deleted)"

    db_session.refresh(rider)
    assert rider.name == service.ANONYMIZED_NAME
    assert rider.phone_number == f"deleted:{rider.id}"
    assert rider.cnic_number == f"deleted:{rider.id}"
    assert rider.vehicle_registration is None
    assert rider.current_latitude is None and rider.current_longitude is None
    assert rider.is_active is False and rider.is_online is False

    # Sessions and devices are gone, so a token issued earlier is now dead.
    assert (
        db_session.query(RefreshToken)
        .filter(RefreshToken.subject_id == rider.id, RefreshToken.status == "valid")
        .count()
        == 0
    )
    assert (
        db_session.query(DeviceToken).filter(DeviceToken.subject_id == rider.id).count()
        == 0
    )

    audit = (
        db_session.query(AdminAuditLog)
        .filter(
            AdminAuditLog.action == "DELETION_REQUEST_COMPLETED",
            AdminAuditLog.target_id == str(req.id),
        )
        .one()
    )
    assert audit.admin_id is not None


def test_approve_before_grace_ends_needs_allow_early_admin_approval(db_session, admin_token, deletion_client):
    rider = _make_rider(db_session)
    req = service.request_rider_deletion(db_session, rider)  # grace still running

    response = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/approve",
        json={"kyc_action": "delete_now"},
        headers=_headers(admin_token),
    )
    assert response.status_code == 409
    assert "ALLOW_EARLY_ADMIN_APPROVAL" in response.json()["detail"]

    # The same request goes through once the flag is on (dues are still checked).
    original = settings.ALLOW_EARLY_ADMIN_APPROVAL
    try:
        settings.ALLOW_EARLY_ADMIN_APPROVAL = True
        early = deletion_client.post(
            f"/admin/deletion-requests/{req.id}/approve",
            json={"kyc_action": "delete_now"},
            headers=_headers(admin_token),
        )
        assert early.status_code == 200
        assert early.json()["status"] == "completed"
    finally:
        settings.ALLOW_EARLY_ADMIN_APPROVAL = original


# ------------------------------------------------------------------------ KYC


def test_kyc_delete_now_removes_every_stored_file(db_session, admin, monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(
        service, "delete_rider_document_url", lambda url: calls.append(url) or True
    )

    rider = _make_rider(db_session)
    urls = [rider.cnic_photo_url, rider.license_photo_url, rider.vehicle_photo_url]
    service.request_rider_deletion(db_session, rider)
    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)
    service.admin_approve(
        db_session, admin.id, req.id, "delete_now", None, "docs gone"
    )

    assert sorted(calls) == sorted(urls), "all three KYC files must be removed"
    db_session.refresh(rider)
    assert rider.cnic_photo_url is None
    assert rider.license_photo_url is None
    assert rider.vehicle_photo_url is None
    db_session.refresh(req)
    assert req.kyc_purged_at is not None


def test_kyc_retain_until_keeps_files_and_no_public_url_leaks(db_session, admin):
    calls: list[str] = []
    original = service.delete_rider_document_url
    service.delete_rider_document_url = lambda url: calls.append(url) or True

    try:
        rider = _make_rider(db_session)
        cnic_url = rider.cnic_photo_url
        service.request_rider_deletion(db_session, rider)
        req = _expired(rider, db_session)
        service.mark_pending_ready_for_review(db_session)

        retain_until = datetime.now(timezone.utc) + timedelta(days=90)
        service.admin_approve(
            db_session, admin.id, req.id, "retain_until", retain_until, "audit hold"
        )

        assert calls == [], "retain_until must not touch storage yet"
        db_session.refresh(rider)
        assert rider.cnic_photo_url == cnic_url, "files stay on file until purge-kyc"
        db_session.refresh(req)
        assert req.status == models.STATUS_COMPLETED
        assert req.kyc_action == models.KYC_RETAIN_UNTIL
        assert req.kyc_retain_until == retain_until
        assert req.kyc_purged_at is None

        # The account holder's own status payload must never carry a document
        # URL (private bucket, no user-facing exposure).
        payload = service.get_status_payload(db_session, req)
        serialised = repr(payload)
        assert "rider-docs" not in serialised
        assert cnic_url not in serialised
    finally:
        service.delete_rider_document_url = original


def test_purge_kyc_deletes_retained_files_and_stamps_timestamp(db_session, admin):
    calls: list[str] = []
    original = service.delete_rider_document_url
    service.delete_rider_document_url = lambda url: calls.append(url) or True

    try:
        rider = _make_rider(db_session)
        service.request_rider_deletion(db_session, rider)
        req = _expired(rider, db_session)
        service.mark_pending_ready_for_review(db_session)
        service.admin_approve(
            db_session,
            admin.id,
            req.id,
            "retain_until",
            datetime.now(timezone.utc) + timedelta(days=90),
            "kept for the audit",
        )
        calls.clear()

        purged = service.admin_purge_kyc(db_session, admin.id, req.id)

        assert len(calls) == 3, "every retained file is removed"
        assert purged.kyc_purged_at is not None
        db_session.refresh(rider)
        assert rider.cnic_photo_url is None
        assert rider.license_photo_url is None
        assert rider.vehicle_photo_url is None

        # Second purge must refuse rather than pretend to work twice.
        with pytest.raises(Exception) as exc:
            service.admin_purge_kyc(db_session, admin.id, req.id)
        assert exc.value.status_code == 400

        audit = (
            db_session.query(AdminAuditLog)
            .filter(
                AdminAuditLog.action == "DELETION_REQUEST_PURGE_KYC",
                AdminAuditLog.target_id == str(purged.id),
            )
            .one()
        )
        assert audit.admin_id is not None
    finally:
        service.delete_rider_document_url = original


def test_stored_document_url_split_recognises_both_storage_shapes():
    assert _split_stored_document_url(
        "https://speedymeals-docs.s3.us-east-1.amazonaws.com/rider-docs/abc/cnic.webp"
    ) == ("speedymeals-docs", "rider-docs/abc/cnic.webp")
    assert _split_stored_document_url(
        "https://proj.supabase.co/storage/v1/object/authenticated/rider-docs/abc/cnic.webp"
    ) == ("rider-docs", "abc/cnic.webp")
    # Anything else (foreign host, empty, menu photo) must not be deletable.
    assert _split_stored_document_url("https://example.com/anything.webp") is None
    assert _split_stored_document_url("https://x.com/menu-items/a/b.webp") is None
    assert _split_stored_document_url("") is None


# ------------------------------------------------------------------ admin API


def test_admin_queue_requires_the_permission(db_session, deletion_client):
    rider = _make_rider(db_session)
    service.request_rider_deletion(db_session, rider)

    # Admin without manage_deletion_requests -> 403.
    admin = Admin(
        email=f"no-perm-{_unique()}@speedymeals.test",
        password_hash="x",
        role="support",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    plain = create_access_token(admin.id, "admin", permissions=[])

    denied = deletion_client.get("/admin/deletion-requests", headers=_headers(plain))
    assert denied.status_code == 403
    assert "manage_deletion_requests" in denied.json()["detail"]

    # A customer token is not an admin at all -> 403.
    customer_token = create_access_token(uuid.uuid4(), "customer")
    assert (
        deletion_client.get(
            "/admin/deletion-requests", headers=_headers(customer_token)
        ).status_code
        == 403
    )

    # Missing header -> 401.
    assert deletion_client.get("/admin/deletion-requests").status_code == 401


def test_admin_queue_lists_dues_and_overdue_flag(db_session, admin_token, deletion_client):
    rich = _make_rider(db_session, wallet=120.5, cash=900)
    poor = _make_rider(db_session)
    service.request_rider_deletion(db_session, rich)
    service.request_rider_deletion(db_session, poor)

    rich_req = _expired(rich, db_session)
    _expired(poor, db_session)
    service.mark_pending_ready_for_review(db_session)

    # Make one request overdue (> 30 days in review).
    rich_req.grace_ends_at = datetime.now(timezone.utc) - timedelta(days=31)
    db_session.commit()

    response = deletion_client.get(
        "/admin/deletion-requests",
        params={"status": "ready_for_review", "page": 1, "page_size": 50},
        headers=_headers(admin_token),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2

    by_id = {item["user_id"]: item for item in payload["items"]}
    rich_item = by_id[str(rich.id)]
    poor_item = by_id[str(poor.id)]
    assert rich_item["wallet_balance"] == 120.5
    assert rich_item["pending_cash_owed"] == 900
    assert rich_item["can_approve"] is False
    assert "unsettled dues" in rich_item["blocking_reason"]
    assert rich_item["is_overdue"] is True
    assert rich_item["subject_phone"].startswith("+9230")
    assert "*" in rich_item["subject_phone"], "phone must be masked for staff"

    assert poor_item["can_approve"] is True
    assert poor_item["blocking_reason"] is None
    assert poor_item["is_overdue"] is False

    # Unknown status filter is rejected, not silently ignored.
    assert (
        deletion_client.get(
            "/admin/deletion-requests",
            params={"status": "nope"},
            headers=_headers(admin_token),
        ).status_code
        == 400
    )


def test_admin_hold_and_release_round_trip(db_session, admin_token, deletion_client):
    rider = _make_rider(db_session, wallet=10)
    service.request_rider_deletion(db_session, rider)
    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)

    held = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/hold",
        json={"reason": "Waiting for cash deposit"},
        headers=_headers(admin_token),
    )
    assert held.status_code == 200
    assert held.json()["status"] == "on_hold"
    assert held.json()["hold_reason"] == "Waiting for cash deposit"

    # Release while the grace period is over -> ready_for_review.
    released = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/release", headers=_headers(admin_token)
    )
    assert released.status_code == 200
    assert released.json()["status"] == "ready_for_review"
    assert released.json()["hold_reason"] is None

    # Release only works from on_hold.
    again = deletion_client.post(
        f"/admin/deletion-requests/{req.id}/release", headers=_headers(admin_token)
    )
    assert again.status_code == 409

    # Audit rows exist for both, carrying the admin id.
    actions = {
        row.action: row.admin_id
        for row in db_session.query(AdminAuditLog)
        .filter(
            AdminAuditLog.target_id == str(req.id),
            AdminAuditLog.action.in_(
                ["DELETION_REQUEST_HOLD", "DELETION_REQUEST_RELEASED"]
            ),
        )
        .all()
    }
    assert set(actions) == {"DELETION_REQUEST_HOLD", "DELETION_REQUEST_RELEASED"}
    assert all(admin_id is not None for admin_id in actions.values())


# -------------------------------------------------------------------- customer


def test_customer_deletion_is_immediate(db_session):
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    _session_for(db_session, customer.id, role="customer")

    request = service.delete_customer_now(db_session, customer)

    assert request.status == models.STATUS_COMPLETED
    assert request.role == "customer"
    assert request.grace_ends_at == request.requested_at, "no grace for customers"

    db_session.refresh(customer)
    assert customer.name == service.ANONYMIZED_NAME
    assert customer.phone_number == f"deleted:{customer.id}"
    assert customer.is_active is False
    assert (
        db_session.query(Address).filter(Address.user_id == customer.id).count() == 0
    )
    assert (
        db_session.query(RefreshToken)
        .filter(
            RefreshToken.subject_id == customer.id, RefreshToken.status == "valid"
        ).count()
        == 0
    )


def test_customer_with_active_order_is_409_and_untouched(db_session):
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    restaurant = _make_restaurant(db_session)
    _make_order(
        db_session, customer, restaurant, address, order_status="Preparing"
    )

    with pytest.raises(Exception) as exc:
        service.delete_customer_now(db_session, customer)
    assert exc.value.status_code == 409
    assert "active or pending order" in exc.value.detail

    db_session.refresh(customer)
    assert customer.is_active is True
    assert customer.name != service.ANONYMIZED_NAME
    assert (
        db_session.query(models.DeletionRequest)
        .filter(models.DeletionRequest.user_id == customer.id)
        .count()
        == 0
    )


def test_customer_delete_route_is_204_for_a_clean_account(db_session, deletion_client):
    token = create_access_token(uuid.uuid4(), "customer")  # unknown subject
    refused = deletion_client.delete("/users/me", headers=_headers(token))
    assert refused.status_code == 404

    customer = _make_customer(db_session)
    token = create_access_token(customer.id, "customer")
    ok = deletion_client.delete("/users/me", headers=_headers(token))
    assert ok.status_code == 204
    assert ok.content == b""


def test_customer_delete_route_with_active_order_is_409(db_session, deletion_client):
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    restaurant = _make_restaurant(db_session)
    _make_order(db_session, customer, restaurant, address, order_status="Accepted")
    token = create_access_token(customer.id, "customer")

    response = deletion_client.delete("/users/me", headers=_headers(token))
    assert response.status_code == 409
    assert "active or pending order" in response.json()["detail"]


def test_deletion_is_rejected_for_other_roles(db_session, deletion_client):
    token = create_access_token(uuid.uuid4(), "restaurant")
    response = deletion_client.delete("/users/me", headers=_headers(token))
    assert response.status_code == 403


# ------------------------------------------------------------ token invalidation


def test_access_token_stops_working_after_deletion(db_session, admin, deletion_client):
    rider = _make_rider(db_session)
    token = create_access_token(rider.id, "rider")

    # The token works while the request is open (rider must read/cancel status).
    service.request_rider_deletion(db_session, rider)
    assert (
        deletion_client.get(
            "/users/me/deletion-request", headers=_headers(token)
        ).status_code
        == 200
    )

    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)
    service.admin_approve(db_session, admin.id, req.id, "delete_now", None, None)

    # After execution the very same token is dead (Redis denylist).
    after = deletion_client.get("/users/me/deletion-request", headers=_headers(token))
    assert after.status_code == 401
    assert after.json()["detail"] == "This account has been deleted."


def test_refresh_token_is_revoked_after_deletion(db_session, admin):
    rider = _make_rider(db_session)
    _session_for(db_session, rider.id)
    service.request_rider_deletion(db_session, rider)
    req = _expired(rider, db_session)
    service.mark_pending_ready_for_review(db_session)
    service.admin_approve(db_session, admin.id, req.id, "delete_now", None, None)

    assert (
        db_session.query(RefreshToken)
        .filter(RefreshToken.subject_id == rider.id, RefreshToken.status == "valid")
        .count()
        == 0
    )


# ------------------------------------------------------------------ public web


def test_public_request_always_answers_the_same(db_session, deletion_client):
    """No user enumeration: an unknown number gets the SAME 202 body as a real one.

    The critical invariant:
    - Both known and unknown numbers receive HTTP 202 with the same JSON body.
    - An OTP is stored in Redis ONLY for the known account (the send is real).
    - An unknown number leaves no OTP in Redis (no SMS sent, no cost, no leak).
    """
    # Seed a real rider with a known PK-format number.
    known_phone = f"+92{_local_phone()}"
    rider = _make_rider(db_session)
    rider.phone_number = known_phone
    db_session.commit()

    unknown_local = _local_phone()
    unknown_phone = f"+92{unknown_local}"

    # Both must return 202.
    known_resp = deletion_client.post(
        "/account-deletion/request",
        json={"country_code": "+92", "phone_number": known_phone[3:]},
    )
    ghost_resp = deletion_client.post(
        "/account-deletion/request",
        json={"country_code": "+92", "phone_number": unknown_local},
    )

    assert known_resp.status_code == 202
    assert ghost_resp.status_code == 202
    # The response body must be identical - no user enumeration.
    assert known_resp.json() == ghost_resp.json()

    # OTP was generated and stored for the known account (background task runs
    # synchronously inside TestClient).
    from app.platform.auth import service as auth_service
    from app.core.redis_client import redis_client
    assert redis_client.get(auth_service._otp_key(known_phone)) is not None, (
        "OTP must be stored for a known account"
    )
    # No OTP for the unknown number - nothing was sent, no Redis key written.
    assert redis_client.get(auth_service._otp_key(unknown_phone)) is None, (
        "OTP must NOT be stored for an unknown number"
    )

    # A malformed number is still a plain 400 - format checks are not secrets.
    assert (
        deletion_client.post(
            "/account-deletion/request",
            json={"country_code": "+92", "phone_number": "2012345678"},
        ).status_code
        == 400
    )


def test_public_request_sends_otp_even_inside_the_login_cooldown(db_session, deletion_client):
    """Regression: the public deletion form must never silently drop its OTP.

    The 45s OTP resend cooldown key (otp:cooldown:<phone>) is shared with the
    login flow. If a rider asks for a login code and then uses the hosted
    deletion page - or the reverse - the send used to raise 429 inside the
    BackgroundTask, which was swallowed: the caller got the "code has been
    sent" 202 and no code ever arrived. The deletion endpoint has its own
    per-phone/per-IP/daily limits, so it must ignore that shared cooldown.
    """
    from app.core.redis_client import redis_client
    from app.platform.auth import service as auth_service

    phone = f"+92{_local_phone()}"
    rider = _make_rider(db_session)
    rider.phone_number = phone
    db_session.commit()

    # Simulate a login OTP requested moments ago (cooldown still active).
    redis_client.set(auth_service._cooldown_key(phone), "1", ex=45)
    try:
        response = deletion_client.post(
            "/account-deletion/request",
            json={"country_code": "+92", "phone_number": phone[3:]},
        )
        assert response.status_code == 202
        assert redis_client.get(auth_service._otp_key(phone)) is not None, (
            "deletion OTP must still be sent while the login cooldown is active"
        )
    finally:
        redis_client.delete(
            auth_service._otp_key(phone), auth_service._cooldown_key(phone)
        )


def test_public_confirm_rider_returns_grace_and_needs_review(db_session, deletion_client):
    phone = f"+92{_local_phone()}"
    rider = _make_rider(db_session)
    rider.phone_number = phone
    db_session.commit()

    assert (
        deletion_client.post(
            "/account-deletion/request",
            json={"country_code": "+92", "phone_number": phone[3:]},
        ).status_code
        == 202
    )
    otp = _otp_for(phone)

    response = deletion_client.post(
        "/account-deletion/confirm",
        json={
            "country_code": "+92",
            "phone_number": phone[3:],
            "otp_code": otp,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["result"] == "pending"
    assert body["requires_admin_review"] is True
    assert body["grace_ends_at"] is not None
    assert "admin review" in body["message"] and "pending dues" in body["message"]

    db_session.refresh(rider)
    assert rider.is_active is False

    # Wrong OTP is a plain 400, no account information attached.
    assert (
        deletion_client.post(
            "/account-deletion/confirm",
            json={
                "country_code": "+92",
                "phone_number": phone[3:],
                "otp_code": "000000",
            },
        ).status_code
        == 400
    )


def test_customer_delete_with_order_history_succeeds_and_keeps_order_readable(
    db_session, deletion_client
):
    """Regression: a customer who has ever ordered must still be deletable.

    `orders.delivery_address_id` is NOT NULL and points at `addresses.id`, so
    deleting every address row raised a ForeignKeyViolation -> HTTP 500 for any
    customer with order history - the normal case for a deletion request. The
    referenced address row is now scrubbed instead of deleted, and the order
    must stay readable afterwards.
    """
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    restaurant = _make_restaurant(db_session)
    order = _make_order(
        db_session, customer, restaurant, address, order_status="Delivered"
    )
    token = create_access_token(customer.id, "customer")

    response = deletion_client.delete("/users/me", headers=_headers(token))
    assert response.status_code == 204

    db_session.refresh(customer)
    assert customer.name == service.ANONYMIZED_NAME
    assert customer.is_active is False

    # The order keeps a valid address row, with the personal payload removed.
    db_session.refresh(address)
    assert address.full_address == service.ANONYMIZED_ADDRESS
    assert address.label is None
    assert address.is_default is False
    db_session.refresh(order)
    assert order.delivery_address_id == address.id
    assert db_session.get(Order, order.id) is not None


def test_public_confirm_customer_deletes_immediately(db_session, deletion_client):
    customer = _make_customer(db_session)
    # Give the fixture a PK-format, digits-only number so the OTP request passes
    # the same validator a real web form hits.
    customer.phone_number = f"+92{_local_phone()}"
    db_session.commit()
    phone = customer.phone_number

    assert (
        deletion_client.post(
            "/account-deletion/request",
            json={"country_code": "+92", "phone_number": phone[3:]},
        ).status_code
        == 202
    )
    otp = _otp_for(phone)

    response = deletion_client.post(
        "/account-deletion/confirm",
        json={"country_code": "+92", "phone_number": phone[3:], "otp_code": otp},
    )
    assert response.status_code == 200
    assert response.json()["result"] == "deleted"
    assert response.json()["requires_admin_review"] is False

    db_session.refresh(customer)
    assert customer.is_active is False
    assert customer.name == service.ANONYMIZED_NAME


def test_public_confirm_unknown_number_reports_no_account(deletion_client):
    """Confirm that verifying a valid OTP for a number with no account returns 'no_account'.

    Since /account-deletion/request no longer sends OTPs for unknown numbers,
    we seed the OTP directly into Redis - simulating the edge case where an
    account existed when the OTP was requested but was deleted before confirm
    (e.g. a concurrent deletion), or testing the confirm logic in isolation.
    """
    local = _local_phone()
    phone = f"+92{local}"

    # Seed the OTP directly - mimics what /request does for a *known* account.
    auth_service.generate_and_send_otp(phone)
    otp = _otp_for(phone)

    response = deletion_client.post(
        "/account-deletion/confirm",
        json={"country_code": "+92", "phone_number": local, "otp_code": otp},
    )
    assert response.status_code == 200
    assert response.json()["result"] == "no_account"
    assert response.json()["grace_ends_at"] is None


def test_public_request_does_not_send_otp_for_unknown_number(deletion_client):
    """Decision #4 invariant: no OTP is stored or sent for a number with no account."""
    local = _local_phone()
    phone = f"+92{local}"

    resp = deletion_client.post(
        "/account-deletion/request",
        json={"country_code": "+92", "phone_number": local},
    )
    assert resp.status_code == 202

    # Redis must have NO OTP key for this number.
    from app.core.redis_client import redis_client
    assert redis_client.get(auth_service._otp_key(phone)) is None, (
        "No OTP must be stored for an unknown number (no SMS should be sent)"
    )


def test_public_request_per_ip_rate_limit(db_session, deletion_client):
    """Per-IP rate limit: after _PER_IP_MAX attempts the endpoint returns 429."""
    from app.platform.account_deletion.routes import _PER_IP_MAX

    test_ip = f"192.168.1.{uuid.uuid4().int % 250}"
    headers = {"x-forwarded-for": test_ip}

    # Exhaust the per-IP limit by hitting the endpoint with the same IP.
    for _ in range(_PER_IP_MAX):
        deletion_client.post(
            "/account-deletion/request",
            json={"country_code": "+92", "phone_number": _local_phone()},
            headers=headers,
        )

    # The (_PER_IP_MAX + 1)th request must be rate-limited.
    over_limit = deletion_client.post(
        "/account-deletion/request",
        json={"country_code": "+92", "phone_number": _local_phone()},
        headers=headers,
    )
    assert over_limit.status_code == 429


def test_public_request_global_daily_cap(db_session, deletion_client, monkeypatch):
    """Global daily cap: once _GLOBAL_DAILY_CAP OTPs are sent the endpoint returns 429."""
    from app.platform.account_deletion import routes as del_routes

    # Seed a rider so the account-exists branch is taken.
    known_phone = f"+92{_local_phone()}"
    rider = _make_rider(db_session)
    rider.phone_number = known_phone
    db_session.commit()

    test_ip = f"10.0.0.{uuid.uuid4().int % 250}"
    headers = {"x-forwarded-for": test_ip}

    # Patch the cap to 1 so we can hit it in a single extra request.
    monkeypatch.setattr(del_routes, "_GLOBAL_DAILY_CAP", 1)

    # First request (cap=1) - succeeds (count becomes 1, not > 1).
    first = deletion_client.post(
        "/account-deletion/request",
        json={"country_code": "+92", "phone_number": known_phone[3:]},
        headers=headers,
    )
    assert first.status_code == 202

    # Patch the cap down to 0 so the next increment (now 2 > 0) is rejected.
    monkeypatch.setattr(del_routes, "_GLOBAL_DAILY_CAP", 0)
    over = deletion_client.post(
        "/account-deletion/request",
        json={"country_code": "+92", "phone_number": known_phone[3:]},
        headers=headers,
    )
    assert over.status_code == 429
    assert "Daily" in over.json()["detail"]

