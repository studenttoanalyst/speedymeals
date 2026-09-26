from pydantic import BaseModel, Field


class AddressComponentsSchema(BaseModel):
    street: str = Field(default="", description="Street number and name")
    neighborhood: str = Field(default="", description="Neighborhood / sublocality")
    city: str = Field(default="", description="City / locality")


class ReverseGeocodeResponseSchema(BaseModel):
    formatted_address: str = Field(..., description="Full human-readable address string")
    place_id: str = Field(..., description="Google Place ID string")
    components: AddressComponentsSchema = Field(..., description="Structured address components")
