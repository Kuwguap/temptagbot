from __future__ import annotations

import logging
from typing import Final, List

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

import stripe

from .config import get_settings
from .models import BotConfiguration, ProductConfig
from .settings_client import load_bot_configuration, store_stripe_session


logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


START_TEXT: Final[str] = (
    "🚗 *Welcome to TempTagBot!*\n\n"
    "Select a product below to start your order. "
    "You'll be redirected to a secure Stripe checkout page."
)

HELP_TEXT: Final[str] = (
    "ℹ️ *Help*\n\n"
    "Use /start to begin a new order.\n"
    "You'll pick a product, pay via Stripe, and then provide vehicle and contact details."
)


def build_product_keyboard(products: List[ProductConfig]) -> InlineKeyboardMarkup:
    visible_products = [p for p in products if p.active]
    if not visible_products:
        return InlineKeyboardMarkup(
            [[InlineKeyboardButton("No products available", callback_data="noop")]]
        )

    buttons = []
    for product in visible_products:
        label = product.label or product.code
        buttons.append(
            [InlineKeyboardButton(label, callback_data=f"product:{product.code}")]
        )
    return InlineKeyboardMarkup(buttons)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_chat is None:
        return

    config: BotConfiguration = context.application.bot_data.get("config")  # type: ignore[assignment]
    keyboard = build_product_keyboard(config.products)

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=START_TEXT,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=keyboard,
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_chat is None:
        return
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=HELP_TEXT,
        parse_mode=ParseMode.MARKDOWN,
    )


def _create_stripe_checkout_url(chat_id: int, product: ProductConfig) -> str | None:
    """Create a Stripe Checkout Session and return the URL. Returns None on failure."""
    settings = get_settings()
    base = (settings.base_url or "https://example.com").rstrip("/")
    try:
        stripe.api_key = settings.stripe_secret_key
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": product.price_cents,
                        "product_data": {
                            "name": product.label or product.code,
                            "description": f"TempTagBot – {product.code}",
                        },
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{base}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/cancel",
            metadata={"telegram_chat_id": str(chat_id), "product_code": product.code},
        )
        store_stripe_session(session.id, chat_id, product.code)
        return session.url
    except Exception as e:
        logger.exception("Stripe checkout session creation failed: %s", e)
        return None


async def product_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None or update.effective_chat is None:
        return

    await query.answer()

    data = query.data or ""
    if not data.startswith("product:"):
        logger.warning("Unexpected callback data: %s", data)
        return

    product_code = data.split(":", maxsplit=1)[1]
    chat_id = update.effective_chat.id

    config: BotConfiguration = context.application.bot_data.get("config")  # type: ignore[assignment]
    selected = next((p for p in config.products if p.code == product_code), None)

    if not selected:
        await query.edit_message_text(
            text="❌ This product is no longer available. Please use /start to refresh options."
        )
        return

    checkout_url = _create_stripe_checkout_url(chat_id, selected)
    if checkout_url:
        keyboard = InlineKeyboardMarkup(
            [[InlineKeyboardButton("PAY NOW", url=checkout_url)]]
        )
        await query.edit_message_text(
            text=(
                f"✅ *{selected.label or selected.code}*\n\n"
                "Pay securely with Stripe:\n"
                f"[PAY NOW]({checkout_url})\n"
                f"{checkout_url}\n\n"
                "After payment you’ll be asked for your vehicle and contact details."
            ),
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=keyboard,
        )
    else:
        await query.edit_message_text(
            text="❌ Payment link could not be created. Please try again later or contact support."
        )


def build_application() -> Application:
    settings = get_settings()
    app = (
        Application.builder()
        .token(settings.telegram_bot_token)
        .build()
    )

    # Load configuration from Supabase once at startup.
    config = load_bot_configuration()
    app.bot_data["config"] = config

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CallbackQueryHandler(product_selected, pattern=r"^product:"))

    return app

