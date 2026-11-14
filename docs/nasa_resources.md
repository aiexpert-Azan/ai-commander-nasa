# How the NASA resources shaped the game

This game was inspired by public NASA educational material. It is **not endorsed by NASA**.

## A. Design and Develop Science Missions (NASA PDF)
<https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>

The game follows the mission life cycle step by step:

| Life-cycle stage | Where it is in the game |
|---|---|
| Mission objective | Briefing screen: investigate historical Kepler signals for possible exoplanets |
| Requirements | Per-level budget, minimum power margin, minimum lifetime, risk cap, discovery target |
| Spacecraft design | Design screen: six subsystem categories |
| Verification | Readiness Review: 8–9 pass/warn/fail checks. Launch is blocked until every critical check passes. |
| Launch | Launch screen: seeded launch and deployment phases |
| Mission operations | Exploration: energy, science days and AI credits are spent on observations |
| Science results | Decision feedback and the final mission report |

The four **mission segments** appear as status tiles on the Readiness screen:
**Launch** (rocket reach and payload), **Space** (power, lifetime, energy, risk),
**Ground** (ground station choice and the downlink check), and **User/Science** (targets and AI credits available).

## B. NASA Goddard Mission Design Lab
<https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/>

The Mission Design Lab runs fast concurrent trade studies, and the game copies that idea. Every choice affects several variables at once:

- **Telescope**: changes science value and unlocks an analysis tool, but also adds cost, mass, power demand and deployment risk.
- **Instrument**: changes the number of targets and adds tools, but also changes data volume (which stresses comms), power and energy per observation.
- **Solar panels**: bring power margin, which becomes energy, lifetime and lower risk, at the price of mass, cost and deployment risk.
- **Antenna**: brings downlink capacity and AI credits, at the price of power demand and cost.
- **Launch vehicle**: decides which orbits you can reach and how much payload you can carry, plus its own cost and reliability.
- **Orbit**: sets observing efficiency, lifetime, sunlight, cost and ground-segment needs.

The resource meters on the Design screen recalculate live from the backend engine, so you see each
trade-off right away. All formulas are written out in [gameplay.md](gameplay.md).

## C. NASA "Build It Yourself" Webb telescope game
<https://science.nasa.gov/mission/webb/game-build-it-yourself/>

We borrowed its beginner-friendly approach:

- **Guided choices and component cards**: one category at a time, short descriptions, and stat chips on every card.
- **Clear objectives**: each screen starts with a single line telling you what to do next.
- **Immediate feedback**: live meters, a spacecraft drawing that changes with your choices, and a sound for every selection.
- **Incompatible-choice warnings**: plain-language failed checks with a "Fix:" hint. For example, a light rocket can't reach L2, and deep orbits need the deep-space network.
- **Increasing difficulty**: three levels with tighter limits and harder-to-read signals.
- **Animated launch**: countdown, liftoff, then step-by-step deployment of the telescope, panels and comms. You can skip it.

## Data sources
Light curves come from Kepler photometry held at MAST. Labels come from the NASA Exoplanet Archive Kepler DR25 KOI table.
In the game they are always described as historical observations. We never present them as new measurements.
