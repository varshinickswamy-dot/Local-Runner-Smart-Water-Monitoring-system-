import os
import joblib
import pandas as pd


# ============================================================
# JalRakshak AI
# Phase 15 - AI Predictor
# ============================================================


# ------------------------------------------------------------
# 1. MODEL PATH
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "isolation_forest.pkl"
)


# ------------------------------------------------------------
# 2. REQUIRED FEATURES
# ------------------------------------------------------------

FEATURES = [
    "flow_rate",
    "pressure_bar",
    "ph",
    "turbidity",
    "tds",
    "total_litres",
    "hour_of_day",
    "day_of_week"
]


# ------------------------------------------------------------
# 3. LOAD TRAINED MODEL
# ------------------------------------------------------------

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"AI model not found at: {MODEL_PATH}"
    )

artifact = joblib.load(MODEL_PATH)

if not isinstance(artifact, dict) or "model" not in artifact:
    raise ValueError(
        "Invalid AI model file. Expected a model artifact "
        "containing a 'model' key."
    )

model = artifact["model"]


# ------------------------------------------------------------
# 4. DETERMINE POSSIBLE CAUSE
# ------------------------------------------------------------

def determine_possible_cause(data):
    """
    Provides an understandable possible cause
    when the AI detects abnormal sensor behaviour.
    """

    flow = float(data.get("flow_rate", 0))
    pressure = float(data.get("pressure_bar", 0))
    ph = float(data.get("ph", 7))
    turbidity = float(data.get("turbidity", 0))
    tds = float(data.get("tds", 0))

    # Possible leakage
    if pressure < 0.7 and flow > 15:
        return "Possible water leakage"

    # Possible theft / unauthorized usage
    if flow > 20 and pressure >= 0.5:
        return "Possible unauthorized water usage"

    # Poor water quality
    if ph < 6.5 or ph > 8.5:
        return "Abnormal pH level"

    if turbidity > 5:
        return "High water turbidity"

    # TDS abnormality
    if tds <= 0:
        return "Possible TDS sensor fault"

    # Sensor problem
    if (
        flow < 0
        or pressure < 0
        or turbidity < 0
    ):
        return "Possible sensor malfunction"

    return "Unusual sensor behaviour"


# ------------------------------------------------------------
# 5. CALCULATE RISK LEVEL
# ------------------------------------------------------------

def calculate_risk(anomaly, anomaly_score):
    """
    Converts AI anomaly detection into a simple
    risk level for the dashboard.
    """

    if not anomaly:
        return "LOW"

    # Higher score = more anomalous
    if anomaly_score >= 0.25:
        return "CRITICAL"

    if anomaly_score >= 0.15:
        return "HIGH"

    if anomaly_score >= 0.05:
        return "MEDIUM"

    return "LOW"


# ------------------------------------------------------------
# 6. MAIN AI PREDICTION FUNCTION
# ------------------------------------------------------------

def predict_sensor_data(data):
    """
    Analyze one sensor reading using the trained
    Isolation Forest model.

    Returns only standard Python types so the result
    can be safely stored in MongoDB.
    """

    # Create feature dictionary
    feature_data = {}

    for feature in FEATURES:
        value = data.get(feature, 0)

        try:
            feature_data[feature] = float(value)
        except (TypeError, ValueError):
            raise ValueError(
                f"Invalid value for AI feature '{feature}': {value}"
            )

    # Convert to DataFrame
    input_data = pd.DataFrame(
        [feature_data],
        columns=FEATURES
    )

    # AI prediction
    prediction = model.predict(input_data)[0]

    # Isolation Forest:
    #  1  = Normal
    # -1  = Anomaly
    anomaly = bool(int(prediction) == -1)

    # AI decision score
    decision_score = model.decision_function(
        input_data
    )[0]

    # Convert so higher = more anomalous
    anomaly_score = float(-float(decision_score))

    # Round as a normal Python float
    anomaly_score = float(
        round(anomaly_score, 4)
    )

    # Risk level
    risk = calculate_risk(
        anomaly,
        anomaly_score
    )

    # Possible cause
    if anomaly:
        possible_cause = determine_possible_cause(
            data
        )
    else:
        possible_cause = "Normal sensor behaviour"

    # IMPORTANT:
    # Explicitly convert every returned value to
    # standard Python types. This prevents MongoDB
    # BSON errors such as np.True_.
    return {
        "anomaly": bool(anomaly),
        "prediction": str(
            "ANOMALY"
            if anomaly
            else "NORMAL"
        ),
        "anomaly_score": float(
            anomaly_score
        ),
        "risk": str(risk),
        "possible_cause": str(
            possible_cause
        )
    }


# ------------------------------------------------------------
# 7. TEST FUNCTION
# ------------------------------------------------------------

if __name__ == "__main__":

    print("\n" + "=" * 60)
    print("JalRakshak AI - Predictor Test")
    print("=" * 60)

    test_data = {
        "flow_rate": 10.5,
        "pressure_bar": 2.2,
        "ph": 7.2,
        "turbidity": 1.5,
        "tds": 450,
        "total_litres": 1500,
        "hour_of_day": 12,
        "day_of_week": 1
    }

    result = predict_sensor_data(
        test_data
    )

    print("\nTest sensor data:")
    print(test_data)

    print("\nAI prediction:")

    for key, value in result.items():
        print(
            f"{key}: {value} "
            f"(Python type: {type(value).__name__})"
        )

    print("\n" + "=" * 60)
    print("PREDICTOR TEST COMPLETED")
    print("=" * 60)
