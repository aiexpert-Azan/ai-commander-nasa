"""Mission engineering + scoring engine.

All values are EDUCATIONAL APPROXIMATIONS chosen to be internally consistent
and to illustrate real trade-offs (see docs/gameplay.md). They are not NASA
engineering data and this is not an orbital-mechanics simulation.

Units: cost in $M, mass in kg, power in W, data in Gbit/day.
"""
from __future__ import annotations

import hashlib
import random
from typing import Any

# ---------------------------------------------------------------------------
# Spacecraft bus (always included)
# ---------------------------------------------------------------------------
BUS = {"cost": 50, "mass": 300, "power": -150}

# ---------------------------------------------------------------------------
# Component catalog. power < 0 = consumption, > 0 = generation.
# ---------------------------------------------------------------------------
COMPONENTS: dict[str, list[dict[str, Any]]] = {
    "telescope": [
        {"id": "tel_small", "name": "Pathfinder 0.3 m", "icon": "telescope_small",
         "cost": 60, "mass": 150, "power": -40,
         "science_multiplier": 1.0, "risk": 0, "tools": [],
         "benefit": "Science points x1.0",
         "description": "Small, light and cheap. Collects less light, so each discovery is worth less."},
        {"id": "tel_medium", "name": "Kepler-class 0.95 m", "icon": "telescope_medium",
         "cost": 140, "mass": 400, "power": -60,
         "science_multiplier": 1.25, "risk": 2, "tools": ["trend"],
         "benefit": "Science points x1.25 + smoothed-trend overlay",
         "description": "Balanced aperture similar in size to Kepler's. Unlocks a smoothed-trend view of each signal."},
        {"id": "tel_large", "name": "Deep-Field 1.4 m", "icon": "telescope_large",
         "cost": 240, "mass": 750, "power": -90,
         "science_multiplier": 1.5, "risk": 5, "tools": ["trend"],
         "benefit": "Science points x1.5 + smoothed-trend overlay",
         "description": "Huge light bucket. Best science value, but heavy, power-hungry and riskier to deploy."},
    ],
    "instrument": [
        {"id": "ins_basic", "name": "Single-CCD Photometer", "icon": "ccd_single",
         "cost": 30, "mass": 40, "power": -50, "data": 2.0,
         "extra_targets": 2, "energy_per_obs": 6, "risk": 0, "tools": [],
         "benefit": "+2 extra targets, low data",
         "description": "One detector. Simple and frugal, but sees few stars at once."},
        {"id": "ins_wide", "name": "Wide-Field CCD Array", "icon": "ccd_array",
         "cost": 80, "mass": 110, "power": -120, "data": 8.0,
         "extra_targets": 6, "energy_per_obs": 10, "risk": 1, "tools": [],
         "benefit": "+6 extra targets, high data",
         "description": "A mosaic of detectors (like Kepler's 42 CCDs). Many targets, lots of data to downlink."},
        {"id": "ins_precision", "name": "Precision Photometer", "icon": "ccd_precision",
         "cost": 110, "mass": 90, "power": -90, "data": 5.0,
         "extra_targets": 3, "energy_per_obs": 8, "risk": 1, "tools": ["depth"],
         "benefit": "+3 extra targets + dip depth/noise readout",
         "description": "Ultra-stable detector electronics. Unlocks a measured dip-depth and noise readout."},
    ],
    "solar": [
        {"id": "sol_small", "name": "Twin Panels (450 W)", "icon": "solar_small",
         "cost": 20, "mass": 40, "power": 450, "risk": 0,
         "benefit": "+450 W", "description": "Light and cheap. Barely enough for a lean spacecraft."},
        {"id": "sol_medium", "name": "Quad Array (750 W)", "icon": "solar_medium",
         "cost": 40, "mass": 80, "power": 750, "risk": 1,
         "benefit": "+750 W", "description": "Solid power margin for most designs."},
        {"id": "sol_large", "name": "Deployable Wings (1100 W)", "icon": "solar_large",
         "cost": 70, "mass": 140, "power": 1100, "risk": 3,
         "benefit": "+1100 W", "description": "Lots of power, but heavy and with a riskier deployment."},
    ],
    "antenna": [
        {"id": "ant_low", "name": "Low-Gain Antenna", "icon": "antenna_low",
         "cost": 10, "mass": 10, "power": -20, "throughput": 4.0, "ai_credit_bonus": 0, "risk": 0,
         "benefit": "4 Gbit/day", "description": "Simple and reliable, but slow. Fine near Earth."},
        {"id": "ant_high", "name": "High-Gain Dish", "icon": "antenna_high",
         "cost": 30, "mass": 30, "power": -60, "throughput": 12.0, "ai_credit_bonus": 1, "risk": 1,
         "benefit": "12 Gbit/day, +1 AI credit", "description": "Pointed dish with a strong link. More data home, more AI analysis time."},
        {"id": "ant_ka", "name": "Ka-Band Dish", "icon": "antenna_ka",
         "cost": 55, "mass": 50, "power": -110, "throughput": 30.0, "ai_credit_bonus": 2, "risk": 2,
         "benefit": "30 Gbit/day, +2 AI credits", "description": "Very high data rate, but it eats power."},
    ],
    "launch": [
        {"id": "lv_light", "name": "Light Lift Rocket", "icon": "rocket_light",
         "cost": 60, "capacity": {"leo": 1300, "l2": 0, "trailing": 600}, "risk": 6,
         "benefit": "LEO 1300 kg / Trailing 600 kg",
         "description": "Cheapest ride. Cannot reach Sun-Earth L2."},
        {"id": "lv_medium", "name": "Medium Lift Rocket", "icon": "rocket_medium",
         "cost": 110, "capacity": {"leo": 3500, "l2": 1500, "trailing": 1700}, "risk": 3,
         "benefit": "LEO 3500 / L2 1500 / Trailing 1700 kg",
         "description": "Workhorse rocket, proven and versatile."},
        {"id": "lv_heavy", "name": "Heavy Lift Rocket", "icon": "rocket_heavy",
         "cost": 200, "capacity": {"leo": 9000, "l2": 4000, "trailing": 4200}, "risk": 2,
         "benefit": "Lifts almost anything",
         "description": "Massive capacity and reliability, at a massive price."},
    ],
    "orbit": [
        {"id": "leo", "name": "Low Earth Orbit", "icon": "orbit_leo",
         "cost": 0, "lifetime_years": 3.0, "observing_efficiency": 0.5, "power_factor": 0.65,
         "deep_space": False, "risk": 2,
         "benefit": "Cheap, but Earth blocks the view half the time",
         "description": "Close and easy to talk to. Earth's shadow and glare interrupt observations."},
        {"id": "l2", "name": "Sun-Earth L2", "icon": "orbit_l2",
         "cost": 25, "lifetime_years": 5.0, "observing_efficiency": 0.9, "power_factor": 1.0,
         "deep_space": True, "risk": 6,
         "benefit": "Stable, cold, long mission",
         "description": "1.5 million km away. Excellent view and constant sunlight. Needs deep-space communications."},
        {"id": "trailing", "name": "Earth-Trailing Orbit", "icon": "orbit_trailing",
         "cost": 15, "lifetime_years": 4.0, "observing_efficiency": 1.0, "power_factor": 0.95,
         "deep_space": True, "risk": 4,
         "benefit": "Uninterrupted star staring (Kepler's choice)",
         "description": "Follows Earth around the Sun, drifting away slowly. Perfect for staring at one star field."},
    ],
}

