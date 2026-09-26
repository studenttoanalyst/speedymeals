from pydantic import BaseModel, Field


class AddressComponentsSchema(BaseModel):
    street: str = Field(default="", description="Street number and name")
    neighborhood: str = Field(default="", description="Neighborhood / sublocality")
    city: str = Field(default="", description="City / locality")


class ReverseGeocodeResponseSchema(BaseModel):
    formatted_address: str = Field(..., description="Full human-readable address string")
    place_id: str = Field(..., description="Google Place ID string")
    components: AddressComponentsSchema = Field(..., description="Structured address components")


class PlacePredictionSchema(BaseModel):
    place_id: str = Field(..., description="Google Place ID")
    description: str = Field(..., description="Full description string of the suggested location")


class PlaceDetailsResponseSchema(BaseModel):
    place_id: str = Field(..., description="Google Place ID")
    formatted_address: str = Field(..., description="Formatted address string")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    components: AddressComponentsSchema = Field(..., description="Structured address components")

