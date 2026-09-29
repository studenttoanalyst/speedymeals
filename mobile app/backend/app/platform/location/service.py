import json
from app.core.maps_client import MapsError, reverse_geocode as maps_reverse_geocode
from app.core.redis_client import redis_client

CACHE_TTL_SECONDS = 86400  # 24 hours cache for reverse geocode results


async def get_reverse_geocode(lat: float, lng: float) -> dict:
    """
    Resolve lat/lng into address components using Google Geocoding API with Redis caching.
    """
    # Round lat/lng to 5 decimal places for cache key (~1.1 meter precision)
    rounded_lat = round(lat, 5)
    rounded_lng = round(lng, 5)
    cache_key = f"geocode:{rounded_lat}:{rounded_lng}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass  # Redis lookup failure should not break geocoding service

    data = await maps_reverse_geocode(lat, lng)

    try:
        redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(data))
    except Exception:
        pass  # Redis set failure should not break request flow

    return data


async def autocomplete_places(query: str, session_token: str | None = None) -> list[dict]:
    """
    Proxy address autocomplete query to Google Places API.
    """
    from app.core.maps_client import autocomplete_places as maps_autocomplete
    return await maps_autocomplete(query, session_token)


async def get_place_details(place_id: str, session_token: str | None = None) -> dict:
    """
    Fetch place details for place_id from Google Places API.
    """
    from app.core.maps_client import get_place_details as maps_get_place_details
    return await maps_get_place_details(place_id, session_token)

