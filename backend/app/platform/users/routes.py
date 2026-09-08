"""
Step 11 endpoints — Profile + Address. All routes require a valid
"customer" role token (Step 7's require_role) — rider/restaurant/admin
tokens get 403, since this module is customer-only per schema.jpeg
(users/addresses tables belong to the customer role).
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import CurrentUser, require_role
from app.platform.users import service
from app.platform.users.schemas import (
    AddressCreateSchema,
    AddressResponseSchema,
    AddressUpdateSchema,
    UserProfileSchema,
    UserProfileUpdateSchema,
)

router = APIRouter(prefix="/users", tags=["users"])

require_customer = require_role(["customer"])


@router.get("/me", response_model=UserProfileSchema)
def get_my_profile(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    return service.get_profile(db, current_user.id)


@router.put("/me", response_model=UserProfileSchema)
def update_my_profile(
    payload: UserProfileUpdateSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    return service.update_profile(db, current_user.id, payload)


@router.get("/me/addresses", response_model=list[AddressResponseSchema])
def list_my_addresses(
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    return service.list_addresses(db, current_user.id)


@router.post("/me/addresses", response_model=AddressResponseSchema, status_code=status.HTTP_201_CREATED)
def create_my_address(
    payload: AddressCreateSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    return service.create_address(db, current_user.id, payload)


@router.put("/me/addresses/{address_id}", response_model=AddressResponseSchema)
def update_my_address(
    address_id: uuid.UUID,
    payload: AddressUpdateSchema,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    return service.update_address(db, current_user.id, address_id, payload)


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_address(
    address_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_customer),
    db: Session = Depends(get_db),
):
    service.delete_address(db, current_user.id, address_id)
