import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pymongo import MongoClient
from pwdlib import PasswordHash

from auth_schemas import UserResponse


# ============================================================
# CONFIGURATION
# ============================================================

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is missing. Add it to your backend .env file."
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


# ============================================================
# PASSWORD HASHING
# ============================================================

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using Argon2.
    """
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against its stored hash.
    """
    return password_hash.verify(password, hashed_password)


# ============================================================
# MONGODB
# ============================================================

MONGODB_URI = (
    os.getenv("MONGODB_URI")
    or os.getenv("MONGO_URI")
    or os.getenv("MONGODB_URL")
)

if not MONGODB_URI:
    raise RuntimeError(
        "MongoDB connection string is missing. "
        "Add MONGODB_URI to your backend .env file."
    )


mongo_client = MongoClient(MONGODB_URI)

auth_database = mongo_client["jalrakshak_ai"]

users_collection = auth_database["users"]


# Create unique indexes so duplicate accounts are prevented.
users_collection.create_index("username", unique=True)
users_collection.create_index("email", unique=True)


# ============================================================
# JWT
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(
    username: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    """

    if expires_delta is None:
        expires_delta = timedelta(minutes=JWT_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": username,
        "exp": expire,
    }

    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return token


# ============================================================
# USER AUTHENTICATION
# ============================================================

def authenticate_user(username: str, password: str):
    """
    Find a user and verify their password.
    """

    user = users_collection.find_one(
        {"username": username}
    )

    if not user:
        return None

    if not verify_password(
        password,
        user.get("password_hash", "")
    ):
        return None

    return user


# ============================================================
# CURRENT USER
# ============================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    """
    Decode JWT and return the logged-in user.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        username = payload.get("sub")

        if not username:
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except jwt.InvalidTokenError:
        raise credentials_exception

    user = users_collection.find_one(
        {"username": username}
    )

    if not user:
        raise credentials_exception

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


# ============================================================
# USER RESPONSE FORMAT
# ============================================================

def user_to_response(user: dict) -> UserResponse:
    """
    Convert MongoDB user document into safe API response.
    Password hash is never returned.
    """

    return UserResponse(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        username=user["username"],
        role=user.get("role", "user"),
        is_active=user.get("is_active", True),
    )