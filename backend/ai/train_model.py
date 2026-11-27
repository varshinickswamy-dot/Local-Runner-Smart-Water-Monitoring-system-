import os
import json
import joblib
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
    roc_auc_score
)


# ============================================================
# JalRakshak AI
# Phase 14 - Isolation Forest Model Training
# ============================================================


# ------------------------------------------------------------
# 1. PATHS
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "jalrakshak_ai_sensor_dataset.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "isolation_forest.pkl"
)

REPORT_PATH = os.path.join(
    MODEL_DIR,
    "training_report.json"
)


# Create models folder if it doesn't exist
os.makedirs(MODEL_DIR, exist_ok=True)


# ------------------------------------------------------------
# 2. FEATURES USED BY THE AI MODEL
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
# 3. LOAD DATASET
# ------------------------------------------------------------

print("\n" + "=" * 60)
print("JalRakshak AI - Phase 14")
print("Isolation Forest Model Training")
print("=" * 60)

print("\nLoading dataset...")

if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(
        f"\nDataset not found:\n{DATASET_PATH}\n"
        "\nMake sure the CSV is inside:\n"
        "backend/ai/dataset/"
    )


df = pd.read_csv(DATASET_PATH)

print(f"Dataset loaded successfully.")
print(f"Total records: {len(df)}")


# ------------------------------------------------------------
# 4. CHECK REQUIRED COLUMNS
# ------------------------------------------------------------

required_columns = FEATURES + ["label"]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:
    raise ValueError(
        f"\nMissing columns in dataset: {missing_columns}"
    )


# ------------------------------------------------------------
# 5. BASIC DATA CLEANING
# ------------------------------------------------------------

print("\nChecking dataset...")

df = df.dropna(subset=required_columns)

print(f"Records after cleaning: {len(df)}")


# ------------------------------------------------------------
# 6. DISPLAY LABEL DISTRIBUTION
# ------------------------------------------------------------

print("\nLabel distribution:")

print(df["label"].value_counts())


# ------------------------------------------------------------
# 7. CREATE ANOMALY TARGET
# ------------------------------------------------------------
#
# Isolation Forest:
#   1  = Normal
#  -1  = Anomaly
#
# Our dataset:
#   normal         = normal
#   leakage        = anomaly
#   water_quality  = anomaly
#   theft          = anomaly
#   sensor_fault   = anomaly
#
# ------------------------------------------------------------

df["is_anomaly"] = (
    df["label"].str.lower() != "normal"
).astype(int)


# ------------------------------------------------------------
# 8. SEPARATE FEATURES AND TARGET
# ------------------------------------------------------------

X = df[FEATURES]

y = df["is_anomaly"]


# ------------------------------------------------------------
# 9. TRAIN / TEST SPLIT
# ------------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print("\nDataset split:")
print(f"Training samples: {len(X_train)}")
print(f"Testing samples : {len(X_test)}")


# ------------------------------------------------------------
# 10. TRAIN ONLY ON NORMAL DATA
# ------------------------------------------------------------
#
# This is important for anomaly detection.
#
# The AI learns what NORMAL water-system behaviour looks like.
# Later, unusual behaviour can be detected as an anomaly.
#
# ------------------------------------------------------------

normal_training_mask = y_train == 0

X_train_normal = X_train[normal_training_mask]

print(
    f"\nNormal samples used for AI training: "
    f"{len(X_train_normal)}"
)


# ------------------------------------------------------------
# 11. CREATE ISOLATION FOREST PIPELINE
# ------------------------------------------------------------

model_pipeline = Pipeline(
    steps=[
        (
            "scaler",
            StandardScaler()
        ),
        (
            "isolation_forest",
            IsolationForest(
                n_estimators=200,
                contamination="auto",
                random_state=42,
                n_jobs=-1
            )
        )
    ]
)


# ------------------------------------------------------------
# 12. TRAIN MODEL
# ------------------------------------------------------------

