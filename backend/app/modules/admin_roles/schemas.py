"""
Pydantic schemas for Admin Roles and Permissions.
Zero em-dash compliant.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class PermissionResponseSchema(BaseModel):
    id: uuid.UUID
    key: str
    label: str
    domain: str
    description: str
    risk_level: str

    model_config = {"from_attributes": True}


class AdminRoleCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Display name for the role")
    color: str = Field(default="#6366F1", max_length=7, description="Hex color badge, e.g. #DC2626")
    icon: str | None = Field(default=None, max_length=50, description="Phosphor icon name")
    permission_keys: list[str] = Field(default_factory=list, description="List of granular permission keys to grant")


class AdminRoleUpdateSchema(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    color: str | None = Field(default=None, max_length=7)
    icon: str | None = None
    permission_keys: list[str] | None = None


class AssignedAdminSchema(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class AdminRoleResponseSchema(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    color: str
    icon: str | None = None
    is_system: bool
    permissions: list[PermissionResponseSchema]
    admin_count: int = 0
    assigned_admins: list[AssignedAdminSchema] = []
    created_at: datetime

    model_config = {"from_attributes": True}
