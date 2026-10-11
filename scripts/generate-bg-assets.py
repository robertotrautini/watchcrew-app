#!/usr/bin/env python3
"""Generates the pre-composited backdrop assets from assets/images/cinema-bg.jpg.

cinema-bg-baked.jpg: what AppBackground used to compose at runtime
  (luminosity blend over #0a0a0a at opacity 0.6): out = 0.6 * luma + 0.4 * 10
  with luma = Rec.709-ish CSS luminosity (0.3 R + 0.59 G + 0.11 B) of the sRGB values.


Run: python3 scripts/generate-bg-assets.py   (needs Pillow + numpy)
"""
from pathlib import Path

import numpy as np
from PIL import Image

OPACITY = 0.6
BACKDROP = 10  # tailwind bg-primary #0a0a0a

root = Path(__file__).resolve().parent.parent / "assets" / "images"
src = np.asarray(Image.open(root / "cinema-bg.jpg").convert("RGB"), dtype=np.float64)
luma = 0.3 * src[..., 0] + 0.59 * src[..., 1] + 0.11 * src[..., 2]
baked = np.clip(OPACITY * luma + (1 - OPACITY) * BACKDROP, 0, 255).round().astype(np.uint8)
img = Image.fromarray(np.stack([baked] * 3, axis=-1), "RGB")
img.save(root / "cinema-bg-baked.jpg", quality=92, optimize=True)
print("ok")
