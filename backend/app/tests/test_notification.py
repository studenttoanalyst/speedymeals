"""
Push notification tests: device registry endpoints, delivery + dead-token
pruning, no-op when Firebase is unconfigured, and the order-copy table.

FCM itself is always mocked; no network and no Firebase project is needed.
"""
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.modules.food_delivery import order_notifications
from app.platform.auth.jwt_utils import create_access_token
from app.platform.notification import service
from app.platform.notification.fcm import PushMessage
from app.platform.notification.models import DeviceToken

TOKEN_A = "a" * 60
TOKEN_B = "b" * 60


@pytest.fixture
def client(db_session):
    """TestClient whose DB session is the per-test rolled-back transaction."""
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def _auth(subject_id: uuid.UUID, role: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject_id, role)}"}


# ------------------------------------------------------------- endpoints

def test_register_requires_auth(client):
    r = client.post("/devices", json={"token": TOKEN_A, "platform": "android"})
    assert r.status_code == 401


def test_register_creates_row_bound_to_token_identity(client, db_session):
    uid = uuid.uuid4()
    r = client.post("/devices", json={"token": TOKEN_A, "platform": "android"}, headers=_auth(uid, "rider"))
    assert r.status_code == 200
    assert r.json() == {"registered": True, "platform": "android"}
    row = db_session.query(DeviceToken).filter_by(token=TOKEN_A).one()
    assert row.subject_id == uid and row.role == "rider"


def test_register_same_token_new_account_repoints_row(client, db_session):
    first, second = uuid.uuid4(), uuid.uuid4()
    client.post("/devices", json={"token": TOKEN_A, "platform": "android"}, headers=_auth(first, "customer"))
    client.post("/devices", json={"token": TOKEN_A, "platform": "android"}, headers=_auth(second, "rider"))
    rows = db_session.query(DeviceToken).filter_by(token=TOKEN_A).all()
    assert len(rows) == 1
    assert rows[0].subject_id == second and rows[0].role == "rider"


def test_super_admin_role_is_stored_as_admin(client, db_session):
    uid = uuid.uuid4()
    client.post("/devices", json={"token": TOKEN_A, "platform": "web"}, headers=_auth(uid, "super_admin"))
    assert db_session.query(DeviceToken).filter_by(token=TOKEN_A).one().role == "admin"


def test_register_rejects_bad_platform_and_short_token(client):
    uid = uuid.uuid4()
    h = _auth(uid, "customer")
    assert client.post("/devices", json={"token": TOKEN_A, "platform": "windows"}, headers=h).status_code == 422
    assert client.post("/devices", json={"token": "short", "platform": "web"}, headers=h).status_code == 422


def test_unregister_only_removes_own_token(client, db_session):
    owner, other = uuid.uuid4(), uuid.uuid4()
    client.post("/devices", json={"token": TOKEN_A, "platform": "android"}, headers=_auth(owner, "customer"))

    r = client.delete("/devices", params={"token": TOKEN_A}, headers=_auth(other, "customer"))
    assert r.status_code == 200 and r.json() == {"removed": False}
    assert db_session.query(DeviceToken).filter_by(token=TOKEN_A).count() == 1

    r = client.delete("/devices", params={"token": TOKEN_A}, headers=_auth(owner, "customer"))
    assert r.json() == {"removed": True}
    assert db_session.query(DeviceToken).filter_by(token=TOKEN_A).count() == 0


def test_tokens_per_account_are_capped(db_session):
    uid = uuid.uuid4()
    for i in range(service.MAX_TOKENS_PER_SUBJECT + 3):
        service.register_device(db_session, uid, "rider", f"{i:02d}".ljust(40, "x"), "android")
    assert (
        db_session.query(DeviceToken).filter_by(subject_id=uid).count()
        == service.MAX_TOKENS_PER_SUBJECT
    )


# -------------------------------------------------------------- delivery

def test_deliver_sends_to_all_devices_of_that_account_only(db_session):
    me, someone_else = uuid.uuid4(), uuid.uuid4()
    service.register_device(db_session, me, "rider", TOKEN_A, "android")
    service.register_device(db_session, me, "rider", TOKEN_B, "ios")
    service.register_device(db_session, someone_else, "rider", "c" * 60, "android")

    with patch("app.platform.notification.fcm.send_multicast", return_value=[]) as send:
        count = service.deliver_to_subject(db_session, me, "rider", PushMessage("t", "b"))

    assert count == 2
    sent_tokens = send.call_args.args[0]
    assert sorted(sent_tokens) == sorted([TOKEN_A, TOKEN_B])


def test_deliver_prunes_tokens_fcm_reports_dead(db_session):
    uid = uuid.uuid4()
    service.register_device(db_session, uid, "customer", TOKEN_A, "android")
    service.register_device(db_session, uid, "customer", TOKEN_B, "android")

    with patch("app.platform.notification.fcm.send_multicast", return_value=[TOKEN_A]):
        service.deliver_to_subject(db_session, uid, "customer", PushMessage("t", "b"))

    remaining = [t for (t,) in db_session.query(DeviceToken.token).filter_by(subject_id=uid)]
    assert remaining == [TOKEN_B]


def test_deliver_with_no_devices_does_not_call_fcm(db_session):
    with patch("app.platform.notification.fcm.send_multicast") as send:
        assert service.deliver_to_subject(db_session, uuid.uuid4(), "rider", PushMessage("t", "b")) == 0
    send.assert_not_called()


def test_deliver_to_wrong_role_sends_nothing(db_session):
    uid = uuid.uuid4()
    service.register_device(db_session, uid, "customer", TOKEN_A, "android")
    with patch("app.platform.notification.fcm.send_multicast") as send:
        assert service.deliver_to_subject(db_session, uid, "rider", PushMessage("t", "b")) == 0
    send.assert_not_called()


