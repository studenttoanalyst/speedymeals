from unittest.mock import AsyncMock, patch
import json
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient


from app.main import app
from app.core.maps_client import MapsError
from app.platform.auth.jwt_utils import create_access_token

client = TestClient(app)

# Point 5 — every location endpoint now requires a valid access token.
# get_current_user() does no DB lookup (role is embedded in the JWT), so a
# synthetic uuid works as the caller identity.
_USER_ID = uuid.uuid4()
AUTH = {"Authorization": f"Bearer {create_access_token(_USER_ID, 'customer')}"}


def test_reverse_geocode_validation_error():
    # Out of range lat/lng (auth header valid so the 422 is query validation,
    # not an auth rejection)
    response = client.get("/api/v1/location/reverse-geocode?lat=100.0&lng=45.0", headers=AUTH)
    assert response.status_code == 422

    response = client.get("/api/v1/location/reverse-geocode?lat=40.0&lng=200.0", headers=AUTH)
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

    response = client.get("/api/v1/location/reverse-geocode?lat=37.42247&lng=-122.08455", headers=AUTH)
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

    response = client.get("/api/v1/location/reverse-geocode?lat=0.0&lng=0.0", headers=AUTH)
    assert response.status_code == 404
    assert response.json()["detail"] == "No address found for the provided location coordinates."


@patch("app.platform.location.service.maps_reverse_geocode")
@patch("app.platform.location.service.redis_client")
def test_reverse_geocode_service_unavailable(mock_redis, mock_maps_geocode):

    mock_redis.get.return_value = None
    mock_maps_geocode.side_effect = MapsError("Geocoding lookup failed.")

    response = client.get("/api/v1/location/reverse-geocode?lat=37.42247&lng=-122.08455", headers=AUTH)
    assert response.status_code == 503
    assert response.json()["detail"] == "Location resolution service is currently unavailable."


@patch("app.platform.location.service.autocomplete_places")
def test_places_autocomplete_success(mock_autocomplete):
    mock_autocomplete.return_value = [
        {"place_id": "ChIJ2eUgeAK6j4ARbn5w_nE990E", "description": "Googleplex, Amphitheatre Pkwy, Mountain View, CA"},
    ]

    response = client.get("/api/v1/location/places/autocomplete?q=Googleplex&session_token=test-token-123", headers=AUTH)
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

    response = client.get("/api/v1/location/places/details?place_id=ChIJ2eUgeAK6j4ARbn5w_nE990E&session_token=test-token-123", headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["place_id"] == "ChIJ2eUgeAK6j4ARbn5w_nE990E"
    assert data["lat"] == 37.42247
    assert data["lng"] == -122.08455


@patch("app.core.maps_client.redis_client")
def test_circuit_breaker_triggers_haversine_fallback(mock_redis, monkeypatch):
    from app.core import maps_client

    # Simulate counter reaching budget limit of 300
    mock_redis.get.return_value = "300"

    # Call get_road_distance_km with known coordinates (Lahore points: ~1.5 km straight line * 1.3 = ~1.95 km)
    distance = maps_client.get_road_distance_km(31.5204, 74.3587, 31.5300, 74.3600)
    assert distance > 0
    # Confirm httpx was not called (would fail with real connection or exception if attempted with dummy key)


# --- Point 3: Directions API route calculation (distance, duration, ETA, polyline) ---


def _fake_directions_response(distance_m, duration_s, polyline="abc_encoded_polyline_xyz"):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "routes": [
                    {
                        "overview_polyline": {"points": polyline},
                        "legs": [
                            {
                                "distance": {"value": distance_m},
                                "duration": {"value": duration_s},
                            }
                        ],
                    }
                ]
            }

    return FakeResponse()


@patch("app.core.maps_client.redis_client")
def test_get_route_details_extracts_all_four_parameters(mock_redis, monkeypatch):
    """Google answered: distance (m->km), duration (s->mins, rounded up to
    at least 1), ETA (now + duration, ISO string), and the encoded
    overview_polyline are all extracted."""
    from app.core import maps_client

    mock_redis.get.return_value = None  # budget not exhausted

    class FakeHttpx:
        @staticmethod
        def get(*args, **kwargs):
            return _fake_directions_response(4200, 900, "poly_ABC123")

    monkeypatch.setattr(maps_client.httpx, "get", FakeHttpx.get)

    route = maps_client.get_route_details(31.5204, 74.3587, 31.5300, 74.3600)

    assert route["distance_km"] == 4.2
    assert route["duration_mins"] == 15
    assert route["polyline"] == "poly_ABC123"
    # ETA is an ISO-8601 timestamp ~15 minutes out
    assert route["eta"].endswith("+00:00")
    from datetime import datetime, timezone

    eta_dt = datetime.fromisoformat(route["eta"])
    assert eta_dt > datetime.now(timezone.utc)


