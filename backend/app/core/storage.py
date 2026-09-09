"""
S3 storage abstraction — the ONLY place that talks to AWS S3.

Kept deliberately thin: one function per asset kind, no generic
"upload anything" API, same shared-instance pattern as redis_client.py.

Prefix strategy (established here, followed by every later upload):
- `menu-items/`  — customer-facing food photos, PUBLIC-read. Anyone with
  the URL can view them (they're shown in the customer browse/menu UI).
- `rider-docs/`  — reserved for private documents (CNIC, license, vehicle
  photos, Phase 8 scope). Never public-read. Menu photos are stored under
  their own prefix so they are never mixed with sensitive documents.
"""
import uuid

import boto3

from app.core.config import settings

_s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

MENU_PHOTO_PREFIX = "menu-items"


def upload_menu_photo(
    restaurant_id: uuid.UUID,
    menu_item_id: uuid.UUID,
    file_bytes: bytes,
    content_type: str,
    extension: str,
) -> str:
    """
    Upload a menu item photo as a public object and return its URL.

    Key is scoped under the restaurant id so even same-name files can never
    collide across restaurants. Raises on any AWS failure — callers turn
    that into a clean 5xx response (nothing is written to the DB unless
    this returns successfully).
    """
    key = f"{MENU_PHOTO_PREFIX}/{restaurant_id}/{menu_item_id}.{extension}"
    _s3_client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
        ACL="public-read",  # customer-facing asset (spec: menu photos shown to customers)
    )
    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"