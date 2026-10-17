"""
S3 and Supabase storage abstraction - the ONLY place that talks to Object Storage.

Kept deliberately thin: one function per asset kind, no generic
"upload anything" API, same shared-instance pattern as redis_client.py.

Prefix and bucket strategy:
- `menu-items` (public): Customer-facing food photos, public-read.
- `restaurant-assets` (public): Storefront cover banners and logos.
- `rider-docs` (private): Sensitive documents (CNIC, license, vehicle registration).
"""
import io
import logging
import uuid
import boto3
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

_s3_kwargs = {
    "region_name": settings.AWS_REGION,
    "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
    "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
}
if settings.S3_ENDPOINT_URL:
    _s3_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

_s3_client = boto3.client("s3", **_s3_kwargs)

MENU_BUCKET = "menu-items"
RESTAURANT_BUCKET = "restaurant-assets"
RIDER_BUCKET = "rider-docs"


def _is_supabase() -> bool:
    return bool(settings.S3_ENDPOINT_URL and "supabase" in settings.S3_ENDPOINT_URL)


def _get_supabase_base_url() -> str:
    if settings.SUPABASE_URL:
        return settings.SUPABASE_URL.rstrip("/")
    if settings.S3_ENDPOINT_URL and "supabase.co" in settings.S3_ENDPOINT_URL:
        # Extract base project url from s3 endpoint url
        parts = settings.S3_ENDPOINT_URL.split("/storage/v1/s3")
        return parts[0].rstrip("/")
    return "https://cmvmbylcocfwnanxdxlh.supabase.co"


def upload_menu_photo(
    restaurant_id: uuid.UUID,
    menu_item_id: uuid.UUID,
    file_bytes: bytes,
    content_type: str,
    extension: str,
) -> str:
    """
    Upload a menu item photo as a public object and return its CDN URL.
    Scoped under restaurant_id so dish photos are organized cleanly.
    """
    if _is_supabase():
        bucket = MENU_BUCKET
        key = f"{restaurant_id}/{menu_item_id}.{extension}"
        _s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        base_url = _get_supabase_base_url()
        return f"{base_url}/storage/v1/object/public/{bucket}/{key}"
    else:
        bucket = settings.S3_BUCKET_NAME
        key = f"{MENU_BUCKET}/{restaurant_id}/{menu_item_id}.{extension}"
        _s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            ACL="public-read",
        )
        return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def upload_restaurant_asset(
    restaurant_id: uuid.UUID,
    asset_type: str,
    file_bytes: bytes,
    content_type: str,
    extension: str,
) -> str:
    """
    Upload a restaurant storefront banner or logo as a public object.
    asset_type: 'cover' or 'logo'
    """
    if _is_supabase():
        bucket = RESTAURANT_BUCKET
        key = f"{restaurant_id}/{asset_type}.{extension}"
        _s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        base_url = _get_supabase_base_url()
        return f"{base_url}/storage/v1/object/public/{bucket}/{key}"
    else:
        bucket = settings.S3_BUCKET_NAME
        key = f"{RESTAURANT_BUCKET}/{restaurant_id}/{asset_type}.{extension}"
        _s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            ACL="public-read",
        )
        return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def _convert_rider_doc_to_webp(file_bytes: bytes, quality: int = 80) -> bytes:
    """
    Convert validated image to WebP format with quality=80.
    Strips EXIF metadata automatically (Pillow does not preserve EXIF unless exif param is given).
    Raises ValueError if conversion fails for any reason.
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
        # WebP supports RGBA (transparency), but palettes or unusual modes should be normalized
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image = image.convert("RGBA")
        elif image.mode != "RGB":
            image = image.convert("RGB")

        out_buf = io.BytesIO()
        image.save(out_buf, format="WEBP", quality=quality)
        return out_buf.getvalue()
    except Exception as exc:
        raise ValueError(f"Failed to convert image to WebP: {exc}") from exc


def upload_rider_document(
    rider_id: uuid.UUID,
    doc_type: str,
    file_bytes: bytes,
    content_type: str,
    extension: str,
) -> str:
    """
    Upload sensitive rider documents (CNIC, driving license, vehicle registration).
    Stored in private bucket without public access.
    Converts image to WebP (quality=80, EXIF stripped) before upload.
    S3/storage key always uses .webp extension.
    """
    webp_bytes = _convert_rider_doc_to_webp(file_bytes, quality=80)
    webp_content_type = "image/webp"
    doc_extension = "webp"

    if _is_supabase():
        bucket = RIDER_BUCKET
        key = f"{rider_id}/{doc_type}.{doc_extension}"
        _s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=webp_bytes,
            ContentType=webp_content_type,
        )
        base_url = _get_supabase_base_url()
        return f"{base_url}/storage/v1/object/authenticated/{bucket}/{key}"
    else:
        bucket = settings.S3_BUCKET_NAME
        key = f"{RIDER_BUCKET}/{rider_id}/{doc_type}.{doc_extension}"
        _s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=webp_bytes,
            ContentType=webp_content_type,
        )
        return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def get_signed_document_url(bucket_name: str, key: str, expires_in: int = 300) -> str:
    """
    Generate a temporary pre-signed URL for private rider documents.
    """
    return _s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


def _split_stored_document_url(url: str) -> tuple[str, str] | None:
    """Map a stored rider-document URL back to (bucket, key).

    Handles both shapes this project writes:
      Supabase: {base}/storage/v1/object/authenticated/rider-docs/{rider}/{doc}.webp
      S3 path:  https://{bucket}.s3.{region}.amazonaws.com/rider-docs/{rider}/{doc}.webp

    Returns None for anything else, so a legacy or foreign URL is skipped
    instead of deleting an unrelated object.
    """
    if not url:
        return None
    marker = "/storage/v1/object/authenticated/"
    if marker in url:
        rest = url.split(marker, 1)[1]
        bucket, _, key = rest.partition("/")
        return (bucket, key) if bucket and key else None
    if "amazonaws.com/" in url:
        # e.g. https://{bucket}.s3.{region}.amazonaws.com/rider-docs/...
        host_part = url.split("amazonaws.com/", 1)[0]
        key = url.split("amazonaws.com/", 1)[1]
        bucket = settings.S3_BUCKET_NAME
        if "//" in host_part:
            domain = host_part.split("//", 1)[1].rstrip(".")
            # e.g. domain = speedymeals-docs.s3.us-east-1
            subparts = domain.split(".s3")
            if subparts[0]:
                bucket = subparts[0]
        if key.startswith(f"{RIDER_BUCKET}/"):
            return bucket, key
    return None


def delete_rider_document_url(url: str) -> bool:
    """Delete one private rider document (CNIC / licence / vehicle photo) from
    object storage, given the URL stored on the rider row.

    Best effort by design: this runs while an admin-approved deletion executes,
    so a missing object (already purged, removed by hand) must never fail or
    roll back the request. Returns True when the object is gone - deleted,
    already absent, or not one of ours to delete - and False only when the
    storage call itself failed.
    """
    target = _split_stored_document_url(url)
    if target is None:
        logger.warning("Skipping stored-object delete: unrecognised document URL")
        return True
    bucket, key = target
    try:
        _s3_client.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception:  # noqa: BLE001 - a failed delete must not abort the request
        logger.exception("Could not delete stored rider document (bucket=%s)", bucket)
        return False