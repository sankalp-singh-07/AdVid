from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from models.user_model import User
from schemas.payment_schema import (
    CreatePaymentOrderRequest,
    CreatePaymentOrderResponse,
    PlanListResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from services.auth_service import get_current_user
from services.payment_service import (
    create_payment_order,
    get_available_plans,
    verify_payment,
)


router = APIRouter(prefix="/plans", tags=["plans"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", status_code=200, response_model=PlanListResponse)
async def list_plans():
    return get_available_plans()


@router.post("/buy", status_code=201, response_model=CreatePaymentOrderResponse)
async def buy_plan(
    request_data: CreatePaymentOrderRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    return await create_payment_order(
        plan_id=request_data.plan_id,
        user=current_user,
        db=db,
    )


@router.post("/verify", status_code=200, response_model=VerifyPaymentResponse)
async def verify_plan_payment(
    request_data: VerifyPaymentRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    return await verify_payment(
        razorpay_order_id=request_data.razorpay_order_id,
        razorpay_payment_id=request_data.razorpay_payment_id,
        razorpay_signature=request_data.razorpay_signature,
        user=current_user,
        db=db,
    )
