# AWS Deployment Guide — Smart Placement Tracker

This walks through deploying the backend (Lambda + API Gateway + DynamoDB)
and the frontend (S3 static hosting). Region used in examples: `ap-south-1`
(Mumbai) — swap for whichever region you prefer, just stay consistent.

---

## 1. Create the DynamoDB tables

For each table below: DynamoDB console → **Create table** → on-demand
capacity mode.

| Table name | Partition key | Sort key |
|---|---|---|
| `SPT_Users` | `email` (String) | — |
| `SPT_StudentProfile` | `userId` (String) | — |
| `SPT_Applications` | `userId` (String) | `applicationId` (String) |
| `SPT_AptitudeProgress` | `userId` (String) | `entryId` (String) |
| `SPT_CodingProgress` | `userId` (String) | `entryId` (String) |

## 2. Create an S3 bucket for resumes

1. S3 console → **Create bucket** → name it e.g. `smart-placement-tracker-resumes`.
2. Keep "Block all public access" **ON** (uploads go through presigned URLs,
   so the bucket itself doesn't need to be public).
3. Under **Permissions → CORS**, add:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
   (Replace `"*"` with your actual S3 website URL once you have it, for tighter security.)

## 3. Create an IAM role for Lambda

Create a role `SPT-Lambda-Role` with:
- Trust policy: AWS Lambda
- Permissions:
  - `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
  - Inline policy granting `dynamodb:GetItem`, `PutItem`, `UpdateItem`,
    `DeleteItem`, `Query` on the 5 tables above
  - Inline policy granting `s3:PutObject` on the resume bucket

## 4. Create the Lambda functions

Each file in `backend/lambda/` maps to one or more Lambda functions. You
can either deploy one function per handler, or combine each file into a
single function with multiple entry points — the simplest path for a
first deployment is **one Lambda per file**, all sharing `utils.py` and
`readiness.py` as a Lambda **Layer**.

### 4a. Package shared code as a Layer
```bash
cd backend/lambda
mkdir -p layer/python
cp utils.py readiness.py layer/python/
cd layer && zip -r ../shared-layer.zip python && cd ..
```
Upload `shared-layer.zip` as a new Lambda Layer (Python 3.12 runtime),
then attach it to every function below.

### 4b. Create each function
Runtime: **Python 3.12**. Attach the shared layer + `SPT-Lambda-Role`.
Set environment variables on every function:
```
TABLE_USERS=SPT_Users
TABLE_PROFILES=SPT_StudentProfile
TABLE_APPLICATIONS=SPT_Applications
TABLE_APTITUDE=SPT_AptitudeProgress
TABLE_CODING=SPT_CodingProgress
RESUME_BUCKET=smart-placement-tracker-resumes
AUTH_SECRET=<generate a long random string — do NOT reuse the placeholder>
```

| Function name | File | Handler |
|---|---|---|
| `spt-auth-register` | `auth.py` | `auth.register_handler` |
| `spt-auth-login` | `auth.py` | `auth.login_handler` |
| `spt-profile-get` | `profile.py` | `profile.get_handler` |
| `spt-profile-update` | `profile.py` | `profile.update_handler` |
| `spt-companies-list` | `companies.py` | `companies.list_handler` |
| `spt-companies-create` | `companies.py` | `companies.create_handler` |
| `spt-companies-update` | `companies.py` | `companies.update_handler` |
| `spt-companies-delete` | `companies.py` | `companies.delete_handler` |
| `spt-aptitude-list` | `aptitude.py` | `aptitude.list_handler` |
| `spt-aptitude-create` | `aptitude.py` | `aptitude.create_handler` |
| `spt-coding-list` | `coding.py` | `coding.list_handler` |
| `spt-coding-create` | `coding.py` | `coding.create_handler` |
| `spt-resume-upload-url` | `resume.py` | `resume.upload_url_handler` |
| `spt-dashboard-get` | `dashboard.py` | `dashboard.get_handler` |
| `spt-analytics-get` | `analytics.py` | `analytics.get_handler` |

For each: zip the individual `.py` file (or upload directly in the console
code editor for quick iteration) as the function's own deployment package.

## 5. Create the API Gateway (HTTP API — cheaper & simpler than REST API)

1. API Gateway console → **Create API** → **HTTP API**.
2. Add routes, integrating each with the matching Lambda:

   | Method | Route | Lambda |
   |---|---|---|
   | POST | `/auth/register` | `spt-auth-register` |
   | POST | `/auth/login` | `spt-auth-login` |
   | GET | `/profile` | `spt-profile-get` |
   | PUT | `/profile` | `spt-profile-update` |
   | GET | `/companies` | `spt-companies-list` |
   | POST | `/companies` | `spt-companies-create` |
   | PUT | `/companies/{id}` | `spt-companies-update` |
   | DELETE | `/companies/{id}` | `spt-companies-delete` |
   | GET | `/aptitude` | `spt-aptitude-list` |
   | POST | `/aptitude` | `spt-aptitude-create` |
   | GET | `/coding` | `spt-coding-list` |
   | POST | `/coding` | `spt-coding-create` |
   | POST | `/resume/upload-url` | `spt-resume-upload-url` |
   | GET | `/dashboard` | `spt-dashboard-get` |
   | GET | `/analytics` | `spt-analytics-get` |

3. Under **CORS**, allow origin `*` (or your S3 website URL), methods
   `GET,POST,PUT,DELETE,OPTIONS`, headers `Content-Type,Authorization`.
4. Deploy to a stage, e.g. `prod`. Note the **Invoke URL** —
   `https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod`.

## 6. Wire the frontend to your API

In `frontend/js/api.js`, replace the placeholder:
```js
const API_BASE_URL = window.__SPT_API_BASE__ || "https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod";
```

## 7. Host the frontend on S3

1. Create a new bucket, e.g. `smart-placement-tracker-app` (**different**
   from the resume bucket).
2. **Properties → Static website hosting** → Enable, index document `index.html`.
3. **Permissions → Bucket policy** → allow public read:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "PublicReadGetObject",
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::smart-placement-tracker-app/*"
     }]
   }
   ```
4. Upload everything in `frontend/` to the bucket root.
5. Your app is now live at the bucket's static website endpoint.

## 8. (Optional) CloudFront + HTTPS + custom domain
Put a CloudFront distribution in front of the S3 website endpoint to get
HTTPS, caching, and a custom domain via Route 53 + ACM certificate.

## 9. Enable CloudWatch monitoring
Lambda automatically logs to CloudWatch Logs — no setup needed. For
alerting, create a CloudWatch Alarm on the `Errors` metric for each
function.

## 10. Cost note
Everything here (DynamoDB on-demand, Lambda, API Gateway HTTP API, S3) is
within the **AWS Free Tier** for a single-user student project, and stays
very cheap even beyond it — this stack was chosen specifically to avoid
always-on servers.
