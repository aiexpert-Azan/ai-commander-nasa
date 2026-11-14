"""Kepler star data: loads processed 128-point signals and the held-out TEST split.

Only stars whose Kepler ID is in `test_ids` of cnn_split_1000.npz are playable.
Catalog labels stay server-side until a player submits a decision.
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from .config import CHECKPOINT_PATH, SPLIT_PATH, SIGNAL_LENGTH, WINDOW_DURATIONS

log = logging.getLogger("ai_commander.data")

LABEL_NAMES = {0: "FALSE POSITIVE", 1: "CANDIDATE"}
PROVENANCE = {
    "labels": "NASA Exoplanet Archive, Kepler DR25 KOI table (koi_pdisposition: CANDIDATE / FALSE POSITIVE)",
    "light_curves": "Kepler photometry retrieved from MAST (Mikulski Archive for Space Telescopes)",
    "processing": ("Phase-folded on the catalog period/epoch, 128 median bins spanning +/-3 transit durations, "
                   "missing bins interpolated, baseline subtracted, flux deviation x1000 (ppt)."),
    "note": "Historical Kepler observations re-processed for this game, not new measurements.",
}

# Bin index -> time from transit centre in units of transit duration.
PHASE_AXIS = [round(-WINDOW_DURATIONS + (i + 0.5) * (2 * WINDOW_DURATIONS / SIGNAL_LENGTH), 4)
              for i in range(SIGNAL_LENGTH)]
_IN_TRANSIT = np.abs(np.array(PHASE_AXIS)) <= 0.5
_OUT_TRANSIT = np.abs(np.array(PHASE_AXIS)) >= 1.5


def signal_features(x: np.ndarray) -> dict[str, float]:
    """Simple, transparent descriptors computed from the processed signal itself."""
    smooth = np.convolve(x, np.ones(3) / 3, mode="same")
    depth = float(-smooth[_IN_TRANSIT].min())
    oot = x[_OUT_TRANSIT]
    noise = float(1.4826 * np.median(np.abs(oot - np.median(oot))))
    snr = depth / max(noise, 1e-3)
    return {"depth_ppt": round(depth, 3), "noise_ppt": round(noise, 3), "snr": round(snr, 2)}


def readability(f: dict[str, float], label: int) -> float:
    """How well the beginner rule reads this signal (higher = easier).

    Rule taught in-game: a clear shallow dip looks planet-like (CANDIDATE); a flat signal
    or a very deep dip (>10 ppt = 1%, typical of eclipsing stars) suggests FALSE POSITIVE.
    """
    depth, snr = f["depth_ppt"], f["snr"]
    if label == 1:
        return snr if depth < 10 else -1.0
    if depth >= 10:
        return 10.0 + min(depth, 500) / 50
    return 3.0 - snr


def assign_difficulty(stars: list["Star"]) -> None:
    """Per label, rank by readability and split into tertiles: clear / moderate / ambiguous."""
    for lab in (0, 1):
        group = sorted((s for s in stars if s.label == lab), key=lambda s: -s.readability)
        n = len(group)
        for i, st in enumerate(group):
            st.difficulty = "clear" if i < n / 3 else "moderate" if i < 2 * n / 3 else "ambiguous"


@dataclass
class Star:
    kepid: int
    koi: str
    signal: np.ndarray
    label: int
    features: dict[str, float]
    readability: float = 0.0
    difficulty: str = "moderate"
    grid: dict[str, float] = field(default_factory=dict)

    def public(self, include_signal: bool = True) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": str(self.kepid), "kepid": self.kepid, "koi_name": self.koi,
            "name": f"KIC {self.kepid}", "difficulty": self.difficulty, "grid": self.grid,
        }
        if include_signal:
            d["signal"] = [round(float(v), 4) for v in self.signal]
            d["phase"] = PHASE_AXIS
            d["features"] = self.features
            d["provenance"] = PROVENANCE
        return d


class StarStore:
    def __init__(self) -> None:
        self.stars: dict[str, Star] = {}
        self.error: str | None = None
        self.validation: dict[str, Any] = {}

    def load(self, checkpoint: Path = CHECKPOINT_PATH, split: Path = SPLIT_PATH) -> None:
        try:
            if not checkpoint.exists() or not split.exists():
                raise FileNotFoundError(f"Missing data file(s): {checkpoint.name}, {split.name}")
            d = np.load(checkpoint, allow_pickle=False)
            s = np.load(split, allow_pickle=False)
            X, y, kepid = d["X"], d["y"], d["kepid"]
            koi = d["kepoi_name"] if "kepoi_name" in d.files else np.array([""] * len(kepid))
            if X.ndim != 2 or X.shape[1] != SIGNAL_LENGTH:
                raise ValueError(f"X must be (N,{SIGNAL_LENGTH}); got {X.shape}")
            if y.shape != (X.shape[0],) or kepid.shape != (X.shape[0],):
                raise ValueError("y / kepid shape does not match X")
            if not np.isfinite(X).all():
                raise ValueError("X contains non-finite values")
            test_ids = set(int(i) for i in s["test_ids"])
            train_val = set(int(i) for i in s["train_ids"]) | set(int(i) for i in s["val_ids"])
            if test_ids & train_val:
                raise ValueError("test_ids overlap train/val ids")
            for i in range(X.shape[0]):
                kid = int(kepid[i])
                if kid not in test_ids:
                    continue
                feats = signal_features(X[i])
                h = hashlib.sha256(str(kid).encode()).digest()
                star = Star(kid, str(koi[i]), X[i].astype(np.float32), int(y[i]), feats,
                            readability=readability(feats, int(y[i])),
                            grid={"x": round(4 + h[0] / 255 * 92, 2), "y": round(6 + h[1] / 255 * 88, 2),
                                  "mag": round(0.5 + h[2] / 255, 2)})
                self.stars[str(kid)] = star
            if not self.stars:
                raise ValueError("No test-split stars found in the checkpoint")
            assign_difficulty(list(self.stars.values()))
            counts: dict[str, dict[str, int]] = {}
            for st in self.stars.values():
                c = counts.setdefault(st.difficulty, {"CANDIDATE": 0, "FALSE POSITIVE": 0})
                c[LABEL_NAMES[st.label]] += 1
            self.validation = {"X_shape": list(X.shape), "y_shape": list(y.shape), "finite": True,
                               "test_stars": len(self.stars), "difficulty_counts": counts}
            log.info("Loaded %d test stars: %s", len(self.stars), counts)
        except Exception as exc:  # noqa: BLE001
            self.error = f"Star data unavailable: {exc}"
            log.error(self.error)

    def get(self, star_id: str) -> Star | None:
        return self.stars.get(str(star_id))

    def select_for_mission(self, pools: list[str], count: int, seed: str) -> list[Star]:
        """Deterministic, label-balanced selection from difficulty pools (first pool preferred)."""
        rng = np.random.default_rng(int(hashlib.sha256(seed.encode()).hexdigest()[:12], 16))
        chosen: list[Star] = []
        # Per label: first pool fills ~half (all if single pool), later pools fill the rest in order.
        for lab in (1, 0):
            want = count // 2 + (count % 2 if lab == 1 else 0)
            got: list[Star] = []
            for pi, pool in enumerate(pools):
                cands = sorted((s for s in self.stars.values() if s.difficulty == pool and s.label == lab),
                               key=lambda s: s.kepid)
                rng.shuffle(cands)
                quota = want if (len(pools) == 1 or pi > 0) else -(-want // 2)
                got += cands[: max(0, min(quota, want - len(got)))]
            # fill shortfall from any pool
            if len(got) < want:
                rest = sorted((s for s in self.stars.values() if s.label == lab and s not in got),
                              key=lambda s: s.kepid)
                rng.shuffle(rest)
                got += rest[: want - len(got)]
            chosen += got
        order = rng.permutation(len(chosen))
        return [chosen[i] for i in order]


store = StarStore()
