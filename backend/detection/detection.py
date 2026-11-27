def analyze_sensor_data(
    flow_rate: float,
    pressure_bar: float | None,
    ph: float,
    turbidity: float,
    tds: float,
    total_litres: float
):
    """
    Server-side detection engine for JalRakshak AI.

    This version uses rule-based detection.
    AI detection will be added later.
    """

    # -------------------------------------------------
    # Default values
    # -------------------------------------------------

    leakage_detected = False
    quality_problem = False
    pressure_problem = False
    theft_suspicion = False
    sensor_problem = False

    leakage_level = "NORMAL"
    quality_status = "GOOD"
    theft_level = "NORMAL"
    sensor_status = "NORMAL"

    leakage_reason = "No leakage detected"
    quality_reason = "Water quality is within normal range"
    theft_reason = "No suspicious consumption detected"
    sensor_reason = "Sensors are operating normally"

    # -------------------------------------------------
    # 1. LEAKAGE DETECTION
    # -------------------------------------------------

    # Critical leakage:
    # High flow + very low pressure
    if pressure_bar is not None and pressure_bar < 0.5 and flow_rate > 5.0:

        leakage_detected = True
        leakage_level = "CRITICAL"

        leakage_reason = (
            "High water flow detected with very low pressure"
        )

    # Very high flow with low pressure
    elif pressure_bar is not None and pressure_bar < 0.7 and flow_rate > 30.0:

        leakage_detected = True
        leakage_level = "MAJOR"

        leakage_reason = (
            "Extremely high flow detected with reduced pressure"
        )

    # Moderate flow abnormality with reduced pressure
    elif pressure_bar is not None and pressure_bar < 0.7 and flow_rate > 20.0:

        leakage_detected = True
        leakage_level = "MODERATE"

        leakage_reason = (
            "High water flow detected with reduced pressure"
        )

    # Slightly abnormal flow with reduced pressure
    elif pressure_bar is not None and pressure_bar < 0.7 and flow_rate > 15.0:

        leakage_detected = True
        leakage_level = "MINOR"

        leakage_reason = (
            "Elevated water flow detected with reduced pressure"
        )

    # -------------------------------------------------
    # 2. PRESSURE DETECTION
    # -------------------------------------------------

    if pressure_bar is not None and pressure_bar < 0.5:
        pressure_problem = True

    # -------------------------------------------------
    # 3. WATER QUALITY DETECTION
    # -------------------------------------------------

    if ph < 6.5 or ph > 8.5:

        quality_problem = True
        quality_status = "WARNING"
        quality_reason = "pH value is outside the normal range"

    if turbidity > 5.0:

        quality_problem = True
        quality_status = "WARNING"
        quality_reason = "Turbidity is above the normal limit"

    # More severe quality condition
    if ph < 5.5 or ph > 9.5 or turbidity > 10.0:

        quality_problem = True
        quality_status = "CRITICAL"

        quality_reason = (
            "Water quality parameters indicate a critical condition"
        )

    # -------------------------------------------------
    # 4. TDS DETECTION
    # -------------------------------------------------

    # TDS limit will be made configurable later.
    if tds < 0:

        quality_problem = True
        quality_status = "CRITICAL"
        quality_reason = "Invalid TDS sensor reading"

    # -------------------------------------------------
    # 5. BASIC THEFT SUSPICION
    # -------------------------------------------------

    # With one flow sensor, theft cannot be mathematically
    # proven. We identify suspicious consumption instead.

    if pressure_bar is not None and flow_rate > 20.0 and pressure_bar >= 0.5:

        theft_suspicion = True
        theft_level = "POSSIBLE_THEFT"

        theft_reason = (
            "High water flow detected while pressure remains normal"
        )

    # -------------------------------------------------
    # 6. SENSOR FAILURE DETECTION
    # -------------------------------------------------

    if (
        flow_rate < 0
        or pressure_bar < 0
        or ph < 0
        or ph > 14
        or turbidity < 0
        or tds < 0
        or total_litres < 0
    ):

        sensor_problem = True
        sensor_status = "FAULT"

        sensor_reason = (
            "One or more sensor values are invalid"
        )

    # -------------------------------------------------
    # 7. OVERALL SYSTEM STATUS
    # -------------------------------------------------

    if leakage_level == "CRITICAL":

        overall_status = "CRITICAL"

    elif quality_status == "CRITICAL":

        overall_status = "CRITICAL"

    elif leakage_detected or quality_problem or theft_suspicion:

        overall_status = "WARNING"

    else:

        overall_status = "NORMAL"

    # -------------------------------------------------
    # Return complete detection result
    # -------------------------------------------------

    return {
        "overall_status": overall_status,

        "leakage": {
            "detected": leakage_detected,
            "level": leakage_level,
            "reason": leakage_reason
        },

        "pressure": {
            "problem": pressure_problem
        },

        "water_quality": {
            "problem": quality_problem,
            "status": quality_status,
            "reason": quality_reason
        },

        "theft": {
            "suspicious": theft_suspicion,
            "level": theft_level,
            "reason": theft_reason
        },

        "sensor_health": {
            "status": sensor_status,
            "reason": sensor_reason
        }
    }