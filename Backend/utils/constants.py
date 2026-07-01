# ─── Subscription Plans ────────────────────────────────────────────────────────
#
# These plans map to the frontend Pricing page.
# cost is in USD cents (Razorpay works in smallest currency unit).
# doc_limit: max documents the user can upload (-1 = unlimited)
# query_limit: max AI queries per month (-1 = unlimited)
# storage_mb: storage quota in MB (-1 = unlimited)
#
plans = {
    "starter": {
        "plan": "Starter",
        "cost": 29,              # $29 / month
        "doc_limit": 50,
        "query_limit": 500,
        "storage_mb": 512,
        "features": [
            "50 documents",
            "500 AI queries/month",
            "512 MB storage",
            "PDF, DOCX, TXT support",
            "Basic chat & search",
            "Email support",
        ],
    },
    "professional": {
        "plan": "Professional",
        "cost": 79,              # $79 / month
        "doc_limit": 500,
        "query_limit": 5000,
        "storage_mb": 5120,      # 5 GB
        "features": [
            "500 documents",
            "5,000 AI queries/month",
            "5 GB storage",
            "All file formats",
            "Document summarization & comparison",
            "Citation & source tracking",
            "Priority support",
        ],
    },
    "enterprise": {
        "plan": "Enterprise",
        "cost": 249,             # $249 / month
        "doc_limit": -1,
        "query_limit": -1,
        "storage_mb": -1,
        "features": [
            "Unlimited documents",
            "Unlimited AI queries",
            "Unlimited storage",
            "All file formats",
            "Full AI feature suite",
            "Custom knowledge spaces",
            "Role-based access control",
            "API access",
            "Dedicated support",
        ],
    },
}

PLAN_CURRENCY = "USD"

# ─── Supported File Types ──────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".txt", ".md",
    ".pptx", ".ppt", ".csv", ".xlsx", ".xls",
}

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}

# ─── Document Processing ───────────────────────────────────────────────────────
DOCUMENT_STATUSES = {
    "pending":    "File uploaded, processing not started",
    "processing": "Text extraction and embedding in progress",
    "ready":      "Document processed and ready to query",
    "failed":     "Processing failed — see error_message",
}

# ─── AI Generation Types ───────────────────────────────────────────────────────
GENERATION_TYPES = {
    "summary":       "Document summary",
    "faq":           "Frequently asked questions",
    "policy":        "Policy document",
    "meeting_notes": "Meeting notes",
    "sop":           "Standard operating procedure",
}