GROUND_STATIONS = [
    {"id": "gs_near", "name": "Near-Earth Station Network", "cost": 5,
     "factor": {"leo": 1.0, "l2": 0.25, "trailing": 0.15},
     "description": "Smaller dishes. Great for low Earth orbit, weak for distant spacecraft."},
    {"id": "gs_deep", "name": "Deep Space Antenna Network", "cost": 20,
     "factor": {"leo": 0.6, "l2": 1.0, "trailing": 0.85},
     "description": "Giant dishes around the globe. Required for spacecraft far from Earth."},
]

CATEGORY_ORDER = ["telescope", "instrument", "solar", "antenna", "launch", "orbit"]

# ---------------------------------------------------------------------------
# Levels
# ---------------------------------------------------------------------------
LEVELS = {
    1: {"id": 1, "name": "Cadet Explorer", "budget": 700, "stars_required": 3, "base_ai_credits": 4,
        "min_power_margin": 0.0, "min_lifetime_years": 1.5, "max_risk": None, "pass_accuracy": 0.6,
        "pools": ["clear"], "guided": True,
        "recommended": {"telescope": "tel_medium", "instrument": "ins_precision", "solar": "sol_medium",
                        "antenna": "ant_high", "launch": "lv_medium", "orbit": "trailing",
                        "ground_station": "gs_deep"},
        "summary": "Generous budget, clear signals, 3 star decisions."},
    2: {"id": 2, "name": "Deep Space Analyst", "budget": 560, "stars_required": 5, "base_ai_credits": 3,
        "min_power_margin": 0.05, "min_lifetime_years": 2.5, "max_risk": None, "pass_accuracy": 0.6,
        "pools": ["clear", "moderate"], "guided": False, "recommended": None,
        "summary": "Tighter budget, more ambiguous signals, 5 star decisions."},
    3: {"id": 3, "name": "Elite Mission Commander", "budget": 480, "stars_required": 8, "base_ai_credits": 1,
        "min_power_margin": 0.10, "min_lifetime_years": 3.0, "max_risk": 22, "pass_accuracy": 0.6,
        "pools": ["moderate", "ambiguous", "clear"], "guided": False, "recommended": None,
        "summary": "Strict limits, few AI credits, higher risk, 8 star decisions."},
}

