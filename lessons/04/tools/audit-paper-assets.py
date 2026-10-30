"""Verify production cutouts and refresh factual metadata, without modifying PNGs."""
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'public' / 'assets' / 'asset-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for asset in manifest['assets']:
    path = ROOT / 'public' / 'assets' / asset['file']
    image = Image.open(path)
    assert image.mode == 'RGBA', f"{path.name}: requires RGBA"
    alpha = image.getchannel('A')
    histogram = alpha.histogram()
    pixels = image.width * image.height
    border = list(alpha.crop((0, 0, image.width, 1)).getdata())
    border += list(alpha.crop((0, image.height - 1, image.width, image.height)).getdata())
    border += list(alpha.crop((0, 0, 1, image.height)).getdata())
    border += list(alpha.crop((image.width - 1, 0, image.width, image.height)).getdata())
    bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    assert histogram[0] / pixels > .15, f"{path.name}: not sufficiently transparent"
    # ImageGen can retain alpha 1–2 encoding noise outside the visible silhouette.
    assert max(border) <= 8, f"{path.name}: visible artwork touches canvas edge"
    assert bounds is not None, f"{path.name}: empty alpha"
    asset['sha256'] = sha256(path.read_bytes()).hexdigest()
    asset['width'], asset['height'] = image.size
    asset['bytes'] = path.stat().st_size
    asset['alphaCheck'] = {
        'mode': image.mode, 'transparentFraction': round(histogram[0] / pixels, 4),
        'semiTransparentFraction': round(sum(histogram[1:255]) / pixels, 4),
        'borderMaximumAlpha': max(border), 'visibleBoundsAlphaAbove8': list(bounds),
        'result': 'pass',
    }
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps([{'id': a['id'], 'size': [a['width'], a['height']], 'alpha': a['alphaCheck']['result']} for a in manifest['assets']], ensure_ascii=False))
