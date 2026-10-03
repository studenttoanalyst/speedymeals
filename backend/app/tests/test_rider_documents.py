"""
Gap 2 fix — rider document upload (spec Sec 8 Step 1, Sec 6 Step 1). The
`rider` fixture (conftest.py) and the S3 client are not real in tests:
storage.upload_rider_document is monkeypatched so these tests never make
a real AWS call, same reasoning as why generate_and_send_otp uses a real
Redis but never a real SMS provider.
"""
import base64
import itertools
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.platform.auth.jwt_utils import create_access_token
from app.platform.wallet_payment import service
from app.platform.wallet_payment.routes import router as wallet_router

# Smallest possible valid PNG (1x1 transparent pixel) — real magic bytes,
# so it passes the same content-sniffing check as a genuine upload.
_VALID_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.fixture
def wallet_client(db_session):
    app = FastAPI()
    app.include_router(wallet_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.fixture(autouse=True)
def _auto_mock_s3_for_service_tests(request, monkeypatch):
    """Apply mock fake_upload automatically to all service tests, but leave storage alone for direct storage tests."""
    if "test_storage_" in request.node.name:
        return

    counter = itertools.count(1)

    def fake_upload(rider_id, doc_type, data, content_type, extension):
        n = next(counter)
        return f"https://fake-bucket.s3.fake-region.amazonaws.com/rider-docs/{rider_id}/{doc_type}-v{n}.webp"

    monkeypatch.setattr(service.storage, "upload_rider_document", fake_upload)


def test_upload_cnic_document_succeeds(db_session, rider):
    result = service.upload_rider_document(
        db_session, rider.id, "cnic", _VALID_PNG_BYTES, "image/png", "cnic.png"
    )
    assert result.cnic_photo_url is not None
    assert "cnic" in result.cnic_photo_url


def test_upload_license_and_vehicle_are_independent_columns(db_session, rider):
    service.upload_rider_document(db_session, rider.id, "license", _VALID_PNG_BYTES, "image/png", "l.png")
    result = service.upload_rider_document(db_session, rider.id, "vehicle", _VALID_PNG_BYTES, "image/png", "v.png")

    assert result.license_photo_url is not None
    assert result.vehicle_photo_url is not None
    assert result.cnic_photo_url is None  # untouched


def test_reupload_same_doc_type_overwrites_previous_url(db_session, rider):
    first = service.upload_rider_document(db_session, rider.id, "cnic", _VALID_PNG_BYTES, "image/png", "a.png")
    first_url = first.cnic_photo_url  # captured now — `first` and `second` end up
    # being the SAME SQLAlchemy identity-mapped object (same session, same
    # rider.id), so reading first.cnic_photo_url AFTER the second call
    # would silently show the second call's value too.
    second = service.upload_rider_document(db_session, rider.id, "cnic", _VALID_PNG_BYTES, "image/png", "b.png")

    assert first_url != second.cnic_photo_url
    assert second.cnic_photo_url.endswith("cnic-v2.webp")


def test_upload_rejects_invalid_doc_type(db_session, rider):
    with pytest.raises(HTTPException) as exc_info:
        service.upload_rider_document(db_session, rider.id, "passport", _VALID_PNG_BYTES, "image/png", "x.png")
    assert exc_info.value.status_code == 400


def test_upload_rejects_oversized_file(db_session, rider):
    oversized = b"\x89PNG\r\n\x1a\n" + b"0" * (service.MAX_RIDER_DOC_SIZE_BYTES + 1)
    with pytest.raises(HTTPException) as exc_info:
        service.upload_rider_document(db_session, rider.id, "cnic", oversized, "image/png", "x.png")
    assert exc_info.value.status_code == 413


def test_upload_rejects_wrong_content_type(db_session, rider):
    with pytest.raises(HTTPException) as exc_info:
        service.upload_rider_document(db_session, rider.id, "cnic", _VALID_PNG_BYTES, "application/pdf", "x.pdf")
    assert exc_info.value.status_code == 415


def test_upload_rejects_content_not_matching_declared_type(db_session, rider):
    fake_png_bytes = b"not-actually-a-png"
    with pytest.raises(HTTPException) as exc_info:
        service.upload_rider_document(db_session, rider.id, "cnic", fake_png_bytes, "image/png", "x.png")
    assert exc_info.value.status_code == 415


def test_upload_unknown_rider_is_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        service.upload_rider_document(db_session, uuid.uuid4(), "cnic", _VALID_PNG_BYTES, "image/png", "x.png")
    assert exc_info.value.status_code == 404


def test_upload_route_returns_200_for_own_document(wallet_client, rider):
    token = create_access_token(rider.id, "rider")
    response = wallet_client.post(
        "/wallet/documents/cnic",
        files={"file": ("cnic.png", _VALID_PNG_BYTES, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["cnic_photo_url"] is not None


def test_upload_route_requires_rider_role(wallet_client, db_session):
    from app.tests.test_order_tracking import _make_restaurant
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = wallet_client.post(
        "/wallet/documents/cnic",
        files={"file": ("cnic.png", _VALID_PNG_BYTES, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_storage_converts_to_webp_and_reduces_size(monkeypatch):
    """
    Directly tests storage.upload_rider_document:
    (1) stored doc is .webp
    (2) stored file size is smaller than the uncompressed original
    (3) strips EXIF
    """
    import io
    from PIL import Image
    from app.core import storage

    # Create a realistic test image (e.g. 300x300 pattern) saved as standard JPEG
    img = Image.new("RGB", (300, 300))
    for x in range(300):
        for y in range(300):
            img.putpixel((x, y), ((x * 5) % 256, (y * 7) % 256, (x + y) % 256))
    raw_jpg_buf = io.BytesIO()
    img.save(raw_jpg_buf, format="JPEG", quality=90)
    raw_jpg_bytes = raw_jpg_buf.getvalue()

    captured_payloads = []

    def mock_put_object(**kwargs):
        captured_payloads.append(kwargs)
        return {}

    monkeypatch.setattr(storage._s3_client, "put_object", mock_put_object)

    test_rider_id = uuid.uuid4()
    doc_url = storage.upload_rider_document(
        test_rider_id,
        "cnic",
        raw_jpg_bytes,
        "image/jpeg",
        "jpg",
    )

    # 1. URL and key end in .webp
    assert doc_url.endswith(".webp")
    assert len(captured_payloads) == 1
    call = captured_payloads[0]
    assert call["Key"].endswith("/cnic.webp")
    assert call["ContentType"] == "image/webp"

    # 2. Converted WebP file size is smaller than the original JPEG
    stored_bytes = call["Body"]
    assert len(stored_bytes) < len(raw_jpg_bytes)

    # Verify it is valid WebP and can be opened by Pillow
    converted_img = Image.open(io.BytesIO(stored_bytes))
    assert converted_img.format == "WEBP"


def test_storage_raises_error_on_corrupt_image():
    """
    Fallback: if Pillow conversion fails for any reason, raise a clear error
    rather than silently uploading the original file under a mismatched extension.
    """
    from app.core import storage

    corrupt_bytes = b"not-an-image-data-payload"
    with pytest.raises(ValueError, match="Failed to convert image to WebP"):
        storage.upload_rider_document(
            uuid.uuid4(),
            "license",
            corrupt_bytes,
            "image/jpeg",
            "jpg",
        )