# Operations rules (shared with frontend via evaluate response).
DAYS_PER_OBS_UNIT = 20          # science days per (year x observing efficiency)
DAYS_PER_OBSERVATION = 10
WRONG_DECISION_EXTRA_DAYS = 5
ENERGY_PER_AI_CONSULT = 4
POINTS_CORRECT = 100
POINTS_WRONG = -30


def _by_id(category: str, cid: str | None) -> dict[str, Any] | None:
    for c in COMPONENTS.get(category, []):
        if c["id"] == cid:
            return c
    return None


def _gs(gid: str | None) -> dict[str, Any] | None:
    return next((g for g in GROUND_STATIONS if g["id"] == gid), None)


def public_catalog() -> dict[str, Any]:
    return {
        "bus": BUS,
        "categories": CATEGORY_ORDER,
        "components": COMPONENTS,
        "ground_stations": GROUND_STATIONS,
        "levels": LEVELS,
        "rules": {
            "days_per_observation": DAYS_PER_OBSERVATION,
            "wrong_decision_extra_days": WRONG_DECISION_EXTRA_DAYS,
            "energy_per_ai_consult": ENERGY_PER_AI_CONSULT,
            "points_correct": POINTS_CORRECT,
            "points_wrong": POINTS_WRONG,
        },
        "disclaimer": "Educational approximation values; not NASA engineering data.",
    }


def _check(cid: str, label: str, status: str, detail: str, fix: str = "") -> dict[str, str]:
    return {"id": cid, "label": label, "status": status, "detail": detail, "fix": fix}


def seeded_rng(*parts: Any) -> random.Random:
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()
    return random.Random(int(h[:16], 16))