def test_dispatch_is_noop_when_firebase_not_configured():
    with patch("app.platform.notification.fcm.is_enabled", return_value=False), patch.object(
        service._executor, "submit"
    ) as submit:
        service.dispatch_push(uuid.uuid4(), "rider", "t", "b")
    submit.assert_not_called()


def test_dispatch_queues_when_configured():
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch.object(
        service._executor, "submit"
    ) as submit:
        service.dispatch_push(uuid.uuid4(), "rider", "t", "b", data={"order_id": uuid.uuid4()})
    submit.assert_called_once()
    message = submit.call_args.args[3]
    assert all(isinstance(v, str) for v in message.data.values())


# ------------------------------------------------------ order notifications

def test_order_copy_covers_every_customer_visible_status():
    from app.modules.food_delivery.service import ORDER_STATUS_TRANSITIONS

    visible = set(ORDER_STATUS_TRANSITIONS) | {s for nxt in ORDER_STATUS_TRANSITIONS.values() for s in nxt}
    missing = visible - set(order_notifications.CUSTOMER_STATUS_COPY)
    assert not missing, f"statuses without push copy: {missing}"


def test_order_notifications_are_noop_without_firebase(db_session):
    class _Order:  # touching any attribute would raise: proves nothing is read
        def __getattr__(self, name):
            raise AssertionError(f"unexpected attribute access: {name}")

    with patch("app.platform.notification.fcm.is_enabled", return_value=False):
        order_notifications.notify_order_progress(db_session, _Order())
        order_notifications.notify_restaurant_new_order(db_session, _Order())
        order_notifications.notify_order_cancelled(db_session, _Order())
        order_notifications.notify_rider_assigned(db_session, _Order())
        order_notifications.notify_rider_low_wallet(db_session, uuid.uuid4())


def test_order_notifications_never_raise_when_push_breaks(db_session):
    class _Order:
        status = "Delivered"
        user_id = uuid.uuid4()
        restaurant_id = uuid.uuid4()
        rider_id = None
        id = uuid.uuid4()

    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push", side_effect=RuntimeError("boom")
    ):
        order_notifications.notify_order_progress(db_session, _Order())  # must not raise


# ---------------------------------------------- hooks fire from real services

def _seed_order(db, status, with_rider=True):
    """Reuse the delivery-status test helpers to build a real order graph."""
    from app.tests.test_delivery_status import (
        _make_address,
        _make_customer,
        _make_order,
        _make_restaurant,
    )
    from app.platform.wallet_payment.models import Rider

    restaurant = _make_restaurant(db)
    customer = _make_customer(db)
    address = _make_address(db, customer)
    rider = None
    if with_rider:
        suffix = uuid.uuid4().hex[:8]
        rider = Rider(
            phone_number=f"+92301{suffix}", name="R", cnic_number=f"cnic-{suffix}",
            approval_status="approved", wallet_balance=50, pending_cash_owed=0,
            is_online=True, country_code="+92", is_active=True,
        )
        db.add(rider)
        db.commit()
        db.refresh(rider)
    order = _make_order(db, restaurant, customer, address, status=status, rider=rider)
    return restaurant, customer, rider, order


def test_delivery_status_change_pushes_to_customer(db_session):
    from app.modules.food_delivery import service as fd_service

    restaurant, customer, rider, order = _seed_order(db_session, "Accepted by Rider")
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push"
    ) as push:
        fd_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Arrived at Restaurant")

    assert push.call_count == 1
    args = push.call_args.args
    assert args[0] == customer.id and args[1] == "customer"
    assert args[2] == "Rider at the restaurant"
    assert push.call_args.kwargs["data"]["order_id"] == str(order.id)


def test_delivered_pushes_customer_and_low_wallet_reminder_to_rider(db_session):
    from app.modules.food_delivery import service as fd_service

    restaurant, customer, rider, order = _seed_order(db_session, "On the Way")
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push"
    ) as push:
        fd_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    targets = [(c.args[0], c.args[1]) for c in push.call_args_list]
    assert (customer.id, "customer") in targets
    assert (rider.id, "rider") in targets  # wallet 50 < reminder threshold 100


def test_delivery_status_change_succeeds_even_if_push_explodes(db_session):
    from app.modules.food_delivery import service as fd_service

    restaurant, customer, rider, order = _seed_order(db_session, "Accepted by Rider")
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push", side_effect=RuntimeError("fcm down")
    ):
        result = fd_service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Arrived at Restaurant"
        )
    assert result["status"] == "Arrived at Restaurant"


def test_admin_cancel_pushes_customer_restaurant_and_rider(db_session):
    from app.modules.admin import service as admin_service

    restaurant, customer, rider, order = _seed_order(db_session, "Rider Assigned")
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push"
    ) as push:
        admin_service.cancel_order(db_session, order.id, "test")

    targets = {(c.args[0], c.args[1]) for c in push.call_args_list}
    assert targets == {
        (customer.id, "customer"),
        (restaurant.id, "restaurant"),
        (rider.id, "rider"),
    }


def test_admin_reassign_pushes_new_rider(db_session):
    from app.modules.admin import service as admin_service

    restaurant, customer, rider, order = _seed_order(db_session, "Ready for Pickup", with_rider=False)
    _, _, new_rider, _ = _seed_order(db_session, "Accepted", with_rider=True)
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push"
    ) as push:
        admin_service.reassign_order_rider(db_session, order.id, new_rider.id)

    assert push.call_count == 1
    assert push.call_args.args[0] == new_rider.id and push.call_args.args[1] == "rider"
    assert push.call_args.kwargs["channel_id"] == "rider_assignments"
