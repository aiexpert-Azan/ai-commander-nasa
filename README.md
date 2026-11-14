# AI Commander — The Exoplanet Hunter

A browser game for the **NASA Space Apps Challenge 2026 — "Space Mission Design Game"**.

You are the Mission Commander. You **design** a space telescope within a budget and engineering limits,
pass a **readiness review**, **launch** it, and then **hunt for exoplanets** in **real historical NASA Kepler
light curves**. For each star, you decide whether the brightness dip is a *planet candidate* or a *false positive*.
An experimental, student-trained neural network called the **AI Scientist** can give you a second opinion.
It is often right, but not always.

> **Disclaimer:** This project is not affiliated with or endorsed by NASA. The signals are *historical* Kepler observations
> that were re-processed for this game. They are not new measurements. The engineering numbers are educational
> approximations, not NASA engineering data. A catalog "candidate" is not a confirmed planet.

---

## Highlights

- **Mission design with real trade-offs.** There are 6 subsystem categories and a ground station. Every part changes several of: cost, mass, power, data rate, downlink, lifetime, risk and science value.
- **Systems-engineering readiness review.** Up to 9 pass/warn/fail checks cover the launch, space, ground and science segments. Launch stays blocked until every critical check passes.
- **Seeded launch simulation.** A countdown, liftoff and deployment phases each roll against your mission risk. The same design and seed always give the same outcome.
- **Real Kepler science.** You see an interactive, zoomable phase-folded light curve for 150 held-out Kepler targets, checked against the Kepler DR25 KOI catalog on the server.
- **Real CNN inference.** A 1D convolutional network runs live through FastAPI. Its score is clearly labelled experimental and never shown as a probability.
- **Three levels:** Cadet Explorer, Deep Space Analyst and Elite Mission Commander, with ranks from Cadet to Elite Commander.
- **Also included:** synthesized sound effects, progress saved in the browser, and a responsive layout that works on phones.

## Gameplay at a glance

**Welcome → Briefing → Spacecraft Design → Readiness Review → Launch → Exploration (+ AI Scientist) → Feedback → Results → Next level**

| Level | Budget | Stars to classify | AI credits (base) | Extra constraints |
|---|---|---|---|---|
| 1 Cadet Explorer | $700M | 3 | 4 | Guided, with a one-click "Use recommended" design |
| 2 Deep Space Analyst | $560M | 5 | 3 | ≥5% power margin, ≥2.5-year lifetime |
| 3 Elite Mission Commander | $480M | 8 | 1 | ≥10% power margin, ≥3-year lifetime, risk ≤ 22% |

Observations cost energy and science days, and each AI consult costs a credit. Correct calls earn points multiplied by your
telescope's science multiplier. Wrong calls cost points and extra observing time. The final score (0–100) combines engineering
readiness (25), resource efficiency (20), science results (40) and mission completion (15).
Every formula is in **[docs/gameplay.md](docs/gameplay.md)**.

## NASA resources used