def evaluate_design(design: dict[str, str | None], level_id: int) -> dict[str, Any]:
    """Compute resources, readiness checks and operating parameters for a design."""
    level = LEVELS.get(level_id, LEVELS[1])
    parts = {cat: _by_id(cat, design.get(cat)) for cat in CATEGORY_ORDER}
    gs = _gs(design.get("ground_station"))
    missing = [cat for cat, p in parts.items() if p is None]

    cost = BUS["cost"] + sum(p["cost"] for p in parts.values() if p)
    cost += gs["cost"] if gs else 0
    mass = BUS["mass"] + sum(p.get("mass", 0) for cat, p in parts.items() if p and cat not in ("launch", "orbit"))

    orbit = parts["orbit"]
    lv = parts["launch"]
    power_factor = orbit["power_factor"] if orbit else 1.0
    generation = (parts["solar"]["power"] if parts["solar"] else 0) * power_factor
    demand = -BUS["power"] + sum(-p["power"] for cat, p in parts.items()
                                 if p and cat in ("telescope", "instrument", "antenna"))
    margin = (generation - demand) / demand if demand else 0.0

    data_rate = parts["instrument"]["data"] if parts["instrument"] else 0.0
    gs_factor = gs["factor"][orbit["id"]] if (gs and orbit) else 0.0
    downlink = (parts["antenna"]["throughput"] if parts["antenna"] else 0.0) * gs_factor

    capacity = lv["capacity"][orbit["id"]] if (lv and orbit) else 0

    # Lifetime: orbit baseline, shortened by thin power margins.
    life = orbit["lifetime_years"] if orbit else 0.0
    if margin < 0.10:
        life *= 0.7
    elif margin < 0.20:
        life *= 0.85
    life = round(life, 2)

    eff = orbit["observing_efficiency"] if orbit else 0.0
    science_days = int(round(life * eff * DAYS_PER_OBS_UNIT))
    energy_per_obs = parts["instrument"]["energy_per_obs"] if parts["instrument"] else 10
    energy = int(max(0, min(160, round(50 + 120 * margin))))

    risk = 5 + sum(p.get("risk", 0) for p in parts.values() if p)
    if margin < 0.10:
        risk += 6
    if downlink and data_rate / downlink > 0.8:
        risk += 4
    if capacity and mass / capacity > 0.9:
        risk += 3
    risk = min(risk, 60)

    stars_required = level["stars_required"]
    targets = stars_required + (parts["instrument"]["extra_targets"] if parts["instrument"] else 0)
    ai_credits = level["base_ai_credits"] + (parts["antenna"]["ai_credit_bonus"] if parts["antenna"] else 0)
    tools = sorted({t for p in parts.values() if p for t in p.get("tools", [])})
    sci_mult = parts["telescope"]["science_multiplier"] if parts["telescope"] else 1.0

    checks: list[dict[str, str]] = []
    if missing or not gs:
        miss = missing + ([] if gs else ["ground_station"])
        checks.append(_check("complete", "Design complete", "fail",
                             f"Missing: {', '.join(miss)}.", "Pick one option in every category."))

    budget = level["budget"]
    if cost <= budget:
        checks.append(_check("budget", "Budget within limit", "pass", f"${cost}M of ${budget}M used."))
    else:
        checks.append(_check("budget", "Budget within limit", "fail",
                             f"Design costs ${cost}M but the budget is ${budget}M (over by ${cost - budget}M).",
                             "Choose a cheaper rocket, smaller telescope or simpler instrument."))

    if lv and orbit:
        if capacity == 0:
            checks.append(_check("launch", "Launch vehicle can reach orbit", "fail",
                                 f"The {lv['name']} cannot reach {orbit['name']}.",
                                 "Pick a bigger rocket or a closer orbit."))
        elif mass <= capacity:
            st = "warn" if mass / capacity > 0.9 else "pass"
            checks.append(_check("launch", "Launch payload capacity", st,
                                 f"Spacecraft {mass} kg vs rocket capacity {capacity} kg to {orbit['name']}."
                                 + (" Very little mass margin." if st == "warn" else "")))
        else:
            checks.append(_check("launch", "Launch payload capacity", "fail",
                                 f"Spacecraft is {mass} kg but the rocket can carry only {capacity} kg to {orbit['name']}.",
                                 "Use lighter parts or a more powerful rocket."))

    need = level["min_power_margin"]
    if margin >= max(need, 0.10):
        checks.append(_check("power", "Power generation meets demand", "pass",
                             f"Generating {generation:.0f} W vs demand {demand:.0f} W ({margin:+.0%} margin)."))
    elif margin >= need:
        checks.append(_check("power", "Power generation meets demand", "warn",
                             f"Only {margin:+.0%} power margin. Thin margins shorten mission life and add risk.",
                             "Bigger solar panels would help."))
    else:
        checks.append(_check("power", "Power generation meets demand", "fail",
                             f"Generating {generation:.0f} W but the spacecraft needs {demand:.0f} W"
                             f" ({margin:+.0%}; this level needs at least {need:+.0%}).",
                             "Add bigger solar panels or choose less power-hungry parts."
                             + (" Low Earth Orbit spends time in Earth's shadow." if orbit and orbit["id"] == "leo" else "")))

    if downlink >= data_rate * 1.25 and downlink > 0:
        checks.append(_check("comms", "Communications carry all science data", "pass",
                             f"Downlink {downlink:.1f} Gbit/day vs {data_rate:.1f} Gbit/day of science data."))
    elif downlink >= data_rate and downlink > 0:
        checks.append(_check("comms", "Communications carry all science data", "warn",
                             f"Downlink {downlink:.1f} Gbit/day barely covers {data_rate:.1f} Gbit/day."))
    else:
        checks.append(_check("comms", "Communications carry all science data", "fail",
                             f"The instrument makes {data_rate:.1f} Gbit/day but only {downlink:.1f} Gbit/day can reach Earth.",
                             "Upgrade the antenna, or use the Deep Space Antenna Network for distant orbits."))

    if orbit and gs:
        if orbit["deep_space"] and gs["id"] != "gs_deep":
            checks.append(_check("ground", "Ground segment matches orbit", "fail",
                                 f"{orbit['name']} is far from Earth; the {gs['name']} cannot track it well.",
                                 "Select the Deep Space Antenna Network."))
        else:
            checks.append(_check("ground", "Ground segment matches orbit", "pass",
                                 f"{gs['name']} can track a spacecraft in {orbit['name']}."))

    min_life = level["min_lifetime_years"]
    days_needed = stars_required * DAYS_PER_OBSERVATION
    if life >= min_life and science_days >= days_needed:
        checks.append(_check("lifetime", "Mission lifetime feasible", "pass",
                             f"{life} years of operations, {science_days} science days (need {days_needed})."))
    else:
        checks.append(_check("lifetime", "Mission lifetime feasible", "fail",
                             f"{life} years / {science_days} science days; this mission needs {min_life} years"
                             f" and {days_needed} science days.",
                             "Use a more stable orbit (L2 or Earth-trailing) and keep a healthy power margin."))

    energy_needed = stars_required * energy_per_obs
    if energy >= energy_needed:
        checks.append(_check("energy", "Energy covers planned observations", "pass",
                             f"{energy} energy units; {stars_required} observations use {energy_needed}."))
    else:
        checks.append(_check("energy", "Energy covers planned observations", "fail",
                             f"Only {energy} energy units but {stars_required} observations need {energy_needed}.",
                             "Increase power margin (bigger panels) or use a less power-hungry instrument."))

    max_risk = level["max_risk"]
    if max_risk is not None and risk > max_risk:
        checks.append(_check("risk", "Mission risk acceptable", "fail",
                             f"Mission risk {risk}% exceeds this level's limit of {max_risk}%.",
                             "Use a more reliable rocket, a simpler design, or increase margins."))
    else:
        checks.append(_check("risk", "Mission risk acceptable", "warn" if risk >= 20 else "pass",
                             f"Estimated anomaly risk {risk}%."))

    critical_fail = any(c["status"] == "fail" for c in checks)
    return {
        "level": level["id"],
        "resources": {
            "cost": cost, "budget": budget, "mass": mass, "launch_capacity": capacity,
            "power_generation": round(generation), "power_demand": round(demand), "power_margin": round(margin, 3),
            "data_rate": data_rate, "downlink": round(downlink, 2), "risk": risk,
            "lifetime_years": life, "science_days": science_days, "energy": energy,
        },
        "operations": {
            "targets": targets, "stars_required": stars_required, "ai_credits": ai_credits,
            "energy": energy, "science_days": science_days, "energy_per_obs": energy_per_obs,
            "energy_per_ai": ENERGY_PER_AI_CONSULT, "days_per_obs": DAYS_PER_OBSERVATION,
            "wrong_extra_days": WRONG_DECISION_EXTRA_DAYS, "science_multiplier": sci_mult,
            "points_correct": round(POINTS_CORRECT * sci_mult), "points_wrong": POINTS_WRONG,
            "tools": tools,
        },
        "checks": checks,
        "launch_ready": not critical_fail,
    }


