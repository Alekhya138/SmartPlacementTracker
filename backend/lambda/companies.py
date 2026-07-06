"""
Companies Lambda — application tracker CRUD.
Routes: GET /companies, POST /companies, PUT /companies/{id}, DELETE /companies/{id}

DynamoDB table: SPT_Applications
  PK: userId (String)
  SK: applicationId (String)
"""

from boto3.dynamodb.conditions import Key

from utils import (
    table, TABLE_APPLICATIONS,
    ok, created, unauthorized, not_found, bad_request,
    parse_body, path_param, get_authenticated_user, new_id,
)

REQUIRED_FIELDS = ["name", "role"]


def list_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    result = table(TABLE_APPLICATIONS).query(
        KeyConditionExpression=Key("userId").eq(auth["sub"])
    )
    items = result.get("Items", [])
    for item in items:
        item["id"] = item.get("applicationId")
    return ok(items)


def create_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    body = parse_body(event)
    if not all(body.get(f) for f in REQUIRED_FIELDS):
        return bad_request("Company name and role are required.")

    application_id = new_id()
    item = {
        "userId": auth["sub"],
        "applicationId": application_id,
        "name": body.get("name"),
        "role": body.get("role"),
        "package": body.get("package"),
        "location": body.get("location"),
        "status": body.get("status", "Interested"),
        "applicationDate": body.get("applicationDate"),
        "deadline": body.get("deadline"),
    }
    table(TABLE_APPLICATIONS).put_item(Item=item)
    item["id"] = application_id
    return created(item)


def update_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    application_id = path_param(event, "id")
    body = parse_body(event)

    editable = ["name", "role", "package", "location", "status", "applicationDate", "deadline"]
    update_data = {k: v for k, v in body.items() if k in editable}
    if not update_data:
        return bad_request("Nothing to update.")

    update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in update_data)
    expr_names = {f"#{k}": k for k in update_data}
    expr_values = {f":{k}": v for k, v in update_data.items()}

    apps_table = table(TABLE_APPLICATIONS)
    apps_table.update_item(
        Key={"userId": auth["sub"], "applicationId": application_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )
    updated = apps_table.get_item(Key={"userId": auth["sub"], "applicationId": application_id}).get("Item")
    if not updated:
        return not_found("Application not found.")
    updated["id"] = application_id
    return ok(updated)


def delete_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    application_id = path_param(event, "id")
    table(TABLE_APPLICATIONS).delete_item(Key={"userId": auth["sub"], "applicationId": application_id})
    return ok({"deleted": True, "id": application_id})
