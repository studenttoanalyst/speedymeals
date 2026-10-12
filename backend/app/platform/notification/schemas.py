"""Request/response shapes for device-token registration."""
from typing import Literal

from pydantic import BaseModel, Field


class DeviceRegisterSchema(BaseModel):
    token: str = Field(..., min_length=20, max_length=512, description="FCM registration token")
    platform: Literal["android", "ios", "web"]


class DeviceRegisterResponseSchema(BaseModel):
    registered: bool = True
    platform: str


class DeviceUnregisterResponseSchema(BaseModel):
    removed: bool