LAUNCH_ANOMALIES = [
    {"id": "solar_partial", "title": "Solar array partially stuck",
     "detail": "One panel latched late. Mission energy reduced by 15%.", "energy_pct": -0.15},
    {"id": "comm_glitch", "title": "Antenna pointing glitch",
     "detail": "Engineers lost link time fixing it. One AI credit lost.", "ai_credits": -1},
    {"id": "safe_mode", "title": "Spacecraft entered safe mode",
     "detail": "A sensor fault paused operations. 10 science days lost.", "science_days": -10},
]


def simulate_launch(design: dict[str, str | None], level_id: int, seed: str) -> dict[str, Any]:
    """Deterministic seeded launch: each phase rolls against the mission risk."""
    ev = evaluate_design(design, level_id)
    if not ev["launch_ready"]:
        return {"ok": False, "error": "Design is not launch-ready.", "evaluation": ev}
    rng = seeded_rng(seed, level_id, *[design.get(c) for c in CATEGORY_ORDER], design.get("ground_station"))
    risk = ev["resources"]["risk"]
    ops = dict(ev["operations"])
    phases = ["Countdown", "Liftoff", "Orbit insertion", "Telescope deployment",
              "Solar panel activation", "Communications link", "Operations ready"]
    events, anomalies = [], []
    # Per-phase anomaly chance spreads total risk across the 4 hardware phases.
    per_phase = risk / 100 / 4
    phase_anomaly = {"Telescope deployment": "safe_mode", "Solar panel activation": "solar_partial",
                     "Communications link": "comm_glitch", "Orbit insertion": "safe_mode"}
    for ph in phases:
        roll = rng.random()
        if ph in phase_anomaly and roll < per_phase:
            a = next(x for x in LAUNCH_ANOMALIES if x["id"] == phase_anomaly[ph])
            anomalies.append(a)
            events.append({"phase": ph, "status": "anomaly", "message": a["title"], "roll": round(roll, 3)})
        else:
            events.append({"phase": ph, "status": "nominal", "message": "Nominal", "roll": round(roll, 3)})
    # Apply anomaly effects but always keep the mission achievable.
    for a in anomalies:
        if "energy_pct" in a:
            ops["energy"] = int(ops["energy"] * (1 + a["energy_pct"]))
        if "ai_credits" in a:
            ops["ai_credits"] = max(0, ops["ai_credits"] + a["ai_credits"])
        if "science_days" in a:
            ops["science_days"] = ops["science_days"] + a["science_days"]
    min_days = ops["stars_required"] * ops["days_per_obs"]
    min_energy = ops["stars_required"] * ops["energy_per_obs"]
    ops["science_days"] = max(ops["science_days"], min_days)
    ops["energy"] = max(ops["energy"], min_energy)
    return {"ok": True, "risk": risk, "per_phase_chance": round(per_phase, 4), "events": events,
            "anomalies": anomalies, "operations": ops, "evaluation": ev}


