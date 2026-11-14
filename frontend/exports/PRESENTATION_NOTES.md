# AI Commander — Presentation Notes

**Team:** Doppler Dancers · **Event:** NASA Space Apps Challenge 2026 · **Challenge:** Space Mission Design Game

| File | Use it for |
|---|---|
| `AI_Commander_Presentation.html` | Live judging. Self-contained, cinematic, with the **live game playable inside the iPhone** on slide 7. |
| `AI_Commander_NASA_Submission.pptx` | Space Apps portal submission. Same 7 slides and content, editable, works offline. |

**Expected duration:** about 8–9 minutes. Plan 45–60 seconds for each of slides 1–6 and about 3 minutes for the live demo on slide 7. Leave extra time for questions.

---

## Launching the HTML presentation

1. Open `AI_Commander_Presentation.html` in **Google Chrome or Microsoft Edge** by double-clicking it. No server or install is needed.
2. Press **F** (or click the ⛶ button) for fullscreen. Slides scale to any screen; the design is built for a 1920 × 1080 projector and also tested at 1366 × 768.
3. Navigation:
   - **→ / Space / Page Down** = next slide; **← / Page Up** = previous slide; **1–7** = jump to a slide; **Home / End** = first or last slide.
   - You can also use the mouse wheel, swipe, or the control bar at the bottom. The bar fades out when idle and comes back when you move the mouse.
   - Add `#7` to the end of the file URL to open straight on the demo slide.
4. The fonts, screenshots and visuals are embedded in the file. The internet is needed only for the live game on slide 7.
5. If you have "reduce motion" turned on in your operating system, the animations are switched off and all content appears immediately.

## Operating the live iPhone demo (slide 7)

- The game starts loading in the background about 2 seconds after the presentation opens, so it is warm by slide 7.
- The status pill under the QR code shows **LIVE** (green) when the real game is running inside the phone.
- **Click inside the phone** to play. While the game has focus:
  - your keyboard and mouse wheel control the game, not the slides;
  - the slide controls hide automatically.
- **Click anywhere outside the phone** to get the slide controls back.
- **Fullscreen demo**: enlarges the phone to fill the screen height and hides everything else. Click **Exit demo** or press **Esc** to leave.
- **Open live game**: opens https://ai-commander-nasa.vercel.app/ in a new tab. This is your backup.
- **Restart demo**: reloads the game inside the phone.
- **QR code**: lets judges play on their own phones.

**Suggested demo script (about 3 minutes):**
1. START MY MISSION, then choose Guided Explorer and skip the tutorial.
2. Auto-Build, then show the live meters.
3. Check: point out the plain-language readiness checks, then Launch and press Skip.
4. Tap a star, then Point Telescope. Show the real Kepler graph and the "dip window".
5. Ask the AI Scientist: "AI Suggests…". Open "How did the AI decide?" to show that the score is not a probability.
6. Make the call and show the feedback, which is checked on the server against the Kepler DR25 catalog.

## Iframe restriction and the one-time deployment step (important)

The deployed site currently sends `X-Frame-Options: DENY`, which **blocks every iframe**. We confirmed this in a real browser. Until it is changed:

- the phone shows a clearly labelled **real screenshot** with an *Open live game* button;
- the status pill says the live embed is blocked.

The presentation never pretends a screenshot is the live game.

**Fix, already made in the repository but not deployed:**
- `frontend/vercel.json` adds `Content-Security-Policy: frame-ancestors 'self' file:`. This lets **only the game's own site and locally opened files** (this presentation) embed the game. Every other website is still blocked. `X-Frame-Options: DENY` is kept for older browsers, and modern browsers follow the CSP rule.
- `frontend/src/main.tsx`: when the game is embedded, it sends one "ready" message (`{type: 'ai-commander-ready'}`) to the page that embeds it. This is how the presentation knows the live embed really works, so it never shows "LIVE" by mistake. No game data is sent and the game logic is unchanged.

**To enable the live embed:** commit these two changes and redeploy the frontend on Vercel. No backend or Railway change is needed. Then open the HTML file and check that slide 7 shows the green **LIVE** pill.

