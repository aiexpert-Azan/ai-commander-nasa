# Gameplay & Mission Engine

All engineering numbers are **educational approximations** that are consistent with each other
(`backend/app/engine.py`). The launch is a stylized, seeded simulation, not orbital mechanics or GMAT.

## Levels

| Level | Budget | Stars | Base AI credits | Min power margin | Min lifetime | Risk cap | Signals |
|---|---|---|---|---|---|---|---|
| 1 Cadet Explorer | $700M | 3 | 4 | 0% | 1.5 y | — | clear |
| 2 Deep Space Analyst | $560M | 5 | 3 | 5% | 2.5 y | — | clear + moderate |
| 3 Elite Mission Commander | $480M | 8 | 1 | 10% | 3.0 y | 22% | moderate + ambiguous |

You unlock the next level by succeeding at the current one: analyze all required stars with at least 60% correct.
Level 1 is guided, with "Recommended" badges and a one-click recommended design.
An automated search over all 1,458 possible designs checks that every level stays achievable:
L1 has 424 launch-ready designs, L2 has 150 and L3 has 69 (this is tested).

## Components (cost $M / mass kg / power W)

The spacecraft bus is always included: $50M, 300 kg, −150 W.

| Category | Options and trade-offs |
|---|---|
| Telescope | 0.3 m (60/150/−40, points ×1.0) · 0.95 m (140/400/−60, ×1.25, trend overlay, +2% risk) · 1.4 m (240/750/−90, ×1.5, trend overlay, +5% risk) |
| Instrument | Single CCD (30/40/−50, 2 Gbit/d, +2 targets, 6 energy/obs) · Wide array (80/110/−120, 8 Gbit/d, +6 targets, 10 energy/obs) · Precision (110/90/−90, 5 Gbit/d, +3 targets, depth/noise readout) |
| Solar | 450 W (20/40) · 750 W (40/80) · 1100 W (70/140, +3% risk) |
| Antenna | Low-gain (10/10/−20, 4 Gbit/d) · High-gain (30/30/−60, 12 Gbit/d, +1 AI credit) · Ka-band (55/50/−110, 30 Gbit/d, +2 AI credits) |
| Launch | Light ($60M; LEO 1300 kg, L2 none, trailing 600 kg, 6% risk) · Medium ($110M; 3500/1500/1700, 3%) · Heavy ($200M; 9000/4000/4200, 2%) |
| Orbit | LEO ($0, 3 y, 50% observing efficiency, 65% sunlight) · Sun–Earth L2 ($25M, 5 y, 90%, needs deep-space comms) · Earth-trailing ($15M, 4 y, 100%, 95% sunlight, needs deep-space comms) |
| Ground station | Near-Earth network ($5M; link quality LEO 100%, L2 25%, trailing 15%) · Deep-space network ($20M; 60% / 100% / 85%) |

## Engineering rules

- **Cost** = bus + all parts + ground station. **Mass** = bus + telescope + instrument + solar + antenna.
- **Power**: generation = panel W × orbit sunlight factor. Demand = bus + telescope + instrument + antenna. Margin = (gen − demand) / demand.
- **Downlink** = antenna throughput × ground-station link quality for the orbit.
- **Lifetime** = orbit baseline × 0.7 if margin < 10%, × 0.85 if margin < 20%.
- **Science days** = lifetime × observing efficiency × 20.
- **Energy units** = clamp(50 + 120 × margin, 0, 160).
- **Risk %** = 5 + the risk of each part + 6 if margin < 10% + 4 if data uses > 80% of downlink + 3 if mass > 90% of rocket capacity.
- **Targets** = required stars + the instrument's extra targets. **AI credits** = level base + antenna bonus.

### Readiness checks (any red check blocks launch)
Design complete · Budget · Launch reach/payload · Power margin ≥ level minimum · Downlink ≥ data rate ·
Ground station matches the orbit (deep orbits need the deep-space network) · Lifetime and science days ·
Energy ≥ required observations × energy per observation · Risk ≤ level cap (Level 3 only).
Yellow checks are warnings: a thin margin, 1.0–1.25× downlink, or risk ≥ 20%.

## Launch simulation

Seven phases run in order. Four of them are hardware phases (orbit insertion, telescope deployment, solar activation and
comms link), and each rolls `random() < risk/4/100` using a SHA-256 seed built from the mission seed, the level and the design.
If you fly the same design with the same seed, you get the same outcome. Possible anomalies: −15% energy, −1 AI credit, or −10 science days.
After anomalies are applied, energy and science days are never allowed to fall below what the required observations need,
so every launch-ready mission can still be completed.

## Operations

- Pointing the telescope at a star costs its *energy per observation* and 10 science days.
- Asking the AI Scientist costs 1 credit and 4 energy. If inference fails, both are refunded.
- A correct call earns 100 × the telescope multiplier. A wrong call costs −30 points and 5 extra science days of re-observation.
- The mission ends when you reach the discovery target, or when you can no longer afford an observation and no observed star is still waiting for a call.

## Final score (0–100)

| Component | Max | Formula |
|---|---|---|
| Engineering readiness | 25 | 25 × (passes + 0.5 × warnings) / number of checks |
| Resource efficiency | 20 | 10 × min(1, budget left / 25% of budget) + 10 × energy left / starting energy |
| Science results | 40 | 40 × min(1, correct / required) |
| Mission completion | 15 | 15 × min(1, analyzed / required) |

Ranks: **Elite Commander** ≥ 90 · **Mission Specialist** ≥ 70 · **Explorer** ≥ 50 · **Cadet** below 50.