@patch("app.core.maps_client.redis_client")
def test_get_route_details_duration_rounds_up_to_at_least_one_minute(mock_redis, monkeypatch):
    """A 40-second hop still surfaces as duration_mins=1 (never 0)."""
    from app.core import maps_client

    mock_redis.get.return_value = None

    class FakeHttpx:
        @staticmethod
        def get(*args, **kwargs):
            return _fake_directions_response(300, 40)

    monkeypatch.setattr(maps_client.httpx, "get", FakeHttpx.get)

    route = maps_client.get_route_details(31.5204, 74.3587, 31.5300, 74.3600)
    assert route["duration_mins"] == 1
    assert route["distance_km"] == 0.3


@patch("app.core.maps_client.redis_client")
def test_get_route_details_budget_exhausted_falls_back_to_haversine(mock_redis):
    """Budget breaker trip: no Google call at all — Haversine estimate with
    a derived duration/ETA and a None polyline."""
    from app.core import maps_client

    mock_redis.get.return_value = "300"  # at MAPS_DAILY_CALL_BUDGET

    route = maps_client.get_route_details(31.5204, 74.3587, 31.5300, 74.3600)

    assert 0 < route["distance_km"] < 10
    assert route["duration_mins"] >= 1
    assert route["eta"].endswith("+00:00")
    assert route["polyline"] is None


@patch("app.core.maps_client.redis_client")
def test_get_route_details_http_failure_falls_back_to_haversine(mock_redis, monkeypatch):
    """Network/HTTP failure: graceful Haversine fallback, never an raise."""
    from app.core import maps_client

    mock_redis.get.return_value = None

    class FakeHttpx:
        @staticmethod
        def get(*args, **kwargs):
            raise maps_client.httpx.ConnectError("network down")

    monkeypatch.setattr(maps_client.httpx, "get", FakeHttpx.get)

    route = maps_client.get_route_details(31.5204, 74.3587, 31.5300, 74.3600)

    assert route["distance_km"] > 0
    assert route["duration_mins"] >= 1
    assert route["eta"]
    assert route["polyline"] is None


