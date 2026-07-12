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
    """Build a full plan dict for API responses and Razorpay order creation."""
    return {
        "id": plan_id,
        "name": plan["plan"],
        "cost": int(plan["cost"]),           # display price in USD
        "currency": PLAN_CURRENCY,
        "doc_limit": plan["doc_limit"],
        "query_limit": plan["query_limit"],
        "storage_mb": plan["storage_mb"],
        "features": plan["features"],
    }


def get_available_plans() -> dict:
    """Return all subscription plans for the Pricing page."""
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
            detail=f"Plan '{plan_id}' not found.",
        )
    return plan


def _require_razorpay_keys() -> tuple[str, str]:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay keys are not configured.",
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
    """
    Create a Razorpay order for the selected subscription plan.
    Amount is sent in cents (USD * 100) as Razorpay expects smallest unit.
    """
    plan = _get_plan_or_404(plan_id)
    key_id, key_secret = _require_razorpay_keys()
    plan_payload = _plan_response(plan_id, plan)

    amount_cents = plan_payload["cost"] * 100  # USD → cents
    receipt = f"plan_{str(user.id)[:8]}_{uuid.uuid4().hex[:12]}"

    payload = {
        "amount": amount_cents,
        "currency": plan_payload["currency"],
        "receipt": receipt,
        "notes": {
            "user_id": str(user.id),
            "plan_id": plan_id,
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
            detail="Razorpay order creation failed.",
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
            amount=amount_cents,
            currency=plan_payload["currency"],
            status="created",
        )
        db.add(payment_order)
        await db.commit()
        logger.info(
            "Payment order created: plan=%s user_id=%s razorpay_order_id=%s",
            plan_id, user.id, razorpay_order["id"],
        )
    except SQLAlchemyError as exc:
        logger.error("DB error saving payment order for user_id=%s — %s", user.id, exc)
        raise

    return {
        "key_id": key_id,
        "order_id": razorpay_order["id"],
        "amount": amount_cents,
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
    """
    Verify the Razorpay payment signature and mark the order as paid.
    TODO (Phase 4): update user's active_plan field once User model has it.
    """
    _, key_secret = _require_razorpay_keys()

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
        plan = plans.get(payment_order.plan_id, {})
        return {
            "message": "Payment already verified.",
            "plan_id": payment_order.plan_id,
            "plan_name": plan.get("plan", payment_order.plan_id),
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
        db.add(payment_order)
        await db.commit()
        logger.info(
            "Payment verified: plan=%s user_id=%s",
            payment_order.plan_id, user.id,
        )
    except SQLAlchemyError as exc:
        logger.error("DB error verifying payment order=%s — %s", razorpay_order_id, exc)
        raise

    plan = plans.get(payment_order.plan_id, {})
    return {
        "message": "Payment verified. Your plan is now active.",
        "plan_id": payment_order.plan_id,
        "plan_name": plan.get("plan", payment_order.plan_id),
    }
