from datetime import datetime, timezone


def create_alerts(
    device_id: str,
    zone_id: str,
    detection_result: dict
):
    """
    Converts detection results into alert documents
    for JalRakshak AI.
    """

    alerts = []

    # -------------------------------------------------
    # 1. LEAKAGE ALERT
    # -------------------------------------------------

    leakage = detection_result["leakage"]

    if leakage["detected"]:

        severity_map = {
            "MINOR": "MEDIUM",
            "MODERATE": "HIGH",
            "MAJOR": "HIGH",
            "CRITICAL": "CRITICAL"
        }

        severity = severity_map.get(
            leakage["level"],
            "MEDIUM"
        )

        alerts.append({
            "device_id": device_id,
            "zone_id": zone_id,
            "type": "LEAKAGE",
            "severity": severity,
            "level": leakage["level"],
            "message": leakage["reason"],
            "status": "ACTIVE",
            "timestamp": datetime.now(timezone.utc)
        })

    # -------------------------------------------------
    # 2. WATER QUALITY ALERT
    # -------------------------------------------------

    quality = detection_result["water_quality"]

    if quality["problem"]:

        if quality["status"] == "CRITICAL":
            severity = "CRITICAL"
        else:
            severity = "HIGH"

        alerts.append({
            "device_id": device_id,
            "zone_id": zone_id,
            "type": "WATER_QUALITY",
            "severity": severity,
            "level": quality["status"],
            "message": quality["reason"],
            "status": "ACTIVE",
            "timestamp": datetime.now(timezone.utc)
        })

    # -------------------------------------------------
    # 3. THEFT ALERT
    # -------------------------------------------------

    theft = detection_result["theft"]

    if theft["suspicious"]:

        alerts.append({
            "device_id": device_id,
            "zone_id": zone_id,
            "type": "THEFT",
            "severity": "HIGH",
            "level": theft["level"],
            "message": theft["reason"],
            "status": "ACTIVE",
            "timestamp": datetime.now(timezone.utc)
        })

    # -------------------------------------------------
    # 4. SENSOR FAILURE ALERT
    # -------------------------------------------------

    sensor = detection_result["sensor_health"]

    if sensor["status"] == "FAULT":

        alerts.append({
            "device_id": device_id,
            "zone_id": zone_id,
            "type": "SENSOR_FAILURE",
            "severity": "CRITICAL",
            "level": "FAULT",
            "message": sensor["reason"],
            "status": "ACTIVE",
            "timestamp": datetime.now(timezone.utc)
        })

    return alerts