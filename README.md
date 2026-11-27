# JalRakshak AI

Smart Water Monitoring System with AI-based leakage, theft and water-quality detection using a physical ESP32 sensor device.

## Hardware data mode

This repository is configured for one physical ESP32 device (JAL-ESP32-001, ZONE-01). The multi-zone simulator has been removed from the normal project and sensor ingestion accepts only payloads explicitly tagged with source=ESP32.

The dashboard, device list, history, alerts and zone map are backed by ESP32-tagged sensor readings. Old simulator records in MongoDB are ignored by these monitoring APIs; they are not deleted.

### Supported sensor telemetry
- Flow rate
- Water pressure
- pH
- Turbidity
- Total dissolved solids (TDS)
- Accumulated water volume

### Important hardware limitation
The current device setup is sensor-only. Motor, smart-valve, automatic-control and emergency-shutdown actions are intentionally disabled. They require physical relay/actuator hardware and corresponding ESP32 firmware before they can safely operate.

## Connect the physical ESP32

1. Configure the sensor pins, device ID, Wi-Fi credentials and backend URL in esp32/JalRakshakDevice/JalRakshakDevice.ino.
2. Upload the firmware to the ESP32.
3. For USB mode, start the backend and frontend, then run connect-esp32.bat on Windows. The bridge forwards serial readings to the backend.
4. For Wi-Fi mode, configure WIFI_SSID, WIFI_PASSWORD and SERVER_URL in the firmware. The ESP32 and backend must be able to reach each other.
5. Confirm that the device status becomes ONLINE and that new timestamps/readings appear on the dashboard.

## Setup
1. Configure backend environment variables in a local backend/.env file. Do not commit secrets.
2. Install backend dependencies in a virtual environment using the backend dependency manifest.
3. Install frontend dependencies with cd frontend && npm install.
4. Start the backend and frontend using start-jalrakshak.bat on the configured Windows development machine.
5. Connect the ESP32 separately using the USB or Wi-Fi method above.

## Security
Environment files, local virtual environments, runtime logs, caches and generated build folders are excluded from this repository. Keep credentials in local environment variables and never commit access tokens or passwords.
