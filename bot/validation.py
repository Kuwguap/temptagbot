"""AI + VIN validation (same logic as web /api/validate)."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import requests
from openai import OpenAI

from .config import get_settings

logger = logging.getLogger(__name__)

VIN_LENGTH = 17
NHTSA_VIN_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues"


def validate_vin_length(vin: str) -> bool:
    cleaned = re.sub(r"\s+", "", vin).upper()
    return len(cleaned) == VIN_LENGTH and cleaned.isalnum()


def decode_vin_nhtsa(vin: str) -> bool:
    try:
        r = requests.get(f"{NHTSA_VIN_URL}/{vin}?format=json", timeout=10)
        r.raise_for_status()
        data = r.json()
        results = data.get("Results", [{}])[0]
        make = results.get("Make") or ""
        err = results.get("ErrorCode") or ""
        return bool(make) and err == "0"
    except Exception as e:
        logger.warning("NHTSA VIN decode failed: %s", e)
        return False


def extract_with_openai(raw_text: str, product_code: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openai_api_key:
        return {}
    client = OpenAI(api_key=settings.openai_api_key)
    is_temp_tag_only = product_code == "100"
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You extract structured data from a customer message about their vehicle and contact info. "
                    "Return a JSON object only, with keys: vin (17 chars, letters and numbers only), address, color, phone, insurance (yes/no or brief description; required if product is Temp Tag Only). "
                    "If a field is missing or unclear, omit it or use empty string. VIN must be exactly 17 characters; if not found or invalid length, omit vin.",
                },
                {
                    "role": "user",
                    "content": f"Product code: {product_code}. {'Insurance is required for this product.' if is_temp_tag_only else ''}\n\nCustomer message:\n{raw_text}",
                },
            ],
            response_format={"type": "json_object"},
        )
        text = (resp.choices or [{}])[0].message.content or "{}"
        out = json.loads(text)
        vin = (out.get("vin") or "").strip().upper().replace(" ", "")
        if len(vin) == VIN_LENGTH:
            out["vin"] = vin
        else:
            out.pop("vin", None)
        return out
    except Exception as e:
        logger.warning("OpenAI extraction failed: %s", e)
        return {}


def validate_details(raw_text: str, product_code: str) -> tuple[dict[str, Any], list[str]]:
    """Returns (extracted_data, errors). extracted_data has vin, address, color, phone, insurance."""
    extracted = extract_with_openai(raw_text, product_code)
    errors: list[str] = []

    vin = (extracted.get("vin") or "").strip().upper().replace(" ", "")
    if not vin:
        errors.append("Could not find a valid 17-character VIN. Please send VIN clearly.")
    elif len(vin) != VIN_LENGTH:
        errors.append(f"VIN must be exactly {VIN_LENGTH} characters.")
    else:
        if not decode_vin_nhtsa(vin):
            errors.append("VIN could not be validated with NHTSA. Please check and try again.")
        extracted["vin"] = vin

    if not (extracted.get("address") or "").strip():
        errors.append("Address is required.")
    if not (extracted.get("color") or "").strip():
        errors.append("Vehicle color is required.")
    if not (extracted.get("phone") or "").strip():
        errors.append("Phone number is required.")

    if product_code == "100":
        if not (extracted.get("insurance") or "").strip():
            errors.append("Insurance information is required for Temp Tag Only.")

    return extracted, errors
