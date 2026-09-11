"""
Food-delivery business logic — Phase 4 (Menu CRUD, availability toggle,
photo upload, restaurant order dashboard + status machine, commission
helper) and Phase 5 (Step 1: customer restaurant browse).

Every function takes the authenticated restaurant_id from CurrentUser, never
trusts an id from the request path for "whose menu is this" — same
ownership pattern as platform/users/service.py's addresses.
"""
import math
import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core import maps_client, storage
from app.core.redis_client import redis_client
from app.modules.food_delivery.models import MenuItem, Order, OrderItem, Rating, Restaurant
from app.modules.food_delivery.schemas import (
    CartAddItemSchema,
    CartItemSchema,
    CartSchema,
    MenuItemCreateSchema,
    MenuItemUpdateSchema,
)
from app.platform.users.models import Address, User

# Step 4 — menu photo upload limits (5 MB; JPG/PNG only, spec Sec 9 Step 5)
MAX_MENU_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_MENU_PHOTO_CONTENT_TYPES = {"image/jpeg", "image/png"}
ALLOWED_MENU_PHOTO_EXTENSIONS = {"jpg", "jpeg", "png"}


def list_menu_items(db: Session, restaurant_id: uuid.UUID) -> list[MenuItem]:
    return db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()


def _get_owned_menu_item(db: Session, restaurant_id: uuid.UUID, menu_item_id: uuid.UUID) -> MenuItem:
    """Shared lookup for update/delete/toggle — 404s (not 403) if the item
    doesn't belong to this restaurant, so we don't leak whether the id
    exists at all under someone else's account."""
    item = (
        db.query(MenuItem)
        .filter(MenuItem.id == menu_item_id, MenuItem.restaurant_id == restaurant_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    return item


def create_menu_item(db: Session, restaurant_id: uuid.UUID, payload: MenuItemCreateSchema) -> MenuItem:
    item = MenuItem(restaurant_id=restaurant_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_menu_item(
    db: Session, restaurant_id: uuid.UUID, menu_item_id: uuid.UUID, payload: MenuItemUpdateSchema
) -> MenuItem:
    item = _get_owned_menu_item(db, restaurant_id, menu_item_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


def delete_menu_item(db: Session, restaurant_id: uuid.UUID, menu_item_id: uuid.UUID) -> None:
    item = _get_owned_menu_item(db, restaurant_id, menu_item_id)
    db.delete(item)
    db.commit()


def set_menu_item_availability(
    db: Session, restaurant_id: uuid.UUID, menu_item_id: uuid.UUID, is_available: bool
) -> MenuItem:
    """Step 3 — dedicated toggle, separate from update_menu_item so a
    counter-staff "mark sold out" tap doesn't need the full update payload."""
    item = _get_owned_menu_item(db, restaurant_id, menu_item_id)
    item.is_available = is_available
    db.commit()
    db.refresh(item)
    return item


# --- Step 4: menu photo upload ---


def _validate_menu_photo(data: bytes, content_type: str | None, filename: str | None) -> str:
    """
    Server-side validation for an uploaded menu photo. Returns the canonical
    file extension for the S3 key. Rejects: wrong content type, wrong file
    extension, size over the 5 MB cap, and files whose magic bytes don't
    match a real JPG/PNG (content type from the client is not trustworthy).
    """
    if len(data) > MAX_MENU_PHOTO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large. Maximum allowed size is 5 MB.",
        )

    if content_type not in ALLOWED_MENU_PHOTO_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type. Only JPG/JPEG and PNG are allowed.",
        )

    extension = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    if extension not in ALLOWED_MENU_PHOTO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type. Only JPG/JPEG and PNG are allowed.",
        )

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="File content does not match a valid JPG/PNG image.",
    )


def upload_menu_item_photo(
    db: Session,
    restaurant_id: uuid.UUID,
    menu_item_id: uuid.UUID,
    data: bytes,
    content_type: str | None,
    filename: str | None,
) -> MenuItem:
    """
    Step 4 — validate, upload to S3, then persist photo_url.

    Ownership: same _get_owned_menu_item() guard as every other menu route,
    so a restaurant can only ever attach a photo to its own menu item.
    Order of operations matters: the S3 upload happens BEFORE any DB write,
    so a failed upload leaves photo_url untouched (no half-updated row).
    """
    item = _get_owned_menu_item(db, restaurant_id, menu_item_id)
    extension = _validate_menu_photo(data, content_type, filename)

    try:
        photo_url = storage.upload_menu_photo(
            restaurant_id, menu_item_id, data, content_type, extension
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image upload failed. Please try again.",
        )

    item.photo_url = photo_url
    db.commit()
    db.refresh(item)
    return item


