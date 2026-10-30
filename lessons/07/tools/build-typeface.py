"""Bake the bundled OFL font's outlines for the raised, real-geometry typefaces."""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parents[1]
font = TTFont(root / "public/fonts/tc-serif-600.woff2")
glyph_set = font.getGlyphSet()
scale = 1000 / font["head"].unitsPerEm

class Outline(BasePen):
    def __init__(self):
        super().__init__(glyph_set)
        self.commands = []
    def points(self, points):
        return " ".join(str(round(v * scale, 2)) for p in points for v in p)
    def _moveTo(self, p):
        self.start = p
        self.commands.append("m " + self.points([p]))
    def _lineTo(self, p): self.commands.append("l " + self.points([p]))
    def _qCurveToOne(self, control, end): self.commands.append("q " + self.points([end, control]))
    def _curveToOne(self, c1, c2, end): self.commands.append("b " + self.points([end, c1, c2]))
    def _closePath(self): self.commands.append("l " + self.points([self.start]))

glyphs = {}
for code, name in font.getBestCmap().items():
    pen, bounds = Outline(), BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    glyph_set[name].draw(bounds)
    box = bounds.bounds or (0, 0, 0, 0)
    glyphs[chr(code)] = {"ha": round(glyph_set[name].width * scale, 2), "x_min": round(box[0] * scale, 2), "x_max": round(box[2] * scale, 2), "o": " ".join(pen.commands)}
data = {"glyphs": glyphs, "familyName": "Workshop Serif Outlines", "resolution": 1000, "ascender": 1000, "descender": -200, "underlinePosition": -100, "underlineThickness": 50, "boundingBox": {"xMin": -100, "xMax": 1100, "yMin": -200, "yMax": 1000}, "license": "SIL Open Font License 1.1; see OFL.txt"}
target = root / "public/fonts/typeface.json"
target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Baked {len(glyphs)} glyphs, {target.stat().st_size:,} bytes")
