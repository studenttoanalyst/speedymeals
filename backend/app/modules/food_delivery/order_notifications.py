"""
Order-lifecycle push notifications (customer, rider, restaurant).

Every public function here:
  - must be called AFTER the business change has been committed,
  - returns immediately when Firebase is not configured (zero queries),
  - swallows its own errors: a push problem must never break or roll back an
    order, so the order flow cannot fail because of notifications.
"""
import logging
import uuid

from sqlalchemy.orm import Session

from app.modules.food_delivery.models import Order, Restaurant
from app.platform.notification import fcm
from app.platform.notification.service import dispatch_push
from app.platform.wallet_payment.models import Rider
from app.platform.wallet_payment.service import WALLET_REMINDER_THRESHOLD

logger = logging.getLogger(__name__)

# status -> (title, body template). {r} = restaurant name.
CUSTOMER_STATUS_COPY: dict[str, tuple[str, str]] = {
    "Accepted": ("Order confirmed", "{r} accepted your order."),
    "Preparing": ("Preparing your food", "{r} is cooking your order now."),
    "Ready for Pickup": ("Ready for pickup", "Your {r} order is ready for a rider."),
    "Rider Assigned": ("Rider assigned", "A rider is being assigned to your {r} order."),
    "Rejected": ("Finding another rider", "We are reassigning your {r} order to a new rider."),
    "Accepted by Rider": ("Rider on the way", "Your rider is heading to {r}."),
    "Arrived at Restaurant": ("Rider at the restaurant", "Your rider has arrived at {r}."),
    "Picked Up": ("Order picked up", "Your {r} order has been picked up."),
    "On the Way": ("On the way", "Your {r} order is on its way to you."),
    "Delivered": ("Order delivered", "Enjoy your meal from {r}!"),
    "Cancelled": ("Order cancelled", "Your {r} order was cancelled."),
}


def _restaurant_name(db: Session, restaurant_id: uuid.UUID) -> str:
    name = db.query(Restaurant.name).filter(Restaurant.id == restaurant_id).scalar()
    return name or "the restaurant"


def _notify_customer(db: Session, order: Order) -> None:
    copy = CUSTOMER_STATUS_COPY.get(order.status)
    if copy is None:
        return
    title, body = copy
    dispatch_push(
        order.user_id,
        "customer",
        title,
        body.format(r=_restaurant_name(db, order.restaurant_id)),
        data={"type": "order_status", "order_id": str(order.id), "status": order.status},
    )


def _notify_rider_assigned(db: Session, order: Order) -> None:
    if order.rider_id is None:
        return
    dispatch_push(
        order.rider_id,
        "rider",
        "New delivery request",
        f"Pickup from {_restaurant_name(db, order.restaurant_id)}. Open the app to accept.",
        data={"type": "rider_assignment", "order_id": str(order.id), "status": order.status},
        channel_id="rider_assignments",
    )


def notify_order_progress(db: Session, order: Order) -> None:
    """Push for the order's CURRENT status: customer always, rider if just assigned."""
    if not fcm.is_enabled():
        return
    try:
        _notify_customer(db, order)
        if order.status == "Rider Assigned":
            _notify_rider_assigned(db, order)
    except Exception:  # noqa: BLE001
        logger.exception("notify_order_progress failed for order %s", getattr(order, "id", "?"))


def notify_rider_assigned(db: Session, order: Order) -> None:
    """Admin manual reassignment: tell the newly assigned rider."""
    if not fcm.is_enabled():
        return
    try:
        _notify_rider_assigned(db, order)
    except Exception:  # noqa: BLE001
        logger.exception("notify_rider_assigned failed for order %s", getattr(order, "id", "?"))


def notify_restaurant_new_order(db: Session, order: Order) -> None:
    """New order placed: alert the restaurant portal (sound handled client-side)."""
    if not fcm.is_enabled():
        return
    try:
        dispatch_push(
            order.restaurant_id,
            "restaurant",
            "New order received",
            f"Order #{str(order.id)[:8]} - Rs. {order.total_amount}. Open the dashboard to accept.",
            data={"type": "new_order", "order_id": str(order.id)},
            click_path="/restaurant/orders",
        )
    except Exception:  # noqa: BLE001
        logger.exception("notify_restaurant_new_order failed for order %s", getattr(order, "id", "?"))


def notify_order_cancelled(db: Session, order: Order) -> None:
    """Admin cancelled an order: customer, restaurant and (if any) rider."""
    if not fcm.is_enabled():
        return
    try:
        _notify_customer(db, order)
        dispatch_push(
            order.restaurant_id,
            "restaurant",
            "Order cancelled",
            f"Order #{str(order.id)[:8]} was cancelled by support.",
            data={"type": "order_cancelled", "order_id": str(order.id)},
            click_path="/restaurant/orders",
        )
        if order.rider_id is not None:
            dispatch_push(
                order.rider_id,
                "rider",
                "Delivery cancelled",
                "This order was cancelled. You do not need to deliver it.",
                data={"type": "order_cancelled", "order_id": str(order.id)},
                channel_id="rider_assignments",
            )
    except Exception:  # noqa: BLE001
        logger.exception("notify_order_cancelled failed for order %s", getattr(order, "id", "?"))


def notify_rider_low_wallet(db: Session, rider_id: uuid.UUID) -> None:
    """After a delivery: remind the rider to recharge when balance is low."""
    if not fcm.is_enabled():
        return
    try:
        balance = db.query(Rider.wallet_balance).filter(Rider.id == rider_id).scalar()
        if balance is None or float(balance) >= WALLET_REMINDER_THRESHOLD:
            return
        dispatch_push(
            rider_id,
            "rider",
            "Low wallet balance",
            f"Your balance is Rs. {float(balance):.0f}. Recharge to keep receiving orders.",
            data={"type": "wallet_low"},
        )
    except Exception:  # noqa: BLE001
        logger.exception("notify_rider_low_wallet failed for rider %s", rider_id)


def notify_rider_offer_expired(rider_id: uuid.UUID, order_id: uuid.UUID) -> None:
    """The rider did not answer in time; the order was offered to someone else."""
    if not fcm.is_enabled():
        return
    try:
        dispatch_push(
            rider_id,
            "rider",
            "Delivery request expired",
            "You did not respond in time, so the order was offered to another rider.",
            data={"type": "rider_offer_expired", "order_id": str(order_id)},
            channel_id="rider_assignments",
        )
    except Exception:  # noqa: BLE001
        logger.exception("notify_rider_offer_expired failed for order %s", order_id)
