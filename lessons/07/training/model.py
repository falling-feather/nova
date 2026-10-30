"""第七章的两个微型 Transformer：议事厅的双向模型（完形填空）与排印车间的单向模型（接龙）。

两者结构相同，只差注意力遮挡：双向模型里每个词元都能看到整句；单向模型里只能看到自己和前面的词元。
注意力层手写，便于取出每一层、每一个头的注意力权重给学生看（见 模型训练/README.md）。
网页端 src/model/transformer.ts 逐项复现同样的计算。
"""
import math

import torch
from torch import nn


class Block(nn.Module):
    def __init__(self, dim, heads):
        super().__init__()
        self.heads = heads
        self.norm1, self.norm2 = nn.LayerNorm(dim), nn.LayerNorm(dim)
        self.qkv, self.proj = nn.Linear(dim, 3 * dim), nn.Linear(dim, dim)
        self.mlp = nn.Sequential(nn.Linear(dim, 4 * dim), nn.GELU(approximate="tanh"), nn.Linear(4 * dim, dim))

    def forward(self, x, mask):
        b, n, d = x.shape
        q, k, v = self.qkv(self.norm1(x)).view(b, n, 3, self.heads, d // self.heads).permute(2, 0, 3, 1, 4)
        weights = torch.softmax(q @ k.transpose(-1, -2) / math.sqrt(d // self.heads) + mask, dim=-1)
        x = x + self.proj((weights @ v).transpose(1, 2).reshape(b, n, d))
        return x + self.mlp(self.norm2(x)), weights


class TinyLM(nn.Module):
    def __init__(self, vocab, dim=128, heads=4, layers=4, context=64, causal=False):
        super().__init__()
        self.config = dict(vocab=vocab, dim=dim, heads=heads, layers=layers, context=context, causal=causal)
        self.causal = causal
        self.tok = nn.Embedding(vocab, dim)
        self.pos = nn.Embedding(context, dim)
        self.blocks = nn.ModuleList(Block(dim, heads) for _ in range(layers))
        self.norm = nn.LayerNorm(dim)
        self.out_bias = nn.Parameter(torch.zeros(vocab))  # 输出层与字架名牌共用权重，只多一组偏置
        nn.init.normal_(self.tok.weight, std=0.02)
        nn.init.normal_(self.pos.weight, std=0.02)

    def mask(self, n, pad=None, device=None):
        m = torch.zeros(n, n, device=device)
        if self.causal:
            m = torch.triu(torch.full((n, n), float("-inf"), device=device), 1)
        m = m[None, None]
        if pad is not None:  # 不听补位的空格
            m = m + torch.where(pad, float("-inf"), 0.0)[:, None, None, :]
        return m

    def forward(self, ids, pad=None, return_all=False):
        n = ids.shape[1]
        x = self.tok(ids) + self.pos.weight[:n]
        mask = self.mask(n, pad, ids.device)
        states, attns = [x], []
        for block in self.blocks:
            x, w = block(x, mask)
            states.append(x)
            attns.append(w)
        logits = self.norm(x) @ self.tok.weight.T + self.out_bias
        if return_all:
            return logits, states, attns
        return logits


def count_params(model):
    return sum(p.numel() for p in model.parameters())
