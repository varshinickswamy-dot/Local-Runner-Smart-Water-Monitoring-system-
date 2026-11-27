from typing import Literal, Optional
from pydantic import BaseModel, Field


class SensorData(BaseModel):
    """Source-aware telemetry. Only fields actually sent by a source are retained."""
    device_id: str = Field(..., min_length=1)
    zone_id: str = Field(..., min_length=1)
    source: Literal["ESP32", "SIMULATOR"]

    flow_rate: Optional[float] = Field(None, ge=0)
    pressure_bar: Optional[float] = Field(None, ge=0)
    ph: Optional[float] = Field(None, ge=0, le=14)
    turbidity: Optional[float] = Field(None, ge=0)
    tds: Optional[float] = Field(None, ge=0)
    total_litres: Optional[float] = Field(None, ge=0)

    status: str = "NORMAL"
    alert: str = ""
