"""AI Scientist: wraps the trained Kepler 1D CNN.

The model is an EXPERIMENTAL candidate-vetting assistant. Its output is a raw
sigmoid score, NOT a calibrated probability that a real planet exists.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

import numpy as np

from .config import CLIP_LIMIT, DISABLE_MODEL, MODEL_CONFIG_PATH, MODEL_PATH, SIGNAL_LENGTH, TF_THREADS

log = logging.getLogger("ai_commander.ai")

DISCLAIMER = ("Experimental model score, not a calibrated planet probability. This CNN was trained on only "
              "700 Kepler signals (test accuracy ~71%, with many false alarms). It can be wrong; "
              "a catalog CANDIDATE is also not a confirmed planet.")


class AIScientist:
    def __init__(self) -> None:
        self.model = None
        self.config: dict[str, Any] = {}
        self.error: str | None = None

    @property
    def ready(self) -> bool:
        return self.model is not None

    def load(self) -> None:
        if DISABLE_MODEL:
            self.error = "Model disabled by AIC_DISABLE_MODEL=1"
            return
        try:
            with open(MODEL_CONFIG_PATH, encoding="utf-8") as fh:
                self.config = json.load(fh)
            if int(self.config.get("input_length", SIGNAL_LENGTH)) != SIGNAL_LENGTH:
                raise ValueError("Model input_length does not match 128")
            if not MODEL_PATH.exists():
                raise FileNotFoundError(f"Model file not found: {MODEL_PATH.name}")
            os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
            import keras  # noqa: WPS433 (lazy: heavy import)
            import tensorflow as tf  # noqa: WPS433

            # Small containers: cap TensorFlow's thread pools (each thread reserves stack memory).
            if TF_THREADS > 0:
                tf.config.threading.set_intra_op_parallelism_threads(TF_THREADS)
                tf.config.threading.set_inter_op_parallelism_threads(1)

            self.model = keras.models.load_model(MODEL_PATH, compile=False)
            shape = tuple(self.model.input_shape)
            if shape[1:] != (SIGNAL_LENGTH, 1):
                raise ValueError(f"Unexpected model input shape {shape}")
            # warm-up so first player request is fast
            self._score(np.zeros((1, SIGNAL_LENGTH, 1), np.float32))
            log.info("AI Scientist model loaded: %s", self.config.get("model_name"))
        except Exception as exc:  # noqa: BLE001
            self.model = None
            self.error = f"Model unavailable: {exc}"
            log.error(self.error)

    def preprocess(self, signal: list[float] | np.ndarray) -> np.ndarray:
        x = np.asarray(signal, dtype=np.float32).reshape(-1)
        if x.shape[0] != SIGNAL_LENGTH:
            raise ValueError(f"Signal must have exactly {SIGNAL_LENGTH} values, got {x.shape[0]}")
        if not np.isfinite(x).all():
            raise ValueError("Signal contains NaN or infinite values")
        scale = float(self.config.get("scale", 1.0)) or 1.0
        x = np.clip(x / scale, -CLIP_LIMIT, CLIP_LIMIT)
        return x.reshape(1, SIGNAL_LENGTH, 1)

    def _score(self, x: np.ndarray) -> float:
        """Single-sample inference. Calling the model directly (inference mode) avoids the
        per-call tf.data pipeline that Model.predict() builds, which is slow for batch size 1."""
        return float(np.asarray(self.model(x, training=False)).reshape(-1)[0])

    def predict_batch(self, X: np.ndarray) -> np.ndarray:
        if not self.ready:
            raise RuntimeError(self.error or "Model not loaded")
        scale = float(self.config.get("scale", 1.0)) or 1.0
        xb = np.clip(X.astype(np.float32) / scale, -CLIP_LIMIT, CLIP_LIMIT)[..., None]
        return self.model.predict(xb, verbose=0).reshape(-1)

    def analyze(self, signal: list[float] | np.ndarray) -> dict[str, Any]:
        if not self.ready:
            raise RuntimeError(self.error or "Model not loaded")
        x = self.preprocess(signal)
        score = self._score(x)
        threshold = float(self.config.get("threshold", 0.5))
        is_cand = score >= threshold
        label = self.config.get("label_1", "CANDIDATE") if is_cand else self.config.get("label_0", "FALSE POSITIVE")
        margin = abs(score - threshold)
        strength = "strong" if margin > 0.35 else "moderate" if margin > 0.15 else "weak"
        if is_cand:
            expl = (f"The network's pattern-matching leans CANDIDATE ({strength} lean). It responds to dip "
                    "shapes that resembled catalog candidates during training.")
        else:
            expl = (f"The network leans FALSE POSITIVE ({strength} lean). The shape looked more like the "
                    "false-positive examples it was trained on (e.g. eclipsing stars or noise).")
        if strength == "weak":
            expl += " The score is close to the decision threshold, so treat this as a coin-flip."
        return {
            "score": round(score, 4),
            "threshold": round(threshold, 3),
            "predicted_class": label,
            "lean_strength": strength,
            "explanation": expl,
            "disclaimer": DISCLAIMER,
            "model": self.config.get("model_name", "kepler_cnn"),
        }


ai = AIScientist()
