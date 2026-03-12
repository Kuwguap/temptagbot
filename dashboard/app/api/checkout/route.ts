import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
// Use production domain for Stripe redirects so users land on temptagbot.com, not a Vercel preview URL
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code || !stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing code or config" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: products } = await supabase
    .from("products")
    .select("code, label, price_cents")
    .eq("active", true)
    .eq("code", code)
    .limit(1);

  const product = products?.[0] as { code: string; label: string; price_cents: number } | undefined;
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: product.price_cents,
          product_data: {
            name: product.label,
            description: `TempTagBot – ${product.code}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl.replace(/\/$/, "")}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl.replace(/\/$/, "")}/`,
    metadata: { product_code: product.code, source: "web" },
  });

  await supabase.from("stripe_sessions").insert({
    id: session.id,
    telegram_chat_id: null,
    product_code: product.code,
  });

  if (session.url) {
    return NextResponse.redirect(session.url);
  }
  return NextResponse.json({ error: "Could not create checkout" }, { status: 500 });
}
