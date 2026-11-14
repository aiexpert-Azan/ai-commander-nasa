"""Verify the trained model and processed Kepler data shipped with the repo.

Usage (from the backend/ folder):  python scripts/verify_assets.py
Exits 1 if a file is missing or its SHA-256 does not match backend/ASSETS.sha256.
"""
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # repo root
MANIFEST = ROOT / "backend" / "ASSETS.sha256"

ok = True
for line in MANIFEST.read_text(encoding="utf-8").splitlines():
    if not line.strip():
        continue
    expected, rel = line.split(maxsplit=1)
    path = ROOT / rel.strip().lstrip("*")
    if not path.exists():
        print(f"MISSING  {rel}")
        ok = False
        continue
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    status = "OK      " if actual == expected else "MISMATCH"
    ok &= actual == expected
    print(f"{status} {rel}  ({path.stat().st_size:,} bytes)")

if not ok:
    print("\nModel/data files are missing or corrupted. Re-clone the repository "
          "(if you downloaded a ZIP, make sure backend/models and backend/data were included).")
    sys.exit(1)
print("All model/data assets verified.")
