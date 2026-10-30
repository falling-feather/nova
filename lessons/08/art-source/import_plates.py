from pathlib import Path
import json, shutil, hashlib
from PIL import Image

root = Path(__file__).resolve().parents[1]
jobs = json.loads((root / 'art-source/plate-jobs.json').read_text(encoding='utf-8'))
plate_dir = root / 'public/ui'
plate_dir.mkdir(exist_ok=True)
records = []
plates = {}
for job in jobs:
    identity = job['id']
    src = Path(job['generated'])
    original = root / job.get('original', f'art-source/plate-{identity}.png')
    if not original.exists():
        shutil.copy2(src, original)
    target = plate_dir / f'plate-{identity}.webp'
    with Image.open(original) as im:
        size = im.size
        if not target.exists() or original.stat().st_mtime > target.stat().st_mtime:
            im.save(target, 'WEBP', quality=93, method=6)
    plates[identity] = {'file': f'/ui/plate-{identity}.webp', 'width': size[0], 'height': size[1]}
    records.append({**job, 'tool': '内置 image_gen.imagegen', 'original': str(original.relative_to(root)).replace(chr(92), '/'), 'webp': str(target.relative_to(root)).replace(chr(92), '/'), 'width': size[0], 'height': size[1], 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'conversion': 'Pillow WebP quality=93, method=6; format conversion only, no resize or redraw'})
(plate_dir / 'plates.json').write_text(json.dumps(plates, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(root / 'docs/美术来源.json').write_text(json.dumps({'version': 1, 'purpose': '以确认设计图逐页编辑得到的无字场景与纸页底板，实验图像和所有交互由前端叠加', 'assets': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'imported': list(plates), 'total': len(plates)}, ensure_ascii=False))
