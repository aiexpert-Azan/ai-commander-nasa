"""Entry point for both local use and production (Railway).

The FastAPI application lives in the `app` package; the canonical ASGI target is `app.main:app`.

- `uvicorn main:app --reload`  works from backend/ (this module re-exports `app`).
- `python main.py`             production launcher used by Railway (see railway.json):
    * binds 0.0.0.0 when running on Railway (or when HOST is set), else 127.0.0.1
    * listens on $PORT (Railway injects it), default 8000
    * runs ONE worker: each worker would load its own copy of TensorFlow + the model (~300-450 MB).
"""
import os

from app.main import app  # noqa: F401

__all__ = ["app"]


def _default_host() -> str:
    on_platform = any(k in os.environ for k in ("RAILWAY_ENVIRONMENT", "RAILWAY_ENVIRONMENT_NAME"))
    return "0.0.0.0" if on_platform else "127.0.0.1"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", _default_host()),
        port=int(os.getenv("PORT", "8000")),
        workers=1,
        proxy_headers=True,          # Railway terminates TLS at its edge proxy
        forwarded_allow_ips="*",
        timeout_keep_alive=30,
        log_level=os.getenv("LOG_LEVEL", "info"),
    )
