"""
Resume Lambda — routes: POST /resume/upload-url

Generates a presigned S3 PUT URL so the browser can upload the resume
directly to S3 without the file ever passing through Lambda.
"""

import os

import boto3

from utils import ok, unauthorized, bad_request, parse_body, get_authenticated_user

s3 = boto3.client("s3")
RESUME_BUCKET = os.environ.get("RESUME_BUCKET", "smart-placement-tracker-resumes")


def upload_url_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    body = parse_body(event)
    file_name = body.get("fileName")
    content_type = body.get("contentType", "application/pdf")

    if not file_name:
        return bad_request("fileName is required.")

    key = f"resumes/{auth['sub']}/{file_name}"

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": RESUME_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=300,  # 5 minutes
    )
    file_url = f"https://{RESUME_BUCKET}.s3.amazonaws.com/{key}"

    return ok({"uploadUrl": upload_url, "fileUrl": file_url})
