"""
JalRakshak AI
Control Action History

Stores all control actions performed from the Controls page.
"""

from datetime import datetime, timezone
from typing import Optional


# =========================================================
# MONGODB COLLECTION
# =========================================================

from database import sensor_readings_collection


control_history_collection = (
    sensor_readings_collection.database["control_history"]
)


# =========================================================
# CREATE INDEXES
# =========================================================

try:
    control_history_collection.create_index(
        [("timestamp", -1)]
    )

    control_history_collection.create_index(
        [("username", 1)]
    )

    control_history_collection.create_index(
        [("action", 1)]
    )

except Exception as error:
    print(
        f"Control history index warning: {error}"
    )


# =========================================================
# LOG CONTROL ACTION
# =========================================================

def log_control_action(
    user: Optional[dict],
    action: str,
    target: str,
    previous_state: Optional[str] = None,
    new_state: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[str] = None,
):
    """
    Store one control action in MongoDB.
    """

    now = datetime.now(timezone.utc)


    # -----------------------------------------------------
    # USER INFORMATION
    # -----------------------------------------------------

    if user:

        username = (
            user.get("username")
            or "unknown"
        )

        full_name = (
            user.get("full_name")
            or username
        )

        user_id = (
            str(user.get("_id"))
            if user.get("_id")
            else user.get("id")
        )

    else:

        username = "system"

        full_name = "System"

        user_id = None


    # -----------------------------------------------------
    # HISTORY DOCUMENT
    # -----------------------------------------------------

    document = {

        "timestamp": now,

        "username": username,

        "full_name": full_name,

        "user_id": user_id,

        "action": action,

        "target": target,

        "previous_state": previous_state,

        "new_state": new_state,

        "status": status,

        "details": details,

        "source": "controls_page",

    }


    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    result = (
        control_history_collection.insert_one(
            document
        )
    )


    return {

        "id": str(
            result.inserted_id
        ),

        "timestamp": now,

        "username": username,

        "full_name": full_name,

        "action": action,

        "target": target,

        "previous_state": previous_state,

        "new_state": new_state,

        "status": status,

        "details": details,

    }


# =========================================================
# GET CONTROL HISTORY
# =========================================================

def get_control_history(
    limit: int = 50,
):
    """
    Return the latest control actions.
    """

    # Keep the API safe from very large requests.
    limit = max(
        1,
        min(
            int(limit),
            200
        )
    )


    cursor = (
        control_history_collection
        .find({})
        .sort(
            "timestamp",
            -1
        )
        .limit(limit)
    )


    history = []


    for document in cursor:

        history.append({

            "id": str(
                document.get("_id")
            ),

            "timestamp":
                document.get(
                    "timestamp"
                ),

            "username":
                document.get(
                    "username",
                    "unknown"
                ),

            "full_name":
                document.get(
                    "full_name",
                    document.get(
                        "username",
                        "unknown"
                    )
                ),

            "action":
                document.get(
                    "action",
                    "UNKNOWN"
                ),

            "target":
                document.get(
                    "target",
                    "UNKNOWN"
                ),

            "previous_state":
                document.get(
                    "previous_state"
                ),

            "new_state":
                document.get(
                    "new_state"
                ),

            "status":
                document.get(
                    "status",
                    "SUCCESS"
                ),

            "details":
                document.get(
                    "details"
                ),

            "source":
                document.get(
                    "source",
                    "controls_page"
                ),

        })


    return history