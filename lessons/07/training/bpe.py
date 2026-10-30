"""在《晨风语料》上训练字节对合并（BPE）分词器，也就是印书局的“铸字”。

规则（网页端 src/model/tokenizer.ts 与 src/model/bpe.ts 用同一套规则）：
1. 标点与空白各自单独成块，不参与合并；其余连续的字组成一个片段。
2. 片段先按小词典（words.json）做正向最长匹配，切成一个个“词”；铸字只在词的内部进行，不跨词合并。
3. 起始字架：语料里出现过的每个字各一块，再加 ASCII 字母和数字。字架上没有的字记作 [UNK]。
4. 每一轮统计所有词里相邻两块一起出现的次数（按出现次数加权），
   把次数最多的一对铸成新的一块；次数相同时，取两块拼起来后按字符编码排在前面的那一对。
5. 新块最多 4 个字；“他、她、它”始终单独成块。
6. 编码时按合并的先后顺序，反复把词里排序最靠前的相邻对合并，直到没有可合并的对。

字架保存前 TOTAL_MERGES 轮（铸字房“字架放多大”在这个范围里调），两个模型使用前 MODEL_MERGES 轮。

用法（先运行 words.py 生成小词典）：
    D:\\nova-ml\\venv\\Scripts\\python.exe bpe.py
"""
import json
import time
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHAPTER = HERE.parent
PUNCT = set("，。！？、：；“”‘’（）《》—…·「」『』,.!?:;\"'()[]<>-~ \t\n")
SPECIALS = ["[PAD]", "[UNK]", "[MASK]", "[BOS]", "[EOS]"]
TOTAL_MERGES = 1200
MODEL_MERGES = 640
MAX_PIECE = 4
STANDALONE = set("他她它")
ASCII = [chr(c) for c in range(ord("a"), ord("z") + 1)] + [chr(c) for c in range(ord("A"), ord("Z") + 1)] + list("0123456789")


def load_words():
    data = json.loads((CHAPTER / "public" / "models" / "words.json").read_text(encoding="utf-8"))
    return set(data["words"]), data["maxWord"]


WORDS, MAX_WORD = load_words()


def segment(text, words=None, max_word=None):
    """正向最长匹配：从左到右，每次取词典里最长的词，匹配不上就取一个字。"""
    words = WORDS if words is None else words
    max_word = MAX_WORD if max_word is None else max_word
    out, i = [], 0
    while i < len(text):
        for size in range(min(max_word, len(text) - i), 1, -1):
            if text[i:i + size] in words:
                out.append(text[i:i + size])
                i += size
                break
        else:
            out.append(text[i])
            i += 1
    return out


def pieces(text):
    """切成片段与标点；返回 (片段文本, 是否可合并)。"""
    out, buf = [], []
    for ch in text:
        if ch in PUNCT:
            if buf:
                out.append(("".join(buf), True))
                buf = []
            if not ch.isspace():
                out.append((ch, False))
        else:
            buf.append(ch)
    if buf:
        out.append(("".join(buf), True))
    return out


