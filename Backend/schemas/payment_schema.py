from pydantic import BaseModel, Field


class PlanResponse(BaseModel):
    id: str
    name: str
    amount: int
    currency: str
    credits: int


class PlanListResponse(BaseModel):
    plans: list[PlanResponse]


class CreatePaymentOrderRequest(BaseModel):
    plan_id: str = Field(..., min_length=1)


class CreatePaymentOrderResponse(BaseModel):
    key_id: str
    order_id: str
    amount: int
    currency: str
    plan: PlanResponse
    test_mode: bool


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    message: str
    credits_added: int
    total_credits: int
