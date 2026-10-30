"""Write a high-quality WebP beside every painted PNG in public/assets.

The PNG originals stay in place because the provenance manifests record their
SHA-256. The game loads the WebP twins (see src/asset-url.ts), and the build
drops PNGs that have a twin (see vite.config.ts).

Usage: python -X utf8 tools/optimize-assets.py [--force] [--check]
  --check  only report images whose WebP is missing or older than the PNG
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent / "public" / "assets"
QUALITY = 92


def psnr(a: Image.Image, b: Image.Image) -> float:
    """Visible quality: both images composited over a mid-tone, so colour
    hidden under fully transparent pixels does not count."""
    def flat(image: Image.Image) -> Image.Image:
        rgba = image.convert("RGBA")
        ground = Image.new("RGBA", rgba.size, (128, 140, 110, 255))
        return Image.alpha_composite(ground, rgba).convert("RGB")
    diff = ImageChops.difference(flat(a), flat(b))
    mse = sum(v * v for v in ImageStat.Stat(diff).rms) / 3
    return 99.0 if mse == 0 else 10 * __import__("math").log10(255 * 255 / mse)


def main() -> int:
    force = "--force" in sys.argv
    check = "--check" in sys.argv
    stale = []
    before = after = 0
    for png in sorted(ROOT.rglob("*.png")):
        webp = png.with_suffix(".webp")
        fresh = webp.exists() and webp.stat().st_mtime >= png.stat().st_mtime
        if check:
            if not fresh:
                stale.append(png)
            continue
        if fresh and not force:
            before += png.stat().st_size
            after += webp.stat().st_size
            continue
        image = Image.open(png)
        image.load()
        image.save(
            webp,
            "WEBP",
            quality=QUALITY,
            alpha_quality=100,
            method=6,
            exact=False,
        )
        quality = psnr(image, Image.open(webp))
        before += png.stat().st_size
        after += webp.stat().st_size
        print(
            f"{png.relative_to(ROOT)}: {png.stat().st_size / 1e6:.2f}MB -> "
            f"{webp.stat().st_size / 1e6:.2f}MB  PSNR {quality:.1f}dB"
        )
    if check:
        for png in stale:
            print(f"缺少或过期的 WebP：{png.relative_to(ROOT)}")
        return 1 if stale else 0
    print(f"合计 {before / 1e6:.1f}MB -> {after / 1e6:.1f}MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