# --- Step 5: restaurant order dashboard ---


def list_restaurant_orders(
    db: Session,
    restaurant_id: uuid.UUID,
    status_filter: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """
    Dashboard list — ONLY this restaurant's orders (ownership enforced in
    the query itself, never filterable into another restaurant's rows).
    Optional filters: status (case-insensitive exact match) and placed_at
    date range (inclusive, using the order's placement timestamp).
    """
    query = db.query(Order, User.name).join(User, Order.user_id == User.id).filter(
        Order.restaurant_id == restaurant_id
    )

    if status_filter:
        query = query.filter(func.lower(Order.status) == status_filter.strip().lower())
    if date_from is not None:
        query = query.filter(
            Order.placed_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        )
    if date_to is not None:
        query = query.filter(
            Order.placed_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        )

    rows = query.order_by(Order.placed_at.desc()).all()
    return [
        {
            "id": order.id,
            "status": order.status,
            "payment_method": order.payment_method,
            "food_subtotal": order.food_subtotal,
            "delivery_fee": order.delivery_fee,
            "total_amount": order.total_amount,
            "placed_at": order.placed_at,
            "customer_name": customer_name,
        }
        for order, customer_name in rows
    ]


def get_restaurant_order(db: Session, restaurant_id: uuid.UUID, order_id: uuid.UUID) -> dict:
    """
    Full order view for the restaurant counter: items, customer name,
    delivery address, payment method, totals, status. The ownership check
    is part of the WHERE clause (order_id AND restaurant_id) — an order
    belonging to any other restaurant is indistinguishable from a missing
    one (404).
    """
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.restaurant_id == restaurant_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    customer = db.query(User).filter(User.id == order.user_id).first()
    address = db.query(Address).filter(Address.id == order.delivery_address_id).first()
    item_rows = (
        db.query(OrderItem, MenuItem.name)
        .join(MenuItem, OrderItem.menu_item_id == MenuItem.id)
        .filter(OrderItem.order_id == order.id)
        .all()
    )

    return {
        "id": order.id,
        "status": order.status,
        "payment_method": order.payment_method,
        "food_subtotal": order.food_subtotal,
        "delivery_distance_km": order.delivery_distance_km,
        "delivery_fee": order.delivery_fee,
        "total_amount": order.total_amount,
        "commission_amount": order.commission_amount,
        "restaurant_payable": order.restaurant_payable,
        "rider_earning": order.rider_earning,
        "special_instructions": order.special_instructions,
        "placed_at": order.placed_at,
        "delivered_at": order.delivered_at,
        "customer_name": customer.name if customer else None,
        "delivery_address": (
            {
                "label": address.label,
                "full_address": address.full_address,
                "latitude": address.latitude,
                "longitude": address.longitude,
            }
            if address
            else None
        ),
        "items": [
            {
                "menu_item_id": item.menu_item_id,
                "name": item_name,
                "quantity": item.quantity,
                "selected_variant": item.selected_variant,
                "price_at_order": item.price_at_order,
            }
            for item, item_name in item_rows
        ],
    }


# --- Step 6: order status transition ---

# Restaurant-side state machine: an order moves forward exactly one step
# at a time (spec Sec 7 Step 10 flow). Anything not listed here — skips,
# backward moves, unknown values — is rejected. Orders land from Phase 5's
# checkout as "Accepted" (restaurant accepted at placement) and walk
# Accepted -> Preparing -> Ready for Pickup, where rider assignment takes
# over in Phase 6 (NOT implemented here, by design).
ORDER_STATUS_TRANSITIONS = {
    "Accepted": {"Preparing"},
    "Preparing": {"Ready for Pickup"},
}


def _get_owned_order(db: Session, restaurant_id: uuid.UUID, order_id: uuid.UUID) -> Order:
    """Shared lookup for restaurant order mutations — same ownership pattern
    as _get_owned_menu_item: the WHERE clause carries both order id and
    restaurant id, so another restaurant's order is a 404, not a leak."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.restaurant_id == restaurant_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order


def update_order_status(
    db: Session, restaurant_id: uuid.UUID, order_id: uuid.UUID, new_status: str
) -> dict:
    """
    Step 6 — advance this restaurant's order by one allowed transition.
    Ownership is enforced up front (404 for another restaurant's order).
    An invalid transition raises 400 BEFORE any write, so a rejected
    request never touches the database.
    """
    order = _get_owned_order(db, restaurant_id, order_id)

    allowed_next = ORDER_STATUS_TRANSITIONS.get(order.status)
    if allowed_next is None or new_status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition order from '{order.status}' to '{new_status}'.",
        )

    order.status = new_status
    db.commit()
    db.refresh(order)

    # Return the full updated view (same shape as GET detail).
    return get_restaurant_order(db, restaurant_id, order_id)


# --- Step 7: commission calculation helper ---


def calculate_commission(
    food_subtotal: Decimal | int | float, commission_rate: Decimal | int | float
) -> dict:
    """
    Reusable commission math for order placement (spec Sec 3.2 / Sec 11):

        commission_amount  = food_subtotal * (commission_rate / 100)
        restaurant_payable = food_subtotal - commission_amount

    Money is computed with Decimal — the DB stores these as Numeric and
    SQLAlchemy returns Decimal for them — never binary float, so paisa-level
    precision is preserved. Inputs are converted via Decimal(str(x)) so a
    float input like 0.1 doesn't drag its binary expansion into the math.

    Validation is minimal and mathematically safe (the MVP doc defines the
    10% default but no hard max): subtotal must be > 0, rate must be in
    [0, 100] (above 100 would make restaurant_payable negative).
    Raises ValueError on invalid input — this is a pure helper, called by
    Phase 5's checkout flow later, not a route, so HTTP errors don't belong
    here.

    Phase 5 note: NOT wired into order creation yet by design — this step
    only makes the calculation available; checkout integration is Phase 5.
    """
    subtotal = Decimal(str(food_subtotal))
    rate = Decimal(str(commission_rate))

    if subtotal <= 0:
        raise ValueError("food_subtotal must be greater than zero.")
    if rate < 0:
        raise ValueError("commission_rate cannot be negative.")
    if rate > 100:
        raise ValueError("commission_rate cannot exceed 100.")

    commission_amount = (subtotal * rate / 100).quantize(Decimal("0.01"))
    restaurant_payable = (subtotal - commission_amount).quantize(Decimal("0.01"))
    return {"commission_amount": commission_amount, "restaurant_payable": restaurant_payable}


# --- Phase 5, Step 1: customer restaurant browse ---


ACTIVE_RESTAURANT_STATUS = "active"
DEFAULT_SEARCH_RADIUS_KM = 5.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points, in kilometres.

    The DB stores coordinates as plain Numeric columns (schema.jpeg), so the
    radius filter is computed in Python after a bounding-box prefilter —
    no PostGIS (not in the stack lock). Accurate enough for a Rs. 20/km
    city-scale delivery fee.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def _get_customer_location(db: Session, customer_id: uuid.UUID, address_id: uuid.UUID | None) -> tuple:
    """Resolve the customer's search location to one of THEIR OWN addresses.
    An address_id belonging to another customer is a 404, never used
    (same ownership-in-WHERE-clause pattern as users/service.py)."""
    query = db.query(Address).filter(Address.user_id == customer_id)
    if address_id is not None:
        address = query.filter(Address.id == address_id).first()
        if address is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Address not found."
            )
    else:
        # No address supplied -> fall back to the default, else most recent.
        address = (
            query.filter(Address.is_default.is_(True)).order_by(Address.created_at).first()
        ) or query.order_by(Address.created_at.desc()).first()
        if address is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No saved address found. Save a delivery address first.",
            )
    return float(address.latitude), float(address.longitude)


def list_restaurants_for_customer(
    db: Session,
    customer_id: uuid.UUID,
    address_id: uuid.UUID | None,
    search: str | None,
    sort: str,
    radius_km: float,
) -> list[dict]:
    """Customer browse view — active restaurants only, within radius of the
    customer's own address. Name search + distance/rating sort; rating is
    the average of ratings.restaurant_rating (no aggregate column exists).
    Coordinates are required on restaurants for distance math (Numeric,
    nullable — a NULL-coordinate restaurant can never be "nearby")."""
    lat, lon = _get_customer_location(db, customer_id, address_id)

    # Bounding box prefilter — cheap SQL over the Numeric lat/long columns;
    # exact haversine radius applied in Python afterwards.
    lat_deg = radius_km / 111.32
    lon_deg = radius_km / (111.32 * max(math.cos(math.radians(lat)), 0.01))
    query = (
        db.query(Restaurant)
        .filter(
            Restaurant.status == ACTIVE_RESTAURANT_STATUS,
            Restaurant.latitude.isnot(None),
            Restaurant.longitude.isnot(None),
            Restaurant.latitude.between(lat - lat_deg, lat + lat_deg),
            Restaurant.longitude.between(lon - lon_deg, lon + lon_deg),
        )
    )

    if search:
        query = query.filter(func.lower(Restaurant.name).contains(search.strip().lower()))

    restaurants = query.all()

    # ratings carries no restaurant_id — the link is Rating -> Order ->
    # Order.restaurant_id, so the average comes through that join.
    avg_ratings = dict(
        db.query(Order.restaurant_id, func.avg(Rating.restaurant_rating))
        .join(Rating, Rating.order_id == Order.id)
        .filter(Rating.restaurant_rating.isnot(None))
        .group_by(Order.restaurant_id)
        .all()
    )

    results = [
        {
            "id": r.id,
            "name": r.name,
            "address": r.address,
            "logo_url": r.logo_url,
            "cover_photo_url": r.cover_photo_url,
            "opening_time": r.opening_time,
            "closing_time": r.closing_time,
            "distance_km": round(haversine_km(lat, lon, float(r.latitude), float(r.longitude)), 2),
            "avg_rating": (
                round(float(avg_ratings[r.id]), 1) if r.id in avg_ratings else None
            ),
        }
        for r in restaurants
        if haversine_km(lat, lon, float(r.latitude), float(r.longitude)) <= radius_km
    ]

    if sort == "rating":
        # Highest rated first; unrated (-1) sink below rated ones, ties by distance.
        results.sort(
            key=lambda item: (
                -(item["avg_rating"] if item["avg_rating"] is not None else -1),
                item["distance_km"],
            )
        )
    else:
        results.sort(key=lambda item: item["distance_km"])
    return results


# --- Phase 5, Step 2: customer menu view ---


def get_customer_menu(
    db: Session,
    restaurant_id: uuid.UUID,
    category: str | None = None,
) -> list[dict]:
    """Customer menu for one restaurant — grouped by category (owner
    decision: grouped response, not a flat list). All items are included,
    including sold-out ones flagged via is_available (owner decision:
    Foodpanda-style — customers see the dish exists and can't order it).

    Only ACTIVE restaurants are served here — a pending/deactivated
    restaurant's menu is indistinguishable from a missing one (404),
    same no-leak pattern as the ownership checks above.
    """
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.id == restaurant_id, Restaurant.status == ACTIVE_RESTAURANT_STATUS)
        .first()
    )
    if restaurant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found.")

    query = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id)
    if category:
        # Same case-insensitive exact-match pattern as the order status filter.
        query = query.filter(func.lower(MenuItem.category) == category.strip().lower())

    items = query.order_by(MenuItem.category, MenuItem.name).all()

    grouped: dict[str | None, list] = {}
    for item in items:
        grouped.setdefault(item.category, []).append(item)

    # None-category last, named categories alphabetical; items keep the
    # category+name order from the query.
    return [
        {
            "category": group_category,
            "items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "price": item.price,
                    "category": item.category,
                    "photo_url": item.photo_url,
                    "variants": item.variants,
                    "is_available": item.is_available,
                }
                for item in grouped[group_category]
            ],
        }
        for group_category in sorted(grouped, key=lambda c: (c is None, c or ""))
    ]


# --- Phase 5, Step 3: multi-cart storage (Redis, never a SQL table) ---


CART_TTL_SECONDS = 7 * 24 * 60 * 60  # stale carts self-expire after 7 days


def _cart_key(customer_id: uuid.UUID, restaurant_id: uuid.UUID) -> str:
    """Exact key structure required by the Phase 5 multi-cart design:
    cart:{customer_id}:{restaurant_id} — e.g. cart:25:8, one independent
    cart per restaurant, never cleared when the customer browses elsewhere
    (no cross-restaurant coupling exists in this module)."""
    return f"cart:{customer_id}:{restaurant_id}"


def get_cart(db: Session, customer_id: uuid.UUID, restaurant_id: uuid.UUID) -> dict:
    """Read one restaurant-specific cart. Returns {'restaurant_id': ...,
    'items': []} when absent — an empty cart is not an error for reads.
    restaurant_id/ownership validation is Step 4's (endpoints) job; this
    is the storage primitive."""
    raw = redis_client.get(_cart_key(customer_id, restaurant_id))
    if raw is None:
        # Same JSON shape as a stored cart, so callers see one consistent form.
        return CartSchema(restaurant_id=restaurant_id, items=[]).model_dump(mode="json")
    return CartSchema.model_validate_json(raw).model_dump(mode="json")


def save_cart(db: Session, customer_id: uuid.UUID, restaurant_id: uuid.UUID, cart: CartSchema) -> dict:
    """Write a full cart (Step 4's add/update/remove all funnel through
    read-modify-write here). The schema's restaurant_id is authoritative —
    it is FORCED to the path/customer-supplied restaurant_id so a payload
    can never write a cart under another restaurant's key.
    Every write (re)starts the 7-day TTL — an active cart never dies
    mid-editing; abandoned ones self-expire so Redis doesn't hoard junk.
    """
    cart.restaurant_id = restaurant_id
    raw = cart.model_dump_json()
    redis_client.set(_cart_key(customer_id, restaurant_id), raw, ex=CART_TTL_SECONDS)
    return cart.model_dump(mode="json")


def delete_cart(db: Session, customer_id: uuid.UUID, restaurant_id: uuid.UUID) -> None:
    """Remove the cart key entirely (used on checkout conversion / manual
    clear in Step 4). No-op if the cart doesn't exist."""
    redis_client.delete(_cart_key(customer_id, restaurant_id))


# --- Phase 5, Step 4: cart CRUD (endpoints; Step 3 primitives underneath) ---


def _get_active_restaurant(db: Session, restaurant_id: uuid.UUID) -> Restaurant:
    """Restaurant exists AND is active — same no-leak 404 pattern as the
    customer browse/menu endpoints (a deactivated restaurant's cart is
    indistinguishable from an unknown id)."""
    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.id == restaurant_id, Restaurant.status == ACTIVE_RESTAURANT_STATUS)
        .first()
    )
    if restaurant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found.")
    return restaurant


def _get_valid_cart_item(db: Session, restaurant_id: uuid.UUID, item_id: uuid.UUID) -> MenuItem:
    """The cart item must exist, belong to THIS restaurant, and be
    available. Wrong-restaurant item is a 404 (no existence leak), same
    ownership-in-WHERE-clause pattern as _get_owned_menu_item."""
    menu_item = (
        db.query(MenuItem)
        .filter(
            MenuItem.id == item_id,
            MenuItem.restaurant_id == restaurant_id,
        )
        .first()
    )
    if menu_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    if not menu_item.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Menu item is currently sold out.",
        )
    return menu_item


