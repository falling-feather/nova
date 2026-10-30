"""训练第七章的两个微型模型。

    D:\\nova-ml\\venv\\Scripts\\python.exe train.py mlm      议事厅：完形填空（双向）
    D:\\nova-ml\\venv\\Scripts\\python.exe train.py causal   排印车间：接龙（单向）

检查点写入 training/checkpoints/，日志写入 training/runs/（均不入库）。
训练中定期在检验句上测：代词填空、追逐句的语序填空、“苹果”在两种上下文里的猜测。
"""
import argparse
import json
import math
import random
import time
from pathlib import Path

import torch
from torch import nn

from bpe import Tokenizer
from model import TinyLM, count_params

HERE = Path(__file__).resolve().parent
CHAPTER = HERE.parent
CACHE, CKPT, RUNS = HERE / "cache", HERE / "checkpoints", HERE / "runs"
PAD, UNK, MASK, BOS, EOS = range(5)
FRUIT_WORDS = ["苹果", "香蕉", "梨", "橘子", "西瓜", "葡萄", "草莓", "桃子"]
DEVICE_WORDS = ["手机", "平板", "电脑", "耳机", "相机", "手表", "苹果"]

KINDS = {
    "mlm": dict(causal=False, context=48, steps=12000, batch=256, lr=2e-3),
    "causal": dict(causal=True, context=64, steps=14000, batch=192, lr=2e-3),
}


def load_tokenizer():
    data = json.loads((CHAPTER / "public" / "models" / "tokenizer.json").read_text(encoding="utf-8"))
    return Tokenizer(data)


def encoded(tok, name, lines, bos_eos, maxlen):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / f"{name}-{len(tok.vocab)}.pt"
    if path.exists():
        return torch.load(path)
    t0 = time.time()
    out = []
    for s in lines:
        ids = tok.encode(s)
        if bos_eos:
            ids = [BOS] + ids + [EOS]
        out.append(torch.tensor(ids[:maxlen], dtype=torch.int16))
    torch.save(out, path)
    print(f"编码 {name}：{len(out)} 行，用时 {time.time() - t0:.0f} 秒")
    return out


def pad_batch(seqs, device):
    n = max(len(s) for s in seqs)
    x = torch.full((len(seqs), n), PAD, dtype=torch.long)
    for i, s in enumerate(seqs):
        x[i, : len(s)] = s.long()
    return x.to(device)


def mask_tokens(x, vocab, gen):
    pad = x == PAD
    sel = (torch.rand(x.shape, device=x.device, generator=gen) < 0.15) & ~pad
    lengths = (~pad).sum(1)
    forced = (torch.rand(len(x), device=x.device, generator=gen) * lengths).long()
    sel[torch.arange(len(x)), forced] = True  # 每句至少遮一块
    labels = torch.where(sel, x, torch.full_like(x, -100))
    r = torch.rand(x.shape, device=x.device, generator=gen)
    inp = x.clone()
    inp[sel & (r < 0.8)] = MASK
    rand = torch.randint(5, vocab, x.shape, device=x.device, generator=gen)
    swap = sel & (r >= 0.8) & (r < 0.9)
    inp[swap] = rand[swap]
    return inp, labels, pad


# ---------------------------------------------------------------- 检验
def eval_rows():
    return [json.loads(l) for l in (HERE / "corpus" / "eval.jsonl").read_text(encoding="utf-8").splitlines()]


@torch.no_grad()
def mlm_probe(model, tok, device):
    """在检验句上做完形填空：代词、追逐句里被追的一方、“苹果”的两种上下文。"""
    model.eval()
    ids_of = tok.ids
    res = {}
    groups = {}
    for row in eval_rows():
        toks = tok.tokens(row["text"])
        tag = row["tag"]
        if tag.startswith("pron-"):
            pos = [i for i, t in enumerate(toks) if t in ("他", "她")]
            if not pos:
                continue
            i = pos[-1]
            groups.setdefault("pronoun", []).append((toks, i, [ids_of["他"], ids_of["她"]], toks[i], row["seen"]))
        elif tag == "order-chase":
            # 第二次出现的被追者：遮住后，看模型选被追者还是追的一方
            names = [t for t in toks if t in ids_of]
            idx = [i for i, t in enumerate(toks) if toks.count(t) == 2 and t not in "，。"]
            if len(idx) == 2:
                chased = toks[idx[1]]
                chaser = toks[0]
                if chased != chaser and chaser in ids_of and chased in ids_of:
                    groups.setdefault("order", []).append((toks, idx[1], [ids_of[chaser], ids_of[chased]], chased, row["seen"]))
        elif tag in ("apple-fruit", "apple-device") and "苹果" in toks:
            i = toks.index("苹果")
            groups.setdefault(tag, []).append((toks, i, None, None, row["seen"]))
    for name, items in groups.items():
        correct = total = unseen_ok = unseen = 0
        fruit_mass = device_mass = 0.0
        for toks, i, choices, answer, seen in items:
            ids = [ids_of.get(t, UNK) for t in toks]
            ids[i] = MASK
            logits = model(torch.tensor([ids], device=device))[0, i]
            p = torch.softmax(logits.float(), -1)
            if choices is not None:
                pick = choices[int(torch.argmax(p[choices]))]
                ok = tok.vocab[pick] == answer
                correct += ok
                total += 1
                if not seen:
                    unseen += 1
                    unseen_ok += ok
            else:
                fruit_mass += float(sum(p[ids_of[w]] for w in FRUIT_WORDS if w != "苹果"))
                device_mass += float(sum(p[ids_of[w]] for w in DEVICE_WORDS if w != "苹果"))
                total += 1
        if name.startswith("apple"):
            res[name] = {"n": total, "fruit_mass": round(fruit_mass / total, 3), "device_mass": round(device_mass / total, 3)}
        else:
            res[name] = {"n": total, "acc": round(correct / total, 3), "unseen_n": unseen, "unseen_acc": round(unseen_ok / max(unseen, 1), 3)}
    model.train()
    return res


