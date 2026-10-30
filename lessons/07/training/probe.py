"""实测议事厅模型：词义地图怎么摆、“苹果”的名牌往哪边漂、代词在听谁、各个记录员（注意力头）的习惯。

    D:\\nova-ml\\venv\\Scripts\\python.exe probe.py

结果写入 training/runs/probe.json（不入库），并生成 public/models/name-map.json（词义地图，入库）。
课程文案里关于某个头、某句话的说法，以这里的实测为准。
"""
import json
from pathlib import Path

import numpy as np
import torch

from bpe import Tokenizer
from export import load

HERE = Path(__file__).resolve().parent
CHAPTER = HERE.parent
MODELS = CHAPTER / "public" / "models"

CLUSTERS = {
    "fruit": ("水果", ["香蕉", "梨", "橘子", "西瓜", "葡萄", "草莓", "桃子"]),
    "device": ("电子产品", ["手机", "平板", "电脑", "耳机", "相机", "手表"]),
    "animal": ("动物", ["小猫", "小狗", "兔子", "小鸟", "熊猫", "金鱼", "松鼠", "乌龟"]),
    "weather": ("天气", ["晴天", "雨天", "下雪", "刮风", "打雷", "彩虹", "乌云"]),
    "school": ("学校", ["教室", "黑板", "作业", "考试", "课本", "铅笔", "书包"]),
    "vehicle": ("交通", ["自行车", "公交车", "地铁", "汽车", "火车", "轮船", "飞机"]),
    "food": ("食物", ["面包", "米饭", "牛奶", "饺子", "面条", "鸡蛋", "包子"]),
    "people": ("家人", ["哥哥", "姐姐", "爸爸", "妈妈", "爷爷", "奶奶", "妹妹", "弟弟"]),
}
APPLE_PAIRS = [
    ("我的苹果屏幕摔裂了。", "我的苹果削了皮。"),
    ("小明用苹果拍了一张照片。", "小明吃了一个苹果。"),
    ("苹果没电了，得赶快充电。", "苹果洗干净再吃。"),
    ("妹妹的苹果开不了机了。", "妹妹把苹果切成了小块。"),
]
PRONOUN_CASES = [
    ("小明把伞借给了小红，因为她忘了带伞。", "她", "小红", "小明"),
    ("小红把伞借给了小明，因为他忘了带伞。", "他", "小明", "小红"),
    ("哥哥把伞借给了妹妹，因为他多带了一把。", "他", "哥哥", "妹妹"),
    ("哥哥给妹妹讲故事，她听得很认真。", "她", "妹妹", "哥哥"),
    ("哥哥给妹妹讲故事，他讲得很生动。", "他", "哥哥", "妹妹"),
    ("奶奶请爷爷帮忙，因为她搬不动箱子。", "她", "奶奶", "爷爷"),
    ("爸爸帮妈妈搬箱子，她说了声谢谢。", "她", "妈妈", "爸爸"),
    ("姐姐今天很开心，因为她考了一百分。", "她", "姐姐", None),
]
DISTRACT = [
    ("哥哥把伞借给了妹妹，因为她忘了带伞。", "哥哥把伞借给了妹妹，外面刮风了，树叶沙沙作响，因为她忘了带伞。", "她", "妹妹"),
    ("我的苹果屏幕摔裂了。", "我的苹果，昨天下午在操场上，屏幕摔裂了。", "苹果", "屏幕"),
]


def run(model, tok, text):
    toks = tok.tokens(text)
    ids = [tok.ids.get(t, 1) for t in toks]
    with torch.no_grad():
        logits, states, attns = model(torch.tensor([ids]), return_all=True)
    return toks, ids, logits[0], [s[0].numpy() for s in states], [a[0].numpy() for a in attns]


def tsne(X, perplexity=8.0, iters=1500, seed=0):
    """小规模 t-SNE：按名牌之间的余弦距离，把几十个词摆到平面上。固定种子，结果可复现。"""
    Xn = X / np.linalg.norm(X, axis=1, keepdims=True)
    D = np.sqrt(np.maximum(0, 2 - 2 * Xn @ Xn.T))
    n = len(D)
    rng = np.random.default_rng(seed)
    P = np.zeros((n, n))
    for i in range(n):
        lo, hi = 1e-3, 1e3
        for _ in range(60):
            beta = (lo + hi) / 2
            p = np.exp(-D[i] ** 2 * beta)
            p[i] = 0
            p /= p.sum() + 1e-12
            H = -(p[p > 0] * np.log(p[p > 0])).sum()
            lo, hi = (beta, hi) if H > np.log(perplexity) else (lo, beta)
        P[i] = p
    P = (P + P.T) / (2 * n)
    Y = rng.normal(0, 1e-2, (n, 2))
    vel = np.zeros_like(Y)
    for it in range(iters):
        d2 = ((Y[:, None] - Y[None]) ** 2).sum(-1)
        Q = 1 / (1 + d2)
        np.fill_diagonal(Q, 0)
        Qn = Q / (Q.sum() + 1e-12)
        G = 4 * ((((P * (4 if it < 200 else 1)) - Qn) * Q)[:, :, None] * (Y[:, None] - Y[None])).sum(1)
        vel = (0.5 if it < 250 else 0.8) * vel - 100 * G
        Y += vel
    return Y


