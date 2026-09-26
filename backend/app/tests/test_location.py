from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.maps_client import MapsError

client = TestClient(app)


def test_reverse_geocode_validation_error():
    # Out of range lat/lng
    response = client.get("/api/v1/location/reverse-geocode?lat=100.0&lng=45.0")
    assert response.status_code == 422

    response = client.get("/api/v1/location/reverse-geocode?lat=40.0&lng=200.0")
    assert response.status_code == 422


@patch("app.platform.location.service.maps_reverse_geocode")
@patch("app.platform.location.service.redis_client")
def test_reverse_geocode_success(mock_redis, mock_maps_geocode):
    mock_redis.get.return_value = None
    mock_maps_geocode.return_value = {
        "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        "place_id": "ChIJ2eUgeAK6j4ARbn5w_nE990E",
        "components": {
            "street": "1600 Amphitheatre Pkwy",
            "neighborhood": "",
            "city": "Mountain View",
        },
    }

    response = client.get("/api/v1/location/reverse-geocode?lat=37.42247&lng=-122.08455")
    assert response.status_code == 200
    data = response.json()
    assert data["formatted_address"] == "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
    assert data["place_id"] == "ChIJ2eUgeAK6j4ARbn5w_nE990E"
    assert data["components"]["street"] == "1600 Amphitheatre Pkwy"
    assert data["components"]["city"] == "Mountain View"


@patch("app.platform.location.service.maps_reverse_geocode")
@patch("app.platform.location.service.redis_client")
def test_reverse_geocode_zero_results(mock_redis, mock_maps_geocode):
    mock_redis.get.return_value = None
    mock_maps_geocode.side_effect = MapsError("ZERO_RESULTS")

    response = client.get("/api/v1/location/reverse-geocode?lat=0.0&lng=0.0")
    assert response.status_code == 404
    assert response.json()["detail"] == "No address found for the provided location coordinates."


@patch("app.platform.location.service.maps_reverse_geocode")
@patch("app.platform.location.service.redis_client")
def test_reverse_geocode_service_unavailable(mock_redis, mock_maps_geocode):

    mock_redis.get.return_value = None
    mock_maps_geocode.side_effect = MapsError("Geocoding lookup failed.")

    response = client.get("/api/v1/location/reverse-geocode?lat=37.42247&lng=-122.08455")
    assert response.status_code == 503
    assert response.json()["detail"] == "Location resolution service is currently unavailable."
