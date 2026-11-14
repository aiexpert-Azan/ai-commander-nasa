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

CORS_ORIGINS = [o.strip() for o in os.getenv(
    "AIC_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
DISABLE_MODEL = os.getenv("AIC_DISABLE_MODEL", "0") == "1"
