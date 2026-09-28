"""
Pydantic schemas for Admin Accounts Provisioning and Management.
Zero em-dash compliant.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class AdminAccountCreateSchema(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, description="Staff first name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Staff last name")
    email: str | None = Field(
        default=None,
        description="Custom email. If omitted, corporate email is auto-generated as firstname.lastname@speedymeals.pk",
    )
    role_id: uuid.UUID = Field(..., description="Assigned role ID")
    phone: str | None = Field(default=None, max_length=20, description="Contact phone number")
    send_welcome_email: bool = Field(default=True, description="Send credentials via welcome email")


class AdminAccountUpdateSchema(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=50)
    last_name: str | None = Field(default=None, min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class AdminRoleAssignSchema(BaseModel):
    role_id: uuid.UUID = Field(..., description="New role ID to assign")


class AdminAccountResponseSchema(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    role_id: uuid.UUID | None = None
    role_name: str | None = None
    role_slug: str | None = None
    role_color: str | None = None
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminAccountProvisionResultSchema(BaseModel):
    admin: AdminAccountResponseSchema
    temporary_password: str = Field(..., description="One-time temporary password to show in creation modal")
    invitation_url: str = Field(..., description="One-click initial password setup URL")
    message: str


class AdminCredentialResetResultSchema(BaseModel):
    admin_id: uuid.UUID
    email: str
    temporary_password: str
    message: str
