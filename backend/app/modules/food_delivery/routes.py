"""
Phase 4 routes — Menu CRUD (Step 2), availability toggle (Step 3), photo
upload (Step 4), the order dashboard (Step 5) — and Phase 5's customer
endpoints: browse (Step 1), menu view (Step 2), cart CRUD (Step 4).
Restaurant routes require a "restaurant" role
token; the customer browse route requires "customer" — rider/restaurant/
admin tokens get 403 either way, same RBAC pattern as
platform/users/routes.py.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import CurrentUser, require_role
from app.modules.food_delivery import service
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
    OrderStatusUpdateSchema,
    OrderTrackingResponseSchema,
    RestaurantOrderDetailResponseSchema,
    RestaurantOrderSummaryResponseSchema,
)

router = APIRouter(prefix="/restaurants/me/menu-items", tags=["restaurant-menu"])
orders_router = APIRouter(prefix="/restaurants/me/orders", tags=["restaurant-orders"])
# Customer-facing browse (Phase 5, Step 1). Empty prefix + explicit "/restaurants"
# path so the customer and restaurant-facing routes live side by side without
# colliding with the /restaurants/me/* prefixes above.
customer_router = APIRouter(prefix="/restaurants", tags=["customer-restaurants"])
# Phase 7, Step 1: tracking is looked up by order_id directly, not nested
# under a restaurant — separate router, own prefix.
customer_orders_router = APIRouter(prefix="/orders", tags=["customer-orders"])

require_restaurant = require_role(["restaurant"])
require_customer = require_role(["customer"])


@customer_router.get("", response_model=list[CustomerRestaurantResponseSchema])
def browse_restaurants(
    address_id: uuid.UUID | None = None,
    search: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="distance", pattern="^(distance|rating)$"),
    radius_km: float = Query(default=service.DEFAULT_SEARCH_RADIUS_KM, gt=0, le=50),
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 1 — customer browse: active restaurants within radius_km of one
    of the customer's OWN addresses (default/most recent when address_id is
    omitted; another customer's address_id is a 404). Name search +
    distance/rating sort. Location is mandatory (400 without a saved
    address) because this is a delivery app — every result carries its
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
    """Step 2 — customer menu for one restaurant, grouped by category
    (optional case-insensitive ?category=Starters filter). Sold-out items
    are included but flagged is_available=false. Only active restaurants
    resolve — anything else is a 404."""
    return service.get_customer_menu(db, restaurant_id, category)


# --- Phase 5, Step 4: cart CRUD (multi-cart, Redis-backed) ---


@customer_router.get("/{restaurant_id}/cart", response_model=CartSchema)
def view_my_cart(
    restaurant_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 — view THIS customer's cart for THIS restaurant. Multi-cart:
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
    """Step 4 — add an item line to this restaurant's cart. Menu item must
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
    """Step 4 — set a cart line's quantity. The line must already be in
    the cart."""
    return service.update_cart_item(db, current_user.id, restaurant_id, item_id, payload.qty)


