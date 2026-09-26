from fastapi import APIRouter, HTTPException, Request, Query, status

from app.core.maps_client import MapsError
from app.core.rate_limiter import enforce_rate_limit
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
):
    """
    Reverse geocode latitude and longitude to a human-readable address.
    Rate limited to 20 requests per minute per IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    enforce_rate_limit(client_ip, "reverse_geocode", max_attempts=20, window_seconds=60)

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
    session_token: str | None = Query(default=None, description="Google Places Session Token for billing grouping"),
):
    """
    Search place autocomplete suggestions using Google Places API proxy.
    """
    try:
        return await service.autocomplete_places(q, session_token)
    except MapsError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Places autocomplete service is currently unavailable.",
        ) from exc


@router.get("/places/details", response_model=PlaceDetailsResponseSchema)
async def place_details(
    place_id: str = Query(..., min_length=1, description="Google Place ID"),
    session_token: str | None = Query(default=None, description="Google Places Session Token"),
):
    """
    Fetch lat/lng and structured address components for a Google Place ID.
    """
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

