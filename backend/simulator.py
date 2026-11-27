import sys
import time
import argparse
import random
import requests
from datetime import datetime

from zones import ZONES


# =====================================================
# JalRakshak AI - Multi-Zone ESP32 Simulator
# =====================================================
#
# Simulates one ESP32 monitoring device in every zone of
# the water network (see zones.py). Most of the time all
# zones are normal; every so often one zone develops a
# leakage, theft or water quality problem so the live zone
# map and instant alerts have something to show.
# =====================================================

# Windows consoles default to cp1252, which cannot print emoji.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SERVER_URL = "http://127.0.0.1:8000/api/sensor-data"

SEND_INTERVAL = 5

# Each "block" lasts this many send cycles. Blocks alternate
# between all-normal and one zone having an incident.
CYCLES_PER_BLOCK = 3

INCIDENT_TYPES = ["LEAKAGE", "THEFT", "QUALITY"]


# =====================================================
# SENSOR VALUES
# =====================================================

total_litres = {
    zone["device_id"]: random.uniform(400.0, 900.0)
    for zone in ZONES
}


def build_reading(zone, flow_rate, pressure_bar, ph,
                  turbidity, tds, status, alert):

    device_id = zone["device_id"]

    total_litres[device_id] += flow_rate / 12

    return {
        "device_id": device_id,
        "zone_id": zone["zone_id"],
        "source": "SIMULATOR",

        "flow_rate": flow_rate,
        "pressure_bar": pressure_bar,
        "ph": ph,
        "turbidity": turbidity,
        "tds": tds,

        "total_litres": round(total_litres[device_id], 2),

        "status": status,
        "alert": alert
    }


# =====================================================
# NORMAL SENSOR DATA
# =====================================================

def generate_normal_reading(zone):

    return build_reading(
        zone,
        flow_rate=round(random.uniform(10.0, 15.0), 2),
        pressure_bar=round(random.uniform(0.75, 0.95), 2),
        ph=round(random.uniform(6.8, 7.5), 2),
        turbidity=round(random.uniform(1.0, 3.0), 2),
        tds=round(random.uniform(100, 180), 2),
        status="NORMAL",
        alert="All systems normal"
    )


# =====================================================
# LEAKAGE SIMULATION
# =====================================================

def generate_leakage_reading(zone):

    return build_reading(
        zone,
        flow_rate=round(random.uniform(8.0, 12.0), 2),
        pressure_bar=round(random.uniform(0.25, 0.45), 2),
        ph=round(random.uniform(6.8, 7.5), 2),
        turbidity=round(random.uniform(1.0, 3.0), 2),
        tds=round(random.uniform(100, 180), 2),
        status="CRITICAL",
        alert="Possible water leakage detected"
    )


# =====================================================
# THEFT SIMULATION
# =====================================================

def generate_theft_reading(zone):

    return build_reading(
        zone,
        flow_rate=round(random.uniform(22.0, 35.0), 2),
        pressure_bar=round(random.uniform(0.75, 1.0), 2),
        ph=round(random.uniform(6.8, 7.5), 2),
        turbidity=round(random.uniform(1.0, 3.0), 2),
        tds=round(random.uniform(100, 180), 2),
        status="WARNING",
        alert="Suspicious water usage detected"
    )


# =====================================================
# WATER QUALITY SIMULATION
# =====================================================

def generate_quality_problem_reading(zone):

    # Abnormal pH
    ph = round(random.choice([
        random.uniform(4.5, 6.0),
        random.uniform(9.0, 10.5)
    ]), 2)

    return build_reading(
        zone,
        flow_rate=round(random.uniform(10.0, 15.0), 2),
        pressure_bar=round(random.uniform(0.75, 0.95), 2),
        ph=ph,
        turbidity=round(random.uniform(6.0, 12.0), 2),
        tds=round(random.uniform(100, 180), 2),
        status="WARNING",
        alert="Abnormal water quality detected"
    )


GENERATORS = {
    "LEAKAGE": generate_leakage_reading,
    "THEFT": generate_theft_reading,
    "QUALITY": generate_quality_problem_reading,
}


# =====================================================
# SEND DATA TO FASTAPI
# =====================================================

