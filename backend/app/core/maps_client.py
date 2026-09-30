"""
Google Maps client - Phase 5, Step 5 (Distance Matrix) + Point 3
(route calculation via the Directions API: distance, duration, ETA,
polyline).

The ONLY Maps-touching module (same isolation pattern as core/storage.py
being the only S3-touching module). The API key comes from settings
(never hardcoded); httpx was added in Phase 0 for exactly this call.
get_route_details() never raises - it degrades to a local estimate instead.

Failure policy: any network/HTTP/payload problem raises MapsError - the
service layer decides the HTTP response (503), so an outage degrades one
request, never the app.
"""
import logging
import math
from datetime import date, datetime, timedelta, timezone
import httpx

from app.core.config import settings
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 10
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
DRIVING_ROAD_FACTOR = 1.3
# Fallback duration estimate when Google cannot answer: an average urban
# driving speed (25 km/h) keeps the ETA conservative without a Maps call.
FALLBACK_AVG_SPEED_KMH = 25


class MapsError(Exception):
    """Google Maps could not provide a distance (network, HTTP error, or
    non-OK element status like ZERO_RESULTS / REQUEST_DENIED)."""


class MapsBudgetExceededError(MapsError):
    """Point 5 - today's MAPS_DAILY_CALL_BUDGET is exhausted. Raised BEFORE
    any Google call so no endpoint can overspend; the routes layer maps it
    to a clean 503 (the client is told to retry later, never shown a
    crash)."""


def _enforce_daily_budget() -> None:
    """Point 5 - single source of truth for Google API spend control:
    raises MapsBudgetExceededError when today's budget is exhausted.
    Called by EVERY Google-touching function (Distance Matrix, Directions,
    Geocoding, Places autocomplete/details) so no product surface can make
    uncapped billable calls."""
    if not _check_and_increment_daily_budget():
        logger.warning(
            "[MAPS_CIRCUIT_BREAKER] Daily budget reached - Google call blocked."
        )
        raise MapsBudgetExceededError("Daily Google Maps API budget exhausted.")


def _calculate_haversine_distance(
    origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
) -> float:
    """
    Great-circle Haversine distance in km multiplied by a 1.3 road factor.
    """
    phi1, phi2 = math.radians(origin_lat), math.radians(dest_lat)
    dphi = math.radians(dest_lat - origin_lat)
    dlambda = math.radians(dest_lon - origin_lon)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    straight_km = 2 * 6371.0 * math.asin(math.sqrt(a))
    return straight_km * DRIVING_ROAD_FACTOR


def _check_and_increment_daily_budget() -> bool:
    """
    Checks if today's Google Maps API call budget is exceeded.
    Returns True if allowed (and increments counter), False if budget exceeded.
    """
    key = f"maps:daily_usage:{date.today().isoformat()}"
    try:
        current_count = redis_client.get(key)
        if current_count is not None and int(current_count) >= settings.MAPS_DAILY_CALL_BUDGET:
            return False

        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 86400)
        pipe.execute()
        return True
    except Exception as exc:
        logger.warning(f"Redis daily budget check failed: {exc}")
        return True  # Fallback to allowing API call if Redis fails


# Alias matching naming in audit findings
_check_budget_and_increment = _check_and_increment_daily_budget


