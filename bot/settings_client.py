from __future__ import annotations

import logging
from typing import List, Optional

import requests

from .config import get_settings
from .models import BotConfiguration, ProductConfig, TelegramSettings


logger = logging.getLogger(__name__)

# Default products when Supabase is empty or unavailable
DEFAULT_PRODUCTS: List[ProductConfig] = [
    ProductConfig(
        id="default-1",
        code="150",
        label="$150 – Temp Tag Only",
        price_cents=15000,
        active=True,
        sort_order=1,
    ),
    ProductConfig(
        id="default-2",
        code="100",
        label="$100 – Insurance Only",
        price_cents=10000,
        active=True,
        sort_order=2,
    ),
    ProductConfig(
        id="default-3",
        code="250",
        label="$250 – Temp Tag + Insurance",
        price_cents=25000,
        active=True,
        sort_order=3,
    ),
]


def _supabase_headers(service_key: str, prefer: str = "") -> dict[str, str]:
    h = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def fetch_products() -> List[ProductConfig]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.warning("Supabase configuration missing; using default product list.")
        return list(DEFAULT_PRODUCTS)

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/products"
    params = {"select": "*", "order": "sort_order.asc"}

    try:
        resp = requests.get(
            url,
            headers=_supabase_headers(settings.supabase_service_key),
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
    except Exception as e:
        logger.warning("Failed to fetch products from Supabase: %s; using defaults.", e)
        return list(DEFAULT_PRODUCTS)

    products: List[ProductConfig] = []
    for row in rows:
        products.append(
            ProductConfig(
                id=str(row.get("id")),
                code=str(row.get("code")),
                label=str(row.get("label")),
                price_cents=int(row.get("price_cents", 0)),
                active=bool(row.get("active", True)),
                sort_order=int(row.get("sort_order", 0)),
            )
        )
    if not products:
        return list(DEFAULT_PRODUCTS)
    return products


def fetch_telegram_settings() -> TelegramSettings:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.warning("Supabase configuration missing; using ADMIN_GROUP_ID from env only.")
        return TelegramSettings(admin_group_id=settings.admin_group_id or None)

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/telegram_settings"
    params = {"select": "*", "limit": 1}

    try:
        resp = requests.get(
            url,
            headers=_supabase_headers(settings.supabase_service_key),
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
    except Exception as e:
        logger.warning("Failed to fetch telegram_settings from Supabase: %s; using env.", e)
        return TelegramSettings(admin_group_id=settings.admin_group_id or None)

    if not rows:
        return TelegramSettings(admin_group_id=settings.admin_group_id or None)

    row = rows[0]
    admin_group_id_raw: Optional[int] = row.get("admin_group_id")
    if admin_group_id_raw is None and settings.admin_group_id:
        admin_group_id_raw = settings.admin_group_id

    return TelegramSettings(admin_group_id=admin_group_id_raw)


def store_stripe_session(session_id: str, telegram_chat_id: int, product_code: str) -> None:
    """Store Stripe checkout session for webhook lookup. Uses service key."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.warning("Cannot store stripe session: Supabase not configured.")
        return

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/stripe_sessions"
    payload = {
        "id": session_id,
        "telegram_chat_id": telegram_chat_id,
        "product_code": product_code,
    }
    try:
        resp = requests.post(
            url,
            headers=_supabase_headers(settings.supabase_service_key, prefer="return=minimal"),
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.exception("Failed to store stripe session in Supabase: %s", e)


def get_pending_details(telegram_chat_id: int) -> str | None:
    """Return product_code if this chat has pending details, else None."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/pending_telegram_details"
    params = {"select": "product_code", "telegram_chat_id": f"eq.{telegram_chat_id}", "limit": "1"}
    try:
        resp = requests.get(
            url,
            headers=_supabase_headers(settings.supabase_service_key),
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        if rows:
            return str(rows[0].get("product_code", ""))
    except Exception as e:
        logger.warning("get_pending_details failed: %s", e)
    return None


def clear_pending_details(telegram_chat_id: int) -> None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        return
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/pending_telegram_details"
    try:
        resp = requests.delete(
            url,
            headers=_supabase_headers(settings.supabase_service_key),
            params={"telegram_chat_id": f"eq.{telegram_chat_id}"},
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.warning("clear_pending_details failed: %s", e)

