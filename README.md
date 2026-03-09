# 🚗 TempTagBot: Automated Telegram Sales & Validation

TempTagBot is a high-efficiency Telegram bot designed to automate the sale of temporary tags and insurance. It handles the entire customer journey—from product selection and Stripe payments to AI-powered data validation and document collection.

## 🌟 Key Features
* **Inline Menu Interface:** Clean, button-based product selection.
* **Stripe Integration:** Secure payment processing with session tracking.
* **AI Data Validation:** Uses OpenAI to verify addresses, phone numbers, and insurance requirements.
* **VIN Verification:** Automated 17-character VIN length check and real-world validity lookup.
* **Document Management:** Handles optional document uploads (Photos/PDFs).
* **Admin Dispatch:** Forwards completed, validated orders to a specific Telegram Group/ID.

## 🛠 Tech Stack
* **Bot:** Python (`python-telegram-bot`)
* **Admin Dashboard:** Next.js (TypeScript, deployed on Vercel)
* **Payment Gateway:** Stripe API
* **Intelligence:** OpenAI API (GPT-4o)
* **Validation:** NHTSA vPIC API (for VIN verification)
* **Database:** Supabase (Postgres + Row Level Security)
* **Environment:** Python 3.10+, Node.js 20+

## 🚀 Quick Start
### 1. Clone the repo
```bash
git clone https://github.com/yourusername/temptagbot.git
cd temptagbot
```

### 2. Configure environment
Copy the example env file and fill in your real secrets:

```bash
cp .env.example .env
```

Fill in:

- `TELEGRAM_BOT_TOKEN`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `ADMIN_GROUP_ID`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run the Telegram bot (Python)
Create and activate a virtualenv, then install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m bot.main
```

### 4. Run the admin dashboard (Next.js)
```bash
cd dashboard
npm install
npm run dev
```
Open http://localhost:3000 to manage products and Telegram settings.

### 5. Supabase setup
Run the SQL in `supabase_schema.sql` in your Supabase project (SQL Editor). This creates `products`, `telegram_settings`, and `stripe_sessions` tables and seeds default products.

### 6. Stripe webhook (for payment completion)
Point Stripe to your webhook URL (e.g. `https://your-app.vercel.app/api/stripe-webhook`). In Stripe Dashboard → Developers → Webhooks, add endpoint and select `checkout.session.completed`. Set the signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel (and in `.env.local` for local testing).

**Vercel env vars for the dashboard:**  
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_KEY`, `TELEGRAM_BOT_TOKEN`.

**Bot env:** Set `PUBLIC_BASE_URL` to your dashboard or any public URL (used as Stripe checkout success/cancel base). Example: `https://your-app.vercel.app`.

---

## 📩 Order Workflow
User triggers /start -> Bot shows product buttons.

User selects product -> Bot sends Stripe payment link.

Payment Success -> Bot asks for vehicle/personal details.

AI Scan: Bot validates VIN (17 chars), Address, Color, Phone, and Insurance status.

Documents: Bot asks for optional files.

Completion: Data is packaged with an Order Number and sent to the Admin Group.