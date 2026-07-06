"""
Dashboard Lambda — routes: GET /dashboard

Aggregates profile, aptitude, coding, and application data into one
summary payload so the frontend dashboard needs only one API call.
"""

from boto3.dynamodb.conditions import Key

from utils import table, TABLE_PROFILES, TABLE_APTITUDE, TABLE_CODING, TABLE_APPLICATIONS
from utils import ok, unauthorized, get_authenticated_user
from readiness import calculate_readiness


def get_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    user_id = auth["sub"]

    profile = table(TABLE_PROFILES).get_item(Key={"userId": user_id}).get("Item") or {}
    aptitude_entries = table(TABLE_APTITUDE).query(KeyConditionExpression=Key("userId").eq(user_id)).get("Items", [])
    coding_entries = table(TABLE_CODING).query(KeyConditionExpression=Key("userId").eq(user_id)).get("Items", [])
    applications = table(TABLE_APPLICATIONS).query(KeyConditionExpression=Key("userId").eq(user_id)).get("Items", [])

    readiness = calculate_readiness(profile, aptitude_entries, coding_entries)

    pipeline = {
        "total": len(applications),
        "applied": len([a for a in applications if a.get("status") in ("Applied", "OA Scheduled", "OA Cleared")]),
        "interview": len([a for a in applications if a.get("status") in ("Interview Scheduled", "HR Round")]),
        "selected": len([a for a in applications if a.get("status") == "Selected"]),
        "rejected": len([a for a in applications if a.get("status") == "Rejected"]),
    }

    return ok({
        **readiness,
        "mockInterviewScore": profile.get("mockInterviewScore"),
        "pipeline": pipeline,
    })