def _validate_variant(menu_item: MenuItem, variant: dict | None) -> None:
    """Minimal variant guard (owner decision): the menu model's `variants`
    JSONB has no locked structure yet, so validation is limited to the one
    invariant that holds today — an item that defines NO variants cannot
    receive one. Items that DO define variants are stored as-sent; full
    option-list validation lands with checkout when the structure is locked."""
    if variant and not menu_item.variants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This menu item does not support variants.",
        )


def add_cart_item(
    db: Session,
    customer_id: uuid.UUID,
    restaurant_id: uuid.UUID,
    payload: CartAddItemSchema,
) -> dict:
    """Add one item line to this restaurant's cart. Adding the same
    item_id + variant again merges quantities (cart stays one line per
    distinct item/variant pair). All DB validation happens BEFORE the Redis
    write, so a rejected request never touches the cart."""
    _get_active_restaurant(db, restaurant_id)
    menu_item = _get_valid_cart_item(db, restaurant_id, payload.item_id)
    _validate_variant(menu_item, payload.variant)

    cart = CartSchema.model_validate(get_cart(db, customer_id, restaurant_id))
    for existing in cart.items:
        if existing.item_id == payload.item_id and existing.variant == payload.variant:
            existing.qty += payload.qty
            break
    else:
        cart.items.append(
            CartItemSchema(item_id=payload.item_id, qty=payload.qty, variant=payload.variant)
        )

    return save_cart(db, customer_id, restaurant_id, cart)


