"""
Point 5 — Location/Places proxy service with response caching.

Reverse geocoding, autocomplete, and place details all trigger billable
Google calls; identical inputs are served from Redis so repeated UI
behavior (typing similar queries, re-opening the same place) does not
re-bill. Cache reads/writes are wrapped in try/except: a Redis outage logs
a warning and falls through to the live Google call — caching must never
break the request path.
"""
import json
import logging

from app.core.maps_client import reverse_geocode as maps_reverse_geocode
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 86400  # 24 hours cache for reverse geocode results
AUTOCOMPLETE_CACHE_TTL_SECONDS = 3600  # Point 5 — 1 hour for autocomplete
PLACE_DETAILS_CACHE_TTL_SECONDS = 86400  # Point 5 — 24 hours for place details
# Autocomplete queries are normalized (lowercase + trimmed) so "Dha" and
# "dha " share one cache entry and one Google bill.
_AUTOCOMPLETE_MAX_LEN = 200


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
    Proxy address autocomplete query to Google Places API, cached 1 hour.
    The session token deliberately does NOT participate in the cache key:
    autocomplete responses are identical regardless of billing session,
    and keying on the token would fragment the cache (and the bill).
    """
    from app.core.maps_client import autocomplete_places as maps_autocomplete

    normalized = query.strip().lower()[:_AUTOCOMPLETE_MAX_LEN]
    cache_key = f"places:autocomplete:{normalized}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.warning("Places autocomplete cache read failed — falling through to Google.")

    predictions = await maps_autocomplete(query, session_token)

    try:
        # Empty result sets are cached too: "no suggestions for gibberish"
        # is a stable answer and repeating it must not re-bill Google.
        redis_client.setex(cache_key, AUTOCOMPLETE_CACHE_TTL_SECONDS, json.dumps(predictions))
    except Exception:
        logger.warning("Places autocomplete cache write failed — response returned uncached.")

    return predictions


async def get_place_details(place_id: str, session_token: str | None = None) -> dict:
    """
    Fetch place details for place_id from Google Places API, cached 24h.
    Place details for a given place_id are effectively immutable over a
    day, so the session token is likewise excluded from the cache key.
    """
    from app.core.maps_client import get_place_details as maps_get_place_details

    cache_key = f"places:details:{place_id}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        logger.warning("Place details cache read failed — falling through to Google.")

    result = await maps_get_place_details(place_id, session_token)

    try:
        redis_client.setex(cache_key, PLACE_DETAILS_CACHE_TTL_SECONDS, json.dumps(result))
    except Exception:
        logger.warning("Place details cache write failed — response returned uncached.")

    return result
