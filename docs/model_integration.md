# Model & Data Integration

## Files

| File | Contents (validated at startup) |
|---|---|
| `backend/models/kepler_cnn_1000.keras` | Keras Sequential 1D CNN, input `(None,128,1)`, sigmoid output, 166,849 params |
| `backend/models/cnn_config_1000.json` | `scale=77.2688`, `threshold=0.40`, labels, 700/150/150 split sizes |
| `backend/data/kepler_1000_checkpoint.npz` | `X (1000,128) float32`, `y (1000,)`, `kepid`, `kepoi_name`, `failed_ids` |
| `backend/data/cnn_split_1000.npz` | `train_ids (700)`, `val_ids (150)`, `test_ids (150)` (Kepler IDs) |

Startup validation (`data_store.py`) checks that X is `(N,128)`, that y and kepid match it, that every value
is finite, and that the test IDs don't overlap the train or validation IDs. You can see the result in
`GET /api/health → data_validation`. If any check fails, the API returns an explicit setup error (HTTP 503).
It never falls back to substitute signals.

## Signal processing (done upstream, *not* repeated here)

The KOI catalog period, epoch and duration were used to phase-fold each light curve. The fold was binned
into 128 medians over ±3 transit durations. Missing bins were interpolated, the baseline was subtracted,
and the result was multiplied by 1000 (parts per thousand). The game **does not fold again**.
Bin *i* maps to `phase = -3 + (i+0.5)·6/128` transit durations. This axis follows directly from the
processing window, so the chart labels it as "time from transit centre". We do not have the original
timestamps or sky coordinates, so the target grid is explicitly labelled *stylized*.

## Inference (`inference.py`)

1. The model and config are loaded once at startup, followed by one warm-up prediction.
2. Input → `float32`, length must be 128 and all values finite (otherwise HTTP 422).
3. `x / scale`, then clip to ±5 (`AIC_CLIP`).
4. Reshape to `(1,128,1)` and run the model in inference mode (`model(x, training=False)`), then compare with `threshold`.
   Calling the model directly avoids the per-call input pipeline that `Model.predict()` builds. On all 150 test stars
   the scores match `predict()` to within 1.2e-7 with identical classes, and the call is about 5× faster (~13 ms vs ~67 ms).
   `AIC_TF_THREADS` can cap TensorFlow's CPU threads on small servers.
5. The response contains `score`, `predicted_class`, `lean_strength`, an `explanation` and a `disclaimer`.

**Checking the preprocessing.** We ran the 150 held-out test stars through this preprocessing pipeline. It
reproduced the training notebook's reported numbers exactly: accuracy **71.33%**, candidate recall **94.67%**.
The result was the same with no clip and with clips of 3, 5 or 10. A clip of 1 changed it, so we chose ±5.
This run only confirms that inference matches training. It is **not** a new benchmark, because these
stars were then used to build the game.

## Honesty rules enforced in code

- The score is shown as an *"experimental candidate score"* with its threshold. It is never called a probability.
- When inference fails, the API returns 503. The frontend then refunds the AI credit, shows
  "AI Scientist temporarily unavailable" and lets the player continue. There are **no random fallback numbers**.
- The model is not an oracle. On the test set it flags many false positives as candidates.
  In our scripted Level-3 run, following the AI blindly gave 3/8 correct answers.
- Only **test-split** stars are playable. A request for a training star ID returns 404 (this is tested).
- Catalog labels never appear in `/api/stars` or `/api/stars/{id}`. They are revealed only by the decision endpoint.

## Difficulty curation

Each test star gets simple descriptors computed from its own signal. **Depth** is the minimum of a 3-bin
smoothed signal inside ±0.5 durations. **Noise** is the robust MAD of the bins outside ±1.5 durations.
**SNR** is depth divided by noise. A *readability* score measures how well the rule taught in the game
reads the signal:

- Catalog candidate: readability = SNR if depth < 10 ppt (a clear, shallow dip is easy).
- Catalog false positive: readability is high if depth ≥ 10 ppt (an eclipsing-binary-like dip),
  otherwise `3 − SNR` (a flatter signal is easier).

Stars are ranked within each label and split into tertiles: **clear / moderate / ambiguous** (25 + 25 per tier).
Level 1 draws from *clear*, Level 2 from *clear + moderate*, and Level 3 from *moderate + ambiguous* (topped up with *clear* if needed).
Each mission has a balanced number of each label. Tertiles were used because only 9 of the 75 test
candidates pass a fixed "SNR ≥ 3" rule. Many real Kepler candidates are faint.
