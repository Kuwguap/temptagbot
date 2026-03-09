# Environment variables

Use these in **Vercel** (dashboard) and **Render** (bot) so the web and bot mirror the same flow and AI validation.

---

## Vercel (Next.js dashboard)

In the project → **Settings → Environment Variables**, add:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_BASE_URL` | Full app URL for Stripe redirects (e.g. `https://temptagbot.vercel.app`) |
| `OPENAI_API_KEY` | OpenAI API key (for AI validation on web) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (API routes + webhook) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (webhook + order notify) |

---

## Render (Python bot)

In the **Web Service** → **Environment**, add:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Same as Vercel |
| `STRIPE_SECRET_KEY` | Same as Vercel |
| `OPENAI_API_KEY` | Same as Vercel (AI validation in bot) |
| `ADMIN_GROUP_ID` | Telegram admin group ID (e.g. `-100xxxxxxxxxx`) |
| `PUBLIC_BASE_URL` | Your Vercel URL (e.g. `https://temptagbot.vercel.app`) |
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | Same as Vercel |

---

## Summary

- **Web (Vercel)**: product selection → Stripe checkout → success page → AI validate (VIN, address, color, phone, insurance) → complete order → notify admin.
- **Bot (Render)**: same flow in Telegram; after payment, user sends one message → same AI validation → order created and admin notified.
- Both use the same **OpenAI** and **NHTSA** logic; **OPENAI_API_KEY** is required on **Vercel** and **Render**.
