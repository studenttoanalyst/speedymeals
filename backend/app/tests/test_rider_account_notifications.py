"""Admin changes to a rider push a `rider_account` event so the rider app refreshes."""
import uuid

import pytest

from app.modules.admin import rider_notifications


@pytest.fixture
def sent(monkeypatch):
    calls = []
    monkeypatch.setattr(
        rider_notifications,
        "dispatch_push",
        lambda subject_id, role, title, body, data=None, **_: calls.append((subject_id, role, title, data)),
    )
    return calls


def test_approval_push_carries_refresh_event(sent):
    rider_id = uuid.uuid4()
    rider_notifications.notify_rider_approval(rider_id, "approved")
    assert sent == [(rider_id, "rider", "You're approved", {"type": "rider_account", "change": "approval"})]


def test_kit_push_reflects_completion(sent):
    rider_id = uuid.uuid4()
    rider_notifications.notify_rider_kit(rider_id, True)
    rider_notifications.notify_rider_kit(rider_id, False)
    assert [title for *_, title, _ in sent] == ["Kit verified", "Kit updated"]
    assert all(data["type"] == "rider_account" for *_, data in sent)


def test_status_push_for_online_and_suspension(sent):
    rider_id = uuid.uuid4()
    rider_notifications.notify_rider_status(rider_id, None, True)
    rider_notifications.notify_rider_status(rider_id, False, False)
    # Suspension implies offline; only one message for it.
    assert [title for *_, title, _ in sent] == ["You're online", "Account suspended"]


def test_push_failure_never_raises(monkeypatch):
    def boom(*_, **__):
        raise RuntimeError("fcm down")

    monkeypatch.setattr(rider_notifications, "dispatch_push", boom)
    rider_notifications.notify_rider_kit(uuid.uuid4(), True)  # must not raise