Notes:
- We tested this exact header policy with a local copy of the site. Clicking, scrolling, Auto-Build through the real API, keyboard isolation, Fullscreen demo and Open live game all worked at 1920 × 1080 and 1366 × 768. It cannot be proven on the live URL until it is deployed.
- `file:` framing is tested in Chromium (Chrome/Edge). If another browser blocks it, use **Open live game**.
- If the venue network blocks the site, use the QR code on a phone hotspot.

## Slide-by-slide speaking notes

The same notes are also inside the PPTX as speaker notes.

**1 · AI COMMANDER — THE EXOPLANET HUNTER.** We are Doppler Dancers. AI Commander is a browser game for the Space Mission Design Game challenge. Players design a telescope mission, launch it, and then hunt for exoplanet signals in real, historical Kepler data, helped by an AI Scientist that can be wrong.

**2 · Mission design is hard to learn from a textbook.** Mission design is usually taught as facts to memorise. Real mission teams make linked decisions under budget, mass, power and risk limits, and then do science with messy real data. Beginners almost never get to experience those decisions.

**3 · Play the whole mission, from design to discovery.**
- The game walks players through the full mission: build, readiness review, launch, observe real Kepler stars, analyse each signal, mission score.
- Guided Explorer adds hints and Auto-Build. Mission Commander is independent play.
- Both use exactly the same rules and scoring.

**4 · Every choice is a real engineering trade-off.**
- Seven design choices; each one changes cost, mass, power, data, risk and lifetime together.
- The numbers shown are the live engine output for the Level 1 recommended design.
- The readiness review blocks launch until every critical check passes and explains each failure. Example: a light rocket cannot reach L2.
- Higher levels tighten the budget, power margin and risk limits.

**5 · Real Kepler data, with an AI second opinion.**
- Left: an *illustration* of a transit. Middle: a *real* processed Kepler signal (KIC 7685981).
- Light curves come from MAST, phase-folded and binned to 128 points. Answers are checked on the server against Kepler DR25.
- The AI Scientist is a 1D CNN. On the 150-star held-out test split: 71.33% accuracy, 94.67% candidate recall, threshold 0.40.
- It flags many false positives, so we present it as an experimental second opinion: never a probability, never a confirmation.

**6 · Built on open tools and NASA resources.**
- React and TypeScript on Vercel call a FastAPI backend on Railway.
- The backend runs the mission engine and the TensorFlow model over the processed Kepler dataset.
- The design follows NASA's mission life cycle and four mission segments, Goddard's trade-study approach, and the Webb "Build It Yourself" game.

**7 · Live mission demo.** Run the live demo, invite judges to scan the QR code, and close with *"Build. Launch. Discover. Every discovery starts with a well-designed mission. Thank you."*

## Verified facts used (sources in this repository)

- **Model:** Keras 1D CNN with 166,849 parameters, trained on 1,000 Kepler DR25 KOIs (500 / 500). The split is by star: 700 train / 150 validation / 150 test.
- **Test results (150 stars):** accuracy 71.33%, candidate recall 94.67%, threshold 0.40. Only those 150 test stars are playable, so this is *not* an independent new benchmark. Source: `README.md`, `docs/model_integration.md`.
- **Engineering numbers on slide 4:** live `POST /api/mission/evaluate` output for the Level 1 recommended design ($515M of $700M, 900 of 1,700 kg, 712 W / 360 W, 10.2 Gbit/day vs 5, 17% risk, all checks passing). Fetched 2026-11-14.
- **Levels, scoring weights and check list:** `backend/app/engine.py`, `README.md`.
- **Screenshots:** captured from the live deployed site at iPhone size (390 × 844) on 2026-11-14.
- **Images:** no NASA imagery or insignia is used. All visuals are our own drawings or real game screenshots. Both decks state: *Not affiliated with or endorsed by NASA.*

## NASA resources cited

1. NASA — Design and Develop Science Missions (PDF): https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf
2. NASA Goddard Mission Design Lab: https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/
3. NASA Webb "Build It Yourself" game: https://science.nasa.gov/mission/webb/game-build-it-yourself/
4. NASA Exoplanet Archive — Kepler DR25 KOI table: https://exoplanetarchive.ipac.caltech.edu/
5. MAST — Kepler mission data: https://archive.stsci.edu/missions-and-data/kepler
