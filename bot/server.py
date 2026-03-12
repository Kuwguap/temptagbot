from __future__ import annotations

import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from .bot import build_application


class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # type: ignore[override]
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        # Silence default stdout logging to avoid noisy logs on Render.
        return


def _run_health_server() -> None:
    port = int(os.environ.get("PORT", "8000"))
    server = HTTPServer(("0.0.0.0", port), _HealthHandler)
    server.serve_forever()


def _run_bot() -> None:
    app = build_application()
    app.run_polling()


def main() -> None:
    # Run the Telegram bot in a background thread and keep an HTTP health
    # server listening on $PORT for Render's web service checks.
    t = threading.Thread(target=_run_bot, daemon=True)
    t.start()
    _run_health_server()


if __name__ == "__main__":
    main()

