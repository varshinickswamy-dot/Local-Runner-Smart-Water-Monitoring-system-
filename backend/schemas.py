from pydantic import BaseModel, Field


class SensorData(BaseModel):
    device_id: str = Field(..., min_length=1)
    zone_id: str = Field(..., min_length=1)

    flow_rate: float = Field(..., ge=0)
    pressure_bar: float = Field(..., ge=0)
    ph: float = Field(..., ge=0, le=14)
    turbidity: float = Field(..., ge=0)
    tds: float = Field(..., ge=0)
    total_litres: float = Field(..., ge=0)

    status: str
    alert: str