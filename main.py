from __future__ import annotations

from bot.bot import build_application


def main() -> None:
    app = build_application()
    # Long polling is fine for development. For production you might prefer webhooks.
    app.run_polling()


if __name__ == "__main__":
    main()