print("\nTraining Isolation Forest model...")

model_pipeline.fit(X_train_normal)

print("Model training completed successfully.")


# ------------------------------------------------------------
# 13. PREDICT TEST DATA
# ------------------------------------------------------------

print("\nEvaluating model...")

raw_predictions = model_pipeline.predict(X_test)


# Isolation Forest:
# -1 = anomaly
#  1 = normal

predicted_anomaly = (
    raw_predictions == -1
).astype(int)


# ------------------------------------------------------------
# 14. GET ANOMALY SCORES
# ------------------------------------------------------------
#
# Lower decision_function value = more anomalous.
#
# We multiply by -1 so:
# Higher anomaly score = more anomalous
#
# ------------------------------------------------------------

decision_scores = model_pipeline.decision_function(
    X_test
)

anomaly_scores = -decision_scores


# ------------------------------------------------------------
# 15. EVALUATION METRICS
# ------------------------------------------------------------

accuracy = accuracy_score(
    y_test,
    predicted_anomaly
)

f1 = f1_score(
    y_test,
    predicted_anomaly,
    zero_division=0
)

try:
    roc_auc = roc_auc_score(
        y_test,
        anomaly_scores
    )
except ValueError:
    roc_auc = None


print("\n" + "-" * 60)
print("MODEL PERFORMANCE")
print("-" * 60)

print(f"Accuracy : {accuracy:.4f}")
print(f"F1 Score : {f1:.4f}")

if roc_auc is not None:
    print(f"ROC-AUC  : {roc_auc:.4f}")


# ------------------------------------------------------------
# 16. CLASSIFICATION REPORT
# ------------------------------------------------------------

print("\nClassification Report:")

report = classification_report(
    y_test,
    predicted_anomaly,
    target_names=[
        "Normal",
        "Anomaly"
    ],
    zero_division=0
)

print(report)


# ------------------------------------------------------------
# 17. CONFUSION MATRIX
# ------------------------------------------------------------

matrix = confusion_matrix(
    y_test,
    predicted_anomaly
)

print("Confusion Matrix:")
print(matrix)


# ------------------------------------------------------------
# 18. SAVE MODEL
# ------------------------------------------------------------

model_artifact = {
    "model": model_pipeline,
    "features": FEATURES,
    "model_name": "Isolation Forest",
    "version": "1.0",
    "description": (
        "JalRakshak AI anomaly detection model "
        "for water monitoring sensor data."
    )
}


joblib.dump(
    model_artifact,
    MODEL_PATH
)

print("\nModel saved successfully:")
print(MODEL_PATH)


# ------------------------------------------------------------
# 19. SAVE TRAINING REPORT
# ------------------------------------------------------------

training_report = {
    "model_name": "Isolation Forest",
    "version": "1.0",
    "dataset": "jalrakshak_ai_sensor_dataset.csv",
    "total_records": int(len(df)),
    "training_samples": int(len(X_train_normal)),
    "testing_samples": int(len(X_test)),
    "features": FEATURES,
    "accuracy": float(accuracy),
    "f1_score": float(f1),
    "roc_auc": (
        float(roc_auc)
        if roc_auc is not None
        else None
    ),
    "labels": {
        "normal": "Normal",
        "anomaly": [
            "leakage",
            "water_quality",
            "theft",
            "sensor_fault"
        ]
    }
}


with open(
    REPORT_PATH,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        training_report,
        file,
        indent=4
    )


print("\nTraining report saved:")
print(REPORT_PATH)


# ------------------------------------------------------------
# 20. FINAL MESSAGE
# ------------------------------------------------------------

print("\n" + "=" * 60)
print("PHASE 14 COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nGenerated files:")

print("1. isolation_forest.pkl")
print("2. training_report.json")

print("\nNext phase:")
print("Phase 15 - AI Backend Integration")
print("=" * 60)