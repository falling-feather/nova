from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

root=Path(__file__).resolve().parents[1]
source=Path('C:/Windows/Fonts/NotoSerifSC-VF.ttf')
chars=set('，。、；：？！“”‘’（）《》【】—…·×→←↗↓↑✓⌁〇一二三四五六七八九十百千年月日第站环节')
for file in [root/'index.html',*(root/'src').rglob('*.ts'),*(root/'src').rglob('*.css')]:
    chars.update(file.read_text(encoding='utf-8'))
chars.update(chr(i) for i in range(32,127))
for weight in (400,600):
    font=TTFont(source)
    instancer.instantiateVariableFont(font,{'wght':weight},inplace=True)
    options=subset.Options();options.flavor='woff2';options.layout_features=['*'];options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
    worker=subset.Subsetter(options=options);worker.populate(text=''.join(c for c in chars if c.isprintable()));worker.subset(font)
    names=font['name']
    for nid in (1,3,4,6,16,17,25):names.removeNames(nameID=nid)
    family='Tides Serif';style='Regular' if weight==400 else 'SemiBold'
    for nid,value in {1:family,2:style,3:f'{family} {style}; Noto Serif SC subset',4:f'{family} {style}',6:f'TidesSerif-{style}'}.items():
        names.setName(value,nid,3,1,0x409)
    font.flavor='woff2';font.save(root/'public/fonts'/f'tide-serif-{weight}.woff2')
print(f'Created Tides Serif subsets: {len(chars)} characters, weights 400/600')
