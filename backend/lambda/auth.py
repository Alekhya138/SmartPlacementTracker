"""
Auth Lambda — handles POST /auth/register and POST /auth/login.

DynamoDB table: SPT_Users
  PK: email (String)
  Attributes: userId, name, college, branch, graduationYear, passwordHash, createdAt
"""

from datetime import datetime, timezone

from utils import (
    table, TABLE_USERS, TABLE_PROFILES,
    ok, created, bad_request, unauthorized, server_error,
    hash_password, verify_password, create_token, parse_body, new_id,
)


def register_handler(event, context):
    body = parse_body(event)
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    college = (body.get("college") or "").strip()
    branch = (body.get("branch") or "").strip()
    graduation_year = body.get("graduationYear")
    password = body.get("password") or ""

    if not all([name, email, college, branch, graduation_year, password]):
        return bad_request("All fields are required.")
    if len(password) < 8:
        return bad_request("Password must be at least 8 characters.")

    users_table = table(TABLE_USERS)
    existing = users_table.get_item(Key={"email": email}).get("Item")
    if existing:
        return bad_request("An account with this email already exists.")

    user_id = new_id()
    users_table.put_item(Item={
        "email": email,
        "userId": user_id,
        "name": name,
        "college": college,
        "branch": branch,
        "graduationYear": graduation_year,
        "passwordHash": hash_password(password),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })

    # Seed a blank student profile row so profile.py can update-in-place
    table(TABLE_PROFILES).put_item(Item={
        "userId": user_id,
        "name": name,
        "email": email,
        "college": college,
        "branch": branch,
    })

    token = create_token(user_id, email)
    return created({
        "token": token,
        "user": {"userId": user_id, "name": name, "email": email},
    })


def login_handler(event, context):
    body = parse_body(event)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return bad_request("Email and password are required.")

    user = table(TABLE_USERS).get_item(Key={"email": email}).get("Item")
    if not user or not verify_password(password, user["passwordHash"]):
        return unauthorized("Invalid email or password.")

    token = create_token(user["userId"], email)
    return ok({
        "token": token,
        "user": {"userId": user["userId"], "name": user["name"], "email": email},
    })
