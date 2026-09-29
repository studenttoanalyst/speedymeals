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
def _fake_s3(monkeypatch):
    """No real AWS in tests — return a deterministic fake URL instead.
    Uses a monotonic counter (not a fixed URL) so a re-upload test can
    tell two calls apart without needing its own monkeypatch override —
    stacking a second monkeypatch.setattr on top of this one inside a
    single test is unreliable (fixture caching), so tests that need
    per-call uniqueness rely on this counter instead of patching again."""
    counter = itertools.count(1)

    def fake_upload(rider_id, doc_type, data, content_type, extension):
        n = next(counter)
        return f"https://fake-bucket.s3.fake-region.amazonaws.com/rider-docs/{rider_id}/{doc_type}-v{n}.{extension}"

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
    assert second.cnic_photo_url.endswith("cnic-v2.png")


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