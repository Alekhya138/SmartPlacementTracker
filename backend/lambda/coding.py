"""
Coding Lambda — routes: GET /coding, POST /coding

DynamoDB table: SPT_CodingProgress
  PK: userId (String)
  SK: entryId (String)
"""

from boto3.dynamodb.conditions import Key

from utils import (
    table, TABLE_CODING,
    ok, created, unauthorized, bad_request,
    parse_body, get_authenticated_user, new_id,
)

VALID_PLATFORMS = {"LeetCode", "GeeksforGeeks", "HackerRank", "CodeChef", "Codeforces"}
VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}


def list_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    result = table(TABLE_CODING).query(KeyConditionExpression=Key("userId").eq(auth["sub"]))
    return ok(result.get("Items", []))


def create_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    body = parse_body(event)
    platform = body.get("platform")
    count = body.get("count", 1)
    difficulty = body.get("difficulty", "Easy")
    date = body.get("date")

    if platform not in VALID_PLATFORMS:
        return bad_request("Unsupported platform.")
    if difficulty not in VALID_DIFFICULTIES:
        return bad_request("Difficulty must be Easy, Medium, or Hard.")
    if not date:
        return bad_request("Date is required.")

    entry = {
        "userId": auth["sub"],
        "entryId": new_id(),
        "platform": platform,
        "count": int(count),
        "difficulty": difficulty,
        "date": date,
    }
    table(TABLE_CODING).put_item(Item=entry)
    return created(entry)