| Resource | What it shaped in the game |
|---|---|
| [Design and Develop Science Missions (NASA PDF)](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf) | The mission life cycle (objective → requirements → design → verification → launch → operations → science) and the four mission segments shown on the readiness screen |
| [NASA Goddard Mission Design Lab](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/) | Engineering trade studies: every component choice changes several resources at once, with live feedback |
| [NASA Webb "Build It Yourself" game](https://science.nasa.gov/mission/webb/game-build-it-yourself/) | Beginner-friendly design: guided choices, component cards, instant feedback, incompatibility warnings, animated launch |
| [NASA Exoplanet Archive — Kepler DR25 KOI table](https://exoplanetarchive.ipac.caltech.edu/) | Historical CANDIDATE / FALSE POSITIVE labels used to check the player's decisions |
| [MAST — Kepler mission data](https://archive.stsci.edu/missions-and-data/kepler) | Source light curves for the processed 128-point signals |

Details: **[docs/nasa_resources.md](docs/nasa_resources.md)**.

## AI Scientist (model details)

| Item | Value |
|---|---|
| Architecture | Keras Sequential 1D CNN: Conv1D 32 → BN → MaxPool → Conv1D 64 → BN → MaxPool → Conv1D 128 → MaxPool → Dense 64 → Dropout → sigmoid; 166,849 parameters |
| Input | 128-point phase-folded transit window (±3 transit durations), flux deviation in ppt, scaled by 1/77.27 and clipped to ±5 |
| Training data | 1,000 Kepler DR25 KOIs (500 candidates / 500 false positives), split by star into 700 train / 150 validation / 150 test |
| Test results | Accuracy **71.33%**, candidate recall **94.67%**, decision threshold 0.40. It flags many false positives as candidates. |
| Use in the game | An experimental vetting assistant. Its output is a raw score, **not a calibrated planet probability**. |

- Only the **150 test-split stars** can be played. Catalog labels are never sent to the browser before you decide.
- If the model is unavailable, the AI credit is refunded and the game continues without the AI. There are no fake scores.
- Our inference code reproduces the reported test metrics exactly, which confirms it matches training preprocessing.
  Those stars are now game content, so these numbers are not an independent new benchmark.

Details: **[docs/model_integration.md](docs/model_integration.md)**.

---

## Setup (Windows)

### Requirements
- **Python 3.12**: the version this project is tested with. TensorFlow wheels are not yet available for Python 3.14. Get it from <https://www.python.org/downloads/>.
- **Node.js 18 or newer** (tested with Node 26). Get it from <https://nodejs.org/>.
- Git. You don't need Git LFS: the model and data are committed directly (about 2.5 MB).

### 1. Clone and set up (one time)
```bat
git clone https://github.com/<your-account>/ai-commander-nasa.git
cd ai-commander-nasa
:: keep the folder path short; TensorFlow needs paths under 260 characters on Windows
setup.bat
```
`setup.bat` does four things:
1. Creates `backend\.venv` with Python 3.12.
2. Installs the backend packages (FastAPI, TensorFlow, …).
3. **Checks the model and data files against SHA-256 checksums** (`backend/ASSETS.sha256`).
4. Runs `npm install` for the frontend.

### 2. Run (two terminals, e.g. in VS Code)
```bat
start-backend.bat      :: terminal 1: picks the first free port from 8000 and prints it
start-frontend.bat     :: terminal 2: Vite dev server; /api is proxied to the backend port
```
Then open **http://127.0.0.1:5173**.

- To auto-reload the backend while editing code, use `start-backend.bat reload`.
- To stop the backend and any leftover `--reload` workers, run `stop-backend.bat`.

| Service | URL |
|---|---|
| Game | http://127.0.0.1:5173 |
| API | http://127.0.0.1:8000 (or the port printed by `start-backend.bat`) |
| API docs (Swagger) | http://127.0.0.1:8000/docs |
| Health check | http://127.0.0.1:8000/api/health, also via http://127.0.0.1:5173/api/health |

### Manual commands (any OS)
The FastAPI app is `app` in `backend/app/main.py`, so the ASGI target is **`app.main:app`**. Run it **from `backend/`**.
```bash
cd backend
python3.12 -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python scripts/verify_assets.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000      # or: uvicorn main:app --reload

cd ../frontend
npm install
npm run dev
```

### Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Could not import module "main"` / `"app"` | uvicorn started from the wrong folder | `cd backend`, then use `app.main:app` |
| `WinError 10013` (with `--reload`) / `WinError 10048` | Port already in use, often by an old backend or an orphaned `--reload` worker; sometimes a Windows reserved port | Run `stop-backend.bat`, or use `start-backend.bat`, which moves to the next free port |
| `No module named tensorflow` | Wrong Python | Use `backend\.venv\Scripts\python` (Python 3.12) |
| "Mission server offline" banner | Backend not running, or its port changed after Vite started | Start the backend first, then restart `start-frontend.bat` |
| `pip install` fails with `OSError: [Errno 2] No such file or directory` and a *Long Path* hint | TensorFlow's files exceed Windows' 260-character path limit when the project sits in a deeply nested folder | Clone to a short path (e.g. `C:\dev\ai-commander-nasa` or `Desktop\PROJECTS\...`), or [enable Windows long paths](https://learn.microsoft.com/windows/win32/fileio/maximum-file-path-limitation#enable-long-paths-in-windows-10-version-1607-and-later) |
| `verify_assets.py` reports MISSING or MISMATCH | Incomplete download (e.g. a partial ZIP) | Re-clone the repository |

### Configuration

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Start port for `start-backend.bat` | `8000` |
| `AIC_BACKEND_URL` | Vite `/api` proxy target | from `.backend-port`, else `http://127.0.0.1:8000` |
| `VITE_API_URL` | Call the backend directly instead of through the proxy (`frontend/.env`) | unset |
| `AIC_CORS_ORIGINS` | Allowed browser origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `AIC_MODEL_PATH`, `AIC_MODEL_CONFIG`, `AIC_CHECKPOINT`, `AIC_SPLIT` | Override model and data paths | files in `backend/models`, `backend/data` |
| `AIC_DISABLE_MODEL=1` | Simulate the AI Scientist being offline | off |

No API keys, accounts or database are needed.

## Tests
```bat
cd backend
.venv\Scripts\python -m pytest -q          :: 15 API + engine tests (data validation, label hiding, inference, readiness, scoring, level feasibility)
.venv\Scripts\python scripts\verify_assets.py
cd ..\frontend
npm run build                               :: TypeScript type-check + production build
```

## Project structure
```
ai-commander-nasa/
├─ backend/
│  ├─ app/
│  │  ├─ main.py          FastAPI routes
│  │  ├─ engine.py        Mission engineering rules, launch simulation, scoring
│  │  ├─ data_store.py    Kepler data loading/validation, test-split filtering, difficulty tiers
│  │  ├─ inference.py     AI Scientist (Keras CNN wrapper)
│  │  └─ config.py        Paths and environment variables
│  ├─ models/             kepler_cnn_1000.keras, cnn_config_1000.json
│  ├─ data/               kepler_1000_checkpoint.npz (signals), cnn_split_1000.npz (train/val/test IDs)
│  ├─ scripts/            find_free_port.py, stop_backend.ps1, verify_assets.py
│  ├─ tests/test_api.py
│  ├─ ASSETS.sha256       Checksums of the model and data files
│  ├─ main.py             Shim so `uvicorn main:app` works
│  └─ requirements.txt
├─ frontend/
│  ├─ src/api/            Typed API client
│  ├─ src/game/           Game state (reducer + localStorage), live evaluation hook
│  ├─ src/audio/          Web Audio synthesized sound effects
│  ├─ src/components/     UI kit, starfield, spacecraft SVG, light-curve chart, star grid
│  ├─ src/screens/        Welcome, Briefing, Design, Readiness, Launch, Exploration, Results
│  └─ package.json, vite.config.ts
├─ docs/                  gameplay.md, model_integration.md, nasa_resources.md
├─ setup.bat  start-backend.bat  start-frontend.bat  stop-backend.bat
└─ README.md
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status of the data and the model |
| GET | `/api/stars?level=&count=&seed=` | Mission targets (no catalog labels) |
| GET | `/api/stars/{id}` | 128-point signal, phase axis, features, provenance |
| POST | `/api/stars/{id}/decision` | Checks the player's call on the server and returns the catalog label |
| POST | `/api/ai/analyze` | Runs the CNN on `{star_id}` or `{signal: [128 floats]}` |
| GET | `/api/mission/components` | Component catalog, levels, rules |
| POST | `/api/mission/evaluate` | Resources and readiness checks, or the final score when `results` is sent |
| POST | `/api/mission/launch` | Seeded launch simulation (rejected if the design isn't launch-ready) |

## Tech stack
React 18, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Recharts, Lucide icons and the Web Audio API on the frontend.
FastAPI, Pydantic, NumPy, TensorFlow/Keras and Uvicorn on the backend.

## Data attribution
- **Labels:** NASA Exoplanet Archive, Kepler DR25 Kepler Objects of Interest table (`koi_pdisposition`).
- **Light curves:** Kepler photometry from MAST (Mikulski Archive for Space Telescopes), processed by the team
  (phase-folded, 128 median bins, baseline-subtracted, ppt). See [docs/model_integration.md](docs/model_integration.md).
- This research uses data from the Kepler mission, funded by the NASA Science Mission Directorate.
