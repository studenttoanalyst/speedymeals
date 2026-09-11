"""
Menu item request/response shapes — Phase 4, Step 1.
Photo upload is a separate endpoint (Step 4, multipart) — these schemas
only carry photo_url as a plain string, set after upload.
"""
import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class MenuItemCreateSchema(BaseModel):
    name: str
    description: str | None = None
    price: float = Field(gt=0)
    category: str | None = None
    variants: dict | None = None
    is_available: bool = True


class MenuItemUpdateSchema(BaseModel):
    """All fields optional — partial update, same pattern as
    UserProfileUpdateSchema / AddressUpdateSchema."""
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    category: str | None = None
    variants: dict | None = None
    is_available: bool | None = None


class MenuItemAvailabilitySchema(BaseModel):
    """Step 3 — dedicated toggle body, nothing else editable through it."""
    is_available: bool


class MenuItemResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    restaurant_id: uuid.UUID
    name: str
    description: str | None
    price: float
    category: str | None
    photo_url: str | None
    variants: dict | None
    is_available: bool


# --- Phase 4, Step 5: restaurant order dashboard response shapes ---


class RestaurantOrderItemResponseSchema(BaseModel):
    """One line of an order's items, with the menu item name resolved
    (order_items only stores menu_item_id + price_at_order snapshot)."""
    menu_item_id: uuid.UUID
    name: str
    quantity: int
    selected_variant: str | None
    price_at_order: float


class RestaurantOrderDeliveryAddressSchema(BaseModel):
    """Delivery address as stored on the `addresses` table (Phase 2 Step 11)."""
    label: str | None
    full_address: str | None
    latitude: float
    longitude: float


class OrderStatusUpdateSchema(BaseModel):
    """Body for PATCH /restaurants/me/orders/{id}/status — Step 6.
    The requested next status, validated against the order state machine
    in the service layer."""
    status: str


class RestaurantOrderSummaryResponseSchema(BaseModel):
    """One row in GET /restaurants/me/orders — dashboard list view."""
    id: uuid.UUID
    status: str
    payment_method: str
    food_subtotal: float
    delivery_fee: float
    total_amount: float
    placed_at: datetime
    customer_name: str


class RestaurantOrderDetailResponseSchema(BaseModel):
    """Full view for GET /restaurants/me/orders/{id} — everything a
    restaurant counter needs to prepare + hand over an order. Payment
    fields are informational only (spec Sec 9 Step 6); no payment
    processing happens here."""
    id: uuid.UUID
    status: str
    payment_method: str
    food_subtotal: float
    delivery_distance_km: float
    delivery_fee: float
    total_amount: float
    commission_amount: float
    restaurant_payable: float
    rider_earning: float
    special_instructions: str | None
    placed_at: datetime
    delivered_at: datetime | None
    customer_name: str
    delivery_address: RestaurantOrderDeliveryAddressSchema | None
    items: list[RestaurantOrderItemResponseSchema]


# --- Phase 5, Step 1: customer restaurant browse response shape ---


class CustomerRestaurantResponseSchema(BaseModel):
    """One row in GET /restaurants (customer browse). Public fields only —
    no email, password_hash, phone_number, commission_rate or status."""
    id: uuid.UUID
    name: str
    address: str | None
    logo_url: str | None
    cover_photo_url: str | None
    opening_time: time | None
    closing_time: time | None
    distance_km: float
    avg_rating: float | None


# --- Phase 5, Step 2: customer menu view response shapes ---


class CustomerMenuItemSchema(BaseModel):
    """One dish on the customer menu — customer-facing fields only
    (no restaurant_id — implicit in the path; no management data).
    Sold-out items are included, flagged via is_available."""
    id: uuid.UUID
    name: str
    description: str | None
    price: float
    category: str | None
    photo_url: str | None
    variants: dict | None
    is_available: bool


class CustomerMenuCategorySchema(BaseModel):
    """One category group in GET /restaurants/{id}/menu — items already
    sorted within the group."""
    category: str | None
    items: list[CustomerMenuItemSchema]


# --- Phase 5, Step 3: multi-cart (Redis) shapes ---


class CartItemSchema(BaseModel):
    """One line in a cart. qty must be at least 1; variant mirrors the
    menu item's JSONB `variants` shape (validity against the actual item
    is checked when cart CRUD endpoints land in Step 4)."""
    item_id: uuid.UUID
    qty: int = Field(gt=0)
    variant: dict | None = None


class CartSchema(BaseModel):
    """One restaurant-specific cart (Phase 5 multi-cart model — a customer
    holds one of these per restaurant simultaneously). Serialized as JSON
    into Redis under `cart:{customer_id}:{restaurant_id}`; never a SQL row
    (deliberate Phase 1 decision — cart is temporary pre-order state)."""
    restaurant_id: uuid.UUID
    items: list[CartItemSchema]


class CartAddItemSchema(BaseModel):
    """Body for POST .../cart/items — Step 4. item existence/belonging/
    availability are validated against the DB in the service layer; the
    schema only enforces shape."""
    item_id: uuid.UUID
    qty: int = Field(gt=0)
    variant: dict | None = None


class CartUpdateItemSchema(BaseModel):
    """Body for PATCH .../cart/items/{item_id} — Step 4 quantity change."""
    qty: int = Field(gt=0)


class CheckoutPreviewResponseSchema(BaseModel):
    """Price breakdown for GET .../cart/checkout-preview — Step 5.
    Calculation only: no order is placed, nothing is cleared."""
    food_subtotal: float
    delivery_distance_km: float
    delivery_fee: float
    total: float


class PlaceOrderSchema(BaseModel):
    """Body for POST .../cart/checkout — Step 6. address ownership and
    payment_method validity are enforced in the service layer."""
    address_id: uuid.UUID
    payment_method: str


class PlaceOrderResponseSchema(BaseModel):
    """The placed order — financial values are the FROZEN snapshot written
    at placement (never recomputed later)."""
    id: uuid.UUID
    status: str
    payment_method: str
    payment_reference: str | None = None
    food_subtotal: float
    delivery_distance_km: float
    delivery_fee: float
    total_amount: float
    commission_amount: float
    restaurant_payable: float
    rider_earning: float
    placed_at: datetime
    items: list[RestaurantOrderItemResponseSchema]
