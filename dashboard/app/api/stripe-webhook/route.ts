import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !supabaseUrl || !supabaseServiceKey || !telegramBotToken || !stripeSecretKey) {
    console.error("Stripe webhook: missing env vars");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  if (!sessionId) {
    return NextResponse.json({ error: "No session id" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: row, error: fetchError } = await supabase
    .from("stripe_sessions")
    .select("telegram_chat_id, product_code")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchError || !row?.telegram_chat_id) {
    console.error("Stripe webhook: could not find session in DB", fetchError);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const chatId = row.telegram_chat_id as number;
  const productCode = (row.product_code as string) || "product";

  const message = `✅ Payment received for ${productCode}.\n\nPlease send your vehicle and contact details in one message (VIN, address, color, phone, and insurance if applicable).`;

  const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const telegramRes = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });

  if (!telegramRes.ok) {
    const errText = await telegramRes.text();
    console.error("Telegram send failed:", telegramRes.status, errText);
    return NextResponse.json({ error: "Failed to notify user" }, { status: 500 });
  }

  await supabase.from("stripe_sessions").delete().eq("id", sessionId);

  return NextResponse.json({ received: true });
}
