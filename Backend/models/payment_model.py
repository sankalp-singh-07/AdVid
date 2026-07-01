import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PaymentOrder(Base):
    """
    Records a Razorpay payment order tied to a subscription plan.

    When a user purchases a plan the frontend calls /api/plans/buy,
    which creates a Razorpay order and stores it here. After the user
    completes payment in the Razorpay checkout widget, the frontend
    calls /api/plans/verify to confirm the transaction.

    The `plan_id` maps to one of the keys in utils/constants.plans
    (e.g. "starter", "professional", "enterprise").
    """

    __tablename__ = "payment_orders"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[str] = mapped_column(String, nullable=False)

    # Razorpay identifiers
    razorpay_order_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String, unique=True, nullable=True
    )

    # Amount is stored in cents (smallest currency unit, same as Razorpay)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False, default="USD")

    # status: "created" | "paid" | "failed"
    status: Mapped[str] = mapped_column(String, nullable=False, default="created")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
