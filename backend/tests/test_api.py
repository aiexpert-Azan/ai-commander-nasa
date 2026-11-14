import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import engine
from app.main import app

GOOD = engine.LEVELS[1]["recommended"]


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health").json()
    assert r["stars_loaded"] == 150
    assert r["data_validation"]["X_shape"] == [1000, 128]
    assert r["model_loaded"] is True


def test_star_list_has_no_labels(client):
    r = client.get("/api/stars", params={"level": 2, "count": 9, "seed": "t"}).json()
    assert r["count"] == 9
    text = str(r["stars"])
    assert "label" not in str([list(s.keys()) for s in r["stars"]])
    assert "FALSE POSITIVE" not in text and "CANDIDATE" not in text


def test_star_detail_and_no_label(client):
    sid = client.get("/api/stars", params={"level": 1}).json()["stars"][0]["id"]
    s = client.get(f"/api/stars/{sid}").json()
    assert len(s["signal"]) == 128 and len(s["phase"]) == 128
    assert "label" not in s and "catalog_label" not in s


def test_only_test_split_stars(client):
    split = np.load("data/cnn_split_1000.npz")
    train = str(int(split["train_ids"][0]))
    assert client.get(f"/api/stars/{train}").status_code == 404


def test_decision_checked_server_side(client):
    sid = client.get("/api/stars", params={"level": 1}).json()["stars"][0]["id"]
    a = client.post(f"/api/stars/{sid}/decision", json={"decision": "candidate"}).json()
    b = client.post(f"/api/stars/{sid}/decision", json={"decision": "false_positive"}).json()
    assert a["correct"] != b["correct"]
    assert a["catalog_label"] in ("CANDIDATE", "FALSE POSITIVE")
    assert client.post(f"/api/stars/{sid}/decision", json={"decision": "maybe"}).status_code == 422


def test_ai_inference(client):
    sid = client.get("/api/stars", params={"level": 1}).json()["stars"][0]["id"]
    r = client.post("/api/ai/analyze", json={"star_id": sid})
    assert r.status_code == 200
    j = r.json()
    assert 0.0 <= j["score"] <= 1.0
    assert j["predicted_class"] in ("CANDIDATE", "FALSE POSITIVE")
    assert "not a calibrated" in j["disclaimer"]


def test_ai_invalid_signal(client):
    assert client.post("/api/ai/analyze", json={"signal": [0.0] * 10}).status_code == 422
    assert client.post("/api/ai/analyze", json={}).status_code == 422


def test_components(client):
    c = client.get("/api/mission/components").json()
    assert set(c["categories"]) == {"telescope", "instrument", "solar", "antenna", "launch", "orbit"}
    for cat in c["categories"]:
        assert 2 <= len(c["components"][cat]) <= 3


def test_recommended_design_launch_ready(client):
    r = client.post("/api/mission/evaluate", json={"design": GOOD, "level": 1}).json()
    assert r["launch_ready"] is True


def test_every_recommended_design_is_complete_and_launch_ready(client):
    """'Use recommended' must yield a full design (incl. ground station) with zero failing checks."""
    levels = client.get("/api/mission/components").json()["levels"]
    for lvl_id, lvl in levels.items():
        rec = lvl["recommended"]
        if not rec:
            continue
        assert rec.get("ground_station"), f"level {lvl_id} recommendation lacks a ground station"
        r = client.post("/api/mission/evaluate", json={"design": rec, "level": int(lvl_id)}).json()
        fails = [c["id"] for c in r["checks"] if c["status"] == "fail"]
        assert r["launch_ready"] and not fails, f"level {lvl_id} fails {fails}"
        assert r["resources"]["cost"] <= lvl["budget"]
        assert client.post("/api/mission/launch", json={"design": rec, "level": int(lvl_id), "seed": "rec"}).status_code == 200


def test_invalid_design_blocked(client):
    bad = dict(GOOD, launch="lv_light", orbit="l2")  # light rocket cannot reach L2
    r = client.post("/api/mission/evaluate", json={"design": bad, "level": 1}).json()
    assert r["launch_ready"] is False
    assert any(c["id"] == "launch" and c["status"] == "fail" for c in r["checks"])
    assert client.post("/api/mission/launch", json={"design": bad, "level": 1}).status_code == 400


def test_trade_offs_change_resources(client):
    a = client.post("/api/mission/evaluate", json={"design": GOOD, "level": 1}).json()["resources"]
    b = client.post("/api/mission/evaluate",
                    json={"design": dict(GOOD, telescope="tel_large"), "level": 1}).json()["resources"]
    assert b["cost"] > a["cost"] and b["mass"] > a["mass"] and b["power_demand"] > a["power_demand"]


def test_launch_deterministic(client):
    body = {"design": GOOD, "level": 1, "seed": "abc"}
    a = client.post("/api/mission/launch", json=body).json()
    b = client.post("/api/mission/launch", json=body).json()
    assert a["events"] == b["events"] and a["ok"]


def test_score(client):
    r = client.post("/api/mission/evaluate", json={"design": GOOD, "level": 1, "results": {
        "analyzed": 3, "correct": 3, "energy_left": 50, "start_energy": 100}}).json()["score"]
    assert r["success"] and 0 <= r["total"] <= 100
    low = client.post("/api/mission/evaluate", json={"design": GOOD, "level": 1, "results": {
        "analyzed": 3, "correct": 0, "energy_left": 0, "start_energy": 100}}).json()["score"]
    assert low["total"] < r["total"] and not low["success"]


def test_every_level_achievable():
    import itertools
    for lvl in (1, 2, 3):
        ok = 0
        for combo in itertools.product(*[[c["id"] for c in engine.COMPONENTS[k]] for k in engine.CATEGORY_ORDER],
                                       [g["id"] for g in engine.GROUND_STATIONS]):
            d = dict(zip(engine.CATEGORY_ORDER + ["ground_station"], combo))
            ok += engine.evaluate_design(d, lvl)["launch_ready"]
        assert ok > 10