RANKS = [(90, "Elite Commander"), (70, "Mission Specialist"), (50, "Explorer"), (0, "Cadet")]


def score_mission(design: dict[str, str | None], level_id: int, results: dict[str, Any]) -> dict[str, Any]:
    """Final mission score (0-100) = engineering 25 + efficiency 20 + science 40 + completion 15."""
    ev = evaluate_design(design, level_id)
    level = LEVELS.get(level_id, LEVELS[1])
    checks = ev["checks"]
    n = len(checks) or 1
    passes = sum(c["status"] == "pass" for c in checks)
    warns = sum(c["status"] == "warn" for c in checks)
    engineering = 25 * (passes + 0.5 * warns) / n

    res = ev["resources"]
    budget_left = max(0.0, (res["budget"] - res["cost"]) / res["budget"])
    start_energy = max(1, int(results.get("start_energy", res["energy"])))
    energy_left = max(0.0, min(1.0, float(results.get("energy_left", 0)) / start_energy))
    efficiency = 10 * min(1.0, budget_left / 0.25) + 10 * energy_left

    required = level["stars_required"]
    analyzed = int(results.get("analyzed", 0))
    correct = int(results.get("correct", 0))
    science = 40 * min(1.0, correct / required)
    completion = 15 * min(1.0, analyzed / required)
    total = round(engineering + efficiency + science + completion)
    rank = next(name for th, name in RANKS if total >= th)
    accuracy = correct / analyzed if analyzed else 0.0
    success = analyzed >= required and accuracy >= level["pass_accuracy"]

    insights = []
    tel = _by_id("telescope", design.get("telescope"))
    if tel:
        insights.append(f"Your {tel['name']} multiplied every correct call by x{tel['science_multiplier']}.")
    ins = _by_id("instrument", design.get("instrument"))
    if ins:
        insights.append(f"The {ins['name']} gave you {required + ins['extra_targets']} targets to choose from.")
    insights.append(f"A {res['power_margin']:+.0%} power margin gave {res['energy']} energy units to spend.")
    if budget_left > 0.15:
        insights.append(f"You left {budget_left:.0%} of the budget unspent, boosting efficiency.")
    else:
        insights.append("Spending almost the whole budget lowered your efficiency score.")

    return {
        "breakdown": {"engineering": round(engineering, 1), "efficiency": round(efficiency, 1),
                      "science": round(science, 1), "completion": round(completion, 1)},
        "total": total, "rank": rank, "success": success, "accuracy": round(accuracy, 3),
        "analyzed": analyzed, "correct": correct, "incorrect": analyzed - correct,
        "budget_remaining": res["budget"] - res["cost"], "insights": insights, "evaluation": ev,
    }
