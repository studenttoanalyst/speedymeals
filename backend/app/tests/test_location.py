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


@patch("app.platform.location.service.autocomplete_places")
def test_places_autocomplete_success(mock_autocomplete):
    mock_autocomplete.return_value = [
        {"place_id": "ChIJ2eUgeAK6j4ARbn5w_nE990E", "description": "Googleplex, Amphitheatre Pkwy, Mountain View, CA"},
    ]

    response = client.get("/api/v1/location/places/autocomplete?q=Googleplex&session_token=test-token-123")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["place_id"] == "ChIJ2eUgeAK6j4ARbn5w_nE990E"
    assert "Googleplex" in data[0]["description"]


@patch("app.platform.location.service.get_place_details")
def test_place_details_success(mock_details):
    mock_details.return_value = {
        "place_id": "ChIJ2eUgeAK6j4ARbn5w_nE990E",
        "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        "lat": 37.42247,
        "lng": -122.08455,
        "components": {
            "street": "1600 Amphitheatre Pkwy",
            "neighborhood": "",
            "city": "Mountain View",
        },
    }

    response = client.get("/api/v1/location/places/details?place_id=ChIJ2eUgeAK6j4ARbn5w_nE990E&session_token=test-token-123")
    assert response.status_code == 200
    data = response.json()
    assert data["place_id"] == "ChIJ2eUgeAK6j4ARbn5w_nE990E"
    assert data["lat"] == 37.42247
    assert data["lng"] == -122.08455

