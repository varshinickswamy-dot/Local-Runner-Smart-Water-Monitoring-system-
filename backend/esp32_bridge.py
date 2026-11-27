import re
import sys
import json
import time
import argparse
from datetime import datetime

import requests
import serial
import serial.tools.list_ports


# =====================================================
# JalRakshak AI - ESP32 USB (serial) bridge
# =====================================================
#
# Reads sensor readings that a USB-connected ESP32 prints
# on its serial port and sends them to the JalRakshak AI
# backend, exactly like a WiFi device would.
#
# The ESP32 can print one reading per line, either as JSON:
#   {"flow_rate": 12.5, "pressure_bar": 0.82, "ph": 7.1,
#    "turbidity": 2.3, "tds": 150}
# or as plain text:
#   Flow: 12.5 L/min, Pressure: 0.82 bar, pH: 7.1, Turbidity: 2.3, TDS: 150
#
# Usage:
#   python esp32_bridge.py              (finds the ESP32 automatically)
#   python esp32_bridge.py --port COM5 --baud 115200
#   python esp32_bridge.py --raw        (only show what the ESP32 prints)
# =====================================================

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SERVER_URL = "http://127.0.0.1:8000/api/sensor-data"

# USB-to-serial chips used on ESP32 boards (vendor id, product id)
ESP32_USB_IDS = {
    (0x10C4, 0xEA60): "CP210x",
    (0x1A86, 0x7523): "CH340",
    (0x1A86, 0x55D4): "CH9102",
    (0x303A, 0x1001): "ESP32-S3/C3 USB",
    (0x0403, 0x6001): "FTDI",
}

# Names the ESP32 code may use -> backend field
FIELD_ALIASES = {
    "flow_rate": ["flow_rate", "flowrate", "flow", "flow_lpm", "water_flow"],
    "pressure_bar": ["pressure_bar", "pressure", "press", "pressurebar"],
    "ph": ["ph", "ph_value", "phvalue"],
    "turbidity": ["turbidity", "turb", "ntu"],
    "tds": ["tds", "tds_ppm", "ppm"],
    "total_litres": ["total_litres", "total_liters", "totallitres", "total",
                     "litres", "liters", "volume", "total_water"],
}

SENSOR_FIELDS = ["flow_rate", "ph", "turbidity", "tds"]

# Used for sensors the ESP32 does not have. These are normal
# values, so a missing sensor does not cause false alerts
# (pH 0 or pressure 0 would look like a real problem).
PLACEHOLDERS = {
    "flow_rate": 0.0,
    "pressure_bar": 0.85,
    "ph": 7.0,
    "turbidity": 1.0,
    "tds": 150.0,
}


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


ALIAS_LOOKUP = {
    normalize(alias): field
    for field, aliases in FIELD_ALIASES.items()
    for alias in aliases
}


# -----------------------------------------------------
# Finding the ESP32
# -----------------------------------------------------

def find_esp32_port():
    ports = list(serial.tools.list_ports.comports())

    for port in ports:
        chip = ESP32_USB_IDS.get((port.vid, port.pid))
        if chip:
            return port.device, chip

    if len(ports) == 1:
        return ports[0].device, ports[0].description

    return None, None


# -----------------------------------------------------
# Parsing one line from the ESP32
# -----------------------------------------------------

def parse_line(line):
    """Returns {field: value} for every known field in the line."""

    values = {}

    # JSON line
    if line.startswith("{"):
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            return values

        for key, value in data.items():
            field = ALIAS_LOOKUP.get(normalize(str(key)))
            if field is not None:
                try:
                    values[field] = float(value)
                except (TypeError, ValueError):
                    pass
            elif key in ("device_id", "zone_id"):
                values[key] = str(value)

        return values

    # Plain text: "Name: 12.3 unit" / "Name=12.3" pairs
    for name, number in re.findall(
        r"([A-Za-z][A-Za-z _\-]*?)\s*[:=]\s*(-?\d+(?:\.\d+)?)", line
    ):
        field = ALIAS_LOOKUP.get(normalize(name))
        if field is not None:
            values[field] = float(number)

    return values


# -----------------------------------------------------
# Sending to the backend
# -----------------------------------------------------

