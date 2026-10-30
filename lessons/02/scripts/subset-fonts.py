"""Subset the museum serif to the characters the museum actually prints.

Usage (optional asset step; normal start/build never needs it):
    python scripts/subset-fonts.py [path/to/NotoSerifSC-VF.ttf]

Writes public/fonts/tc-serif-{400,600}.woff2 and tc-serif.chars.txt. Re-run it
after editing any text: tests/font-coverage.test.js fails while a printed
character is missing from the subset. The regular weight carries every printed
character; the semibold weight only what can be set bold: everything outside
the long articles, plus their section headings and explicitly emphasized spans. Needs fontTools and
brotli (pip install fonttools brotli).

The source is Noto Serif SC (SIL Open Font License 1.1, (c) Adobe, Reserved Font
Name "Source"). The subset is a Modified Version, so it is renamed and ships
with OFL.txt.
"""

import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Windows\Fonts\NotoSerifSC-VF.ttf")
OUT = ROOT / "public" / "fonts"
FAMILY = "Thought Court Serif"
WEIGHTS = {400: "Regular", 600: "SemiBold"}
# Punctuation and figures that copy may need even before it is written.
EXTRA = "，。、；：？！“”‘’（）《》〈〉「」『』【】—…·・×→←↗↓↑〇一二三四五六七八九十百千年月日第厅号"


ARTICLES = ROOT / "src" / "content" / "articles"


def printed_characters(bold=False):
    files = [ROOT / "index.html"] + [
        p for p in (ROOT / "src").rglob("*") if p.suffix in {".js", ".json", ".css", ".html"}
    ]
    chars = set(EXTRA)
    for path in files:
        text = path.read_text(encoding="utf-8")
        if bold and ARTICLES in path.parents:
            # Body emphasis is curated in the same article source as its prose.
            text = "".join(line for line in text.splitlines() if line.lstrip().startswith("## ")) + "".join(re.findall(r"\*\*(.+?)\*\*", text))
        chars |= set(text)
    chars |= {chr(c) for c in range(0x20, 0x7F)}
    # isprintable() rejects the ideographic space, which CJK layout uses.
    return sorted(c for c in chars if c.isprintable() or c == chr(0x3000))


def rename(font, style):
    names = font["name"]
    full = f"{FAMILY} {style}"
    for record in list(names.names):
        if record.nameID in (1, 3, 4, 6, 16, 17, 25):
            names.removeNames(nameID=record.nameID)
    for name_id, value in {
        1: FAMILY,
        2: "Regular",
        3: f"{full}; subset of Noto Serif SC 2.02",
        4: full,
        6: full.replace(" ", ""),
    }.items():
        names.setName(value, name_id, 3, 1, 0x409)
        names.setName(value, name_id, 1, 0, 0)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    chars = printed_characters()
    text = "".join(chars)
    for weight, style in WEIGHTS.items():
        subset_chars = chars if weight == 400 else printed_characters(bold=True)
        font = TTFont(SOURCE)
        if "fvar" in font:
            font = instancer.instantiateVariableFont(font, {"wght": weight})
        options = subset.Options()
        options.layout_features = ["kern", "palt", "halt", "locl", "ccmp", "vert", "vrt2"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.hinting = False
        options.desubroutinize = True
        options.flavor = "woff2"
        subsetter = subset.Subsetter(options)
        subsetter.populate(text="".join(subset_chars))
        subsetter.subset(font)
        rename(font, style)
        font.flavor = "woff2"
        target = OUT / f"tc-serif-{weight}.woff2"
        font.save(target)
        print(f"{target.name}: {target.stat().st_size / 1024:.0f} KB, {len(subset_chars)} characters")
    (OUT / "tc-serif.chars.txt").write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
