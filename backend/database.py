import os
import certifi

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# GET MONGODB CONNECTION STRING
# =========================================================

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError(
        "MONGODB_URI is not set in the .env file"
    )


# =========================================================
# MONGODB CLIENT
# =========================================================

# Atlas (mongodb+srv://) needs TLS; a local MongoDB
# (mongodb://127.0.0.1:27017) does not.

USE_TLS = MONGODB_URI.startswith("mongodb+srv://")

tls_options = (
    {"tls": True, "tlsCAFile": certifi.where()}
    if USE_TLS
    else {}
)

try:
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        retryWrites=True,
        **tls_options,
    )

except Exception as e:
    print("MongoDB client creation failed:", e)
    raise


# =========================================================
# DATABASE
# =========================================================

db = client["jalrakshak_ai"]


# =========================================================
# COLLECTIONS
# =========================================================

sensor_readings_collection = db["sensor_readings"]

alerts_collection = db["alerts"]

devices_collection = db["devices"]

settings_collection = db["settings"]


# =========================================================
# TEST DATABASE CONNECTION
# =========================================================

def test_database_connection():

    try:

        client.admin.command("ping")

        print(
            "MongoDB connection successful!"
        )

        return True

    except PyMongoError as e:

        print(
            "MongoDB connection failed:"
        )

        print(e)

        return False

    except Exception as e:

        print(
            "Unexpected MongoDB error:"
        )

        print(e)

        return False