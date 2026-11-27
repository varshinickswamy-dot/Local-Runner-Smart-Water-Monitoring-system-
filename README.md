# JalRakshak AI

Smart Water Monitoring System with AI-based leakage, theft and water-quality detection using a hybrid physical + simulated telemetry model.

## Telemetry source design

The project intentionally combines one real ESP32 device with simulated measurements for hardware that is not installed:

| Zone / metric | Source | Notes |
|---|---|---|
| ZONE-01 flow rate | Physical ESP32 | Real flow sensor |
| ZONE-01 pH | Physical ESP32 | Real pH sensor |
| ZONE-01 turbidity | Physical ESP32 | Real turbidity sensor |
| ZONE-01 TDS | Physical ESP32 | Real TDS sensor |
| ZONE-01 pressure | Simulator | No physical pressure sensor is installed |
| ZONE-02 through ZONE-06 | Simulator | Virtual network zones and readings |

The ESP32 firmware and USB bridge send only the four installed sensor measurements. They do not create placeholder pressure or other missing readings. The simulator sends a pressure-only supplemental record for ZONE-01 and complete simulated records for the other zones.

Backend records retain a `source` and per-field `field_sources` map. Supplemental pressure records are stored separately and are never allowed to overwrite the four ESP32 measurements. If pressure has not arrived yet, pressure-based detection and AI analysis are marked unavailable rather than inventing a value.

## Hardware limitation

The current ESP32 installation is sensor-only. Motor, smart-valve, automatic-control and emergency-shutdown actions remain disabled because no relay or actuator hardware is installed.

## Connect the physical ESP32

1. Configure the four sensor pins, device ID, Wi-Fi credentials and backend URL in `esp32/JalRakshakDevice/JalRakshakDevice.ino`.
2. Upload the firmware to the ESP32.
3. For USB mode, start the application and run `connect-esp32.bat`. The bridge forwards actual ESP32 readings to the backend.
4. For Wi-Fi mode, configure `WIFI_SSID`, `WIFI_PASSWORD` and `SERVER_URL` in the firmware. The ESP32 and backend must be able to reach each other.
5. Confirm the physical device is reporting flow, pH, turbidity and TDS. Pressure is explicitly marked as simulator-sourced.

## Run the application

1. Configure backend environment variables in a local `backend/.env` file. Never commit secrets.
2. Install backend dependencies in the configured virtual environment.
3. Install frontend dependencies with `cd frontend && npm install`.
4. Run `start-jalrakshak.bat` on the configured Windows development machine. It starts MongoDB, FastAPI, the hybrid simulator and the React frontend.
5. For physical USB telemetry, run `connect-esp32.bat` separately after connecting the board.

## Data and safety notes

- Historical simulator records remain in MongoDB; the updated API includes both source types and excludes pressure-only supplemental records from normal reading lists.
- The simulator is test/demo data, not real measurements from the remaining network zones.
- Environment files, local virtual environments, runtime logs, caches and generated build folders must remain uncommitted.
