"""整理“按词拆”的小词典：先用 jieba 给《晨风语料》分词，留下出现较多的词，再补上生成语料用到的词表。

    D:\\nova-ml\\venv\\Scripts\\python.exe words.py

输出 public/models/words.json。网页和分词器都只用这份词典做“正向最长匹配”，不依赖 jieba：
从句子开头起，每次取词典里能匹配上的最长的词，匹配不上就取一个字。
铸字（BPE）只在这样切出的词里面进行，不跨词合并。
"""
import json
from collections import Counter
from pathlib import Path

import jieba

import corpus as C

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "public" / "models" / "words.json"
MAX_WORD = 6
MIN_COUNT = 5


def main():
    jieba.setLogLevel(60)
    lines = (HERE / "corpus" / "sentences.txt").read_text(encoding="utf-8").splitlines()
    lines += (HERE / "corpus" / "paragraphs.txt").read_text(encoding="utf-8").splitlines()
    counts = Counter()
    for line in set(lines):
        counts.update(w for w in jieba.lcut(line) if 2 <= len(w) <= MAX_WORD)
    lexicon = set(C.MALE + C.FEMALE + C.PEOPLE + list(C.FRUITS) + list(C.DEVICES) + list(C.ANIMALS) + list(C.FOODS) + C.BALLS
                  + list(C.VEHICLES) + C.SCHOOL_THINGS + C.FLOWERS + C.PLACES + C.TIMES + list(C.LEND))
    lexicon |= {a[2] for a in C.ANIMALS.values()}
    words = {w for w, n in counts.items() if n >= MIN_COUNT} | {w for w in lexicon if 2 <= len(w) <= MAX_WORD}
    words = {w for w in words if not any(p in w for p in "他她它") and all("\u4e00" <= ch <= "\u9fff" for ch in w)}
    out = sorted(words, key=lambda w: (-len(w), w))
    OUT.write_text(json.dumps({"maxWord": MAX_WORD, "words": out}, ensure_ascii=False), encoding="utf-8")
    print(f"小词典 {len(out)} 个词，写入 {OUT.name}")


if __name__ == "__main__":
    main()
