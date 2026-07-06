"""
Profile Lambda — handles GET /profile and PUT /profile.

DynamoDB table: SPT_StudentProfile
  PK: userId (String)
"""

from utils import (
    table, TABLE_PROFILES,
    ok, unauthorized, not_found, parse_body, get_authenticated_user,
)

EDITABLE_FIELDS = [
    "name", "phone", "college", "branch", "cgpa", "skills", "languages",
    "linkedin", "github", "leetcode", "hackerrank", "certifications",
    "projects", "resumeUrl",
]


def get_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    item = table(TABLE_PROFILES).get_item(Key={"userId": auth["sub"]}).get("Item")
    if not item:
        return not_found("Profile not found.")
    return ok(item)


def update_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    body = parse_body(event)
    update_data = {k: v for k, v in body.items() if k in EDITABLE_FIELDS}

    if not update_data:
        return ok({"message": "Nothing to update."})

    update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in update_data)
    expr_names = {f"#{k}": k for k in update_data}
    expr_values = {f":{k}": v for k, v in update_data.items()}

    profiles_table = table(TABLE_PROFILES)
    profiles_table.update_item(
        Key={"userId": auth["sub"]},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )

    updated = profiles_table.get_item(Key={"userId": auth["sub"]}).get("Item")
    return ok(updated)
