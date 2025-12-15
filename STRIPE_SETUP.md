# Share Notes - Subscription Setup Guide

## Stripe Integration

Your app now has a complete subscription system! Here's how to set it up:

### 1. **Create a Stripe Account**
- Go to [https://stripe.com](https://stripe.com)
- Sign up for a free account
- Stripe supports **135+ currencies** and **195+ countries**

### 2. **Get Your API Keys**
- Go to Stripe Dashboard → Developers → API Keys
- Copy your **Secret Key** (starts with `sk_test_...` for test mode)
- Update `docker-compose.yml`:
  ```yaml
  STRIPE_SECRET_KEY: sk_test_your_actual_key_here
  ```

### 3. **Create a Product and Price**
- Go to Stripe Dashboard → Products
- Click "Add Product"
- Name: "Premium Subscription"
- Price: $3.00 USD (monthly recurring)
- Copy the **Price ID** (starts with `price_...`)
- Update `docker-compose.yml`:
  ```yaml
  STRIPE_PRICE_ID: price_your_actual_price_id_here
  ```

### 4. **Set Up Webhook (for production)**
- Go to Stripe Dashboard → Developers → Webhooks
- Click "Add endpoint"
- URL: `https://yourdomain.com/api/subscription/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the **Signing Secret** (starts with `whsec_...`)
- Update `docker-compose.yml`:
  ```yaml
  STRIPE_WEBHOOK_SECRET: whsec_your_webhook_secret_here
  ```

### 5. **Test the Integration**
Use Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- Any future expiry date and any CVC

### 6. **How It Works**

#### Free Users (Anonymous & Authenticated):
- ✅ Up to 3 notes
- ✅ Real-time collaboration
- ✅ Share notes
- ❌ Unlimited notes

#### Premium Users ($3/month):
- ✅ **Unlimited notes**
- ✅ Real-time collaboration
- ✅ Share notes
- ✅ Priority support
- ✅ Advanced features

#### User Flow:
1. User creates notes (1, 2, 3...)
2. On 4th note attempt → Sees upgrade prompt
3. Clicks "Upgrade to Premium"
4. Redirected to Stripe Checkout
5. Completes payment
6. Webhook updates user to premium
7. Can now create unlimited notes!

### 7. **Features Implemented**

**Backend:**
- ✅ Subscription model (PostgreSQL)
- ✅ Stripe customer creation
- ✅ Checkout session generation
- ✅ Webhook handler for payment events
- ✅ Note limit enforcement (3 for free)
- ✅ Subscription status tracking

**Frontend:**
- ✅ Beautiful pricing modal
- ✅ Note limit progress bar
- ✅ Upgrade prompts
- ✅ Stripe checkout redirect
- ✅ Success/cancel handling

### 8. **Testing the Flow**

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Run migration:**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

3. **Create 3 notes** - should work fine

4. **Try creating 4th note** - you'll see:
   - Progress bar showing "3/3 notes used"
   - Warning alert: "Limit Reached"
   - Premium upgrade button

5. **Click "Upgrade to Premium"** - opens beautiful pricing modal

6. **Click "Upgrade Now"** - redirects to Stripe Checkout

7. **Use test card 4242 4242 4242 4242** - completes payment

8. **Redirected back** - now you're premium with unlimited notes!

### 9. **Customization**

Want to change the price or add features? Update:
- Price in Stripe Dashboard
- Feature lists in `PricingModal.tsx`
- Note limit in `subscription.py` (currently 3)

### 10. **Go Live**

When ready for production:
1. Switch to Stripe live mode
2. Get live API keys (starts with `sk_live_...`)
3. Create live product and price
4. Update webhook URL to production domain
5. Test with real card (starts charging real money!)

## Security Notes

- ✅ Stripe handles all payment processing (PCI compliant)
- ✅ No credit card data touches your servers
- ✅ Webhook signature verification prevents fraud
- ✅ HTTPS required in production
- ✅ Environment variables for secrets

## Support

- Stripe docs: https://stripe.com/docs
- Stripe test cards: https://stripe.com/docs/testing
- Your Stripe Dashboard: https://dashboard.stripe.com

---

**Cost Breakdown:**
- Stripe fees: 2.9% + $0.30 per transaction
- $3 subscription → You keep ~$2.60
- First $1M in revenue: No platform fees!
