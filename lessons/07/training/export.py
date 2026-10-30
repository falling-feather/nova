"""把训练好的两个模型导出给网页，并生成一致性测试用的样例。

    D:\\nova-ml\\venv\\Scripts\\python.exe export.py

输出：
    public/models/council.bin|json   议事厅的双向模型（完形填空）
    public/models/press.bin|json     排印车间的单向模型（接龙）
    public/models/basket.json        铸字房的“一筐旧报纸”（语料里抽出的句子）
    tests/fixtures/*-parity.json     网页推理与 PyTorch 的对照样例

权重以 float16 存储；样例输出也用 float16 取整后的权重计算，网页端读到的就是同一组数。
"""
import json
import random
from pathlib import Path

import numpy as np
import torch

from bpe import Tokenizer
from model import TinyLM

HERE = Path(__file__).resolve().parent
CHAPTER = HERE.parent
MODELS = CHAPTER / "public" / "models"
FIXTURES = CHAPTER / "tests" / "fixtures"
NAMES = {"mlm": "council", "causal": "press"}


def load(kind):
    ck = torch.load(HERE / "checkpoints" / f"{kind}.pt", map_location="cpu")
    model = TinyLM(**ck["config"])
    model.load_state_dict(ck["state"])
    with torch.no_grad():  # 与网页一致：权重先取整到 float16
        for p in model.parameters():
            p.copy_(p.half().float())
    return model.eval(), ck["step"]


def export_weights(model, name, step):
    tensors, blobs, offset = [], [], 0
    for key, value in model.state_dict().items():
        arr = value.detach().cpu().numpy().astype(np.float16).ravel()
        tensors.append({"name": key, "shape": list(value.shape), "offset": offset, "length": int(arr.size)})
        blobs.append(arr.tobytes())
        offset += arr.nbytes
    (MODELS / f"{name}.bin").write_bytes(b"".join(blobs))
    meta = {"name": name, "config": model.config, "dtype": "float16", "file": f"{name}.bin", "trainedSteps": step,
            "params": int(sum(p.numel() for p in model.parameters())), "tensors": tensors}
    (MODELS / f"{name}.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {meta['params']:,} 个参数，{offset / 1024:.0f} KB")


def fixtures(model, name, tok, texts, mask_first=None):
    cases = []
    with torch.no_grad():
        for text in texts:
            ids = tok.encode(text)
            if model.causal:
                ids = [3] + ids
            at = list(range(len(ids)))
            if mask_first and mask_first in tok.tokens(text):
                ids[tok.tokens(text).index(mask_first)] = 2
            logits, states, attns = model(torch.tensor([ids]), return_all=True)
            cases.append({
                "text": text, "ids": ids,
                "logits": {str(i): [round(float(v), 5) for v in logits[0, i]] for i in at[-2:]},
                "attention": [[[[round(float(v), 6) for v in row] for row in head] for head in layer[0]] for layer in attns],
                "finalState": [round(float(v), 5) for v in states[-1][0, -1]],
            })
    FIXTURES.mkdir(parents=True, exist_ok=True)
    (FIXTURES / f"{name}-parity.json").write_text(json.dumps({"model": name, "cases": cases}, ensure_ascii=False), encoding="utf-8")


def basket(tok):
    # 与分词器的训练材料同比例：单句与段落都抽一些
    lines = (HERE / "corpus" / "sentences.txt").read_text(encoding="utf-8").splitlines()
    paras = (HERE / "corpus" / "paragraphs.txt").read_text(encoding="utf-8").splitlines()
    r = random.Random(7)
    sample = r.sample(lines, 2000) + r.sample(paras, 1000)
    r.shuffle(sample)
    (MODELS / "basket.json").write_text(json.dumps({"lines": sample}, ensure_ascii=False), encoding="utf-8")
    return sample


def main():
    data = json.loads((MODELS / "tokenizer.json").read_text(encoding="utf-8"))
    tok = Tokenizer(data)
    for kind, name in NAMES.items():
        path = HERE / "checkpoints" / f"{kind}.pt"
        if not path.exists():
            print("跳过（尚未训练）：", kind)
            continue
        model, step = load(kind)
        export_weights(model, name, step)
        if kind == "mlm":
            fixtures(model, name, tok, ["我的苹果屏幕摔裂了。", "哥哥把伞借给了妹妹，因为她忘了带伞。"], mask_first="她")
        else:
            fixtures(model, name, tok, ["校庆当天，合唱团", "外面下雨了，"])
    sample = basket(tok)
    texts = sample[:40] + ["我的苹果屏幕摔裂了。", "司马光砸缸救出了小伙伴。", "Nova 来到了印书局！", "饕餮和貔貅", "小明把伞借给了小红，因为她忘了带伞。"]
    FIXTURES.mkdir(parents=True, exist_ok=True)
    (FIXTURES / "tokenizer.json").write_text(json.dumps({
        "cases": [{"text": t, "merges": k, "tokens": Tokenizer(data, k).tokens(t), "ids": Tokenizer(data, k).encode(t)} for t in texts for k in (0, 120, data["modelMerges"], 1000)],
    }, ensure_ascii=False), encoding="utf-8")
    # 核对：在这一筐报纸上按同样规则铸十轮，与字架上的前十轮对照（网页里显示的就是这一筐的结果）
    from bpe import train
    small = train(sample, 10)
    same = sum(1 for a, b in zip(small["merges"], data["merges"]) if a == b)
    print(f"一筐报纸的前十轮铸字与完整字架一致 {same}/10：", " ".join(a + b for a, b in small["merges"]))


if __name__ == "__main__":
    main()
