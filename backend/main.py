from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from schemas import SensorData
from pydantic import BaseModel

from database import (
    test_database_connection,
    sensor_readings_collection,
    alerts_collection
)

from detection.detection import analyze_sensor_data
from detection.alerts import create_alerts

# Phase 15 - AI anomaly detection
from ai.predictor import predict_sensor_data

from datetime import datetime, timezone

import anyio.from_thread

from websocket_manager import manager

# Authentication
from auth_schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from auth import (
    users_collection,
    hash_password,
    authenticate_user,
    create_access_token,
    get_current_user,
    user_to_response,
)

# Controls / software simulation layer
from controls import (
    get_control_state,
    set_valve_state,
    set_motor_state,
    set_auto_mode,
    emergency_shutdown,
    reset_emergency_shutdown,
)

# Control action history
from control_history import log_control_action, get_control_history

# Water network zones for the live zone map
from zones import RESERVOIR, ZONES


# =========================================================
# JALRAKSHAK AI - FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="JalRakshak AI",
    description=(
        "Smart Water Monitoring System with AI-Based "
        "Leakage, Theft and Water Quality Detection"
    ),
    version="1.1.0"
)


# =====================================================
# CORS CONFIGURATION
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# SETTINGS MODEL
# =========================================================

class SettingsUpdate(BaseModel):
    auto_refresh: bool = True
    refresh_interval: int = 5
    notifications: bool = True


class HistorySettingUpdate(BaseModel):
    history_enabled: bool = True


# =========================================================
# CONTROLS MODELS
# =========================================================

class ValveControlRequest(BaseModel):
    state: str


class MotorControlRequest(BaseModel):
    state: str


class AutoModeControlRequest(BaseModel):
    enabled: bool


# =========================================================
# SETTINGS COLLECTION
# =========================================================
# Uses the same MongoDB database connection already used
# by sensor_readings_collection.
# No change to database.py is required.

settings_collection = sensor_readings_collection.database["settings"]


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def startup_event():
    test_database_connection()


# =========================================================
# AUTHENTICATION API
# =========================================================