def update_cart_item(
    db: Session,
    customer_id: uuid.UUID,
    restaurant_id: uuid.UUID,
    item_id: uuid.UUID,
    qty: int,
) -> dict:
    """Set a cart line's quantity (Schema enforces qty >= 1; removing a
    line is the DELETE endpoint's job, not qty=0). The line must exist in
    THIS cart, and the underlying item must still be available — a sold-out
    item can be viewed in the cart (menu decision) but not re-ordered."""
    _get_active_restaurant(db, restaurant_id)
    _get_valid_cart_item(db, restaurant_id, item_id)

    cart = CartSchema.model_validate(get_cart(db, customer_id, restaurant_id))
    for existing in cart.items:
        if existing.item_id == item_id:
            existing.qty = qty
            break
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart.")

    return save_cart(db, customer_id, restaurant_id, cart)


def remove_cart_item(
    db: Session, customer_id: uuid.UUID, restaurant_id: uuid.UUID, item_id: uuid.UUID
) -> dict:
    """Drop one line from this restaurant's cart. The line must exist in
    the cart; the menu item itself is NOT availability-checked — removing
    a sold-out line must stay possible."""
    _get_active_restaurant(db, restaurant_id)

    cart = CartSchema.model_validate(get_cart(db, customer_id, restaurant_id))
    remaining = [existing for existing in cart.items if existing.item_id != item_id]
    if len(remaining) == len(cart.items):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart.")

    cart.items = remaining
    return save_cart(db, customer_id, restaurant_id, cart)


