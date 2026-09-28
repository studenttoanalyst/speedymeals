"""
Point 5 — Places/Location proxy endpoints. Every endpoint here triggers a
billable Google Maps/Places API call, so NONE of them may be reachable by
anonymous traffic: all three require a valid access token
(get_current_user — any role; customers, riders, restaurant and admin staff
all legitimately use address search), and all three are per-user rate
limited via the shared Redis limiter (core/rate_limiter.py).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status

from app.core.maps_client import MapsError
from app.core.rate_limiter import enforce_rate_limit
from app.platform.auth.dependencies import CurrentUser, get_current_user
from app.platform.location import service
from app.platform.location.schemas import (
    PlaceDetailsResponseSchema,
    PlacePredictionSchema,
    ReverseGeocodeResponseSchema,
)

router = APIRouter(prefix="/api/v1/location", tags=["location"])


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponseSchema)
async def reverse_geocode(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Reverse geocode latitude and longitude to a human-readable address.
    Auth required; rate limited to 20 requests per minute per user.
    """
    enforce_rate_limit(str(current_user.id), "reverse_geocode", max_attempts=20, window_seconds=60)

    try:
        return await service.get_reverse_geocode(lat, lng)
    except MapsError as exc:
        err_msg = str(exc)
        if err_msg == "ZERO_RESULTS":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No address found for the provided location coordinates.",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Location resolution service is currently unavailable.",
        ) from exc



@router.get("/places/autocomplete", response_model=list[PlacePredictionSchema])
async def places_autocomplete(
    q: str = Query(..., min_length=1, max_length=200, description="Address search query text"),
    session_token: str | None = Query(default=None, max_length=100, description="Google Places Session Token for billing grouping"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Search place autocomplete suggestions using Google Places API proxy.
    Auth required; rate limited to 30 requests per minute per user.
    """
    enforce_rate_limit(str(current_user.id), "places_autocomplete", max_attempts=30, window_seconds=60)

    try:
        return await service.autocomplete_places(q, session_token)
    except MapsError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Places autocomplete service is currently unavailable.",
        ) from exc


@router.get("/places/details", response_model=PlaceDetailsResponseSchema)
async def place_details(
    place_id: str = Query(..., min_length=1, max_length=200, description="Google Place ID"),
    session_token: str | None = Query(default=None, max_length=100, description="Google Places Session Token"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Fetch lat/lng and structured address components for a Google Place ID.
    Auth required; rate limited to 20 requests per minute per user.
    """
    enforce_rate_limit(str(current_user.id), "places_details", max_attempts=20, window_seconds=60)

    try:
        return await service.get_place_details(place_id, session_token)
    except MapsError as exc:
        err_msg = str(exc)
        if err_msg == "ZERO_RESULTS":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Place ID not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Place details service is currently unavailable.",
        ) from exc
