"""
Shared helpers used by every Lambda function in Smart Placement Tracker.

- DynamoDB table accessors
- Password hashing (PBKDF2, stdlib only — no extra layers needed)
- Lightweight signed auth tokens (HMAC-SHA256, JWT-like but dependency-free)
- Consistent JSON responses + CORS headers
- API Gateway event parsing helpers
"""

import base64
import hashlib
import hmac
import json
import os
import time
import uuid

import boto3

dynamodb = boto3.resource("dynamodb")

# ---- Table names come from Lambda environment variables (set these in AWS) ----
TABLE_USERS = os.environ.get("TABLE_USERS", "SPT_Users")
TABLE_PROFILES = os.environ.get("TABLE_PROFILES", "SPT_StudentProfile")
TABLE_APPLICATIONS = os.environ.get("TABLE_APPLICATIONS", "SPT_Applications")
TABLE_CODING = os.environ.get("TABLE_CODING", "SPT_CodingProgress")
TABLE_APTITUDE = os.environ.get("TABLE_APTITUDE", "SPT_AptitudeProgress")

# Secret used to sign auth tokens. In production, store this in AWS Secrets
# Manager or SSM Parameter Store and read it here — do NOT hardcode it.
AUTH_SECRET = os.environ.get("AUTH_SECRET", "change-this-secret-before-deploying")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def table(name):
    return dynamodb.Table(name)


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body, default=str),
    }


def ok(body):
    return response(200, body)


def created(body):
    return response(201, body)


def bad_request(message):
    return response(400, {"error": "bad_request", "message": message})


def unauthorized(message="Not authenticated"):
    return response(401, {"error": "unauthorized", "message": message})


def not_found(message="Not found"):
    return response(404, {"error": "not_found", "message": message})


def server_error(message="Something went wrong"):
    return response(500, {"error": "server_error", "message": message})


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------

def hash_password(password, salt=None):
    salt = salt or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return f"{salt}${digest.hex()}"


def verify_password(password, stored):
    try:
        salt, _ = stored.split("$")
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored)


# ---------------------------------------------------------------------------
# Auth tokens (HMAC-signed, base64url JSON payload — good enough for a
# student project; swap for Cognito/JWT library for production hardening)
# ---------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_token(user_id, email, ttl_seconds=60 * 60 * 24 * 7):
    payload = {"sub": user_id, "email": email, "exp": int(time.time()) + ttl_seconds}
    payload_b64 = _b64url_encode(json.dumps(payload).encode())
    signature = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_token(token):
    try:
        payload_b64, signature = token.split(".")
        expected_sig = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if payload["exp"] < time.time():
            return None
        return payload
    except Exception:
        return None


def get_authenticated_user(event):
    """Extract and verify the bearer token from an API Gateway event.
    Returns the decoded payload (sub, email) or None."""
    headers = event.get("headers") or {}
    auth_header = headers.get("Authorization") or headers.get("authorization") or ""
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.replace("Bearer ", "").strip()
    return verify_token(token)


# ---------------------------------------------------------------------------
# Event parsing
# ---------------------------------------------------------------------------

def parse_body(event):
    try:
        return json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {}


def path_param(event, name):
    params = event.get("pathParameters") or {}
    return params.get(name)


def new_id():
    return str(uuid.uuid4())