# --- Phase 5, Step 5: checkout price preview (distance + delivery fee) ---


DELIVERY_FEE_BASE = Decimal("50")
DELIVERY_FEE_PER_KM = Decimal("20")


def calculate_delivery_fee(delivery_distance_km: Decimal | int | float) -> Decimal:
    """Locked fee formula (spec Sec 3.3): fee = 50 + (km x 20). Decimal in,
    Decimal out, quantized to paisa — never binary float."""
    distance = Decimal(str(delivery_distance_km))
    return (DELIVERY_FEE_BASE + distance * DELIVERY_FEE_PER_KM).quantize(Decimal("0.01"))


def preview_checkout(
    db: Session,
    customer_id: uuid.UUID,
    restaurant_id: uuid.UUID,
    address_id: uuid.UUID,
) -> dict:
    """Checkout CALCULATION PREVIEW — no order row is created, no payment,
    cart is NOT cleared (Step 6's checkout will consume this math).

    Address ownership: WHERE user_id == customer_id (same pattern as the
    browse endpoint) — another customer's address_id is a 404. Distance is
    the real road distance from Maps Distance Matrix (restaurant ->
    address); a Maps outage surfaces as a clean 503, never a crash, and
    nothing is written anywhere on failure.
    """
    restaurant = _get_active_restaurant(db, restaurant_id)

    address = (
        db.query(Address)
        .filter(Address.id == address_id, Address.user_id == customer_id)
        .first()
    )
    if address is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found.")

    cart = CartSchema.model_validate(get_cart(db, customer_id, restaurant_id))
    if not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty."
        )
    if restaurant.latitude is None or restaurant.longitude is None:
        # Direct-id carts can bypass browse (which already filters these
        # out) — without coordinates there is no distance to compute.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant location is not configured.",
        )

    # Price every line from the CURRENT menu, grouped by item_id — a cart
    # line whose menu item has vanished (deleted/sold out since) makes the
    # whole preview invalid rather than silently mispricing it.
    lines: dict[uuid.UUID, list[CartItemSchema]] = {}
    for line in cart.items:
        lines.setdefault(line.item_id, []).append(line)

    menu_items = (
        db.query(MenuItem).filter(MenuItem.id.in_(lines.keys())).all()
    )
    by_id = {item.id: item for item in menu_items}
    if len(by_id) != len(lines):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart contains an item that is no longer on the menu. Please update your cart.",
        )

    food_subtotal = Decimal("0")
    for item_id, item_lines in lines.items():
        item = by_id[item_id]
        food_subtotal += item.price * sum(line.qty for line in item_lines)

    try:
        distance_km = maps_client.get_road_distance_km(
            float(restaurant.latitude),
            float(restaurant.longitude),
            float(address.latitude),
            float(address.longitude),
        )
    except maps_client.MapsError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not calculate delivery distance. Please try again shortly.",
        )

    delivery_distance_km = Decimal(str(round(distance_km, 2)))
    delivery_fee = calculate_delivery_fee(delivery_distance_km)
    total = (food_subtotal + delivery_fee).quantize(Decimal("0.01"))

    return {
        "food_subtotal": food_subtotal.quantize(Decimal("0.01")),
        "delivery_distance_km": delivery_distance_km,
        "delivery_fee": delivery_fee,
        "total": total,
    }

