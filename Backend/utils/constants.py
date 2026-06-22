plans = {
    "starter": {
        "plan": "Starter",
        "cost": 49,
        "doc_limit": 100,
        "query_limit": 500,
        "credits": 100,
    },
    "professional": {
        "plan": "Professional",
        "cost": 149,
        "doc_limit": -1,  # -1 represents unlimited
        "query_limit": -1,
        "credits": 1000,
    },
    "enterprise": {
        "plan": "Enterprise",
        "cost": 499,
        "doc_limit": -1,
        "query_limit": -1,
        "credits": 99999,
    },
}

PLAN_CURRENCY = "USD"
