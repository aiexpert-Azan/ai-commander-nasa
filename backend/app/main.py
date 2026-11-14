"""AI Commander - The Exoplanet Hunter: FastAPI backend."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import engine
from .config import CORS_ORIGINS, SIGNAL_LENGTH
from .data_store import LABEL_NAMES, PROVENANCE, store
from .inference import ai

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.load()
    ai.load()
    yield


app = FastAPI(title="AI Commander - The Exoplanet Hunter API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
                   allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- schemas
class Design(BaseModel):
    telescope: Optional[str] = None
    instrument: Optional[str] = None
    solar: Optional[str] = None
    antenna: Optional[str] = None
    launch: Optional[str] = None
    orbit: Optional[str] = None
    ground_station: Optional[str] = None


class Results(BaseModel):
    analyzed: int = Field(0, ge=0)
    correct: int = Field(0, ge=0)
    energy_left: float = 0
    start_energy: float = 0


class EvaluateRequest(BaseModel):
    design: Design
    level: int = Field(1, ge=1, le=3)
    results: Optional[Results] = None


class LaunchRequest(BaseModel):
    design: Design
    level: int = Field(1, ge=1, le=3)
    seed: str = Field("mission", max_length=64)


class AnalyzeRequest(BaseModel):
    star_id: Optional[str] = None
    signal: Optional[list[float]] = None


class DecisionRequest(BaseModel):
    decision: Literal["candidate", "false_positive"]


def _require_stars():
    if store.error or not store.stars:
        raise HTTPException(503, detail=store.error or "Star data not loaded. See README setup.")


# ---------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {
        "status": "ok" if not store.error else "degraded",
        "stars_loaded": len(store.stars),
        "star_data_error": store.error,
        "model_loaded": ai.ready,
        "model_error": ai.error,
        "model_config": {k: ai.config.get(k) for k in ("model_name", "input_length", "threshold", "scale")}
        if ai.config else None,
        "data_validation": store.validation,
    }


@app.get("/api/stars")
def list_stars(level: int = Query(1, ge=1, le=3), count: Optional[int] = Query(None, ge=1, le=40),
               seed: str = Query("mission", max_length=64)):
    """Mission targets for a level. Never includes catalog labels."""
    _require_stars()
    lv = engine.LEVELS[level]
    n = count or lv["stars_required"] + 2
    picked = store.select_for_mission(lv["pools"], n, f"{seed}:{level}")
    return {"level": level, "count": len(picked), "stars": [s.public(include_signal=False) for s in picked],
            "provenance": PROVENANCE,
            "grid_note": "Stylized target grid: positions are decorative, not real sky coordinates."}


@app.get("/api/stars/{star_id}")
def get_star(star_id: str):
    _require_stars()
    s = store.get(star_id)
    if not s:
        raise HTTPException(404, detail="Star not found in the playable test set")
    return s.public(include_signal=True)


@app.post("/api/stars/{star_id}/decision")
def submit_decision(star_id: str, req: DecisionRequest):
    """Check the player's call against the historical KOI disposition (server-side)."""
    _require_stars()
    s = store.get(star_id)
    if not s:
        raise HTTPException(404, detail="Star not found")
    player = 1 if req.decision == "candidate" else 0
    correct = player == s.label
    f = s.features
    if s.label == 1:
        lesson = ("Kepler's catalog lists this as a CANDIDATE: the dip passed automated vetting. "
                  "Candidates still need follow-up to be confirmed as planets.")
    else:
        lesson = ("Kepler's catalog flags this as a FALSE POSITIVE. Common causes are eclipsing binary "
                  "stars, light from a nearby star, or instrument noise.")
    if f["depth_ppt"] >= 10:
        lesson += f" The dip is about {f['depth_ppt'] / 10:.1f}% deep - planets rarely block more than 1-2% of a star's light."
    elif f["snr"] < 3:
        lesson += " This dip is faint compared with the noise, which makes it genuinely hard to judge."
    return {"star_id": star_id, "correct": correct, "player_decision": LABEL_NAMES[player],
            "catalog_label": LABEL_NAMES[s.label], "lesson": lesson, "features": f,
            "source": PROVENANCE["labels"]}


@app.post("/api/ai/analyze")
def analyze(req: AnalyzeRequest):
    if req.star_id is None and req.signal is None:
        raise HTTPException(422, detail="Provide star_id or signal")
    if req.star_id is not None:
        _require_stars()
        s = store.get(req.star_id)
        if not s:
            raise HTTPException(404, detail="Star not found")
        signal = s.signal
    else:
        signal = req.signal
        if len(signal) != SIGNAL_LENGTH:
            raise HTTPException(422, detail=f"signal must contain exactly {SIGNAL_LENGTH} numbers")
    if not ai.ready:
        raise HTTPException(503, detail="AI Scientist temporarily unavailable: " + (ai.error or "model not loaded"))
    try:
        return ai.analyze(signal)
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(503, detail=f"AI Scientist temporarily unavailable: {exc}") from exc


@app.get("/api/mission/components")
def components():
    return engine.public_catalog()


@app.post("/api/mission/evaluate")
def evaluate(req: EvaluateRequest):
    design = req.design.model_dump()
    if req.results is not None:
        return {"score": engine.score_mission(design, req.level, req.results.model_dump())}
    return engine.evaluate_design(design, req.level)


@app.post("/api/mission/launch")
def launch(req: LaunchRequest):
    result = engine.simulate_launch(req.design.model_dump(), req.level, req.seed)
    if not result["ok"]:
        raise HTTPException(400, detail={"message": result["error"], "checks": result["evaluation"]["checks"]})
    return result