def send(reading):
    """Returns (message, status_line_for_esp32 or None)."""
    try:
        response = requests.post(SERVER_URL, json=reading, timeout=5)
    except requests.exceptions.ConnectionError:
        return "❌ backend not reachable (is it running on port 8000?)", None
    except requests.exceptions.Timeout:
        return "❌ backend timed out", None

    if response.status_code != 200:
        return f"❌ backend error {response.status_code}: {response.text[:200]}", None

    result = response.json()
    detection = result.get("detection", {})
    status = detection.get("overall_status", "NORMAL")
    alerts = result.get("alerts_created", 0)

    if detection.get("leakage", {}).get("detected"):
        problem = "LEAKAGE"
    elif detection.get("theft", {}).get("suspicious"):
        problem = "THEFT"
    elif detection.get("water_quality", {}).get("problem"):
        problem = "QUALITY"
    else:
        problem = ""

    # Sent back to the ESP32 so its LCD shows the website's verdict
    status_line = f"STATUS:{status}:{problem}\n"

    return f"✅ sent  status={status}  alerts={alerts}", status_line


def main():
    parser = argparse.ArgumentParser(description="JalRakshak AI ESP32 USB bridge")
    parser.add_argument("--port", help="Serial port, e.g. COM5 (default: auto-detect)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default 115200)")
    parser.add_argument("--device-id", default="JAL-ESP32-001")
    parser.add_argument("--zone-id", default="ZONE-01",
                        help="Map zone for this device (default ZONE-01, Malleshwaram)")
    parser.add_argument("--raw", action="store_true",
                        help="Only print what the ESP32 sends; do not forward it")
    args = parser.parse_args()

    port, chip = (args.port, "manual") if args.port else find_esp32_port()

    if not port:
        print("❌ No ESP32 found on any COM port.")
        print("   - Is the USB cable plugged in (and is it a DATA cable, not charge-only)?")
        print("   - Is the CP210x / CH340 driver installed? (Device Manager > Ports (COM & LPT))")
        print("   Available ports:", [p.device for p in serial.tools.list_ports.comports()] or "none")
        sys.exit(1)

    print("=" * 60)
    print("  JALRAKSHAK AI - ESP32 USB BRIDGE")
    print("=" * 60)
    print(f"  Port   : {port} ({chip}) @ {args.baud} baud")
    print(f"  Device : {args.device_id}   Zone: {args.zone_id}")
    print(f"  Mode   : {'RAW (just showing ESP32 output)' if args.raw else 'forwarding to ' + SERVER_URL}")
    print("  Press CTRL + C to stop.")
    print("=" * 60)

    try:
        connection = serial.Serial(port, args.baud, timeout=2)
    except serial.SerialException as error:
        print(f"❌ Cannot open {port}: {error}")
        print("   Close the Arduino IDE Serial Monitor (only one program can use the port).")
        sys.exit(1)

    total_litres = 0.0
    last_time = None
    warned_missing = set()

    try:
        while True:
            raw = connection.readline()

            if not raw:
                continue

            line = raw.decode("utf-8", errors="replace").strip()

            if not line:
                continue

            now = datetime.now().strftime("%H:%M:%S")

            if args.raw:
                print(f"{now}  {line}")
                continue

            values = parse_line(line)
            sensors = {k: v for k, v in values.items() if k in SENSOR_FIELDS}

            if not sensors:
                # Boot messages, debug prints, etc.
                print(f"{now}  (ignored) {line[:100]}")
                continue

            # Count total water from flow if the ESP32 does not send it
            if "total_litres" in values:
                total_litres = values["total_litres"]
            elif "flow_rate" in sensors:
                current = time.monotonic()
                if last_time is not None:
                    total_litres += sensors["flow_rate"] * (current - last_time) / 60
                last_time = current

            missing = [field for field in SENSOR_FIELDS if field not in sensors]
            if missing:
                print("Waiting for actual ESP32 fields: " + ", ".join(missing))
                continue

            reading = {
                "device_id": values.get("device_id", args.device_id),
                "zone_id": values.get("zone_id", args.zone_id),
                "source": "ESP32",
                **{field: max(0.0, sensors.get(field, PLACEHOLDERS[field]))
                   for field in SENSOR_FIELDS},
                "total_litres": round(max(0.0, total_litres), 2),
                "status": "NORMAL",
                "alert": "Real ESP32 reading (four connected sensors only)",
            }

            # pH must be 0-14 for the backend
            reading["ph"] = min(reading["ph"], 14.0)

            message, status_line = send(reading)

            if status_line:
                try:
                    connection.write(status_line.encode("ascii"))
                except serial.SerialException:
                    pass

            shown = "  ".join(f"{k}={reading[k]}" for k in SENSOR_FIELDS)
            print(f"{now}  {shown}  ->  {message}")

    except KeyboardInterrupt:
        print("\nBridge stopped.")
    except serial.SerialException as error:
        print(f"\n❌ Lost connection to the ESP32: {error}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
