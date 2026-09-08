"""
Business logic for Step 11 — Profile get/update, Address CRUD.

Every function here takes the already-authenticated user_id (from
CurrentUser via require_role, Step 7) — never trusts an id from the
request body/path for "whose data is this", to prevent one customer
reading/editing another customer's addresses.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.platform.users.models import Address, User
from app.platform.users.schemas import AddressCreateSchema, AddressUpdateSchema, UserProfileUpdateSchema


def get_profile(db: Session, user_id: uuid.UUID) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        # Should not happen in practice (token subject always matches a row
        # created at OTP-verify time) but guarded rather than assumed.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


def update_profile(db: Session, user_id: uuid.UUID, payload: UserProfileUpdateSchema) -> User:
    user = get_profile(db, user_id)

    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email

    db.commit()
    db.refresh(user)
    return user


def list_addresses(db: Session, user_id: uuid.UUID) -> list[Address]:
    return db.query(Address).filter(Address.user_id == user_id).all()


def _get_owned_address(db: Session, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    """Shared lookup for update/delete — 404s (not 403) if the address
    doesn't belong to this user, so we don't leak whether the id exists
    at all under someone else's account."""
    address = (
        db.query(Address)
        .filter(Address.id == address_id, Address.user_id == user_id)
        .first()
    )
    if address is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found.")
    return address


def _clear_other_defaults(db: Session, user_id: uuid.UUID, exclude_id: uuid.UUID | None = None) -> None:
    """Only one address can be is_default=True per user at a time."""
    query = db.query(Address).filter(Address.user_id == user_id, Address.is_default.is_(True))
    if exclude_id is not None:
        query = query.filter(Address.id != exclude_id)
    query.update({"is_default": False})


def create_address(db: Session, user_id: uuid.UUID, payload: AddressCreateSchema) -> Address:
    if payload.is_default:
        _clear_other_defaults(db, user_id)

    address = Address(user_id=user_id, **payload.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


def update_address(
    db: Session, user_id: uuid.UUID, address_id: uuid.UUID, payload: AddressUpdateSchema
) -> Address:
    address = _get_owned_address(db, user_id, address_id)

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_default") is True:
        _clear_other_defaults(db, user_id, exclude_id=address_id)

    for field, value in updates.items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


def delete_address(db: Session, user_id: uuid.UUID, address_id: uuid.UUID) -> None:
    address = _get_owned_address(db, user_id, address_id)
    db.delete(address)
    db.commit()
