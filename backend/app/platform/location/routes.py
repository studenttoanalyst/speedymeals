from fastapi import APIRouter, HTTPException, Query, status

from app.core.maps_client import MapsError
from app.platform.location import service
from app.platform.location.schemas import ReverseGeocodeResponseSchema

router = APIRouter(prefix="/api/v1/location", tags=["location"])


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponseSchema)
async def reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
):
    """
    Reverse geocode latitude and longitude to a human-readable address.
    """
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
