"""Create order in Supabase and notify Telegram admin (bot and web)."""
from __future__ import annotations

import logging
import random
import string

import requests

from .config import get_settings

logger = logging.getLogger(__name__)


def _supabase_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def generate_order_number() -> str:
    n = random.randint(1000, 9999)
    return f"TT-{n}"


def create_order(
    product_code: str,
    source: str,
    vin: str,
    address: str,
    color: str,
    phone: str,
    insurance_info: str | None = None,
    stripe_session_id: str | None = None,
) -> str | None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.warning("Supabase not configured; cannot create order")
        return None
    order_number = generate_order_number()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/orders"
    payload = {
        "order_number": order_number,
        "source": source,
        "product_code": product_code,
        "stripe_session_id": stripe_session_id,
        "vin": vin,
        "address": address,
        "color": color,
        "phone": phone,
        "insurance_info": insurance_info,
        "document_urls": [],
    }
    try:
        r = requests.post(
            url,
            headers=_supabase_headers(settings.supabase_service_key),
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
    except Exception as e:
        logger.exception("Create order failed: %s", e)
        return None
    return order_number


def notify_admin_order(order_number: str, product_code: str, vin: str, address: str, color: str, phone: str, insurance_info: str | None) -> None:
    settings = get_settings()
    admin_id = get_admin_group_id()
    if not admin_id or not settings.telegram_bot_token:
        return
    text = (
        f"📋 *Order {order_number}* (Telegram)\n"
        f"Product: {product_code}\n"
        f"VIN: {vin}\n"
        f"Address: {address}\n"
        f"Color: {color}\n"
        f"Phone: {phone}\n"
        f"Insurance: {insurance_info or 'N/A'}"
    )
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        r = requests.post(
            url,
            json={"chat_id": admin_id, "text": text, "parse_mode": "Markdown"},
            timeout=10,
        )
        r.raise_for_status()
    except Exception as e:
        logger.warning("Notify admin failed: %s", e)


def get_admin_group_id() -> int | None:
    from .settings_client import fetch_telegram_settings
    t = fetch_telegram_settings()
    return t.admin_group_id
