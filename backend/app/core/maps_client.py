"""
Google Maps Distance Matrix client — Phase 5, Step 5.

The ONLY Maps-touching module (same isolation pattern as core/storage.py
being the only S3-touching module). The API key comes from settings
(never hardcoded); httpx was added in Phase 0 for exactly this call.

Failure policy: any network/HTTP/payload problem raises MapsError — the
service layer decides the HTTP response (503), so an outage degrades one
request, never the app.
"""
import logging
import math
from datetime import date
import httpx

from app.core.config import settings
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 10
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
DRIVING_ROAD_FACTOR = 1.3


class MapsError(Exception):
    """Google Maps could not provide a distance (network, HTTP error, or
    non-OK element status like ZERO_RESULTS / REQUEST_DENIED)."""


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


def get_road_distance_km(
    origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
) -> float:
    """
    Road distance in kilometres between two lat/lon points (driving mode),
    restaurant -> delivery address. Returns raw km (unrounded — the caller
    decides storage/display precision).
    """
    if not _check_and_increment_daily_budget():
        logger.warning(
            "[MAPS_CIRCUIT_BREAKER] Daily budget reached. Falling back to local Haversine formula."
        )
        return _calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)

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



GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"


async def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Reverse geocode latitude and longitude to human-readable address components
    and place ID using Google Geocoding API.
    """
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
    return settings.GOOGLE_PLACES_API_KEY or settings.GOOGLE_MAPS_API_KEY


async def autocomplete_places(input_text: str, session_token: str | None = None) -> list[dict]:
    """
    Search for address autocomplete predictions using Google Places API.
    Supports session tokens for cost protection.
    """
    params = {
        "input": input_text,
        "key": _get_places_api_key(),
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
    """
    params = {
        "place_id": place_id,
        "key": _get_places_api_key(),
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