def send_sensor_data(zone, data, label):

    try:

        response = requests.post(
            SERVER_URL,
            json=data,
            timeout=5
        )

        result = (
            "OK" if response.status_code == 200
            else f"SERVER ERROR {response.status_code}"
        )

        print(
            f"{datetime.now().strftime('%H:%M:%S')}  "
            f"{zone['zone_id']} {zone['name_en']:<16} "
            f"{label:<10} "
            f"flow {data.get('flow_rate', '--')}} L/min  "
            f"pressure {data.get('pressure_bar', '--')}} bar  "
            f"pH {data.get('ph', '--')}}  "
            f"-> {result}"
        )

    except requests.exceptions.ConnectionError:

        print("❌ Cannot connect to FastAPI. "
              "Make sure FastAPI is running on port 8000.")

    except requests.exceptions.Timeout:

        print("❌ Request timed out.")

    except Exception as error:

        print(f"❌ Error: {error}")


# =====================================================
# INCIDENT SCHEDULE
# =====================================================

def current_incident(cycle):
    """
    Returns (zone_id, incident_type) for the zone that has a
    problem during this cycle, or (None, None) when every
    zone is normal.
    """

    block = cycle // CYCLES_PER_BLOCK

    # Even blocks: everything normal.
    if block % 2 == 0:
        return None, None

    incident_number = block // 2

    zone = ZONES[incident_number % len(ZONES)]

    # Rotate the incident type so each zone sees
    # different kinds of problems over time.
    incident_type = INCIDENT_TYPES[
        (incident_number + incident_number // len(ZONES))
        % len(INCIDENT_TYPES)
    ]

    return zone["zone_id"], incident_type


# =====================================================
# MAIN SIMULATION
# =====================================================

def main():

    parser = argparse.ArgumentParser(description="JalRakshak AI multi-zone simulator")
    parser.add_argument(
        "--exclude-zone",
        action="append",
        default=[],
        metavar="ZONE_ID",
        help="Do not simulate this zone (e.g. a real ESP32 reports it). Can be repeated."
    )
    args = parser.parse_args()

    zones = [zone for zone in ZONES if zone["zone_id"] not in args.exclude_zone]

    print("=" * 60)

    print("        JALRAKSHAK AI")
    print("        MULTI-ZONE ESP32 SIMULATOR")

    print("=" * 60)

    for zone in zones:
        print(f"{zone['device_id']}  {zone['zone_id']}  "
              f"{zone['name_en']}")

    for zone_id in args.exclude_zone:
        print(f"{zone_id}  skipped (real device)")

    print(f"Server    : {SERVER_URL}")

    print("\nSimulation started...")
    print("Press CTRL + C to stop.")

    print("=" * 60)

    cycle = 0

    try:

        while True:

            incident_zone, incident_type = current_incident(cycle)

            if incident_zone:
                print(f"\n🚨 {incident_type} TEST in {incident_zone}")
            else:
                print("\n✅ ALL ZONES NORMAL")

            for zone in zones:

                # ZONE-01 has real ESP32 flow, pH, turbidity and TDS.
                # Simulate pressure only for that zone.
                if zone["zone_id"] == "ZONE-01":
                    pressure = round(random.uniform(0.75, 0.95), 2)
                    if zone["zone_id"] == incident_zone and incident_type == "LEAKAGE":
                        pressure = round(random.uniform(0.25, 0.45), 2)
                    data = {
                        "device_id": zone["device_id"],
                        "zone_id": zone["zone_id"],
                        "source": "SIMULATOR",
                        "pressure_bar": pressure,
                        "status": "NORMAL" if pressure >= 0.5 else "CRITICAL",
                        "alert": "Simulated pressure telemetry; no physical pressure sensor installed",
                    }
                    send_sensor_data(zone, data, "PRESSURE")
                    continue

                if zone["zone_id"] == incident_zone:
                    data = GENERATORS[incident_type](zone)
                    label = incident_type
                else:
                    data = generate_normal_reading(zone)
                    label = "NORMAL"

                send_sensor_data(zone, data, label)

            cycle += 1

            time.sleep(SEND_INTERVAL)

    except KeyboardInterrupt:

        print("\n\nSimulation stopped.")

        print("JalRakshak AI ESP32 Simulator closed.")


# =====================================================
# PROGRAM START
# =====================================================

if __name__ == "__main__":
    main()