def train(lines, merges_wanted):
    word_counts, char_counts = Counter(), Counter()
    for line in lines:
        for text, mergeable in pieces(line):
            char_counts.update(text)
            if mergeable:
                word_counts.update(segment(text))
    base = sorted(char_counts, key=lambda ch: (-char_counts[ch], ch))
    for ch in ASCII:
        if ch not in char_counts:
            base.append(ch)
    words = [[list(w), n] for w, n in word_counts.items() if len(w) > 1]
    pair_counts = Counter()
    where = defaultdict(set)  # 哪些词含有这一对，增量更新时只重算它们
    for i, (syms, n) in enumerate(words):
        for a, b in zip(syms, syms[1:]):
            pair_counts[a, b] += n
            where[a, b].add(i)
    merges = []
    t0 = time.time()
    while len(merges) < merges_wanted:
        best = None
        for (a, b), n in pair_counts.items():
            if n <= 0 or len(a) + len(b) > MAX_PIECE or STANDALONE & set(a + b):
                continue
            key = (-n, a + b)
            if best is None or key < best[0]:
                best = (key, (a, b))
        if best is None:
            break
        a, b = best[1]
        merges.append([a, b])
        merged = a + b
        for i in list(where[a, b]):
            syms, n = words[i]
            for x, y in zip(syms, syms[1:]):
                pair_counts[x, y] -= n
            out, j = [], 0
            while j < len(syms):
                if j + 1 < len(syms) and syms[j] == a and syms[j + 1] == b:
                    out.append(merged)
                    j += 2
                else:
                    out.append(syms[j])
                    j += 1
            words[i][0] = out
            for x, y in zip(out, out[1:]):
                pair_counts[x, y] += n
                where[x, y].add(i)
        del pair_counts[a, b]
        where.pop((a, b), None)
    vocab = SPECIALS + base + [a + b for a, b in merges]
    print(f"合并 {len(merges)} 轮，用时 {time.time() - t0:.1f} 秒；字架共 {len(vocab)} 块（起始单字 {len(base)} 块）")
    return {"version": 2, "modelMerges": min(MODEL_MERGES, len(merges)), "maxPiece": MAX_PIECE, "standalone": "".join(sorted(STANDALONE)),
            "specials": SPECIALS, "baseCount": len(base), "vocab": vocab, "merges": merges}


class Tokenizer:
    def __init__(self, data, merges_used=None):
        self.data = data
        k = data["modelMerges"] if merges_used is None else merges_used
        self.merges = data["merges"][:k]
        self.rank = {(a, b): i for i, (a, b) in enumerate(self.merges)}
        self.vocab = data["vocab"][: len(data["specials"]) + data["baseCount"] + k]
        self.ids = {t: i for i, t in enumerate(self.vocab)}
        self.unk = self.ids["[UNK]"]

    def split_piece(self, text):
        syms = list(text)
        while len(syms) > 1:
            best, at = None, -1
            for j in range(len(syms) - 1):
                r = self.rank.get((syms[j], syms[j + 1]))
                if r is not None and (best is None or r < best):
                    best, at = r, j
            if best is None:
                break
            a, b = self.merges[best]
            out, j = [], 0
            while j < len(syms):
                if j + 1 < len(syms) and syms[j] == a and syms[j + 1] == b:
                    out.append(a + b)
                    j += 2
                else:
                    out.append(syms[j])
                    j += 1
            syms = out
        return syms

    def tokens(self, text):
        out = []
        for piece, mergeable in pieces(text):
            if mergeable:
                for word in segment(piece):
                    out.extend(self.split_piece(word))
            else:
                out.append(piece)
        return out

    def encode(self, text):
        return [self.ids.get(t, self.unk) for t in self.tokens(text)]

    def decode(self, ids):
        return "".join(self.vocab[i] for i in ids if i >= len(self.data["specials"]) or i == self.unk)


def main():
    lines = (HERE / "corpus" / "sentences.txt").read_text(encoding="utf-8").splitlines()
    lines += (HERE / "corpus" / "paragraphs.txt").read_text(encoding="utf-8").splitlines()
    data = train(lines, TOTAL_MERGES)
    out = CHAPTER / "public" / "models" / "tokenizer.json"
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("写入", out.relative_to(CHAPTER), f"{out.stat().st_size / 1024:.0f} KB")
    tok = Tokenizer(data)
    print(f"模型使用前 {data['modelMerges']} 轮合并，字架 {len(tok.vocab)} 块")
    for s in ["我的苹果屏幕摔裂了。", "我的苹果削了皮。", "小明把伞借给了小红，因为她忘了带伞。", "本周六，晨风中学举行了第六十届校庆。",
              "小猫追着老鼠跑，老鼠吓得躲了起来。", "爸爸开车送我上学。", "司马光砸缸救出了小伙伴。"]:
        print("   " + " | ".join(tok.tokens(s)))
    sample = lines[:20000]
    for k in (0, 150, 300, 640, 900, 1200):
        if k <= len(data["merges"]):
            t = Tokenizer(data, k)
            avg = sum(len(t.tokens(s)) for s in sample) / len(sample)
            print(f"合并 {k:5d} 轮：字架 {len(t.vocab):5d} 块，每行平均 {avg:5.1f} 块")


if __name__ == "__main__":
    main()
