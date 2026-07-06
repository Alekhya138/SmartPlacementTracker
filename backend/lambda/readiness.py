"""
Readiness scoring — pure calculation logic shared by dashboard.py.
Not exposed as its own API route; imported directly.

Weights (sum to 100):
  Coding        25
  Aptitude      20
  Resume        15
  Profile/CGPA  15
  Projects      15
  Certifications 10
"""

PROFILE_FIELDS_FOR_COMPLETION = [
    "name", "phone", "college", "branch", "cgpa", "skills", "languages",
    "linkedin", "github", "leetcode", "hackerrank",
]


def profile_completion(profile):
    filled = sum(1 for f in PROFILE_FIELDS_FOR_COMPLETION if profile.get(f))
    return round((filled / len(PROFILE_FIELDS_FOR_COMPLETION)) * 100)


def coding_score(coding_entries):
    if not coding_entries:
        return 0
    total_problems = sum(e.get("count", 0) for e in coding_entries)
    # 60 problems logged ~ full marks; tune this as real usage data comes in
    return min(100, round((total_problems / 60) * 100))


def aptitude_score(aptitude_entries):
    if not aptitude_entries:
        return 0
    scores = [e.get("score", 0) for e in aptitude_entries]
    return round(sum(scores) / len(scores))


def resume_score(profile):
    return 100 if profile.get("resumeUrl") else 0


def projects_score(profile):
    count = len(profile.get("projects", []) or [])
    return min(100, count * 34)  # 3 solid projects ~ full marks


def certifications_score(profile):
    count = len(profile.get("certifications", []) or [])
    return min(100, count * 34)


def calculate_readiness(profile, aptitude_entries, coding_entries):
    breakdown = {
        "aptitude": aptitude_score(aptitude_entries),
        "coding": coding_score(coding_entries),
        "resume": resume_score(profile),
        "communication": profile.get("communicationScore", 0),
        "projects": projects_score(profile),
        "certifications": certifications_score(profile),
    }

    weights = {"coding": 0.25, "aptitude": 0.20, "resume": 0.15, "communication": 0.15,
               "projects": 0.15, "certifications": 0.10}

    overall = round(sum(breakdown[k] * weights[k] for k in weights))

    return {
        "readinessScore": overall,
        "breakdown": breakdown,
        "profileCompletion": profile_completion(profile),
        "resumeUploaded": bool(profile.get("resumeUrl")),
    }
