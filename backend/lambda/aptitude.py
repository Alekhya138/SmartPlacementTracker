"""
Aptitude Lambda — routes: GET /aptitude, POST /aptitude

DynamoDB table: SPT_AptitudeProgress
  PK: userId (String)
  SK: entryId (String)
"""

from boto3.dynamodb.conditions import Key

from utils import (
    table, TABLE_APTITUDE,
    ok, created, unauthorized, bad_request,
    parse_body, get_authenticated_user, new_id,
)

VALID_CATEGORIES = {"Quantitative", "Logical Reasoning", "Verbal"}


def list_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    result = table(TABLE_APTITUDE).query(KeyConditionExpression=Key("userId").eq(auth["sub"]))
    return ok(result.get("Items", []))


def create_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    body = parse_body(event)
    category = body.get("category")
    score = body.get("score")
    date = body.get("date")

    if category not in VALID_CATEGORIES:
        return bad_request("Category must be Quantitative, Logical Reasoning, or Verbal.")
    if not isinstance(score, (int, float)) or not (0 <= score <= 100):
        return bad_request("Score must be a number between 0 and 100.")
    if not date:
        return bad_request("Date is required.")

    entry = {
        "userId": auth["sub"],
        "entryId": new_id(),
        "category": category,
        "score": score,
        "date": date,
    }
    table(TABLE_APTITUDE).put_item(Item=entry)
    return created(entry)
