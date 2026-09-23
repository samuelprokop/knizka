"""
Farebná úprava Kling videa (hero knihy) snímku po snímke.

1. vyváženie bielej podľa pozadia (pozadie -> biela, strany sa zosvetlia rovnomerne)
2. zvyšky modrosivého pozadia -> čistá biela, jemný tieň pod knihou ostane
3. oranžová obálka -> presne FF661A

Použitie: python3 grade_hero.py <vstupny_priecinok> <vystupny_priecinok> [snimky...]
"""

import sys
import glob
import os

import numpy as np
from PIL import Image

BG_REF = np.array([193.2, 198.6, 205.2], dtype=np.float32)
WB_GAIN = 255.0 / BG_REF

COVER_MEAN_AFTER_WB = np.array([167.1, 75.8, 36.3], dtype=np.float32) * WB_GAIN
COVER_TARGET = np.array([255.0, 102.0, 26.0], dtype=np.float32)
COVER_GAIN = COVER_TARGET / COVER_MEAN_AFTER_WB


def smoothstep(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def grade(src):
    img = np.asarray(src.convert("RGB")).astype(np.float32)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]

    # pozadie je modrasté (B > R), strany a obálka teplé (R > B)
    bg_mask = smoothstep(b - r, 1.0, 7.0)[..., None]
    cover_mask = (smoothstep(r - b, 40.0, 75.0) * (r > 80))[..., None]

    out = img * WB_GAIN

    # pozadie: neutrálna šedá z jasu (odstráni modrý nádych), svetlé miesta -> 255,
    # tmavšie (tieň pod knihou) ostanú ako jemná sivá
    lum = out.mean(axis=2, keepdims=True)
    bg_val = np.clip(lum * 1.04, 0, 255)
    out = out * (1 - bg_mask) + bg_val * bg_mask

    out = out * (1 - cover_mask) + np.clip(out * COVER_GAIN, 0, 255) * cover_mask

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    src_dir, dst_dir = sys.argv[1], sys.argv[2]
    os.makedirs(dst_dir, exist_ok=True)
    only = set(sys.argv[3:])
    for path in sorted(glob.glob(os.path.join(src_dir, "*.png"))):
        name = os.path.basename(path)
        if only and name not in only:
            continue
        grade(Image.open(path)).save(os.path.join(dst_dir, name))
    print("GRADE_OK")


if __name__ == "__main__":
    main()