@app.post("/api/auth/register", response_model=TokenResponse)
def register_user(data: RegisterRequest):
    # Check whether username already exists.
    existing_username = users_collection.find_one(
        {"username": data.username}
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already exists"
        )

    # Check whether email already exists.
    existing_email = users_collection.find_one(
        {"email": data.email}
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    # Create the user document.
    user_document = {
        "full_name": data.full_name.strip(),
        "email": str(data.email).lower(),
        "username": data.username.strip(),
        "password_hash": hash_password(data.password),
        "role": "user",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        result = users_collection.insert_one(user_document)
    except Exception as exc:
        # Protect against a race condition with the unique indexes.
        if "duplicate key" in str(exc).lower():
            from fastapi import HTTPException
            raise HTTPException(
                status_code=409,
                detail="Username or email already registered"
            )
        raise

    user_document["_id"] = result.inserted_id

    access_token = create_access_token(
        username=user_document["username"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_to_response(user_document),
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login_user(data: LoginRequest):
    user = authenticate_user(
        username=data.username.strip(),
        password=data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )

    access_token = create_access_token(
        username=user["username"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_to_response(user),
    }


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return user_to_response(current_user)


# =========================================================
# CONTROLS API
# =========================================================
# These endpoints expose the software/simulation control layer.
# They do not directly control ESP32 hardware.
# Existing control behavior is preserved.
# Control actions are additionally stored in MongoDB history.


@app.get("/api/controls")
def get_controls(current_user=Depends(get_current_user)):
    """
    Return the current software control state.
    Authentication is required.
    """
    return {
        "success": True,
        "data": get_control_state(),
    }


@app.put("/api/controls/valve")
def update_valve_control(
    control: ValveControlRequest,
    current_user=Depends(get_current_user),
):
    raise HTTPException(status_code=409, detail="Valve control is unavailable: this ESP32 installation has sensors only and no valve actuator.")
    """
    Change the simulated smart valve state.

    Allowed states:
        OPEN
        CLOSED
    """
    before_state = get_control_state()
    previous_state = before_state["valve"]["state"]

    try:
        state = set_valve_state(control.state)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    new_state = state["valve"]["state"]

    log_control_action(
        user=current_user,
        action="VALVE_OPEN" if new_state == "OPEN" else "VALVE_CLOSE",
        target="SMART_VALVE",
        previous_state=previous_state,
        new_state=new_state,
        status="SUCCESS",
        details="Valve control changed from Controls page",
    )

    return {
        "success": True,
        "message": "Valve state updated successfully",
        "data": state,
    }


@app.put("/api/controls/motor")
def update_motor_control(
    control: MotorControlRequest,
    current_user=Depends(get_current_user),
):
    raise HTTPException(status_code=409, detail="Motor control is unavailable: this ESP32 installation has sensors only and no motor relay.")
    """
    Change the simulated motor state.

    Allowed states:
        RUNNING
        STOPPED
    """
    before_state = get_control_state()
    previous_state = before_state["motor"]["state"]

    try:
        state = set_motor_state(control.state)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    new_state = state["motor"]["state"]

    log_control_action(
        user=current_user,
        action="MOTOR_START" if new_state == "RUNNING" else "MOTOR_STOP",
        target="WATER_MOTOR",
        previous_state=previous_state,
        new_state=new_state,
        status="SUCCESS",
        details="Motor control changed from Controls page",
    )

    return {
        "success": True,
        "message": "Motor state updated successfully",
        "data": state,
    }


@app.put("/api/controls/auto-mode")
def update_auto_mode(
    control: AutoModeControlRequest,
    current_user=Depends(get_current_user),
):
    raise HTTPException(status_code=409, detail="Automatic control is unavailable in sensor-only mode.")
    """
    Enable or disable automatic control mode.
    """
    before_state = get_control_state()
    previous_state = "ENABLED" if before_state["auto_mode"] else "DISABLED"

    state = set_auto_mode(control.enabled)

    new_state = "ENABLED" if state["auto_mode"] else "DISABLED"

    log_control_action(
        user=current_user,
        action=(
            "AUTO_MODE_ENABLE"
            if state["auto_mode"]
            else "AUTO_MODE_DISABLE"
        ),
        target="AUTOMATIC_MODE",
        previous_state=previous_state,
        new_state=new_state,
        status="SUCCESS",
        details="Automatic mode changed from Controls page",
    )

    return {
        "success": True,
        "message": (
            "Automatic mode enabled"
            if control.enabled
            else "Automatic mode disabled"
        ),
        "data": state,
    }


@app.post("/api/controls/emergency-shutdown")
def activate_emergency_shutdown(
    current_user=Depends(get_current_user),
):
    raise HTTPException(status_code=409, detail="Emergency shutdown cannot operate without physical motor/valve actuators.")
    """
    Activate emergency shutdown.

    The software control layer immediately:
        - closes the valve
        - stops the motor
        - enables emergency shutdown
    """
    before_state = get_control_state()

    previous_state = (
        f"Valve {before_state['valve']['state']}, "
        f"Motor {before_state['motor']['state']}"
    )

    state = emergency_shutdown()

    new_state = (
        f"Valve {state['valve']['state']}, "
        f"Motor {state['motor']['state']}"
    )

    log_control_action(
        user=current_user,
        action="EMERGENCY_STOP",
        target="SYSTEM",
        previous_state=previous_state,
        new_state=new_state,
        status="SUCCESS",
        details="Emergency shutdown activated from Controls page",
    )

    return {
        "success": True,
        "message": "Emergency shutdown activated",
        "data": state,
    }


@app.post("/api/controls/reset-emergency")
def clear_emergency_shutdown(
    current_user=Depends(get_current_user),
):
    raise HTTPException(status_code=409, detail="Emergency shutdown controls are unavailable in sensor-only mode.")
    """
    Clear emergency shutdown.

    This does not automatically open the valve
    or start the motor.
    """
    before_state = get_control_state()

    previous_state = (
        "ACTIVE"
        if before_state["emergency_shutdown"]
        else "INACTIVE"
    )

    state = reset_emergency_shutdown()

    new_state = (
        "ACTIVE"
        if state["emergency_shutdown"]
        else "INACTIVE"
    )

    log_control_action(
        user=current_user,
        action="EMERGENCY_RESET",
        target="SYSTEM",
        previous_state=previous_state,
        new_state=new_state,
        status="SUCCESS",
        details="Emergency shutdown cleared from Controls page",
    )

    return {
        "success": True,
        "message": "Emergency shutdown cleared",
        "data": state,
    }


@app.get("/api/controls/history")
def get_control_action_history(
    limit: int = 50,
    current_user=Depends(get_current_user),
):
    """
    Return the latest control actions performed by authenticated users.
    """
    return {
        "success": True,
        "count": len(get_control_history(limit)),
        "data": get_control_history(limit),
    }


# =========================================================
# HOME API
# =========================================================

@app.get("/")
def home():
    return {
        "project": "JalRakshak AI",
        "message": "Backend is running successfully!",
        "status": "online"
    }


# =========================================================
# SETTINGS API
# =========================================================

@app.get("/api/settings")
def get_settings():

    settings = settings_collection.find_one(
        {"_id": "jalrakshak_settings"}
    )

    # Create default settings if none exist
    if settings is None:

        settings = {
            "_id": "jalrakshak_settings",
            "auto_refresh": True,
            "refresh_interval": 5,
            "notifications": True,
            "history_enabled": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }

        settings_collection.insert_one(settings)

    return {
        "success": True,
        "data": {
            "auto_refresh": settings.get(
                "auto_refresh",
                True
            ),
            "refresh_interval": settings.get(
                "refresh_interval",
                5
            ),
            "notifications": settings.get(
                "notifications",
                True
            ),
            "history_enabled": settings.get(
                "history_enabled",
                True
            )
        }
    }


@app.put("/api/settings")
def update_settings(settings: SettingsUpdate):

    # -----------------------------------------------------
    # Validate refresh interval
    # -----------------------------------------------------

    allowed_intervals = [
        5,
        10,
        15,
        30,
        60
    ]

    if settings.refresh_interval not in allowed_intervals:

        return {
            "success": False,
            "message": (
                "Invalid refresh interval. "
                "Allowed values are 5, 10, 15, 30 and 60 seconds."
            )
        }

    # -----------------------------------------------------
    # Update settings in MongoDB
    # -----------------------------------------------------

    settings_collection.update_one(
        {"_id": "jalrakshak_settings"},
        {
            "$set": {
                "auto_refresh": settings.auto_refresh,
                "refresh_interval": settings.refresh_interval,
                "notifications": settings.notifications,
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    return {
        "success": True,
        "message": "Settings updated successfully",
        "data": {
            "auto_refresh": settings.auto_refresh,
            "refresh_interval": settings.refresh_interval,
            "notifications": settings.notifications
        }
    }


# =========================================================
# HISTORY SETTING API
# =========================================================

@app.put("/api/settings/history")
def update_history_setting(settings: HistorySettingUpdate):

    # -----------------------------------------------------
    # Update only the History ON/OFF setting.
    # This avoids changing auto-refresh or notification
    # settings when the user toggles History.
    # -----------------------------------------------------

    settings_collection.update_one(
        {"_id": "jalrakshak_settings"},
        {
            "$set": {
                "history_enabled": settings.history_enabled,
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "auto_refresh": True,
                "refresh_interval": 5,
                "notifications": True,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    return {
        "success": True,
        "message": (
            "History setting updated successfully"
        ),
        "data": {
            "history_enabled": settings.history_enabled
        }
    }


# =========================================================
# SETTINGS STATUS API
# =========================================================


@app.get("/api/system/status")
def get_system_status():

    # -----------------------------------------------------
    # Check MongoDB connection
    # -----------------------------------------------------

    database_status = "CONNECTED"

    try:
        sensor_readings_collection.database.command(
            "ping"
        )
    except Exception:
        database_status = "DISCONNECTED"

    # -----------------------------------------------------
    # Return system status
    # -----------------------------------------------------

    return {
        "success": True,
        "data": {
            "backend": {
                "status": "CONNECTED",
                "message": "FastAPI backend is running"
            },
            "database": {
                "status": database_status,
                "message": (
                    "MongoDB connection is active"
                    if database_status == "CONNECTED"
                    else "MongoDB connection unavailable"
                )
            },
            "monitoring": {
                "status": "ACTIVE",
                "message": "Sensor monitoring system is running"
            },
            "ai_detection": {
                "status": "ENABLED",
                "message": "AI-based detection system is operational"
            }
        }
    }


# =========================================================
# STEP 30 — RECEIVE SENSOR DATA
# =========================================================

@app.post("/api/sensor-data")
def receive_sensor_data(data: SensorData):

    # -----------------------------------------------------
    # 1. RUN DETECTION ENGINE
    # -----------------------------------------------------

    detection_result = analyze_sensor_data(
        flow_rate=data.flow_rate,
        pressure_bar=data.pressure_bar,
        ph=data.ph,
        turbidity=data.turbidity,
        tds=data.tds,
        total_litres=data.total_litres
    )

    # -----------------------------------------------------
    # 2. RUN AI ANOMALY DETECTION
    # -----------------------------------------------------
    #
    # The trained Isolation Forest learns normal sensor
    # behaviour and identifies unusual combinations of
    # flow, pressure, pH, turbidity, TDS and usage patterns.
    #
    # Rule-based detection above is preserved unchanged.
    # AI detection is an additional intelligent layer.
    # -----------------------------------------------------

    current_timestamp = datetime.now(timezone.utc)

    ai_result = predict_sensor_data(
        {
            "flow_rate": data.flow_rate,
            "pressure_bar": data.pressure_bar,
            "ph": data.ph,
            "turbidity": data.turbidity,
            "tds": data.tds,
            "total_litres": data.total_litres,
            "hour_of_day": current_timestamp.hour,
            "day_of_week": current_timestamp.weekday()
        }
    )

    # -----------------------------------------------------
    # 3. CREATE ALERTS
    # -----------------------------------------------------

    alerts = create_alerts(
        device_id=data.device_id,
        zone_id=data.zone_id,
        detection_result=detection_result
    )

    # -----------------------------------------------------
    # 4. PREPARE SENSOR RECORD
    # -----------------------------------------------------

    sensor_record = data.model_dump()

    sensor_record["timestamp"] = datetime.now(
        timezone.utc
    )
    sensor_record["source"] = "ESP32"

    # Store detection results together with sensor data
    sensor_record["detection"] = detection_result

    # Store AI result separately so the frontend can
    # distinguish AI analysis from rule-based detection.
    sensor_record["ai_detection"] = ai_result

    # -----------------------------------------------------
    # 5. SAVE SENSOR READING TO MONGODB
    # -----------------------------------------------------

    result = sensor_readings_collection.insert_one(
        sensor_record
    )

    # -----------------------------------------------------
    # 6. STORE ALERTS IN MONGODB
    # -----------------------------------------------------

    for alert in alerts:
        alert["source"] = "ESP32"
        alerts_collection.insert_one(alert)

    # -----------------------------------------------------
    # 7. BROADCAST REAL-TIME WEBSOCKET UPDATE
    # -----------------------------------------------------

    await_manager_payload = {
        "event": "sensor_update",
        "record_id": str(result.inserted_id),
        "device_id": data.device_id,
        "zone_id": data.zone_id,
        "timestamp": sensor_record["timestamp"],
        "sensor_data": {
            "flow_rate": data.flow_rate,
            "pressure_bar": data.pressure_bar,
            "ph": data.ph,
            "turbidity": data.turbidity,
            "tds": data.tds,
            "total_litres": data.total_litres
        },
        "detection": detection_result,
        "ai_detection": ai_result,
        "alerts_created": len(alerts),
        # Alert details for instant website notifications.
        # MongoDB's _id is left out because it is not JSON-safe.
        "alerts": [
            {
                key: value
                for key, value in alert.items()
                if key != "_id"
            }
            for alert in alerts
        ]
    }

    # The HTTP endpoint remains synchronous, so FastAPI runs it
    # in a worker thread where there is no running event loop.
    # anyio.from_thread.run hands the async broadcast back to
    # the server's event loop and waits for it to finish.
    try:
        anyio.from_thread.run(
            manager.broadcast,
            await_manager_payload
        )
    except Exception as error:
        print("WebSocket broadcast failed:", error)

    # -----------------------------------------------------
    # 8. RETURN RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,
        "message": (
            "Sensor data received, analyzed and "
            "stored successfully"
        ),
        "record_id": str(result.inserted_id),
        "device_id": data.device_id,
        "zone_id": data.zone_id,
        "detection": detection_result,
        "ai_detection": ai_result,
        "alerts_created": len(alerts)
    }


# =========================================================
# PHASE 20 — REAL-TIME WEBSOCKET
# =========================================================

@app.websocket("/ws/sensor-data")
async def sensor_data_websocket(websocket: WebSocket):
    """
    Keep a browser/React client connected so the backend can
    push new sensor readings immediately.
    """

    await manager.connect(websocket)

    try:
        # Send a connection confirmation immediately.
        await websocket.send_json({
            "event": "connection",
            "status": "connected",
            "message": "JalRakshak AI real-time monitoring connected",
            "connected_clients": manager.connection_count
        })

        # Keep the connection alive until the client disconnects.
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(websocket)

    except Exception:
        manager.disconnect(websocket)


# =========================================================
# STEP 31 — GET LATEST SENSOR DATA
# =========================================================

@app.get("/api/sensor-data/latest")
def get_latest_sensor_data():

    # Find newest sensor reading
    latest_data = sensor_readings_collection.find_one(
        {"source": "ESP32"},
        sort=[("timestamp", -1)]
    )

    # No data available
    if latest_data is None:
        return {
            "success": False,
            "message": "No sensor data available"
        }

    # Convert MongoDB ObjectId to string
    latest_data["_id"] = str(
        latest_data["_id"]
    )

    return {
        "success": True,
        "data": latest_data
    }


# =========================================================
# STEP 32 — GET SENSOR HISTORY
# =========================================================

@app.get("/api/sensor-data/history")
def get_sensor_history(
    device_id: str = "",
    limit: int = 50
):

    # -----------------------------------------------------
    # Validate limit
    # -----------------------------------------------------

    if limit > 200:
        limit = 200

    if limit < 1:
        limit = 1

    # -----------------------------------------------------
    # Build MongoDB query
    # -----------------------------------------------------

    query = {"source": "ESP32"}

    if device_id:
        query["device_id"] = device_id

    # -----------------------------------------------------
    # Get readings
    # Newest first
    # -----------------------------------------------------

    readings = list(
        sensor_readings_collection
        .find(query)
        .sort("timestamp", -1)
        .limit(limit)
    )

    # -----------------------------------------------------
    # Convert ObjectId
    # -----------------------------------------------------

    for reading in readings:
        reading["_id"] = str(
            reading["_id"]
        )

    # -----------------------------------------------------
    # Return response
    # -----------------------------------------------------

    return {
        "success": True,
        "count": len(readings),
        "device_id": (
            device_id
            if device_id
            else None
        ),
        "limit": limit,
        "data": readings
    }


# =========================================================
# STEP 33 + 34 — GET AND FILTER ALERTS
# =========================================================

@app.get("/api/alerts")
def get_alerts(
    type: str | None = None,
    severity: str | None = None,
    limit: int = 20
):

    # -----------------------------------------------------
    # Validate limit
    # -----------------------------------------------------

    if limit > 200:
        limit = 200

    if limit < 1:
        limit = 1

    # -----------------------------------------------------
    # Build MongoDB filter
    # -----------------------------------------------------

    query = {"source": "ESP32"}

    if type:
        query["type"] = type.upper()

    if severity:
        query["severity"] = severity.upper()

    # -----------------------------------------------------
    # Get alerts
    # Newest first
    # -----------------------------------------------------

    alerts = list(
        alerts_collection
        .find(query)
        .sort("timestamp", -1)
        .limit(limit)
    )

    # -----------------------------------------------------
    # Convert ObjectId
    # -----------------------------------------------------

    for alert in alerts:
        alert["_id"] = str(
            alert["_id"]
        )

    # -----------------------------------------------------
    # Return response
    # -----------------------------------------------------

    return {
        "success": True,
        "count": len(alerts),
        "filters": {
            "type": (
                type.upper()
                if type
                else None
            ),
            "severity": (
                severity.upper()
                if severity
                else None
            ),
            "limit": limit
        },
        "data": alerts
    }


# =========================================================
# STEP 35 — GET DEVICES
# =========================================================

@app.get("/api/devices")
def get_devices():

    # -----------------------------------------------------
    # Find latest reading for every device
    # -----------------------------------------------------

    pipeline = [
        {"$match": {"source": "ESP32"}},
        {
            "$sort": {
                "timestamp": -1
            }
        },
        {
            "$group": {
                "_id": "$device_id",
                "latest_record": {
                    "$first": "$$ROOT"
                }
            }
        }
    ]

    device_records = list(
        sensor_readings_collection.aggregate(
            pipeline
        )
    )

    devices = []

    # -----------------------------------------------------
    # Prepare device information
    # -----------------------------------------------------

    for record in device_records:

        latest = record["latest_record"]

        device_id = latest.get(
            "device_id",
            "UNKNOWN"
        )

        zone_id = latest.get(
            "zone_id",
            "UNKNOWN"
        )

        timestamp = latest.get(
            "timestamp"
        )

        # -------------------------------------------------
        # Determine online/offline status
        # -------------------------------------------------

        device_status = "OFFLINE"

        if timestamp is not None:

            current_time = datetime.now(
                timezone.utc
            )

            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(
                    tzinfo=timezone.utc
                )

            seconds_since_last_data = (
                current_time - timestamp
            ).total_seconds()

            # Device online if data arrived within 30 sec
            if seconds_since_last_data <= 30:
                device_status = "ONLINE"

        # -------------------------------------------------
        # Create device object
        # -------------------------------------------------

        device = {
            "device_id": device_id,
            "zone_id": zone_id,
            "status": device_status,
            "last_seen": timestamp,

            "latest_reading": {
                "flow_rate": latest.get(
                    "flow_rate"
                ),
                "pressure_bar": latest.get(
                    "pressure_bar"
                ),
                "ph": latest.get(
                    "ph"
                ),
                "turbidity": latest.get(
                    "turbidity"
                ),
                "tds": latest.get(
                    "tds"
                ),
                "total_litres": latest.get(
                    "total_litres"
                ),
                "system_status": latest.get(
                    "status"
                ),
                "alert": latest.get(
                    "alert"
                )
            }
        }

        devices.append(device)

    # -----------------------------------------------------
    # Return devices
    # -----------------------------------------------------

    return {
        "success": True,
        "count": len(devices),
        "data": devices
    }


# =========================================================
# STEP 38 — DASHBOARD SUMMARY
# =========================================================

@app.get("/api/dashboard/summary")
def get_dashboard_summary():

    # =====================================================
    # 1. GET LATEST SENSOR READING
    # =====================================================

    latest_data = sensor_readings_collection.find_one(
        {"source": "ESP32"},
        sort=[("timestamp", -1)]
    )

    # =====================================================
    # 2. GET ACTIVE ALERTS
    # =====================================================

    active_alerts = list(
        alerts_collection.find(
            {
                "status": "ACTIVE",
                "source": "ESP32"
            }
        ).sort(
            "timestamp",
            -1
        )
    )

    # =====================================================
    # 3. COUNT ALERTS BY SEVERITY
    # =====================================================

    critical_alerts = 0
    high_alerts = 0
    medium_alerts = 0
    low_alerts = 0

    for alert in active_alerts:

        severity = alert.get(
            "severity",
            ""
        ).upper()

        if severity == "CRITICAL":
            critical_alerts += 1

        elif severity == "HIGH":
            high_alerts += 1

        elif severity == "MEDIUM":
            medium_alerts += 1

        elif severity == "LOW":
            low_alerts += 1

    # =====================================================
    # 4. NO SENSOR DATA
    # =====================================================

    if latest_data is None:

        return {
            "success": True,

            "system": {
                "status": "NO_DATA",
                "message": "No sensor data available"
            },

            "latest_reading": None,

            "water_quality": {
                "problem": False,
                "status": "UNKNOWN",
                "reason": "No sensor data available"
            },

            "leakage": {
                "detected": False,
                "level": "NORMAL",
                "reason": "No sensor data available"
            },

            "theft": {
                "suspicious": False,
                "level": "NORMAL",
                "reason": "No sensor data available"
            },

            "ai_detection": {
                "anomaly": False,
                "prediction": "NO_DATA",
                "anomaly_score": 0,
                "risk": "LOW",
                "possible_cause": "No sensor data available"
            },

            "alerts": {
                "active": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            }
        }

    # =====================================================
    # 5. CONVERT OBJECT ID
    # =====================================================

    latest_data["_id"] = str(
        latest_data["_id"]
    )

    # =====================================================
    # 6. GET DETECTION RESULT
    # =====================================================

    detection = latest_data.get(
        "detection",
        {}
    )

    leakage = detection.get(
        "leakage",
        {}
    )

    water_quality = detection.get(
        "water_quality",
        {}
    )

    theft = detection.get(
        "theft",
        {}
    )

    ai_detection = latest_data.get(
        "ai_detection",
        {}
    )

    # =====================================================
    # 7. DEVICE STATUS
    # =====================================================

    device_id = latest_data.get(
        "device_id"
    )

    zone_id = latest_data.get(
        "zone_id"
    )

    timestamp = latest_data.get(
        "timestamp"
    )

    device_status = "OFFLINE"

    if timestamp is not None:

        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(
                tzinfo=timezone.utc
            )

        seconds_since_last_data = (
            datetime.now(timezone.utc)
            - timestamp
        ).total_seconds()

        if seconds_since_last_data <= 30:
            device_status = "ONLINE"

    # =====================================================
    # 8. RETURN COMPLETE DASHBOARD SUMMARY
    # =====================================================

    return {

        "success": True,

        # -------------------------------------------------
        # SYSTEM
        # -------------------------------------------------

        "system": {
            "status": detection.get(
                "overall_status",
                latest_data.get(
                    "status",
                    "UNKNOWN"
                )
            ),

            "device_id": device_id,

            "zone_id": zone_id,

            "device_status": device_status
        },

        # -------------------------------------------------
        # LATEST SENSOR READING
        # -------------------------------------------------

        "latest_reading": {

            "flow_rate": latest_data.get(
                "flow_rate"
            ),

            "pressure_bar": latest_data.get(
                "pressure_bar"
            ),

            "ph": latest_data.get(
                "ph"
            ),

            "turbidity": latest_data.get(
                "turbidity"
            ),

            "tds": latest_data.get(
                "tds"
            ),

            "total_litres": latest_data.get(
                "total_litres"
            ),

            "timestamp": latest_data.get(
                "timestamp"
            )
        },

        # -------------------------------------------------
        # WATER QUALITY
        # -------------------------------------------------

        "water_quality": {

            "problem": water_quality.get(
                "problem",
                False
            ),

            "status": water_quality.get(
                "status",
                "UNKNOWN"
            ),

            "reason": water_quality.get(
                "reason",
                ""
            )
        },

        # -------------------------------------------------
        # LEAKAGE
        # -------------------------------------------------

        "leakage": {

            "detected": leakage.get(
                "detected",
                False
            ),

            "level": leakage.get(
                "level",
                "NORMAL"
            ),

            "reason": leakage.get(
                "reason",
                ""
            )
        },

        # -------------------------------------------------
        # THEFT
        # -------------------------------------------------

        "theft": {

            "suspicious": theft.get(
                "suspicious",
                False
            ),

            "level": theft.get(
                "level",
                "NORMAL"
            ),

            "reason": theft.get(
                "reason",
                ""
            )
        },

        # -------------------------------------------------
        # AI DETECTION
        # -------------------------------------------------

        "ai_detection": {
            "anomaly": ai_detection.get(
                "anomaly",
                False
            ),
            "prediction": ai_detection.get(
                "prediction",
                "UNKNOWN"
            ),
            "anomaly_score": ai_detection.get(
                "anomaly_score",
                0
            ),
            "risk": ai_detection.get(
                "risk",
                "LOW"
            ),
            "possible_cause": ai_detection.get(
                "possible_cause",
                ""
            )
        },

        # -------------------------------------------------
        # ALERT SUMMARY
        # -------------------------------------------------

        "alerts": {

            "active": len(active_alerts),

            "critical": critical_alerts,

            "high": high_alerts,

            "medium": medium_alerts,

            "low": low_alerts
        }
    }

# =========================================================
# LIVE ZONE MAP
# =========================================================

# A zone is shown as OFFLINE when its device has not sent
# a reading for this many seconds.
ZONE_OFFLINE_AFTER_SECONDS = 120


def _as_utc_iso(timestamp):
    """MongoDB returns naive UTC datetimes; mark them as UTC."""

    if timestamp is None:
        return None

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    return timestamp.isoformat()


@app.get("/api/zones")
def get_zones():
    """
    Returns every water network zone with its latest sensor
    reading and recent alerts, for the live zone map.
    """

    now = datetime.now(timezone.utc)

    zones = []

    for zone in ZONES[:1]:  # One physical ESP32 device is configured.

        latest = sensor_readings_collection.find_one(
            {"zone_id": zone["zone_id"], "source": "ESP32"},
            sort=[("timestamp", -1)]
        )

        recent_alerts = list(
            alerts_collection
            .find({"zone_id": zone["zone_id"], "source": "ESP32"})
            .sort("timestamp", -1)
            .limit(5)
        )

        status = "OFFLINE"
        reading = None
        last_seen = None

        if latest is not None:

            last_seen_time = latest["timestamp"]

            if last_seen_time.tzinfo is None:
                last_seen_time = last_seen_time.replace(
                    tzinfo=timezone.utc
                )

            age_seconds = (now - last_seen_time).total_seconds()

            if age_seconds <= ZONE_OFFLINE_AFTER_SECONDS:
                status = latest.get("detection", {}).get(
                    "overall_status",
                    "NORMAL"
                )

            last_seen = _as_utc_iso(latest["timestamp"])

            reading = {
                "flow_rate": latest.get("flow_rate"),
                "pressure_bar": latest.get("pressure_bar"),
                "ph": latest.get("ph"),
                "turbidity": latest.get("turbidity"),
                "tds": latest.get("tds"),
                "total_litres": latest.get("total_litres"),
            }

        zones.append({
            **zone,
            "status": status,
            "last_seen": last_seen,
            "reading": reading,
            "detection": (
                latest.get("detection") if latest else None
            ),
            "ai_detection": (
                latest.get("ai_detection") if latest else None
            ),
            "recent_alerts": [
                {
                    "type": alert.get("type"),
                    "severity": alert.get("severity"),
                    "message": alert.get("message"),
                    "timestamp": _as_utc_iso(
                        alert.get("timestamp")
                    ),
                }
                for alert in recent_alerts
            ],
        })

    return {
        "success": True,
        "reservoir": RESERVOIR,
        "zones": zones,
    }
