import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const VIN_LENGTH = 17;
const NHTSA_VIN_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues";

export type ValidatePayload = {
  rawText?: string;
  productCode: string;
  vin?: string;
  address?: string;
  color?: string;
  phone?: string;
  insurance?: string;
};

export type ValidatedResult = {
  vin?: string;
  address?: string;
  color?: string;
  phone?: string;
  insurance?: string;
};

async function decodeVin(vin: string): Promise<{ valid: boolean; make?: string; model?: string }> {
  const res = await fetch(`${NHTSA_VIN_URL}/${encodeURIComponent(vin)}?format=json`);
  if (!res.ok) return { valid: false };
  const data = await res.json();
  const results = data.Results?.[0];
  if (!results) return { valid: false };
  const make = results.Make;
  const model = results.Model;
  const valid = make && make !== "" && results.ErrorCode === "0";
  return { valid: !!valid, make, model };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  let body: ValidatePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { rawText, productCode, vin: vinInput, address, color, phone, insurance } = body;
  const result: ValidatedResult = {};
  const errors: string[] = [];

  // Step 1: VIN
  let vin = (vinInput ?? "").trim().toUpperCase().replace(/\s/g, "");
  if (rawText) {
    const extracted = await extractWithOpenAI(apiKey, rawText, productCode);
    if (extracted.vin) vin = extracted.vin;
    if (extracted.address) result.address = extracted.address;
    if (extracted.color) result.color = extracted.color;
    if (extracted.phone) result.phone = extracted.phone;
    if (extracted.insurance !== undefined) result.insurance = extracted.insurance;
  } else {
    if (address) result.address = address;
    if (color) result.color = color;
    if (phone) result.phone = phone;
    if (insurance !== undefined) result.insurance = insurance;
  }

  if (vin.length !== VIN_LENGTH) {
    errors.push(`VIN must be exactly ${VIN_LENGTH} characters.`);
  } else {
    const vinCheck = await decodeVin(vin);
    if (!vinCheck.valid) {
      errors.push("VIN could not be validated with NHTSA. Please check and try again.");
    } else {
      result.vin = vin;
    }
  }

  // Step 2: Require address, color, phone from AI or fields
  if (!result.address) errors.push("Address is required.");
  if (!result.color) errors.push("Vehicle color is required.");
  if (!result.phone) errors.push("Phone number is required.");

  // Step 3: If product is "Temp Tag Only" (100), require insurance info
  const tempTagOnly = productCode === "100";
  if (tempTagOnly && (result.insurance === undefined || result.insurance === "")) {
    errors.push("Insurance information is required for Temp Tag Only.");
  }

  return NextResponse.json({
    ok: errors.length === 0,
    extracted: result,
    errors: errors.length ? errors : undefined,
  });
}

async function extractWithOpenAI(
  apiKey: string,
  rawText: string,
  productCode: string
): Promise<ValidatedResult & { vin?: string }> {
  const client = new OpenAI({ apiKey });
  const isTempTagOnly = productCode === "100";
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You extract structured data from a customer message about their vehicle and contact info.
Return a JSON object only, with keys: vin (17 chars, letters and numbers only), address, color, phone, insurance (yes/no or brief description; required if product is "Temp Tag Only").
If a field is missing or unclear, omit it or use empty string. VIN must be exactly 17 characters; if not found or invalid length, omit vin.`,
      },
      {
        role: "user",
        content: `Product code: ${productCode}. ${isTempTagOnly ? "Insurance is required for this product." : ""}\n\nCustomer message:\n${rawText}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = res.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(text) as Record<string, string>;
    const vin = (parsed.vin ?? "").trim().toUpperCase().replace(/\s/g, "");
    return {
      vin: vin.length === VIN_LENGTH ? vin : undefined,
      address: parsed.address ?? "",
      color: parsed.color ?? "",
      phone: parsed.phone ?? "",
      insurance: parsed.insurance ?? "",
    };
  } catch {
    return {};
  }
}
