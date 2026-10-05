#!/usr/bin/env python3
"""Generate WatchCrew brand assets (reproducible). Run: python3 scripts/generate-brand-assets.py

Glyph = icon of the legacy app "Filmkritiker Trautmanns" (legacy repo icon-512.png: gold ring,
gold centre dot, three dimmer dots, on #0a0a0a). Geometry/colours were measured from that PNG
(512px grid) and are redrawn here as vectors, so every size is crisp (the legacy PNG is only 512px).

Outputs in assets/images/: icon.png (1024, opaque), android-icon-foreground/background/monochrome.png
(1024, adaptive 108dp layers; glyph ring = 55% of canvas, inside the 66dp = 61% safe zone),
splash-icon.png (glyph only, transparent), splash-bg.png (full-screen gradient, in-app splash), favicon.png.
Use --preview DIR to render gradient candidates (linear vs radial) + launcher masks for review.
"""
import argparse, math, os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "images")
BG = (10, 10, 10)
GOLD = (200, 164, 78)
GOLD_DIM = (143, 118, 58)
# Geometry on the legacy 512 grid (centre 256).
RING_R, RING_W = 134.5, 15.0  # outer 141.5 -> centre-line radius 134
DOT_C = 38.0
DOTS = [(255.5, 168.5), (180.0, 298.0), (330.0, 298.0)]
DOT_R = 24.0
SS = 4  # supersampling


def glyph(size, ring_fraction=283 / 512, colors=True, mono=False):
    """RGBA glyph on transparent canvas; ring outer diameter = ring_fraction * size."""
    n = size * SS
    k = n * ring_fraction / 283.0  # px per legacy unit
    c = n / 2
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    main = (255, 255, 255, 255) if mono else GOLD + (255,)
    dim = (255, 255, 255, 178) if mono else GOLD_DIM + (255,)
    ro = 141.5 * k
    d.ellipse([c - ro, c - ro, c + ro, c + ro], fill=main)
    ri = (141.5 - RING_W) * k
    d.ellipse([c - ri, c - ri, c + ri, c + ri], fill=(0, 0, 0, 0))
    d.ellipse([c - DOT_C * k, c - DOT_C * k, c + DOT_C * k, c + DOT_C * k], fill=main)
    for x, y in DOTS:
        px, py = c + (x - 255.5) * k, c + (y - 255.5) * k
        d.ellipse([px - DOT_R * k, py - DOT_R * k, px + DOT_R * k, py + DOT_R * k], fill=dim)
    return im.resize((size, size), Image.LANCZOS)


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def gradient(w, h, kind, lift=44):
    """Black with a subtle grey light in the top-left corner. Dithered against banding."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    if kind == "linear":
        ang = math.radians(35)  # direction of fade, measured from the vertical (top-left -> bottom-right)
        dx, dy = math.sin(ang), math.cos(ang)
        proj = x * dx + y * dy
        t = proj / (w * dx + h * dy)
        v = 1 - smooth(t / 0.9)
    else:  # radial from top-left corner
        r = np.hypot(x, y) / (math.hypot(w, h) * 0.85)
        v = 1 - smooth(r)
    v = v ** 1.2 * lift
    v += np.random.default_rng(1).uniform(-0.5, 0.5, v.shape)
    g = np.clip(np.round(v), 0, 255).astype(np.uint8)
    return Image.fromarray(np.stack([g, g, g], -1), "RGB")


def splash_full(kind, w=1080, h=2400, glyph_dp=288, dp_w=412):
    bg = gradient(w, h, kind).convert("RGBA")
    gs = int(w * glyph_dp / dp_w)
    g = glyph(gs)
    bg.alpha_composite(g, ((w - gs) // 2, (h - gs) // 2))
    return bg.convert("RGB")


def save(im, name):
    im.save(os.path.join(OUT, name), optimize=True)
    print("wrote", name, im.size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="dir for preview PNGs only (no asset writes)")
    ap.add_argument("--kind", default="linear", choices=["linear", "radial"])
    a = ap.parse_args()
    if a.preview:
        os.makedirs(a.preview, exist_ok=True)
        for k in ("linear", "radial"):
            splash_full(k).resize((540, 1200), Image.LANCZOS).save(os.path.join(a.preview, f"splash-{k}.png"))
        # launcher mockups
        fg, bgc = glyph(1024), Image.new("RGBA", (1024, 1024), BG + (255,))
        ad = bgc.copy(); ad.alpha_composite(fg)
        tiles = []
        for shape in ("circle", "squircle"):
            m = Image.new("L", (1024, 1024), 0)
            dm = ImageDraw.Draw(m)
            # adaptive: visible 72/108 of canvas
            s = int(1024 * 72 / 108); o = (1024 - s) // 2
            if shape == "circle":
                dm.ellipse([o, o, o + s, o + s], fill=255)
            else:
                dm.rounded_rectangle([o, o, o + s, o + s], radius=int(s * 0.3), fill=255)
            t = Image.new("RGBA", (1024, 1024), (60, 60, 70, 255)); t.paste(ad, (0, 0), m)
            tiles.append(t.resize((256, 256), Image.LANCZOS))
        sheet = Image.new("RGBA", (256 * 3, 256), (60, 60, 70, 255))
        sheet.paste(tiles[0], (0, 0)); sheet.paste(tiles[1], (256, 0))
        sheet.paste(Image.open(os.path.join(OUT, "icon.png")).convert("RGBA").resize((256, 256), Image.LANCZOS), (512, 0))
        sheet.save(os.path.join(a.preview, "launcher.png"))
        return
    full = glyph(1024)
    icon = Image.new("RGB", (1024, 1024), BG)
    icon.paste(full, (0, 0), full)
    save(icon, "icon.png")
    save(full, "android-icon-foreground.png")
    save(Image.new("RGB", (1024, 1024), BG), "android-icon-background.png")
    save(glyph(1024, mono=True), "android-icon-monochrome.png")
    save(full, "splash-icon.png")
    save(gradient(1080, 2400, a.kind), "splash-bg.png")
    fav = Image.new("RGB", (1024, 1024), BG)
    fav.paste(full, (0, 0), full)
    save(fav.resize((48, 48), Image.LANCZOS), "favicon.png")


if __name__ == "__main__":
    main()
