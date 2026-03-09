from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass
class Settings:
    telegram_bot_token: str
    stripe_secret_key: str
    openai_api_key: str
    admin_group_id: int
    base_url: str | None = None  # public URL for webhooks (e.g. from ngrok)
    supabase_url: str | None = None
    supabase_service_key: str | None = None


def get_settings() -> Settings:
    try:
        admin_group_raw = os.getenv("ADMIN_GROUP_ID", "").strip()
        return Settings(
            telegram_bot_token=os.environ["TELEGRAM_BOT_TOKEN"],
            stripe_secret_key=os.environ["STRIPE_SECRET_KEY"],
            openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
            admin_group_id=int(admin_group_raw) if admin_group_raw else 0,
            base_url=os.getenv("PUBLIC_BASE_URL"),
            supabase_url=os.getenv("SUPABASE_URL"),
            supabase_service_key=os.getenv("SUPABASE_SERVICE_KEY"),
        )
    except KeyError as exc:
        missing = ", ".join(exc.args)
        raise RuntimeError(f"Missing required environment variable(s): {missing}") from exc