@customer_router.delete("/{restaurant_id}/cart/items/{item_id}", response_model=CartSchema)
def remove_cart_item(
    restaurant_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 — remove one line from this restaurant's cart. Removing a
    sold-out line stays possible (no availability re-check)."""
    return service.remove_cart_item(db, current_user.id, restaurant_id, item_id)


@customer_router.delete("/{restaurant_id}/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    restaurant_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 4 — delete this restaurant-specific cart entirely. Other
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
    """Step 5 — checkout price preview for this restaurant's cart, delivered
    to one of the customer's OWN addresses (required ?address_id=; another
    customer's address is a 404). Distance comes from the Google Maps
    Distance Matrix (restaurant -> address), fee = 50 + (km x 20).
    Calculation only: no order placed, cart not cleared."""
    return service.preview_checkout(db, current_user.id, restaurant_id, address_id)


@customer_router.post("/{restaurant_id}/cart/checkout", response_model=PlaceOrderResponseSchema, status_code=status.HTTP_201_CREATED)
def place_my_order(
    restaurant_id: uuid.UUID,
    payload: PlaceOrderSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Step 6 — convert this restaurant's cart into a real order. All prices
    are re-read from the DB and frozen on the order row (commission via the
    Phase 4 helper, rider earning = 100% of delivery fee). The Redis cart
    is cleared only after the DB commit succeeds."""
    return service.place_order(
        db, current_user.id, restaurant_id, payload.address_id, payload.payment_method
    )


@router.get("", response_model=list[MenuItemResponseSchema])
def list_my_menu_items(
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    return service.list_menu_items(db, current_user.id)


@router.post("", response_model=MenuItemResponseSchema, status_code=status.HTTP_201_CREATED)
def create_my_menu_item(
    payload: MenuItemCreateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    return service.create_menu_item(db, current_user.id, payload)


@router.put("/{menu_item_id}", response_model=MenuItemResponseSchema)
def update_my_menu_item(
    menu_item_id: uuid.UUID,
    payload: MenuItemUpdateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    return service.update_menu_item(db, current_user.id, menu_item_id, payload)


@router.delete("/{menu_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_menu_item(
    menu_item_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    service.delete_menu_item(db, current_user.id, menu_item_id)


@router.patch("/{menu_item_id}/availability", response_model=MenuItemResponseSchema)
def set_my_menu_item_availability(
    menu_item_id: uuid.UUID,
    payload: MenuItemAvailabilitySchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    return service.set_menu_item_availability(db, current_user.id, menu_item_id, payload.is_available)


@router.post("/{menu_item_id}/photo", response_model=MenuItemResponseSchema)
async def upload_my_menu_item_photo(
    menu_item_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """
    Step 4 — attach a JPG/PNG photo to one of this restaurant's menu items.
    The file is read with a hard cap (max size + 1 byte) so an oversized
    upload is rejected without being buffered into memory in full.
    Validation + S3 upload live in the service layer.
    """
    data = await file.read(service.MAX_MENU_PHOTO_SIZE_BYTES + 1)
    return service.upload_menu_item_photo(
        db, current_user.id, menu_item_id, data, file.content_type, file.filename
    )


@orders_router.get("", response_model=list[RestaurantOrderSummaryResponseSchema])
def list_my_orders(
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """Step 5 — restaurant order dashboard list. Only this restaurant's
    orders; optional status (?status=preparing) and date range
    (?date_from=2026-01-01&date_to=2026-01-31) filters."""
    return service.list_restaurant_orders(
        db, current_user.id, status, date_from, date_to
    )


@orders_router.get("/{order_id}", response_model=RestaurantOrderDetailResponseSchema)
def get_my_order(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """Step 5 — full order detail (items, customer, delivery address,
    totals). Ownership enforced in the query; other restaurants' orders
    are never visible (404)."""
    return service.get_restaurant_order(db, current_user.id, order_id)


@orders_router.patch("/{order_id}/status", response_model=RestaurantOrderDetailResponseSchema)
def update_my_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdateSchema,
    current_user: CurrentUser = Depends(require_restaurant),
    db: Session = Depends(get_db),
):
    """
    Step 6 — advance one of this restaurant's orders through the state
    machine (Accepted -> Preparing -> Ready for Pickup), one step at a
    time. Invalid/skipped/backward transitions are rejected with 400 and
    leave the order unchanged. "Ready for Pickup" is the trigger point
    for rider assignment, but assignment itself is Phase 6 — this only
    updates the status.
    """
    return service.update_order_status(db, current_user.id, order_id, payload.status)


@customer_orders_router.get("/{order_id}/track", response_model=OrderTrackingResponseSchema)
def track_my_order(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """
    Phase 7, Step 1 — poll-based live tracking for the customer's own
    order. No push notifications (spec Sec 14 exclusion) — the client is
    expected to poll this. Ownership is enforced in the service layer's
    query itself; another customer's order_id returns 404, not 403 (same
    no-leak pattern as the restaurant-side order lookup).
    """
    return service.get_order_tracking(db, current_user.id, order_id)
