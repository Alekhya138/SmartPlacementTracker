"""
Analytics Lambda — routes: GET /analytics

Returns pre-aggregated series for the analytics charts page.
"""

from collections import defaultdict
from datetime import datetime

from boto3.dynamodb.conditions import Key

from utils import table, TABLE_PROFILES, TABLE_APTITUDE, TABLE_CODING, TABLE_APPLICATIONS
from utils import ok, unauthorized, get_authenticated_user
from readiness import calculate_readiness


def month_key(date_str):
    try:
        return datetime.fromisoformat(date_str).strftime("%b")
    except Exception:
        return "Unknown"


def get_handler(event, context):
    auth = get_authenticated_user(event)
    if not auth:
        return unauthorized()

    user_id = auth["sub"]

    profile = table(TABLE_PROFILES).get_item(Key={"userId": user_id}).get("Item") or {}
    aptitude_entries = table(TABLE_APTITUDE).query(KeyConditionExpression=Key("userId").eq(user_id)).get("Items", [])
    coding_entries = table(TABLE_CODING).query(KeyConditionExpression=Key("userId").eq(user_id)).get("Items", [])
    applications = table(TABLE_APPLICATIONS).query(KeyConditionExpression=Key("userId").eq(user_id)).get("Items", [])

    # Applications per month
    apps_by_month = defaultdict(int)
    for a in applications:
        if a.get("applicationDate"):
            apps_by_month[month_key(a["applicationDate"])] += 1

    # Selection rate
    selected = len([a for a in applications if a.get("status") == "Selected"])
    rejected = len([a for a in applications if a.get("status") == "Rejected"])
    pending = len(applications) - selected - rejected

    # Coding growth by week (last 4 weeks, problem counts)
    coding_by_week = defaultdict(int)
    for e in coding_entries:
        try:
            d = datetime.fromisoformat(e["date"])
            week_label = f"Wk{d.isocalendar()[1] % 4 + 1}"
            coding_by_week[week_label] += e.get("count", 0)
        except Exception:
            continue

    # Aptitude improvement by category (average score)
    apt_by_category = defaultdict(list)
    for e in aptitude_entries:
        apt_by_category[e.get("category", "Unknown")].append(e.get("score", 0))
    aptitude_avg = {cat: round(sum(v) / len(v)) for cat, v in apt_by_category.items()}

    # Readiness trend — approximated from current snapshot repeated across
    # the last few months since historical snapshots aren't stored yet.
    # For real trend tracking, write a readiness snapshot to a
    # SPT_ReadinessHistory table on a schedule (see AWS_DEPLOYMENT_GUIDE.md).
    current_readiness = calculate_readiness(profile, aptitude_entries, coding_entries)["readinessScore"]

    return ok({
        "readinessTrend": {"labels": ["Current"], "data": [current_readiness]},
        "applicationsPerMonth": {"labels": list(apps_by_month.keys()), "data": list(apps_by_month.values())},
        "selectionRate": {"selected": selected, "rejected": rejected, "pending": max(pending, 0)},
        "codingGrowth": {"labels": list(coding_by_week.keys()), "data": list(coding_by_week.values())},
        "aptitudeImprovement": {"labels": list(aptitude_avg.keys()), "data": list(aptitude_avg.values())},
    })
