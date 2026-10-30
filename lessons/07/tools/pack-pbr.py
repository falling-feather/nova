"""Lossless format conversion only; no resize, grading, or generated surface data."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest_path = root / "source-assets/pbr.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
original_bytes = runtime_bytes = 0
catalog = {}
for record in manifest["records"]:
    for asset in record["assets"]:
        path = Path(asset["file"])
        if path.suffix != ".jpg":
            original_bytes += asset["bytes"]
            runtime_bytes += asset["bytes"]
            continue
        source = root / "source-assets/pbr" / path.name
        target = root / "public/textures/pbr" / (path.stem + ".webp")
        if hashlib.sha256(source.read_bytes()).hexdigest() != asset["sha256"]:
            raise ValueError(f"Source checksum changed: {source.name}")
        with Image.open(source) as raw:
            pixels = raw.convert("RGB")
            if not target.exists():
                pixels.save(target, "WEBP", lossless=True, method=6)
            with Image.open(target) as packed:
                if packed.convert("RGB").tobytes() != pixels.tobytes():
                    raise ValueError(f"Pixel mismatch: {target.name}")
            dimensions = list(pixels.size)
        encoding = "lossless WebP; decoded RGB pixels unchanged"
        if target.stat().st_size >= source.stat().st_size:
            candidate = target.resolve()
            if not candidate.is_relative_to((root / "public/textures/pbr").resolve()):
                raise ValueError("Generated texture escaped the runtime directory")
            target.unlink()
            target = root / "public/textures/pbr" / source.name
            shutil.copyfile(source, target)
            encoding = "original JPEG; byte-for-byte copy"
        asset["file"] = source.relative_to(root).as_posix()
        asset["runtime"] = {"file": target.relative_to(root).as_posix(), "bytes": target.stat().st_size,
                            "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                            "dimensions": dimensions, "encoding": encoding}
        material,channel = path.stem.split("-",1)
        catalog.setdefault(material,{})[channel]=target.name
        original_bytes += asset["bytes"]
        runtime_bytes += asset["runtime"]["bytes"]
manifest["runtimeBytes"] = runtime_bytes
manifest["sourceBytes"] = original_bytes
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
(root / "public/textures/pbr/catalog.json").write_text(json.dumps(catalog,separators=(",",":")),encoding="utf-8")
print(json.dumps({"sourceBytes": original_bytes, "runtimeBytes": runtime_bytes, "pixelsUnchanged": True}))
