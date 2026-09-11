"""
Google Maps Distance Matrix client — Phase 5, Step 5.

The ONLY Maps-touching module (same isolation pattern as core/storage.py
being the only S3-touching module). The API key comes from settings
(never hardcoded); httpx was added in Phase 0 for exactly this call.

Failure policy: any network/HTTP/payload problem raises MapsError — the
service layer decides the HTTP response (503), so an outage degrades one
request, never the app.
"""
import httpx

from app.core.config import settings

REQUEST_TIMEOUT_SECONDS = 10
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


class MapsError(Exception):
    """Google Maps could not provide a distance (network, HTTP error, or
    non-OK element status like ZERO_RESULTS / REQUEST_DENIED)."""


def get_road_distance_km(
    origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
) -> float:
    """
    Road distance in kilometres between two lat/lon points (driving mode),
    restaurant -> delivery address. Returns raw km (unrounded — the caller
    decides storage/display precision).
    """
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
