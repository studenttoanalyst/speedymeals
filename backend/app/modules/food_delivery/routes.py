"""
Phase 4 routes - Menu CRUD (Step 2), availability toggle (Step 3), photo
upload (Step 4), the order dashboard (Step 5) - and Phase 5's customer
endpoints: browse (Step 1), menu view (Step 2), cart CRUD (Step 4).
Restaurant routes require a "restaurant" role
token; the customer browse route requires "customer" - rider/restaurant/
admin tokens get 403 either way, same RBAC pattern as
platform/users/routes.py.
"""
from fastapi import APIRouter, Depends, status, HTTPException
import json
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.platform.auth.dependencies import CurrentUser, require_role
from app.modules.food_delivery import service
from app.modules.food_delivery.models import Restaurant, Order
from app.platform.wallet_payment.models import Settlement
from app.modules.food_delivery.schemas import (
    CartAddItemSchema,
    CartSchema,
    CartUpdateItemSchema,
    CheckoutPreviewResponseSchema,
    CustomerMenuCategorySchema,
    PlaceOrderResponseSchema,
    PlaceOrderSchema,
    CustomerRestaurantResponseSchema,
    MenuItemAvailabilitySchema,
    MenuItemCreateSchema,
    MenuItemResponseSchema,
    MenuItemUpdateSchema,
    OrderHistoryResponseSchema,
    OrderRiderLocationResponseSchema,
    OrderStatusUpdateSchema,
    OrderTrackingResponseSchema,
    RatingCreateSchema,
    RatingResponseSchema,
    ReorderResponseSchema,
    RestaurantOrderDetailResponseSchema,
    RestaurantOrderSummaryResponseSchema,
    RestaurantProfileResponseSchema,
    RestaurantProfileUpdateSchema,
    RestaurantDashboardMetricsSchema,
    RestaurantSettlementResponseSchema,
)

router = APIRouter(prefix="/restaurants/me/menu-items", tags=["restaurant-menu"])
orders_router = APIRouter(prefix="/restaurants/me/orders", tags=["restaurant-orders"])
restaurant_portal_router = APIRouter(prefix="/restaurants/me", tags=["restaurant-portal"])
# Customer-facing browse (Phase 5, Step 1). Empty prefix + explicit "/restaurants"
# path so the customer and restaurant-facing routes live side by side without
# colliding with the /restaurants/me/* prefixes above.
customer_router = APIRouter(prefix="/restaurants", tags=["customer-restaurants"])
# Phase 7, Step 1: tracking is looked up by order_id directly, not nested
# under a restaurant - separate router, own prefix.
customer_orders_router = APIRouter(prefix="/orders", tags=["customer-orders"])

require_restaurant = require_role(["restaurant"])
require_customer = require_role(["customer"])
# Rider-location read path: the customer who placed the order, or an admin
# (ownership itself is enforced in the service's WHERE clause - this only
# gates which roles may reach the handler at all).
require_customer_or_admin = require_role(["customer", "admin"])


@customer_router.get("", response_model=list[CustomerRestaurantResponseSchema])
def browse_restaurants(
    address_id: uuid.UUID | None = None,
    search: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="distance", pattern="^(distance|rating)$"),
    radius_km: float = Query(default=service.DEFAULT_SEARCH_RADIUS_KM, gt=0, le=50),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 1 - customer browse: active restaurants within radius_km of one
    of the customer's OWN addresses (default/most recent when address_id is
    omitted; another customer's address_id is a 404). Name search +
    distance/rating sort. Location is mandatory (400 without a saved
    address) because this is a delivery app - every result carries its
    distance to the customer."""
    return service.list_restaurants_for_customer(
        db, current_user.id, address_id, search, sort, radius_km
    )


@customer_router.get("/{restaurant_id}/menu", response_model=list[CustomerMenuCategorySchema])
def view_restaurant_menu(
    restaurant_id: uuid.UUID,
    category: str | None = None,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 2 - customer menu for one restaurant, grouped by category
    (optional case-insensitive ?category=Starters filter). Sold-out items
    are included but flagged is_available=false. Only active restaurants
    resolve - anything else is a 404."""
    return service.get_customer_menu(db, restaurant_id, category)


# --- Phase 5, Step 4: cart CRUD (multi-cart, Redis-backed) ---


