"""
Phase 4 routes — Menu CRUD (Step 2), availability toggle (Step 3), photo
upload (Step 4), and the order dashboard (Step 5). All routes require a
"restaurant" role token — customer/rider/admin tokens get 403, same RBAC
pattern as platform/users/routes.py.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import CurrentUser, require_role
from app.modules.food_delivery import service
from app.modules.food_delivery.schemas import (
    MenuItemAvailabilitySchema,
    MenuItemCreateSchema,
    MenuItemResponseSchema,
    MenuItemUpdateSchema,
    OrderStatusUpdateSchema,
    RestaurantOrderDetailResponseSchema,
    RestaurantOrderSummaryResponseSchema,
)

router = APIRouter(prefix="/restaurants/me/menu-items", tags=["restaurant-menu"])
orders_router = APIRouter(prefix="/restaurants/me/orders", tags=["restaurant-orders"])

require_restaurant = require_role(["restaurant"])


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
