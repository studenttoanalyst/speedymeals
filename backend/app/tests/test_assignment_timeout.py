"""
Rider assignment timeout + retry sweeper, and restaurant order rejection.
Push is mocked; Redis (rider locations, excluded-riders set) is real, like the
other rider-assignment tests.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.core import assignment_sweeper
from app.core.redis_client import redis_client
from app.modules.food_delivery import service
from app.tests.test_delivery_status import (
    _make_address,
    _make_customer,
    _make_order,
    _make_rider,
    _make_restaurant,
)

OFFER = "Rider Assigned"


@pytest.fixture
def world(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    yield db_session, restaurant, customer, address


def _stale(order, db, seconds=120):
    order.rider_assigned_at = datetime.now(timezone.utc) - timedelta(seconds=seconds)
    db.commit()


def _cleanup(order_id):
    redis_client.delete(service._excluded_riders_key(order_id))


def _offer(db, restaurant, customer, address, rider, age=0):
    order = _make_order(db, restaurant, customer, address, status=OFFER, rider=rider)
    order.rider_assigned_at = datetime.now(timezone.utc) - timedelta(seconds=age)
    db.commit()
    return order


def test_ignored_offer_is_reassigned_to_next_rider(world):
    db, restaurant, customer, address = world
    ignoring = _make_rider(db)
    other = _make_rider(db, lat=31.540, lng=74.370)
    order = _offer(db, restaurant, customer, address, ignoring, age=120)
    try:
        with patch("app.modules.food_delivery.order_notifications.notify_rider_offer_expired") as expired, patch(
            "app.modules.food_delivery.order_notifications.notify_order_progress"
        ) as progress:
            result = service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.rider_id == other.id and order.status == OFFER
        assert (datetime.now(timezone.utc) - order.rider_assigned_at).total_seconds() < 30
        assert result["expired"] == 1 and result["assigned"] == 1
        expired.assert_called_once_with(ignoring.id, order.id)
        progress.assert_called_once()
        assert ignoring.id in service._get_excluded_riders(order.id)
    finally:
        _cleanup(order.id)


def test_fresh_offer_is_left_alone(world):
    db, restaurant, customer, address = world
    rider = _make_rider(db)
    _make_rider(db, lat=31.540, lng=74.370)
    order = _offer(db, restaurant, customer, address, rider, age=5)
    result = service.expire_stale_rider_assignments(db, timeout_seconds=60)
    db.refresh(order)
    assert order.rider_id == rider.id and result["expired"] == 0


def test_no_other_rider_leaves_order_unassigned_then_retries(world):
    db, restaurant, customer, address = world
    ignoring = _make_rider(db)
    order = _offer(db, restaurant, customer, address, ignoring, age=120)
    try:
        service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.status == "Rejected" and order.rider_id is None

        # Ignoring rider is excluded. A new rider comes online: next sweep offers it.
        fresh = _make_rider(db, lat=31.540, lng=74.370)
        result = service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.rider_id == fresh.id and order.status == OFFER
        assert result["assigned"] == 1
    finally:
        _cleanup(order.id)


def test_everyone_passed_restarts_the_cycle_instead_of_deadlocking(world):
    db, restaurant, customer, address = world
    only_rider = _make_rider(db)
    order = _offer(db, restaurant, customer, address, only_rider, age=120)
    try:
        service.expire_stale_rider_assignments(db, timeout_seconds=60)  # expires, nobody else
        db.refresh(order)
        assert order.rider_id is None

        # Within the cooldown the rider who ignored it is NOT re-offered.
        service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.rider_id is None

        # After a full timeout window the cycle restarts (clear), then re-offers.
        _stale(order, db)
        service.expire_stale_rider_assignments(db, timeout_seconds=60)
        service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.rider_id == only_rider.id and order.status == OFFER
    finally:
        _cleanup(order.id)


def test_ready_order_without_rider_is_picked_up_when_a_rider_appears(world):
    db, restaurant, customer, address = world
    order = _make_order(db, restaurant, customer, address, status="Ready for Pickup", rider=None)
    try:
        service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.rider_id is None and order.status == "Ready for Pickup"

        rider = _make_rider(db)
        service.expire_stale_rider_assignments(db, timeout_seconds=60)
        db.refresh(order)
        assert order.rider_id == rider.id and order.status == OFFER
    finally:
        _cleanup(order.id)


def test_accepted_or_cancelled_orders_are_never_touched(world):
    db, restaurant, customer, address = world
    rider = _make_rider(db)
    accepted = _make_order(db, restaurant, customer, address, status="Accepted by Rider", rider=rider)
    cancelled = _make_order(db, restaurant, customer, address, status="Cancelled", rider=None)
    result = service.expire_stale_rider_assignments(db, timeout_seconds=0)
    db.refresh(accepted)
    db.refresh(cancelled)
    assert accepted.status == "Accepted by Rider" and accepted.rider_id == rider.id
    assert cancelled.status == "Cancelled" and cancelled.rider_id is None
    assert result == {"expired": 0, "assigned": 0, "checked": 0}


def test_rider_rejection_is_remembered_across_reoffers(world):
    db, restaurant, customer, address = world
    first = _make_rider(db)
    second = _make_rider(db, lat=31.540, lng=74.370)
    order = _offer(db, restaurant, customer, address, first)
    try:
        service.rider_respond_to_assignment(db, first.id, order.id, "reject")
        db.refresh(order)
        assert order.rider_id == second.id
        assert first.id in service._get_excluded_riders(order.id)
        assert order.rider_assigned_at is not None
    finally:
        _cleanup(order.id)


def test_sweep_once_skips_when_lock_held():
    with patch.object(assignment_sweeper.redis_client, "set", return_value=False), patch(
        "app.modules.food_delivery.service.expire_stale_rider_assignments"
    ) as sweep:
        assert assignment_sweeper.sweep_once() is None
    sweep.assert_not_called()


# ------------------------------------------------ restaurant rejects an order

def test_restaurant_can_reject_a_new_order(world):
    db, restaurant, customer, address = world
    order = _make_order(db, restaurant, customer, address, status="Accepted", rider=None)
    with patch("app.platform.notification.fcm.is_enabled", return_value=True), patch(
        "app.modules.food_delivery.order_notifications.dispatch_push"
    ) as push:
        service.reject_order_by_restaurant(db, restaurant.id, order.id, "Kitchen at maximum capacity")
    db.refresh(order)
    assert order.status == "Cancelled"
    assert order.cancelled_by == "restaurant"
    assert order.cancellation_reason == "Kitchen at maximum capacity"
    assert push.call_args.args[:2] == (customer.id, "customer")
    assert push.call_args.args[2] == "Order cancelled"


@pytest.mark.parametrize("status", ["Preparing", "Ready for Pickup", "Rider Assigned", "Delivered"])
def test_restaurant_cannot_reject_after_cooking_started(world, status):
    db, restaurant, customer, address = world
    order = _make_order(db, restaurant, customer, address, status=status, rider=None)
    with pytest.raises(HTTPException) as exc:
        service.reject_order_by_restaurant(db, restaurant.id, order.id, "too late")
    assert exc.value.status_code == 400
    db.refresh(order)
    assert order.status == status


def test_restaurant_cannot_reject_another_restaurants_order(world):
    db, restaurant, customer, address = world
    other = _make_restaurant(db)
    order = _make_order(db, restaurant, customer, address, status="Accepted", rider=None)
    with pytest.raises(HTTPException) as exc:
        service.reject_order_by_restaurant(db, other.id, order.id, "not mine")
    assert exc.value.status_code == 404