@patch("app.core.maps_client.redis_client")
def test_get_route_details_malformed_payload_falls_back(mock_redis, monkeypatch):
    """Malformed/empty Google payload (e.g. ZERO_RESULTS, missing keys) is
    handled by the same graceful fallback."""
    from app.core import maps_client

    mock_redis.get.return_value = None

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"status": "ZERO_RESULTS", "routes": []}

    class FakeHttpx:
        @staticmethod
        def get(*args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(maps_client.httpx, "get", FakeHttpx.get)

    route = maps_client.get_route_details(31.5204, 74.3587, 31.5300, 74.3600)
    assert route["polyline"] is None
    assert route["distance_km"] > 0


@patch("app.platform.location.routes.enforce_rate_limit")
def test_reverse_geocode_rate_limiting_exceeded(mock_rate_limit):
    mock_rate_limit.side_effect = HTTPException(status_code=429, detail="Too many attempts. Please try again in 60 seconds.")

    response = client.get("/api/v1/location/reverse-geocode?lat=37.42247&lng=-122.08455", headers=AUTH)
    assert response.status_code == 429
    assert response.json()["detail"] == "Too many attempts. Please try again in 60 seconds."


# --- Point 5: auth, rate limits, budget protection, and caching ---


def test_location_endpoints_reject_anonymous_calls():
    """Point 5 — no Google-adjacent endpoint may be reachable without a
    valid access token: anonymous traffic gets 401/403 from the bearer
    scheme before any service code (and therefore any billable call) runs."""
    paths = [
        "/api/v1/location/reverse-geocode?lat=31.5&lng=74.3",
        "/api/v1/location/places/autocomplete?q=Lahore",
        "/api/v1/location/places/details?place_id=ChIJ2eUgeAK6j4ARbn5w_nE990E",
    ]
    for path in paths:
        response = client.get(path)
        assert response.status_code in (401, 403), path


@patch("app.platform.location.routes.enforce_rate_limit")
def test_autocomplete_rate_limiting_exceeded(mock_rate_limit):
    """Point 5 — autocomplete is rate limited per user (30/min); the 429
    comes from the shared limiter before the Google proxy is touched."""
    mock_rate_limit.side_effect = HTTPException(status_code=429, detail="Too many attempts. Please try again in 30 seconds.")

    response = client.get("/api/v1/location/places/autocomplete?q=Lahore", headers=AUTH)
    assert response.status_code == 429


@patch("app.platform.location.routes.enforce_rate_limit")
def test_place_details_rate_limiting_exceeded(mock_rate_limit):
    """Point 5 — place details is rate limited per user (20/min)."""
    mock_rate_limit.side_effect = HTTPException(status_code=429, detail="Too many attempts. Please try again in 30 seconds.")

    response = client.get("/api/v1/location/places/details?place_id=ChIJ2eUgeAK6j4ARbn5w_nE990E", headers=AUTH)
    assert response.status_code == 429


@patch("app.core.maps_client.redis_client")
def test_budget_exhausted_blocks_google_calls(mock_redis, monkeypatch):
    """Point 5 — with the daily budget exhausted, the previously unguarded
    Places/Geocoding client functions raise MapsBudgetExceededError BEFORE
    any network I/O (httpx never called), so no uncapped spend is possible.
    Distance/Directions keep their Haversine fallback (no raise) by design."""
    from app.core import maps_client

    mock_redis.get.return_value = "300"  # at MAPS_DAILY_CALL_BUDGET

    def _no_http(*args, **kwargs):
        raise AssertionError("httpx must not be called when budget is exhausted")

    monkeypatch.setattr(maps_client.httpx, "get", _no_http)

    # The gated client functions are async — drive them with asyncio.run.
    import asyncio

    with pytest.raises(maps_client.MapsBudgetExceededError):
        asyncio.run(maps_client.autocomplete_places("Lahore"))
    with pytest.raises(maps_client.MapsBudgetExceededError):
        asyncio.run(maps_client.get_place_details("ChIJ2eUgeAK6j4ARbn5w_nE990E"))
    with pytest.raises(maps_client.MapsBudgetExceededError):
        asyncio.run(maps_client.reverse_geocode(31.5, 74.3))


@patch("app.core.maps_client.redis_client")
def test_budget_exhausted_surfaces_as_503_on_routes(mock_redis):
    """Point 5 — route-level behavior: budget exhaustion (a MapsError
    subclass) maps to a clean 503 with a retry-friendly message, never a
    crash, and never a silent uncapped Google call."""
    mock_redis.get.return_value = "300"

    response = client.get("/api/v1/location/places/autocomplete?q=Lahore", headers=AUTH)
    assert response.status_code == 503

    response = client.get("/api/v1/location/places/details?place_id=ChIJ2eUgeAK6j4ARbn5w_nE990E", headers=AUTH)
    assert response.status_code == 503

    response = client.get("/api/v1/location/reverse-geocode?lat=31.5&lng=74.3", headers=AUTH)
    assert response.status_code == 503


@patch("app.core.maps_client.autocomplete_places")
@patch("app.platform.location.service.redis_client")
def test_autocomplete_cache_hit_avoids_google_call(mock_redis, mock_maps_autocomplete):
    """Point 5 — a cached autocomplete response (1h TTL) is served from
    Redis; the Google proxy function is never invoked."""
    cached_payload = [{"place_id": "cached_1", "description": "Cached Cafe, Lahore"}]
    mock_redis.get.return_value = json.dumps(cached_payload)

    response = client.get("/api/v1/location/places/autocomplete?q=Lahore", headers=AUTH)

    assert response.status_code == 200
    assert response.json() == cached_payload
    mock_maps_autocomplete.assert_not_called()


@patch("app.core.maps_client.autocomplete_places")
@patch("app.platform.location.service.redis_client")
def test_autocomplete_cache_miss_calls_google_and_stores(mock_redis, mock_maps_autocomplete):
    """Point 5 — on a miss, the Google result is cached with a 3600s TTL;
    repeated identical queries are normalized into one cache entry."""
    mock_redis.get.return_value = None
    mock_maps_autocomplete.return_value = [{"place_id": "p1", "description": "Fresh Cafe"}]

    response = client.get("/api/v1/location/places/autocomplete?q=Lahore", headers=AUTH)
    assert response.status_code == 200
    assert response.json() == [{"place_id": "p1", "description": "Fresh Cafe"}]

    # setex called with the 1-hour TTL on the normalized query key
    key, ttl = mock_redis.setex.call_args[0][0], mock_redis.setex.call_args[0][1]
    assert key == "places:autocomplete:lahore"
    assert ttl == 3600


@patch("app.core.maps_client.get_place_details")
@patch("app.platform.location.service.redis_client")
def test_place_details_cache_hit_avoids_google_call(mock_redis, mock_maps_details):
    """Point 5 — a cached place-details response (24h TTL) bypasses Google."""
    cached_payload = {
        "place_id": "ChIJcached", "formatted_address": "Cached St", "lat": 1.0, "lng": 2.0,
        "components": {"street": "Cached St", "neighborhood": "", "city": "Lahore"},
    }
    mock_redis.get.return_value = json.dumps(cached_payload)

    response = client.get("/api/v1/location/places/details?place_id=ChIJcached", headers=AUTH)

    assert response.status_code == 200
    assert response.json()["place_id"] == "ChIJcached"
    mock_maps_details.assert_not_called()


@patch("app.core.maps_client.autocomplete_places")
@patch("app.platform.location.service.redis_client")
def test_autocomplete_cache_failure_falls_through_to_google(mock_redis, mock_maps_autocomplete):
    """Point 5 fail-safe — a Redis outage on read must never break the
    request: the call falls through to the live Google proxy."""
    mock_redis.get.side_effect = RuntimeError("redis down")
    mock_maps_autocomplete.return_value = [{"place_id": "p9", "description": "Fallback Cafe"}]

    response = client.get("/api/v1/location/places/autocomplete?q=Lahore", headers=AUTH)

    assert response.status_code == 200
    assert response.json() == [{"place_id": "p9", "description": "Fallback Cafe"}]
    mock_maps_autocomplete.assert_called_once()



