"""Paths and constants. Override paths with environment variables if needed."""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = Path(os.getenv("AIC_MODEL_PATH", BACKEND_DIR / "models" / "kepler_cnn_1000.keras"))
MODEL_CONFIG_PATH = Path(os.getenv("AIC_MODEL_CONFIG", BACKEND_DIR / "models" / "cnn_config_1000.json"))
CHECKPOINT_PATH = Path(os.getenv("AIC_CHECKPOINT", BACKEND_DIR / "data" / "kepler_1000_checkpoint.npz"))
SPLIT_PATH = Path(os.getenv("AIC_SPLIT", BACKEND_DIR / "data" / "cnn_split_1000.npz"))

SIGNAL_LENGTH = 128
WINDOW_DURATIONS = 3.0  # signal spans +/- 3 transit durations
CLIP_LIMIT = float(os.getenv("AIC_CLIP", "5.0"))  # clip scaled input to +/- this value

# ---- CORS ----
# Exact origins allowed to call the API from a browser, comma-separated.
# Production example: AIC_CORS_ORIGINS=https://ai-commander.vercel.app
CORS_ORIGINS = [o.strip().rstrip("/") for o in os.getenv(
    "AIC_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
# Optional regex for extra origins, e.g. Vercel preview deployments:
# AIC_CORS_ORIGIN_REGEX=https://ai-commander-nasa(-[a-z0-9-]+)?\.vercel\.app
CORS_ORIGIN_REGEX = os.getenv("AIC_CORS_ORIGIN_REGEX", "").strip()
# Allow any http://localhost:<port> / 127.0.0.1:<port> origin (local development). Set 0 in production.
CORS_ALLOW_LOCALHOST = os.getenv("AIC_CORS_ALLOW_LOCALHOST", "1") == "1"

DISABLE_MODEL = os.getenv("AIC_DISABLE_MODEL", "0") == "1"
# Cap TensorFlow CPU threads (0 = TensorFlow default). Useful on small containers.
TF_THREADS = int(os.getenv("AIC_TF_THREADS", "0") or 0)
