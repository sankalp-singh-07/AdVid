from pydantic import BaseModel, Field


class PlanFeatures(BaseModel):
    """Details surfaced to the frontend Pricing page."""

    id: str
    name: str
    cost: int           # USD dollars (not cents) for display
    currency: str
    doc_limit: int      # -1 = unlimited
    query_limit: int    # -1 = unlimited
    storage_mb: int     # -1 = unlimited
    features: list[str]


class PlanListResponse(BaseModel):
    plans: list[PlanFeatures]


class CreatePaymentOrderRequest(BaseModel):
    plan_id: str = Field(..., min_length=1)


class CreatePaymentOrderResponse(BaseModel):
    key_id: str
    order_id: str
    amount: int        # in cents for Razorpay
    currency: str
    plan: PlanFeatures
    test_mode: bool


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    message: str
    plan_id: str
    plan_name: str
