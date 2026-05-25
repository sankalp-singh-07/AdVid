import hmac
import uuid
from hashlib import sha256

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from models.payment_model import PaymentOrder
from models.user_model import User
from utils.constants import PLAN_CURRENCY, plans
from utils.logger import get_logger


logger = get_logger("payment_service")
RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"


def _plan_response(plan_id: str, plan: dict) -> dict:
    return {
        "id": plan_id,
        "name": plan["plan"],
        "amount": int(plan["cost"]) * 100,
        "currency": PLAN_CURRENCY,
        "credits": int(plan["credits"]),
    }


def get_available_plans() -> dict:
    return {
        "plans": [
            _plan_response(plan_id, plan)
            for plan_id, plan in plans.items()
        ]
    }


def _get_plan_or_404(plan_id: str) -> dict:
    plan = plans.get(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found.",
        )
    return plan


def _require_test_razorpay_keys() -> tuple[str, str]:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay test keys are not configured.",
        )

    if settings.RAZORPAY_TEST_MODE and not settings.RAZORPAY_KEY_ID.startswith("rzp_test_"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Only Razorpay test keys are allowed while RAZORPAY_TEST_MODE is enabled.",
        )

    return settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET


async def create_payment_order(
    plan_id: str,
    user: User,
    db: AsyncSession,
) -> dict:
    plan = _get_plan_or_404(plan_id)
    key_id, key_secret = _require_test_razorpay_keys()
    plan_payload = _plan_response(plan_id, plan)

    receipt = f"plan_{str(user.id)[:8]}_{uuid.uuid4().hex[:12]}"
    payload = {
        "amount": plan_payload["amount"],
        "currency": plan_payload["currency"],
        "receipt": receipt,
        "notes": {
            "user_id": str(user.id),
            "plan_id": plan_id,
            "credits": str(plan_payload["credits"]),
            "test_mode": str(settings.RAZORPAY_TEST_MODE).lower(),
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                RAZORPAY_ORDERS_URL,
                auth=(key_id, key_secret),
                json=payload,
            )
            response.raise_for_status()
            razorpay_order = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Razorpay order creation failed: %s", exc.response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Razorpay test order creation failed.",
        )
    except httpx.HTTPError as exc:
        logger.error("Razorpay connection error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to Razorpay.",
        )

    try:
        payment_order = PaymentOrder(
            user_id=user.id,
            plan_id=plan_id,
            razorpay_order_id=razorpay_order["id"],
            amount=plan_payload["amount"],
            currency=plan_payload["currency"],
            credits=plan_payload["credits"],
            status="created",
        )
        db.add(payment_order)
        await db.commit()
    except SQLAlchemyError as exc:
        logger.error("DB error saving Razorpay order for user_id=%s — %s", user.id, exc)
        raise

    return {
        "key_id": key_id,
        "order_id": razorpay_order["id"],
        "amount": plan_payload["amount"],
        "currency": plan_payload["currency"],
        "plan": plan_payload,
        "test_mode": settings.RAZORPAY_TEST_MODE,
    }


def _is_valid_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    key_secret: str,
) -> bool:
    payload = f"{order_id}|{payment_id}".encode()
    digest = hmac.new(key_secret.encode(), payload, sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


async def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user: User,
    db: AsyncSession,
) -> dict:
    _, key_secret = _require_test_razorpay_keys()

    try:
        result = await db.execute(
            select(PaymentOrder).where(
                PaymentOrder.razorpay_order_id == razorpay_order_id,
                PaymentOrder.user_id == user.id,
            )
        )
        payment_order = result.scalars().first()
    except SQLAlchemyError as exc:
        logger.error("DB error fetching payment order=%s — %s", razorpay_order_id, exc)
        raise

    if not payment_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment order not found.",
        )

    if payment_order.status == "paid":
        return {
            "message": "Payment already verified.",
            "credits_added": 0,
            "total_credits": user.credits,
        }

    if not _is_valid_signature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        key_secret,
    ):
        payment_order.status = "failed"
        db.add(payment_order)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay payment signature.",
        )

    try:
        payment_order.status = "paid"
        payment_order.razorpay_payment_id = razorpay_payment_id
        user.credits += payment_order.credits
        db.add(payment_order)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except SQLAlchemyError as exc:
        logger.error("DB error verifying payment order=%s — %s", razorpay_order_id, exc)
        raise

    return {
        "message": "Payment verified and credits added.",
        "credits_added": payment_order.credits,
        "total_credits": user.credits,
    }