def main():
    tok = Tokenizer(json.loads((MODELS / "tokenizer.json").read_text(encoding="utf-8")))
    model, _ = load("mlm")
    E = model.tok.weight.detach().numpy()
    report = {}

    # ---- 词义地图：名牌（词向量）按分组做线性判别投影
    words, labels = [], []
    for key, (_, ws) in CLUSTERS.items():
        for w in ws:
            assert w in tok.ids, w
            words.append(w)
            labels.append(key)
    words.append("苹果")
    labels.append("both")
    X = np.stack([E[tok.ids[w]] for w in words])
    P = tsne(X)
    lo, hi = P.min(0), P.max(0)
    norm = lambda p: ((p - lo) / (hi - lo)).tolist()
    entries = [{"text": w, "id": tok.ids[w], "cluster": c, "x": round(norm(P[i])[0], 4), "y": round(norm(P[i])[1], 4)} for i, (w, c) in enumerate(zip(words, labels))]
    X, words, labels = X[:-1], words[:-1], labels[:-1]
    centers = {}
    for key, (name, _) in CLUSTERS.items():
        pts = np.array([[e["x"], e["y"]] for e in entries if e["cluster"] == key])
        centers[key] = {"key": key, "name": name, "x": round(float(pts[:, 0].mean()), 4), "y": round(float(pts[:, 1].mean()), 4)}
    sim = lambda a, b: float(np.dot(a, b) / np.linalg.norm(a) / np.linalg.norm(b))
    cent = {k: np.mean([E[tok.ids[w]] for w in ws], 0) for k, (_, ws) in CLUSTERS.items()}
    report["apple_static"] = {k: round(sim(E[tok.ids["苹果"]], v), 3) for k, v in cent.items()}
    # 簇内与簇间的平均相似度（检查名牌是否真的按意思聚拢）
    within, across = [], []
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            (within if labels[i] == labels[j] else across).append(sim(X[i], X[j]))
    report["similarity_within_vs_across"] = [round(float(np.mean(within)), 3), round(float(np.mean(across)), 3)]

    # ---- “苹果”在句子里：各层的名牌与两组词中心的相似度、在同一投影上的位置
    drift = []
    layer_centroids = {}
    for layer in range(1, 5):  # 各层里，两组词在自己常见句子中的平均名牌
        acc = {"fruit": [], "device": []}
        for s in ["这个{}又甜又脆。", "我在超市买了两斤{}。", "妈妈把{}洗干净，切成了小块。", "小明吃了一个{}。", "桌上的果盘里放着{}。"]:
            for w in CLUSTERS["fruit"][1]:
                toks, ids, _, states, _ = run(model, tok, s.format(w))
                if w in toks:
                    acc["fruit"].append(states[layer][toks.index(w)])
        for s in ["我的{}屏幕摔裂了。", "{}没电了，得赶快充电。", "我用{}拍了一张照片。", "小明买了一部{}。", "{}开不了机了，只好拿去修。"]:
            for w in ["手机", "平板", "电脑", "相机", "手表"]:
                toks, ids, _, states, _ = run(model, tok, s.format(w))
                if w in toks:
                    acc["device"].append(states[layer][toks.index(w)])
        layer_centroids[layer] = {k: np.mean(v, 0) for k, v in acc.items()}
    for phone, fruit in APPLE_PAIRS:
        row = {"phone": phone, "fruit": fruit, "layers": []}
        tp = run(model, tok, phone)
        tf = run(model, tok, fruit)
        for layer in range(0, 5):
            vp = tp[3][layer][tp[0].index("苹果")]
            vf = tf[3][layer][tf[0].index("苹果")]
            item = {"layer": layer}
            if layer:
                c = layer_centroids[layer]
                item["phone_ctx"] = {k: round(sim(vp, v), 3) for k, v in c.items()}
                item["fruit_ctx"] = {k: round(sim(vf, v), 3) for k, v in c.items()}
            row["layers"].append(item)
        drift.append(row)
    report["apple_drift"] = drift

    # ---- 代词在听谁
    pron = []
    for text, p, ref, other in PRONOUN_CASES:
        toks, ids, logits, states, attns = run(model, tok, text)
        i = toks.index(p)
        heads = []
        for l, a in enumerate(attns):
            for h in range(a.shape[0]):
                heads.append({"l": l, "h": h, "ref": round(float(a[h, i, toks.index(ref)]), 3),
                              "other": round(float(a[h, i, toks.index(other)]), 3) if other else None})
        masked = list(ids)
        masked[i] = 2
        with torch.no_grad():
            pm = torch.softmax(model(torch.tensor([masked]))[0, i], -1)
        best = max(heads, key=lambda d: d["ref"] - (d["other"] or 0))
        pron.append({"text": text, "tokens": toks, "best_head": best, "mean_ref": round(float(np.mean([d["ref"] for d in heads])), 3),
                     "mean_other": round(float(np.mean([d["other"] or 0 for d in heads])), 3),
                     "fill": {"他": round(float(pm[tok.ids["他"]]), 3), "她": round(float(pm[tok.ids["她"]]), 3)}})
    report["pronoun"] = pron

    # ---- 插入无关的话
    report["distract"] = []
    for base, noisy, who, clue in DISTRACT:
        out = {}
        for name, text in (("base", base), ("noisy", noisy)):
            toks, ids, _, _, attns = run(model, tok, text)
            i, j = toks.index(who), toks.index(clue)
            out[name] = {"tokens": toks, "to_clue_mean": round(float(np.mean([a[:, i, j].mean() for a in attns])), 3),
                         "to_clue_by_layer": [round(float(a[:, i, j].max()), 3) for a in attns]}
        report["distract"].append(out)

    # ---- 记录员的习惯：对一批句子统计每个头平均听“左边一位”“右边一位”“自己”“标点”的比例
    lines = json.loads((MODELS / "basket.json").read_text(encoding="utf-8"))["lines"][:400]
    stats = np.zeros((4, 4, 5))
    count = 0
    for s in lines:
        if not 4 <= len(tok.tokens(s)) <= model.config["context"]:
            continue
        toks, ids, _, _, attns = run(model, tok, s)
        n = len(toks)
        count += 1
        punct = np.array([t in "，。！？、" for t in toks])
        for l, a in enumerate(attns):
            for h in range(4):
                A = a[h]
                stats[l, h, 0] += np.mean([A[i, i - 1] for i in range(1, n)])
                stats[l, h, 1] += np.mean([A[i, i + 1] for i in range(n - 1)])
                stats[l, h, 2] += np.mean(np.diag(A))
                stats[l, h, 3] += A[:, punct].sum(1).mean() if punct.any() else 0
                stats[l, h, 4] += float(-(A * np.log(A + 1e-9)).sum(1).mean())
    stats /= count
    report["heads"] = [[{"prev": round(float(stats[l, h, 0]), 3), "next": round(float(stats[l, h, 1]), 3), "self": round(float(stats[l, h, 2]), 3),
                         "punct": round(float(stats[l, h, 3]), 3), "entropy": round(float(stats[l, h, 4]), 3)} for h in range(4)] for l in range(4)]

    (HERE / "runs").mkdir(exist_ok=True)
    (HERE / "runs" / "probe.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    senses = {k: {"name": CLUSTERS[k][0], "layers": [[round(float(v), 5) for v in cent[k]]] + [[round(float(v), 5) for v in layer_centroids[l][k]] for l in range(1, 5)]}
              for k in ("fruit", "device")}
    (MODELS / "name-map.json").write_text(json.dumps({
        "senses": senses,
        "sensesMethod": "第 0 层是名牌（词向量）的组中心；第 1–4 层是水果词、电子产品词在各自常见句子里开完这一层会以后的平均名牌。",
        "method": "按议事厅模型名牌（词向量）之间的相似度，用 t-SNE 把词摆在平面上：名牌越像，站得越近。只有附近的远近有意义，两组之间隔多远不说明什么。",
        "words": entries, "clusters": list(centers.values()),
    }, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("apple_static", "similarity_within_vs_across")}, ensure_ascii=False))
    for row in drift:
        print(row["phone"], "/", row["fruit"])
        for it in row["layers"]:
            print("  层", it["layer"], it.get("phone_ctx", ""), it.get("fruit_ctx", ""))
    for p in pron:
        print(p["text"], "最清楚的头", p["best_head"], "平均", p["mean_ref"], p["mean_other"], "遮住后", p["fill"])
    print(json.dumps(report["distract"], ensure_ascii=False))
    for l in range(4):
        print("层", l, [f"左{d['prev']:.2f} 右{d['next']:.2f} 自{d['self']:.2f} 标点{d['punct']:.2f} 熵{d['entropy']:.2f}" for d in report["heads"][l]])


if __name__ == "__main__":
    main()
