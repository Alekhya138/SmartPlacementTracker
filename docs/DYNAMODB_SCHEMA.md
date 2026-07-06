# DynamoDB Schema — Smart Placement Tracker

All tables use **on-demand (pay-per-request)** billing mode, which is best
for a student project with unpredictable, low-volume traffic.

## 1. SPT_Users
Stores login credentials, separate from the profile table for security.

| Attribute      | Type   | Notes                          |
|----------------|--------|---------------------------------|
| `email` (PK)   | String | Lowercased, unique              |
| `userId`       | String | UUID, used as the app-wide user identifier |
| `name`         | String | |
| `college`      | String | |
| `branch`       | String | |
| `graduationYear` | Number | |
| `passwordHash` | String | `salt$pbkdf2hash` format |
| `createdAt`    | String | ISO 8601 |

## 2. SPT_StudentProfile
| Attribute      | Type   | Notes |
|----------------|--------|-------|
| `userId` (PK)  | String | |
| `name`, `email`, `phone`, `college`, `branch` | String | |
| `cgpa`         | Number | |
| `skills`, `languages`, `certifications`, `projects` | List\<String\> | |
| `linkedin`, `github`, `leetcode`, `hackerrank` | String | |
| `resumeUrl`    | String | S3 object URL |
| `mockInterviewScore` | Number | |
| `communicationScore` | Number | Optional, self-rated or set by admin/mentor |

## 3. SPT_Applications (Company Tracker)
| Attribute        | Type   | Notes |
|------------------|--------|-------|
| `userId` (PK)    | String | |
| `applicationId` (SK) | String | UUID |
| `name`           | String | Company name |
| `role`           | String | |
| `package`        | Number | LPA |
| `location`       | String | |
| `status`         | String | Interested / Applied / OA Scheduled / OA Cleared / Interview Scheduled / HR Round / Selected / Rejected |
| `applicationDate`| String | ISO date |
| `deadline`       | String | ISO date |

## 4. SPT_AptitudeProgress
| Attribute      | Type   | Notes |
|----------------|--------|-------|
| `userId` (PK)  | String | |
| `entryId` (SK) | String | UUID |
| `category`     | String | Quantitative / Logical Reasoning / Verbal |
| `score`        | Number | 0–100 |
| `date`         | String | ISO date |

## 5. SPT_CodingProgress
| Attribute      | Type   | Notes |
|----------------|--------|-------|
| `userId` (PK)  | String | |
| `entryId` (SK) | String | UUID |
| `platform`     | String | LeetCode / GeeksforGeeks / HackerRank / CodeChef / Codeforces |
| `count`        | Number | Problems solved that session |
| `difficulty`   | String | Easy / Medium / Hard |
| `date`         | String | ISO date |

## Future tables (not yet wired into Lambda code — see README "Future enhancements")
- **SPT_Notifications** — `userId` (PK), `notificationId` (SK), `type`, `message`, `read`, `createdAt`
- **SPT_MockInterviews** — `userId` (PK), `interviewId` (SK), `date`, `score`, `feedback`
- **SPT_ReadinessHistory** — `userId` (PK), `snapshotDate` (SK), `readinessScore` — write one item per week (e.g. via EventBridge scheduled Lambda) to power a real readiness trend chart instead of the single-point approximation in `analytics.py`.

## Indexing notes
- All application-data tables use `userId` as the partition key, so a
  student's data is always fetched with a single, cheap `Query` (never a
  full-table `Scan`).
- No GSIs are required for the current feature set. If you add an admin
  "search all students" feature, add a GSI on `SPT_Users` with a
  low-cardinality partition key (e.g. `college`) or use DynamoDB Scan with
  pagination for the admin dashboard only.