@torch.no_grad()
def sample(model, tok, prompt, device, temperature=0.8, n=40, seed=0):
    model.eval()
    g = torch.Generator(device=device).manual_seed(seed)
    ids = [BOS] + tok.encode(prompt)
    for _ in range(n):
        logits = model(torch.tensor([ids[-model.config["context"]:]], device=device))[0, -1].float()
        logits[[PAD, UNK, MASK, BOS]] = -1e9
        nxt = int(torch.multinomial(torch.softmax(logits / temperature, -1), 1, generator=g))
        if nxt == EOS:
            break
        ids.append(nxt)
    model.train()
    return tok.decode(ids[1:])


# ---------------------------------------------------------------- 训练
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=KINDS)
    ap.add_argument("--steps", type=int)
    args = ap.parse_args()
    cfg = dict(KINDS[args.kind])
    if args.steps:
        cfg["steps"] = args.steps
    torch.manual_seed(20261011)
    random.seed(20261011)
    device = torch.device("cuda")
    tok = load_tokenizer()
    vocab = len(tok.vocab)
    sentences = (HERE / "corpus" / "sentences.txt").read_text(encoding="utf-8").splitlines()
    if args.kind == "mlm":
        data = encoded(tok, "sentences", sentences, False, cfg["context"])
    else:
        paragraphs = (HERE / "corpus" / "paragraphs.txt").read_text(encoding="utf-8").splitlines()
        data = encoded(tok, "causal-sentences", sentences, True, cfg["context"]) + encoded(tok, "causal-paragraphs", paragraphs, True, cfg["context"])
    random.shuffle(data)
    held = data[:4000]
    train_data = data[4000:]
    model = TinyLM(vocab, context=cfg["context"], causal=cfg["causal"]).to(device)
    print(f"{args.kind}：参数 {count_params(model):,}，词表 {vocab}，训练样本 {len(train_data):,}，步数 {cfg['steps']}")
    decay = [p for n, p in model.named_parameters() if p.dim() >= 2]
    no_decay = [p for n, p in model.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.01}, {"params": no_decay, "weight_decay": 0.0}], lr=cfg["lr"], betas=(0.9, 0.98))
    warm = 400
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1, (s + 1) / warm) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1, s / cfg["steps"])))))
    scaler = torch.amp.GradScaler()
    gen = torch.Generator(device=device).manual_seed(1)
    CKPT.mkdir(exist_ok=True)
    RUNS.mkdir(exist_ok=True)
    log = (RUNS / f"{args.kind}.jsonl").open("w", encoding="utf-8")
    t0 = time.time()
    for step in range(1, cfg["steps"] + 1):
        batch = pad_batch(random.sample(train_data, cfg["batch"]), device)
        with torch.autocast("cuda", dtype=torch.float16):
            if args.kind == "mlm":
                inp, labels, pad = mask_tokens(batch, vocab, gen)
                logits = model(inp, pad)
                loss = nn.functional.cross_entropy(logits.float().reshape(-1, vocab), labels.reshape(-1), ignore_index=-100)
            else:
                inp, target = batch[:, :-1], batch[:, 1:].clone()
                target[target == PAD] = -100
                logits = model(inp, inp == PAD)
                loss = nn.functional.cross_entropy(logits.float().reshape(-1, vocab), target.reshape(-1), ignore_index=-100)
        opt.zero_grad(set_to_none=True)
        scaler.scale(loss).backward()
        scaler.unscale_(opt)
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(opt)
        scaler.update()
        sched.step()
        if step % 500 == 0 or step == cfg["steps"]:
            with torch.no_grad():
                model.eval()
                hb = pad_batch(held[:1024], device)
                if args.kind == "mlm":
                    inp, labels, pad = mask_tokens(hb, vocab, torch.Generator(device=device).manual_seed(9))
                    hl = nn.functional.cross_entropy(model(inp, pad).float().reshape(-1, vocab), labels.reshape(-1), ignore_index=-100)
                else:
                    inp, target = hb[:, :-1], hb[:, 1:].clone()
                    target[target == PAD] = -100
                    hl = nn.functional.cross_entropy(model(inp, inp == PAD).float().reshape(-1, vocab), target.reshape(-1), ignore_index=-100)
                model.train()
            row = {"step": step, "loss": round(loss.item(), 4), "held_loss": round(hl.item(), 4), "lr": round(sched.get_last_lr()[0], 6), "sec": round(time.time() - t0)}
            if step % 2000 == 0 or step == cfg["steps"]:
                if args.kind == "mlm":
                    row["probe"] = mlm_probe(model, tok, device)
                else:
                    row["samples"] = [sample(model, tok, p, device, seed=i) for i, p in enumerate(["校庆当天，", "我的苹果", "外面下雨了，"])]
            print(json.dumps(row, ensure_ascii=False), flush=True)
            log.write(json.dumps(row, ensure_ascii=False) + "\n")
            log.flush()
            torch.save({"config": model.config, "state": model.state_dict(), "step": step}, CKPT / f"{args.kind}.pt")
    print(f"完成，用时 {time.time() - t0:.0f} 秒，显存峰值 {torch.cuda.max_memory_allocated() / 2**20:.0f} MB")


if __name__ == "__main__":
    main()
