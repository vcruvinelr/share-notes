import os
from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Note, Subscription, SubscriptionStatus, User
from app.schemas import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    SubscriptionResponse,
)

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "price_premium_monthly")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.post(
    "/create-checkout-session", response_model=CheckoutSessionResponse
)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe checkout session for subscription"""
    if current_user.is_anonymous:
        raise HTTPException(
            status_code=403,
            detail="Anonymous users cannot subscribe. Please create an account.",  # noqa: E501
        )

    if current_user.is_premium:
        raise HTTPException(
            status_code=400, detail="You already have an active subscription"
        )

    try:
        # Create or get Stripe customer
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": str(current_user.id)},
            )
            current_user.stripe_customer_id = customer.id
            await db.commit()

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/?success=true&session_id={{CHECKOUT_SESSION_ID}}",  # noqa: E501
            cancel_url=f"{FRONTEND_URL}/?canceled=true",
            metadata={"user_id": str(current_user.id)},
        )

        return CheckoutSessionResponse(
            checkout_url=checkout_session.url, session_id=checkout_session.id
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout session: {str(e)}",
        )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's subscription status"""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    return subscription


@router.get("/note-limit")
async def get_note_limit(
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get note limit information for current user"""
    # If no user (not even anonymous), return default limits
    if current_user is None:
        return {
            "note_count": 0,
            "limit": 3,
            "can_create_more": True,
            "is_premium": False,
        }

    # Count user's notes
    note_count_query = select(func.count(Note.id)).where(
        Note.owner_id == current_user.id
    )
    result = await db.execute(note_count_query)
    note_count = result.scalar()

    # Free users have a limit of 3 notes
    limit = 3 if not current_user.is_premium else None
    can_create_more = current_user.is_premium or (note_count < 3)

    return {
        "note_count": note_count,
        "limit": limit,
        "can_create_more": can_create_more,
        "is_premium": current_user.is_premium,
    }


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel user's subscription"""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(
            status_code=404, detail="No active subscription found"
        )

    try:
        # Cancel at period end in Stripe
        stripe.Subscription.modify(
            subscription.stripe_subscription_id, cancel_at_period_end=True
        )

        subscription.cancel_at_period_end = True
        await db.commit()

        return {
            "message": "Subscription will be canceled at the end of the billing period"  # noqa: E501
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events"""
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]

        # Get subscription details from Stripe
        stripe_subscription = stripe.Subscription.retrieve(
            session["subscription"]
        )

        # Update user
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.is_premium = True

            # Create or update subscription record
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )
            subscription = result.scalar_one_or_none()

            if not subscription:
                subscription = Subscription(user_id=user_id)
                db.add(subscription)

            subscription.stripe_subscription_id = stripe_subscription.id
            subscription.stripe_price_id = stripe_subscription["items"][
                "data"
            ][0]["price"]["id"]
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription.current_period_start
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )
            subscription.cancel_at_period_end = (
                stripe_subscription.cancel_at_period_end
            )

            await db.commit()

    elif event["type"] == "customer.subscription.updated":
        stripe_subscription = event["data"]["object"]

        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription.id
            )
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.status = SubscriptionStatus(
                stripe_subscription.status
            )
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription.current_period_start
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )
            subscription.cancel_at_period_end = (
                stripe_subscription.cancel_at_period_end
            )

            # Update user premium status
            result = await db.execute(
                select(User).where(User.id == subscription.user_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.is_premium = stripe_subscription.status == "active"

            await db.commit()

    elif event["type"] == "customer.subscription.deleted":
        stripe_subscription = event["data"]["object"]

        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription.id
            )
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.status = SubscriptionStatus.CANCELED

            # Update user premium status
            result = await db.execute(
                select(User).where(User.id == subscription.user_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.is_premium = False

            await db.commit()

    return {"status": "success"}
