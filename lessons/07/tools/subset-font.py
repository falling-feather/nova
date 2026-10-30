"""Build local OFL font subsets covering the complete course and trained vocabulary.
Download the upstream source to .work/NotoSerifSC-variable.ttf before running.
Source: https://github.com/google/fonts/tree/main/ofl/notoserifsc
"""
import json,re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
root=Path(__file__).resolve().parents[1]
original=root/".work/NotoSerifSC-variable.ttf"
text=(root/"public/models/tokenizer.json").read_text(encoding="utf-8")
text+="□ −×% · 活字印书局小雨小林雨伞昨天合计颗"
for path in (root/"src").rglob("*.ts"):
    text+=path.read_text(encoding="utf-8")
codepoints={ord(c) for c in text}|set(range(32,127))
for weight in [400,600]:
    font=TTFont(original)
    options=subset.Options();options.name_IDs=[0,1,2,3,4,5,6,13,14];options.name_legacy=True
    cut=subset.Subsetter(options=options);cut.populate(unicodes=codepoints);cut.subset(font)
    font=instantiateVariableFont(font,{"wght":weight},inplace=True)
    for record in font["name"].names:
        if record.nameID in [1,3,4,6]:
            record.string=("WorkshopSerif" if record.nameID==6 else "Workshop Serif").encode(record.getEncoding())
    font.flavor="woff2"
    target=root/f"public/fonts/tc-serif-{weight}.woff2"
    font.save(target)
    print(f"{weight}: {len(font.getBestCmap())} glyphs, {target.stat().st_size:,} bytes")