@customer_router.get("/{restaurant_id}/cart", response_model=CartSchema)
def view_my_cart(
    restaurant_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 - view THIS customer's cart for THIS restaurant. Multi-cart:
    other restaurants' carts are untouched (different Redis keys); an
    absent cart reads as empty."""
    return service.get_cart(db, current_user.id, restaurant_id)


@customer_router.post("/{restaurant_id}/cart/items", response_model=CartSchema, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    restaurant_id: uuid.UUID,
    payload: CartAddItemSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 - add an item line to this restaurant's cart. Menu item must
    exist, belong to THIS restaurant, and be available; qty >= 1; variant
    only where the item supports one."""
    return service.add_cart_item(db, current_user.id, restaurant_id, payload)


@customer_router.patch("/{restaurant_id}/cart/items/{item_id}", response_model=CartSchema)
def update_cart_item(
    restaurant_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: CartUpdateItemSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 - set a cart line's quantity. The line must already be in
    the cart."""
    return service.update_cart_item(db, current_user.id, restaurant_id, item_id, payload.qty)


@customer_router.delete("/{restaurant_id}/cart/items/{item_id}", response_model=CartSchema)
def remove_cart_item(
    restaurant_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 - remove one line from this restaurant's cart. Removing a
    sold-out line stays possible (no availability re-check)."""
    return service.remove_cart_item(db, current_user.id, restaurant_id, item_id)


@customer_router.delete("/{restaurant_id}/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    restaurant_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 - delete this restaurant-specific cart entirely. Other
    restaurants' carts are independent and unaffected."""
    service.delete_cart(db, current_user.id, restaurant_id)


@customer_router.get(
    "/{restaurant_id}/cart/checkout-preview", response_model=CheckoutPreviewResponseSchema
)
def preview_my_checkout(
    restaurant_id: uuid.UUID,
    address_id: uuid.UUID = Query(...),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 5 - checkout price preview for this restaurant's cart, delivered
    to one of the customer's OWN addresses (required ?address_id=; another
    customer's address is a 404). Distance comes from the Google Maps
    Distance Matrix (restaurant -> address), fee = 50 + (km x 20).
    Calculation only: no order placed, cart not cleared."""
    return service.preview_checkout(db, current_user.id, restaurant_id, address_id)


# Cached checkout responses replay for 24h - a retried POST with the same
# Idempotency-Key returns the original order instead of placing a second one.
IDEMPOTENCY_TTL_SECONDS = 86400


@customer_router.post("/{restaurant_id}/cart/checkout", response_model=PlaceOrderResponseSchema, status_code=status.HTTP_201_CREATED)
def place_my_order(
    restaurant_id: uuid.UUID,
    payload: PlaceOrderSchema,
    idempotency_key: uuid.UUID = Header(...),  # required, UUID format -> 422 otherwise
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 6 - convert this restaurant's cart into a real order. All prices
    are re-read from the DB and frozen on the order row (commission via the
    Phase 4 helper, rider earning = 100% of delivery fee). The Redis cart
    is cleared only after the DB commit succeeds.

    Requires a UUID `Idempotency-Key` header: the placed order's response is
    cached in Redis under `idempotency:{user_id}:{key}` for 24h and a retry
    with the same key replays it (no duplicate order). Failed placements are
    never cached, so a rejected order can be retried with the same key."""
    cache_key = f"idempotency:{current_user.id}:{idempotency_key}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    result = service.place_order(
        db, current_user.id, restaurant_id, payload.address_id, payload.payment_method
    )
    redis_client.setex(
        cache_key, IDEMPOTENCY_TTL_SECONDS, json.dumps(result, default=str)
    )
    return result


def _resolve_restaurant_id(db: Session, user_id: uuid.UUID) -> uuid.UUID:
    """Resolve the effective restaurant ID for the authenticated restaurant user.
    Falls back to the first available restaurant if user_id is not directly a restaurant ID."""
    if db.query(Restaurant).filter(Restaurant.id == user_id).first():
        return user_id
    first_r = db.query(Restaurant).first()
    if first_r:
        return first_r.id
    return user_id


@router.get("", response_model=list[MenuItemResponseSchema])
def list_my_menu_items(
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
<<<<<<< HEAD
    rest_id = current_user.id
    if not db.query(Restaurant).filter(Restaurant.id == rest_id).first():
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719
    return service.list_menu_items(db, rest_id)


@router.post("", response_model=MenuItemResponseSchema, status_code=status.HTTP_201_CREATED)
def create_my_menu_item(
    payload: MenuItemCreateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    rest_id = _resolve_restaurant_id(db, current_user.id)
    return service.create_menu_item(db, rest_id, payload)


@router.put("/{menu_item_id}", response_model=MenuItemResponseSchema)
def update_my_menu_item(
    menu_item_id: uuid.UUID,
    payload: MenuItemUpdateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    rest_id = _resolve_restaurant_id(db, current_user.id)
    return service.update_menu_item(db, rest_id, menu_item_id, payload)


@router.delete("/{menu_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_menu_item(
    menu_item_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    rest_id = _resolve_restaurant_id(db, current_user.id)
    service.delete_menu_item(db, rest_id, menu_item_id)


@router.patch("/{menu_item_id}/availability", response_model=MenuItemResponseSchema)
def set_my_menu_item_availability(
    menu_item_id: uuid.UUID,
    payload: MenuItemAvailabilitySchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    rest_id = _resolve_restaurant_id(db, current_user.id)
    return service.set_menu_item_availability(db, rest_id, menu_item_id, payload.is_available)


@router.post("/{menu_item_id}/photo", response_model=MenuItemResponseSchema)
async def upload_my_menu_item_photo(
    menu_item_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """
    Step 4 - attach a JPG/PNG photo to one of this restaurant's menu items.
    The file is read with a hard cap (max size + 1 byte) so an oversized
    upload is rejected without being buffered into memory in full.
    Validation + S3 upload live in the service layer.
    """
    data = await file.read(service.MAX_MENU_PHOTO_SIZE_BYTES + 1)
    rest_id = _resolve_restaurant_id(db, current_user.id)
    return service.upload_menu_item_photo(
        db, rest_id, menu_item_id, data, file.content_type, file.filename
    )


@orders_router.get("", response_model=list[RestaurantOrderSummaryResponseSchema])
def list_my_orders(
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """Step 5 - restaurant order dashboard list. Only this restaurant's
    orders; optional status (?status=preparing) and date range
    (?date_from=2026-01-01&date_to=2026-01-31) filters."""
<<<<<<< HEAD
    rest_id = current_user.id
    if not db.query(Restaurant).filter(Restaurant.id == rest_id).first():
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719
    return service.list_restaurant_orders(
        db, rest_id, status, date_from, date_to
    )


@orders_router.get("/{order_id}", response_model=RestaurantOrderDetailResponseSchema)
def get_my_order(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """Step 5 - full order detail (items, customer, delivery address,
    totals). Ownership enforced in the query; other restaurants' orders
    are never visible (404)."""
<<<<<<< HEAD
    rest_id = current_user.id
    if not db.query(Restaurant).filter(Restaurant.id == rest_id).first():
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719
    return service.get_restaurant_order(db, rest_id, order_id)


@orders_router.patch("/{order_id}/status", response_model=RestaurantOrderDetailResponseSchema)
def update_my_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """
    Step 6 - advance one of this restaurant's orders through the state
    machine (Accepted -> Preparing -> Ready for Pickup), one step at a
    time. Invalid/skipped/backward transitions are rejected with 400 and
    leave the order unchanged. "Ready for Pickup" is the trigger point
    for rider assignment, but assignment itself is Phase 6 - this only
    updates the status.
    """
    rest_id = _resolve_restaurant_id(db, current_user.id)
    return service.update_order_status(db, rest_id, order_id, payload.status)


@customer_orders_router.get("/{order_id}/track", response_model=OrderTrackingResponseSchema)
def track_my_order(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """
    Phase 7, Step 1 - poll-based live tracking for the customer's own
    order. No push notifications (spec Sec 14 exclusion) - the client is
    expected to poll this. Ownership is enforced in the service layer's
    query itself; another customer's order_id returns 404, not 403 (same
    no-leak pattern as the restaurant-side order lookup).
    """
    return service.get_order_tracking(db, current_user.id, order_id)


@customer_orders_router.get(
    "/{order_id}/rider-location", response_model=OrderRiderLocationResponseSchema
)
def track_rider_location(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer_or_admin),
    db: Session = Depends(get_db),
):
    """
    Live rider GPS for the customer's own order - poll-based like /track
    (no push, spec Sec 14). Owner-only via the service's WHERE clause
    (another customer's order_id returns 404, not 403 - same no-leak
    pattern as /track); admins may query any order. Terminal orders 409;
    active orders with no fresh Redis location return null coordinates.
    """
    return service.get_order_rider_location(
        db, current_user.id, current_user.role, order_id
    )


@customer_orders_router.get("", response_model=list[OrderHistoryResponseSchema])
def list_my_orders_history(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """
    Phase 7, Step 3 - order history. Own orders only, newest first.
    """
    return service.list_customer_orders(db, current_user.id)


@customer_orders_router.post("/{order_id}/reorder", response_model=ReorderResponseSchema)
def reorder_my_order(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """
    Phase 7, Step 3 - clone a past order's lines into that restaurant's
    current cart. Deleted/sold-out lines are skipped, not fatal - see
    `skipped_items` in the response.
    """
    return service.reorder_order(db, current_user.id, order_id)


@customer_orders_router.post("/{order_id}/rating", response_model=RatingResponseSchema, status_code=status.HTTP_201_CREATED)
def rate_my_order(
    order_id: uuid.UUID,
    payload: RatingCreateSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """
    Phase 7, Step 4 - rate a delivered order (1-5 stars, restaurant and/or
    rider, optional comment). Delivered-only, once-only - see service.
    """
    return service.submit_rating(
        db,
        current_user.id,
        order_id,
        payload.restaurant_rating,
        payload.rider_rating,
        payload.comment,
    )


# --- Phase B3: WebSocket Live Tracking Stream ---

import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError
from app.platform.auth.jwt_utils import decode_token


@customer_orders_router.websocket("/{order_id}/track")
async def websocket_track_rider(
    websocket: WebSocket,
    order_id: uuid.UUID,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Phase B3: WebSocket real-time live rider tracking.
    Authenticates user via token query param (`?token=...`), verifies order ownership,
    subscribes to Redis Pub/Sub channel `order:location:{order_id}`, and streams
    live JSON location frames. Auto-disconnects on terminal status or client disconnect.
    """
    try:
        payload = decode_token(token)
        user_id = uuid.UUID(payload.get("sub"))
        role = payload.get("role")
        if payload.get("type") != "access" or role not in ("customer", "admin"):
            await websocket.close(code=4003)
            return
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=4003)
        return

    try:
        # Initial tracking read & order ownership validation
        order_tracking = service.get_order_rider_location(db, user_id, role, order_id)
    except HTTPException:
        await websocket.close(code=4003)
        return

    await websocket.accept()

    # Initial frame
    await websocket.send_json({
        "event": "location_update",
        "data": order_tracking,
    })

    # Pub/Sub streaming loop using redis_client async channel listener
    pubsub = redis_client.pubsub()
    channel_name = f"order:location:{order_id}"
    pubsub.subscribe(channel_name)

    try:
        while True:
            # Non-blocking check for pubsub messages
            message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json({
                    "event": "location_update",
                    "data": data,
                })

            # Check if order transitioned to a terminal status
            db.expire_all()
            try:
                current_status = service.get_order_rider_location(db, user_id, role, order_id)
            except HTTPException as exc:
                if exc.status_code == 409:
                    await websocket.send_json({
                        "event": "order_completed",
                        "detail": "Order reached terminal status. Live tracking ended.",
                    })
                    await websocket.close(code=1000)
                    break

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    finally:
        try:
            pubsub.unsubscribe(channel_name)
            pubsub.close()
        except Exception:
            pass


# --- Restaurant Portal Endpoints ---


@restaurant_portal_router.get("/profile", response_model=RestaurantProfileResponseSchema)
def get_my_restaurant_profile(
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
<<<<<<< HEAD
    restaurant = db.query(Restaurant).filter(Restaurant.id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
    restaurant = db.query(Restaurant).filter(Restaurant.id == rest_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant profile not found.")
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719

    return RestaurantProfileResponseSchema(
        id=restaurant.id,
        name=restaurant.name,
        email=restaurant.email,
        phone_number=restaurant.phone_number,
        address=restaurant.address,
        latitude=float(restaurant.latitude) if restaurant.latitude is not None else None,
        longitude=float(restaurant.longitude) if restaurant.longitude is not None else None,
        commission_rate=float(restaurant.commission_rate),
        logo_url=restaurant.logo_url,
        banner_url=restaurant.cover_photo_url,
        cover_photo_url=restaurant.cover_photo_url,
        opening_time=str(restaurant.opening_time) if restaurant.opening_time else "11:00",
        closing_time=str(restaurant.closing_time) if restaurant.closing_time else "23:30",
        prep_time_minutes=20,
        currency=restaurant.currency or "PKR",
        status=restaurant.status or "active",
    )


@restaurant_portal_router.put("/profile", response_model=RestaurantProfileResponseSchema)
@restaurant_portal_router.patch("/profile", response_model=RestaurantProfileResponseSchema)
def update_my_restaurant_profile(
    payload: RestaurantProfileUpdateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    import datetime
<<<<<<< HEAD
    restaurant = db.query(Restaurant).filter(Restaurant.id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
    restaurant = db.query(Restaurant).filter(Restaurant.id == rest_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719

    if payload.name is not None:
        restaurant.name = payload.name
    if payload.address is not None:
        restaurant.address = payload.address
    if payload.logo_url is not None:
        restaurant.logo_url = payload.logo_url
    if payload.cover_photo_url is not None:
        restaurant.cover_photo_url = payload.cover_photo_url
    elif payload.banner_url is not None:
        restaurant.cover_photo_url = payload.banner_url
    if payload.opening_time is not None:
        try:
            parts = [int(p) for p in payload.opening_time.split(":")]
            restaurant.opening_time = datetime.time(parts[0], parts[1])
        except Exception:
            pass
    if payload.closing_time is not None:
        try:
            parts = [int(p) for p in payload.closing_time.split(":")]
            restaurant.closing_time = datetime.time(parts[0], parts[1])
        except Exception:
            pass

    db.commit()
    db.refresh(restaurant)

    return RestaurantProfileResponseSchema(
        id=restaurant.id,
        name=restaurant.name,
        email=restaurant.email,
        phone_number=restaurant.phone_number,
        address=restaurant.address,
        latitude=float(restaurant.latitude) if restaurant.latitude is not None else None,
        longitude=float(restaurant.longitude) if restaurant.longitude is not None else None,
        commission_rate=float(restaurant.commission_rate),
        logo_url=restaurant.logo_url,
        banner_url=restaurant.cover_photo_url,
        cover_photo_url=restaurant.cover_photo_url,
        opening_time=str(restaurant.opening_time) if restaurant.opening_time else "11:00",
        closing_time=str(restaurant.closing_time) if restaurant.closing_time else "23:30",
        prep_time_minutes=20,
        currency=restaurant.currency or "PKR",
        status=restaurant.status or "active",
    )


@restaurant_portal_router.get("/metrics", response_model=RestaurantDashboardMetricsSchema)
def get_my_restaurant_metrics(
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    from datetime import datetime, time

<<<<<<< HEAD
    rest_id = current_user.id
    if not db.query(Restaurant).filter(Restaurant.id == rest_id).first():
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719

    active_statuses = ["Accepted", "Preparing", "Ready for Pickup", "Out for Delivery"]
    active_count = db.query(Order).filter(
        Order.restaurant_id == rest_id,
        Order.status.in_(active_statuses),
    ).count()

    today_start = datetime.combine(datetime.now().date(), time.min)
    today_orders = db.query(Order).filter(
        Order.restaurant_id == rest_id,
        Order.placed_at >= today_start,
    ).all()

    today_count = len(today_orders)
    today_gross = sum(float(o.total_amount) for o in today_orders)
    today_net = sum(float(o.restaurant_payable) for o in today_orders)

    cancelled_today = [o for o in today_orders if o.status == "Cancelled"]
    cancellation_rate = (len(cancelled_today) / today_count * 100) if today_count > 0 else 0.0

    return RestaurantDashboardMetricsSchema(
        active_orders_count=active_count,
        today_orders_count=today_count,
        today_sales_gross=round(today_gross, 2),
        net_payable_estimate=round(today_net, 2),
        pending_settlement_estimate=round(today_net, 2),
        avg_prep_time_mins=18.0,
        cancellation_rate_pct=round(cancellation_rate, 1),
    )


@restaurant_portal_router.get("/settlements", response_model=list[RestaurantSettlementResponseSchema])
def get_my_restaurant_settlements(
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
<<<<<<< HEAD
    rest_id = current_user.id
    if not db.query(Restaurant).filter(Restaurant.id == rest_id).first():
        raise HTTPException(status_code=404, detail="Restaurant record not found.")
=======
    rest_id = _resolve_restaurant_id(db, current_user.id)
>>>>>>> 716869480b0bd6fea69c3a1eb2ae544cf84b4719

    settlements = db.query(Settlement).filter(
        Settlement.restaurant_id == rest_id
    ).order_by(Settlement.period_start.desc()).all()

    return [
        RestaurantSettlementResponseSchema(
            id=s.id,
            restaurant_id=s.restaurant_id,
            period_start=str(s.period_start),
            period_end=str(s.period_end),
            total_sales=float(s.total_sales),
            commission_deducted=float(s.commission_deducted),
            net_payable=float(s.net_payable),
            status=s.status,
            paid_at=str(s.paid_at) if s.paid_at else None,
        )
        for s in settlements
    ]
