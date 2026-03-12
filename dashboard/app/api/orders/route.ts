import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

function generateOrderNumber(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TT-${n}`;
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  let body: {
    sessionId: string;
    productCode: string;
    vin: string;
    address: string;
    color: string;
    phone: string;
    insuranceInfo: string;
    documentUrls?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, productCode, vin, address, color, phone, insuranceInfo, documentUrls } = body;
  if (!sessionId || !productCode || !vin || !address || !color || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let orderNumber = generateOrderNumber();
  const { data: existing } = await supabase.from("orders").select("id").eq("order_number", orderNumber).maybeSingle();
  if (existing) orderNumber = generateOrderNumber();

  const { error: insertError } = await supabase.from("orders").insert({
    order_number: orderNumber,
    source: "web",
    product_code: productCode,
    stripe_session_id: sessionId,
    vin,
    address,
    color,
    phone,
    insurance_info: insuranceInfo ?? null,
    document_urls: documentUrls ?? [],
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: settings } = await supabase
    .from("telegram_settings")
    .select("admin_group_id, description")
    .eq("id", 1)
    .maybeSingle();

  const ids: string[] = [];
  if (settings) {
    const idsRaw =
      (settings.description as string | null) ??
      (settings.admin_group_id != null ? String(settings.admin_group_id) : null);
    if (idsRaw) {
      ids.push(
        ...idsRaw
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p && /^-?\d+$/.test(p))
      );
    }
  }

  if (telegramBotToken && ids.length > 0) {
    const report = `📋 *Order ${orderNumber}* (Web)\nProduct: ${productCode}\nVIN: ${vin}\nAddress: ${address}\nColor: ${color}\nPhone: ${phone}\nInsurance: ${insuranceInfo || "N/A"}`;
    for (const id of ids) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: Number(id),
            text: report,
            parse_mode: "Markdown",
          }),
        });
        if (!res.ok) {
          console.error("[orders] Telegram send failed for chat", id, await res.text());
        }
      } catch (e) {
        console.error("[orders] Telegram send error for chat", id, e);
      }
    }
  }

  await supabase.from("stripe_sessions").delete().eq("id", sessionId);

  return NextResponse.json({ orderNumber });
}
