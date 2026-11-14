"""Convenience entry point so `uvicorn main:app` works from the backend/ folder.

The real application lives in the `app` package: the canonical ASGI target is `app.main:app`.
"""
from app.main import app  # noqa: F401

__all__ = ["app"]

if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.getenv("PORT", "8000")))
