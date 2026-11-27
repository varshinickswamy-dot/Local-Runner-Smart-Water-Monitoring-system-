"""
JalRakshak AI
Control State Management

This module stores the current software control state
for the smart valve, motor, automatic mode and
emergency shutdown.

This is currently a software/simulation control layer.
It does not directly control ESP32 hardware yet.
"""

from datetime import datetime, timezone
from threading import RLock


# =========================================================
# CONTROL STATE
# =========================================================

_control_state = {
    "valve": {
        "state": "OPEN",
        "updated_at": None,
    },

    "motor": {
        "state": "STOPPED",
        "updated_at": None,
    },

    "auto_mode": False,

    "emergency_shutdown": False,

    "last_action": "System initialized",

    "updated_at": None,
}


# =========================================================
# THREAD SAFETY
# =========================================================

# RLock allows the same thread to safely acquire the lock
# again when a control function calls get_control_state().
_control_lock = RLock()


# =========================================================
# CURRENT UTC TIME
# =========================================================

def _utc_now():
    """
    Return the current UTC timestamp.
    """
    return datetime.now(timezone.utc)


# =========================================================
# UPDATE TIMESTAMP
# =========================================================

def _update_timestamp():
    """
    Update the global control-state timestamp.
    """
    _control_state["updated_at"] = _utc_now()


# =========================================================
# GET CONTROL STATE
# =========================================================

def get_control_state():
    """
    Return a copy of the current control state.
    """

    with _control_lock:

        return {
            "valve": {
                "state": _control_state["valve"]["state"],
                "updated_at": _control_state["valve"]["updated_at"],
            },

            "motor": {
                "state": _control_state["motor"]["state"],
                "updated_at": _control_state["motor"]["updated_at"],
            },

            "auto_mode": _control_state["auto_mode"],

            "emergency_shutdown": (
                _control_state["emergency_shutdown"]
            ),

            "last_action": _control_state["last_action"],

            "updated_at": _control_state["updated_at"],
        }


# =========================================================
# SET VALVE
# =========================================================

def set_valve_state(state: str):
    """
    Change the smart valve state.

    Allowed:
        OPEN
        CLOSED
    """

    state = str(state).upper()

    if state not in {"OPEN", "CLOSED"}:
        raise ValueError(
            "Valve state must be OPEN or CLOSED"
        )

    with _control_lock:

        # Emergency shutdown always keeps valve closed.
        if (
            _control_state["emergency_shutdown"]
            and state == "OPEN"
        ):
            raise ValueError(
                "Cannot open valve during emergency shutdown"
            )

        now = _utc_now()

        _control_state["valve"]["state"] = state
        _control_state["valve"]["updated_at"] = now

        _control_state["last_action"] = (
            f"Valve changed to {state}"
        )

        _update_timestamp()

        return get_control_state()


# =========================================================
# SET MOTOR
# =========================================================

def set_motor_state(state: str):
    """
    Change the smart motor state.

    Allowed:
        RUNNING
        STOPPED
    """

    state = str(state).upper()

    if state not in {"RUNNING", "STOPPED"}:
        raise ValueError(
            "Motor state must be RUNNING or STOPPED"
        )

    with _control_lock:

        # Emergency shutdown always keeps motor stopped.
        if (
            _control_state["emergency_shutdown"]
            and state == "RUNNING"
        ):
            raise ValueError(
                "Cannot start motor during emergency shutdown"
            )

        now = _utc_now()

        _control_state["motor"]["state"] = state
        _control_state["motor"]["updated_at"] = now

        _control_state["last_action"] = (
            f"Motor changed to {state}"
        )

        _update_timestamp()

        return get_control_state()


# =========================================================
# SET AUTO MODE
# =========================================================

def set_auto_mode(enabled: bool):
    """
    Enable or disable automatic motor control.
    """

    with _control_lock:

        enabled = bool(enabled)

        _control_state["auto_mode"] = enabled

        _control_state["last_action"] = (
            "Automatic mode enabled"
            if enabled
            else "Automatic mode disabled"
        )

        _update_timestamp()

        return get_control_state()


# =========================================================
# EMERGENCY SHUTDOWN
# =========================================================

def emergency_shutdown():
    """
    Immediately close the valve and stop the motor.
    """

    with _control_lock:

        now = _utc_now()

        _control_state["emergency_shutdown"] = True

        _control_state["valve"]["state"] = "CLOSED"
        _control_state["valve"]["updated_at"] = now

        _control_state["motor"]["state"] = "STOPPED"
        _control_state["motor"]["updated_at"] = now

        _control_state["last_action"] = (
            "Emergency shutdown activated"
        )

        _update_timestamp()

        return get_control_state()


# =========================================================
# RESET EMERGENCY
# =========================================================

def reset_emergency_shutdown():
    """
    Clear emergency shutdown.

    This does not automatically open the valve
    or start the motor.
    """

    with _control_lock:

        _control_state["emergency_shutdown"] = False

        _control_state["last_action"] = (
            "Emergency shutdown cleared"
        )

        _update_timestamp()

        return get_control_state()