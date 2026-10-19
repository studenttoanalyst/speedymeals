"""WebSocket live-tracking authorisation: `auth_failed` frame + close 4003.

The fix under test (Phase 4): the WS handler now accepts the handshake first
and then rejects a bad token or a non-owner with an ORDERED sequence — a JSON
`auth_failed` frame followed by close code 4003. Before the fix it closed
before accepting, which clients only ever see as an opaque HTTP 403 handshake
rejection: indistinguishable from an outage, so clients retried a token that
could never work (the "4003 no-retry" follow-up from RELEASE_AUDIT.md).

The frame carries a deliberately generic detail for every failure mode so the
socket never reveals whether an order id exists.
"""

import json
import uuid

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from app.core import maps_client
from app.core.database import get_db
from app.modules.food_delivery.routes import customer_orders_router
from app.platform.auth.jwt_utils import create_access_token

from app.tests.test_order_tracking import (
    _make_address,
    _make_customer,
    _make_order,
    _make_restaurant,
)


@pytest.fixture(autouse=True)
def _no_network(monkeypatch):
    """No test may touch the Directions API."""
    monkeypatch.setattr(
        maps_client,
        "get_route_details",
        lambda *a, **k: {
            "distance_km": 3.0,
            "duration_mins": 12,
            "eta": None,
            "polyline": None,
        },
    )


@pytest.fixture
def ws_client(db_session):
    app = FastAPI()
    app.include_router(customer_orders_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def _owned_order(db):
    order_customer = _make_customer(db)
    address = _make_address(db, order_customer)
    restaurant = _make_restaurant(db)
    order = _make_order(db, order_customer, restaurant, address)
    return order_customer, order


def _assert_auth_failed_then_4003(ws):
    """The exact wire sequence the client keys its no-retry behaviour on."""
    frame = ws.receive()
    # ASGI messages are named from the app's point of view: a frame the
    # server pushes out is a `websocket.send`.
    assert frame["type"] == "websocket.send"
    payload = json.loads(frame["text"])
    assert payload["event"] == "auth_failed"
    assert isinstance(payload["detail"], str) and payload["detail"]

    close = ws.receive()
    assert close["type"] == "websocket.close"
    assert close["code"] == 4003
    return payload["detail"]


def test_garbage_token_gets_auth_failed_frame_then_4003(ws_client, db_session):
    _, order = _owned_order(db_session)
    with ws_client.websocket_connect(
        f"/orders/{order.id}/track?token=not-a-jwt-at-all"
    ) as ws:
        _assert_auth_failed_then_4003(ws)


def test_wrong_role_token_gets_auth_failed_then_4003(ws_client, db_session):
    """A valid signed token with a non-viewer role is still denied."""
    _, order = _owned_order(db_session)
    stranger = create_access_token(uuid.uuid4(), "restaurant")
    with ws_client.websocket_connect(
        f"/orders/{order.id}/track?token={stranger}"
    ) as ws:
        _assert_auth_failed_then_4003(ws)


def test_non_owner_gets_same_generic_denial(ws_client, db_session):
    """Ownership failure must be indistinguishable from a bad token (no
    order-existence leak): same frame, same detail, same close code."""
    _, order = _owned_order(db_session)
    stranger = _make_customer(db_session)
    stranger_token = create_access_token(stranger.id, "customer")

    _, garbage = None, None
    with ws_client.websocket_connect(
        f"/orders/{order.id}/track?token={stranger_token}"
    ) as ws:
        non_owner_detail = _assert_auth_failed_then_4003(ws)

    with ws_client.websocket_connect(
        f"/orders/{order.id}/track?token=garbage"
    ) as ws:
        garbage_detail = _assert_auth_failed_then_4003(ws)

    assert non_owner_detail == garbage_detail


def test_owner_receives_initial_location_frame(ws_client, db_session):
    """The happy path still works after the accept-first restructure: the owner
    gets the initial `location_update` frame and is NEVER sent auth_failed."""
    owner, order = _owned_order(db_session)
    token = create_access_token(owner.id, "customer")
    with ws_client.websocket_connect(
        f"/orders/{order.id}/track?token={token}"
    ) as ws:
        frame = ws.receive()
        assert frame["type"] == "websocket.send"
        payload = json.loads(frame["text"])
        assert payload["event"] == "location_update"
        assert "data" in payload
    # Exiting the context closes the session; the handler's finally runs.