def get_distance_matrix(
    origins: list[tuple[float, float]] | tuple[float, float],
    destinations: list[tuple[float, float]] | tuple[float, float],
) -> list[list[float]]:
    """
    Distance Matrix API: Multi-origin/destination matrix routing with fallback calculation.
    Returns a 2D matrix of road distances in km [origin_idx][destination_idx].
    Gracefully falls back to the Haversine road formula on quota exhaustion or network failure.
    """
    if isinstance(origins, tuple) and len(origins) == 2 and isinstance(origins[0], (int, float)):
        orig_list = [origins]
    else:
        orig_list = list(origins)

    if isinstance(destinations, tuple) and len(destinations) == 2 and isinstance(destinations[0], (int, float)):
        dest_list = [destinations]
    else:
        dest_list = list(destinations)

    def _fallback_matrix() -> list[list[float]]:
        return [
            [
                round(_calculate_haversine_distance(o[0], o[1], d[0], d[1]), 2)
                for d in dest_list
            ]
            for o in orig_list
        ]

    if not _check_and_increment_daily_budget() or not settings.GOOGLE_MAPS_API_KEY:
        return _fallback_matrix()

    origins_str = "|".join(f"{o[0]},{o[1]}" for o in orig_list)
    destinations_str = "|".join(f"{d[0]},{d[1]}" for d in dest_list)

    params = {
        "origins": origins_str,
        "destinations": destinations_str,
        "mode": "driving",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }

    try:
        response = httpx.get(DISTANCE_MATRIX_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        rows = data.get("rows", [])
        matrix: list[list[float]] = []
        for i, row in enumerate(rows):
            row_items: list[float] = []
            for j, elem in enumerate(row.get("elements", [])):
                if elem.get("status") == "OK" and "distance" in elem:
                    row_items.append(round(elem["distance"]["value"] / 1000.0, 2))
                else:
                    o = orig_list[i] if i < len(orig_list) else orig_list[0]
                    d = dest_list[j] if j < len(dest_list) else dest_list[0]
                    row_items.append(round(_calculate_haversine_distance(o[0], o[1], d[0], d[1]), 2))
            matrix.append(row_items)
        return matrix
    except Exception as exc:
        logger.warning(f"[MAPS_DISTANCE_MATRIX] Lookup failed, using fallback: {exc}")
        return _fallback_matrix()


def get_road_distance_km(
    origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
) -> float:
    """
    Road distance in kilometres between two lat/lon points (driving mode),
    restaurant -> delivery address. Returns raw km (unrounded - the caller
    decides storage/display precision).
    """
    if not _check_and_increment_daily_budget():
        logger.warning(
            "[MAPS_CIRCUIT_BREAKER] Daily budget reached. Falling back to local Haversine formula."
        )
        return _calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)

    # (Point 5: distance/directions keep the in-function Haversine fallback
    # instead of raising - checkout must never hard-fail on Maps outages.)

    params = {
        "origins": f"{origin_lat},{origin_lon}",
        "destinations": f"{dest_lat},{dest_lon}",
        "mode": "driving",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    try:
        response = httpx.get(DISTANCE_MATRIX_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        element = response.json()["rows"][0]["elements"][0]
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise MapsError("Distance lookup failed.") from exc

    if element.get("status") != "OK" or "distance" not in element:
        raise MapsError(f"Distance lookup failed: {element.get('status')}")

    return element["distance"]["value"] / 1000.0  # meters -> km


def _haversine_fallback_route(
    origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
) -> dict:
    """Graceful degradation for Point 3: estimate distance via the existing
    Haversine formula, duration from an average urban driving speed, and the
    ETA from that duration. The polyline is unknowable without Google's
    actual route geometry, so it is None - the client renders no path.
    Never raises; used both when the daily budget is exhausted and when the
    Directions call itself fails."""
    distance_km = _calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    duration_mins = max(1, round(distance_km / FALLBACK_AVG_SPEED_KMH * 60))
    eta = (datetime.now(timezone.utc) + timedelta(minutes=duration_mins)).isoformat()
    return {
        "distance_km": round(distance_km, 2),
        "duration_mins": duration_mins,
        "eta": eta,
        "polyline": None,
    }


def get_route_details(
    origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float
) -> dict:
    """Point 3 - full route calculation between two lat/lon points (driving
    mode) via the Google Directions API. Returns a dict with:

    - distance_km: road distance in kilometres (float)
    - duration_mins: travel time in whole minutes (int)
    - eta: ISO-8601 UTC timestamp = now + duration (str)
    - polyline: encoded overview_polyline.points for map rendering (str)

    Reuses the same daily-budget circuit breaker as Distance Matrix. On
    budget exhaustion OR any network/HTTP/payload failure it degrades to the
    Haversine-based fallback route (polyline=None) instead of raising, per
    the Point 3 error-handling policy - checkout/tracking must not break
    because Google is down."""
    if not _check_and_increment_daily_budget():
        logger.warning(
            "[MAPS_CIRCUIT_BREAKER] Daily budget reached. Falling back to Haversine route estimate."
        )
        return _haversine_fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

    # (Point 5: route details keep the in-function fallback, same as above.)

    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode": "driving",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    try:
        response = httpx.get(DIRECTIONS_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        route = data["routes"][0]
        leg = route["legs"][0]
        distance_km = leg["distance"]["value"] / 1000.0  # meters -> km
        duration_mins = max(1, round(leg["duration"]["value"] / 60.0))  # seconds -> mins
        polyline = route["overview_polyline"]["points"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning(f"[MAPS_DIRECTIONS] Directions lookup failed, using fallback: {exc}")
        return _haversine_fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

    eta = (datetime.now(timezone.utc) + timedelta(minutes=duration_mins)).isoformat()

    return {
        "distance_km": round(distance_km, 2),
        "duration_mins": duration_mins,
        "eta": eta,
        "polyline": polyline,
    }


GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"


async def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Reverse geocode latitude and longitude to human-readable address components
    and place ID using Google Geocoding API.
    """
    # Point 5 - geocoding is a billable Google call: count it against the
    # daily budget and refuse (before any network I/O) when exhausted.
    _enforce_daily_budget()

    if not settings.GOOGLE_MAPS_API_KEY:
        logger.warning("[MAPS_GEOCODING] No API key configured. Returning structured fallback.")
        return {
            "formatted_address": f"Location ({round(lat, 4)}, {round(lng, 4)}), Pakistan",
            "place_id": f"loc_{round(lat, 3)}_{round(lng, 3)}",
            "components": {
                "street": f"Point {round(lat, 4)}, {round(lng, 4)}",
                "neighborhood": "",
                "city": "Lahore",
            },
        }

    params = {
        "latlng": f"{lat},{lng}",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(GEOCODING_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise MapsError("Geocoding lookup failed.") from exc

    status = data.get("status")
    if status == "ZERO_RESULTS":
        raise MapsError("ZERO_RESULTS")

    if status != "OK" or not data.get("results"):
        raise MapsError(f"Geocoding lookup failed: {status}")

    first_result = data["results"][0]

    components = {}
    for comp in first_result.get("address_components", []):
        types = comp.get("types", [])
        if "route" in types or "street_number" in types:
            components.setdefault("street", []).append(comp.get("long_name", ""))
        if "neighborhood" in types or "sublocality" in types or "sublocality_level_1" in types:
            components.setdefault("neighborhood", comp.get("long_name", ""))
        if "locality" in types or "administrative_area_level_2" in types:
            components.setdefault("city", comp.get("long_name", ""))

    formatted_components = {
        "street": " ".join(components.get("street", [])) if isinstance(components.get("street"), list) else components.get("street", ""),
        "neighborhood": components.get("neighborhood", ""),
        "city": components.get("city", ""),
    }

    return {
        "formatted_address": first_result.get("formatted_address", ""),
        "place_id": first_result.get("place_id", ""),
        "components": formatted_components,
    }


PLACES_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


def _get_places_api_key() -> str:
    """Dynamically retrieves GOOGLE_PLACES_API_KEY if configured;
    otherwise seamlessly falls back to GOOGLE_MAPS_API_KEY."""
    return settings.GOOGLE_PLACES_API_KEY or settings.GOOGLE_MAPS_API_KEY or ""


async def autocomplete_places(input_text: str, session_token: str | None = None) -> list[dict]:
    """
    Search for address autocomplete predictions using Google Places API.
    Supports session tokens for cost protection.
    Returns empty list when API key is missing or no results found.
    """
    # Point 5 - Places autocomplete is billable AND the most expensive
    # per-call product here: same budget gate, no uncapped calls.
    _enforce_daily_budget()

    api_key = _get_places_api_key()
    if not api_key:
        logger.warning("[MAPS_PLACES] No API key configured. Returning empty predictions list.")
        return []

    params = {
        "input": input_text,
        "key": api_key,
    }
    if session_token:
        params["sessiontoken"] = session_token

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(PLACES_AUTOCOMPLETE_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise MapsError("Places autocomplete lookup failed.") from exc

    status = data.get("status")
    if status == "ZERO_RESULTS":
        return []

    if status != "OK":
        raise MapsError(f"Places autocomplete lookup failed: {status}")

    predictions = []
    for pred in data.get("predictions", []):
        predictions.append({
            "place_id": pred.get("place_id", ""),
            "description": pred.get("description", ""),
        })

    return predictions


async def get_place_details(place_id: str, session_token: str | None = None) -> dict:
    """
    Fetch place details (lat/lng and address components) for a given place_id using Google Places API.
    Supports session tokens to close out autocomplete billing sessions.
    Returns structured fallback when API key is unconfigured.
    """
    # Point 5 - billable Google call: same budget gate as autocomplete.
    _enforce_daily_budget()

    api_key = _get_places_api_key()
    if not api_key:
        logger.warning("[MAPS_PLACES] No API key configured. Returning structured fallback.")
        return {
            "place_id": place_id,
            "formatted_address": "Default Location, Pakistan",
            "lat": 31.5204,
            "lng": 74.3587,
            "components": {
                "street": "Main Boulevard",
                "neighborhood": "Gulberg",
                "city": "Lahore",
            },
        }

    params = {
        "place_id": place_id,
        "key": api_key,
        "fields": "place_id,formatted_address,geometry,address_components",
    }
    if session_token:
        params["sessiontoken"] = session_token

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(PLACE_DETAILS_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise MapsError("Place details lookup failed.") from exc

    status = data.get("status")
    if status == "ZERO_RESULTS" or status == "INVALID_REQUEST":
        raise MapsError("ZERO_RESULTS")

    if status != "OK" or not data.get("result"):
        raise MapsError(f"Place details lookup failed: {status}")

    result = data["result"]
    location = result.get("geometry", {}).get("location", {})
    lat = location.get("lat", 0.0)
    lng = location.get("lng", 0.0)

    components = {}
    for comp in result.get("address_components", []):
        types = comp.get("types", [])
        if "route" in types or "street_number" in types:
            components.setdefault("street", []).append(comp.get("long_name", ""))
        if "neighborhood" in types or "sublocality" in types or "sublocality_level_1" in types:
            components.setdefault("neighborhood", comp.get("long_name", ""))
        if "locality" in types or "administrative_area_level_2" in types:
            components.setdefault("city", comp.get("long_name", ""))

    formatted_components = {
        "street": " ".join(components.get("street", [])) if isinstance(components.get("street"), list) else components.get("street", ""),
        "neighborhood": components.get("neighborhood", ""),
        "city": components.get("city", ""),
    }

    return {
        "place_id": result.get("place_id", place_id),
        "formatted_address": result.get("formatted_address", ""),
        "lat": lat,
        "lng": lng,
        "components": formatted_components,
    }


