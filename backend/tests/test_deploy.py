"""Deployment configuration: CORS rules and the production launcher (no TensorFlow needed)."""
import importlib

import pytest
from fastapi.testclient import TestClient


def _preflight(client: TestClient, origin: str) -> str | None:
    r = client.options("/api/ai/analyze", headers={
        "Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    return r.headers.get("access-control-allow-origin")


@pytest.fixture
def prod_app(monkeypatch):
    """Rebuild the app with production-style CORS settings (lifespan not run: no model load)."""
    monkeypatch.setenv("AIC_CORS_ALLOW_LOCALHOST", "0")
    monkeypatch.setenv("AIC_CORS_ORIGINS", "https://ai-commander-nasa.vercel.app/")
    monkeypatch.setenv("AIC_CORS_ORIGIN_REGEX", r"https://ai-commander-nasa(-[a-z0-9-]+)?\.vercel\.app")
    import app.config
    import app.main
    importlib.reload(app.config)
    yield importlib.reload(app.main).app
    monkeypatch.undo()
    importlib.reload(app.config)
    importlib.reload(app.main)


def test_production_cors(prod_app):
    c = TestClient(prod_app)
    assert _preflight(c, "https://ai-commander-nasa.vercel.app") == "https://ai-commander-nasa.vercel.app"  # trailing / stripped
    assert _preflight(c, "https://ai-commander-nasa-git-main-team.vercel.app")  # preview deployment
    assert _preflight(c, "http://localhost:5173") is None  # localhost disabled in production
    assert _preflight(c, "https://evil.example.com") is None
    assert _preflight(c, "https://ai-commander-nasa.vercel.app.evil.com") is None  # no suffix tricks


def test_default_cors_allows_local_dev():
    import app.main
    c = TestClient(app.main.app)
    assert _preflight(c, "http://127.0.0.1:5173") == "http://127.0.0.1:5173"
    assert _preflight(c, "http://localhost:4173") == "http://localhost:4173"
    assert _preflight(c, "https://evil.example.com") is None


def test_launcher_host(monkeypatch):
    import main
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("RAILWAY_ENVIRONMENT_NAME", raising=False)
    assert main._default_host() == "127.0.0.1"
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    assert main._default_host() == "0.0.0.0"
