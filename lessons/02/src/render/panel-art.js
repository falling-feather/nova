/**
 * Line illustrations for the wall panels. Each is drawn in a 1000 × 450 box,
 * scaled into the panel, in the hall colour plus ink. Labels stay short and
 * inside the box (local y between 40 and 440).
 */
import { SERIF } from "./fonts.js";

const INK = "#2d3533",
  SOFT = "#bfb39a",
  PAPER = "#fbf6ea",
  WARM = "#e0a33a";

function stroke(c, color, width, dash) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.setLineDash?.(dash || []);
  c.stroke();
  c.setLineDash?.([]);
}
function poly(c, pts, color, width = 4, dash) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  stroke(c, color, width, dash);
}
function circle(c, x, y, r, fill, line, width = 4) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (line) stroke(c, line, width);
}
function rrect(c, x, y, w, h, r, fill, line, width = 4) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (line) stroke(c, line, width);
}
function arrow(c, x1, y1, x2, y2, color, width = 5, dash) {
  poly(c, [[x1, y1], [x2, y2]], color, width, dash);
  const a = Math.atan2(y2 - y1, x2 - x1),
    s = 18;
  poly(
    c,
    [
      [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)],
      [x2, y2],
      [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)],
    ],
    color,
    width,
  );
}
function text(c, s, x, y, size, color = INK, align = "center", serif = false) {
  c.fillStyle = color;
  c.font = `${serif ? "" : "500 "}${size}px ${serif ? SERIF : '"Microsoft YaHei",sans-serif'}`;
  c.textAlign = align;
  c.fillText(s, x, y);
  c.textAlign = "left";
}
function bubble(c, x, y, w, h, fill, line, tailLeft) {
  rrect(c, x, y, w, h, 26, fill, line, 4);
  c.beginPath();
  const tx = tailLeft ? x + 50 : x + w - 50;
  c.moveTo(tx - 14, y + h - 2);
  c.lineTo(tx + (tailLeft ? -26 : 26), y + h + 30);
  c.lineTo(tx + 14, y + h - 2);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
function lines(c, x, y, w, count, gap = 26, color = SOFT) {
  for (let i = 0; i < count; i++)
    poly(c, [[x, y + i * gap], [x + (i === count - 1 ? w * 0.6 : w), y + i * gap]], color, 5);
}
function magnifier(c, x, y, r, color) {
  circle(c, x, y, r, null, color, 8);
  poly(c, [[x + r * 0.7, y + r * 0.7], [x + r * 1.6, y + r * 1.6]], color, 12);
}
function star(c, x, y, r, color) {
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    poly(c, [[x - Math.cos(a) * r, y - Math.sin(a) * r], [x + Math.cos(a) * r, y + Math.sin(a) * r]], color, 4);
  }
}
function seeded(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function nodes(c, layers, col, linkColor = SOFT) {
  const pts = layers.map((n, l) =>
    Array.from({ length: n }, (_, j) => [220 + l * 280, 225 + (j - (n - 1) / 2) * 78]),
  );
  for (let l = 0; l < pts.length - 1; l++)
    for (const a of pts[l]) for (const b of pts[l + 1]) poly(c, [a, b], linkColor, 3);
  pts.flat().forEach(([x, y]) => circle(c, x, y, 22, PAPER, col, 5));
  return pts;
}

const art = {
  dartmouth(c, col) {
    rrect(c, 110, 50, 320, 360, 10, PAPER, SOFT, 4);
    text(c, "Artificial", 270, 105, 34, col, "center", true);
    text(c, "Intelligence", 270, 145, 34, col, "center", true);
    lines(c, 150, 200, 240, 5, 34);
    circle(c, 390, 365, 24, null, "#b9533f", 5);
    // A college building under the summer sun.
    poly(c, [[540, 300], [720, 205], [900, 300], [540, 300]], col, 6);
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) c.fillRect(575 + i * 70, 310, 22, 80);
    c.fillRect(540, 392, 360, 14);
    circle(c, 880, 105, 34, WARM);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      poly(c, [[880 + Math.cos(a) * 48, 105 + Math.sin(a) * 48], [880 + Math.cos(a) * 66, 105 + Math.sin(a) * 66]], WARM, 5);
    }
    text(c, "1956 · 夏", 720, 430, 30, INK);
  },
  perceptron(c, col) {
    const cells = [];
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 5; k++) {
        const x = 90 + k * 46,
          y = 130 + r * 46,
          on = k < 2 && r > 0 && r < 4;
        cells.push([x, y, on]);
        circle(c, x, y, 16, on ? col : PAPER, SOFT, 3);
      }
    cells
      .filter((_, i) => i % 3 === 0)
      .forEach(([x, y, on]) => poly(c, [[x + 16, y], [505, 225]], on ? col : SOFT, on ? 6 : 2));
    circle(c, 560, 225, 58, PAPER, col, 7);
    text(c, "调权重", 560, 238, 30, col);
    arrow(c, 625, 205, 780, 150, INK, 5);
    arrow(c, 625, 245, 780, 300, SOFT, 5);
    circle(c, 820, 150, 34, WARM, INK, 4);
    circle(c, 820, 300, 34, PAPER, INK, 4);
    text(c, "左", 890, 162, 34, INK);
    text(c, "右", 890, 312, 34, INK);
    text(c, "眼睛", 182, 410, 28, INK);
  },
  dendral(c, col) {
    const atoms = Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3 - Math.PI / 2;
      return [290 + Math.cos(a) * 120, 225 + Math.sin(a) * 120];
    });
    poly(c, [...atoms, atoms[0]], col, 7);
    atoms.forEach(([x, y], i) => {
      circle(c, x, y, 26, i === 2 ? "#b9533f" : PAPER, col, 5);
      text(c, i === 2 ? "O" : "C", x, y + 11, 28, i === 2 ? "#fff" : INK);
    });
    magnifier(c, 360, 175, 70, INK);
    rrect(c, 600, 100, 310, 250, 16, PAPER, SOFT, 4);
    text(c, "如果……", 640, 180, 40, col, "left", true);
    text(c, "就……", 640, 260, 40, col, "left", true);
  },
  eliza(c, col) {
    bubble(c, 470, 60, 430, 110, col, null, false);
    text(c, "我今天很难过", 685, 128, 40, "#fff");
    bubble(c, 100, 230, 500, 110, PAPER, SOFT, true);
    text(c, "你为什么难过呢？", 350, 298, 40, INK);
    poly(c, [[375, 318], [455, 318]], WARM, 8);
    poly(c, [[737, 148], [817, 148]], WARM, 8);
    text(c, "它在找关键词", 760, 410, 30, INK);
  },
  winter(c, col) {
    poly(c, [[90, 380], [920, 380]], SOFT, 4);
    poly(c, [[110, 350], [300, 140], [470, 320], [610, 350], [790, 190], [910, 110]], col, 9);
    text(c, "热潮", 300, 110, 32, col);
    text(c, "寒冬", 540, 410, 32, "#4f7aa6");
    text(c, "回暖", 860, 90, 32, col);
    for (const [x, y] of [[470, 200], [560, 160], [640, 230], [520, 260]]) star(c, x, y, 22, "#7fa3c7");
  },
  backprop(c, col) {
    const pts = nodes(c, [3, 4, 2], col);
    arrow(c, 210, 60, 780, 60, SOFT, 5);
    text(c, "先预测", 495, 95, 28, INK);
    arrow(c, 780, 400, 210, 400, col, 6, [18, 12]);
    text(c, "把误差往回传，调整每条连线", 495, 440, 28, col);
    const [x, y] = pts[2][0];
    poly(c, [[x + 40, y - 20], [x + 70, y + 10]], "#b9533f", 7);
    poly(c, [[x + 70, y - 20], [x + 40, y + 10]], "#b9533f", 7);
  },
  cuda(c, col) {
    rrect(c, 110, 130, 190, 190, 14, PAPER, INK, 6);
    text(c, "CPU", 205, 238, 40, INK);
    text(c, "几个大核心", 205, 380, 28, INK);
    for (let r = 0; r < 7; r++)
      for (let k = 0; k < 12; k++) {
        c.fillStyle = (r + k) % 4 ? col : WARM;
        c.fillRect(410 + k * 42, 90 + r * 42, 32, 32);
      }
    text(c, "GPU：成百上千个小核心一起算", 662, 420, 28, INK);
  },
  imagenet(c, col) {
    const draw = (kind, x, y) => {
      rrect(c, x, y, 150, 110, 12, PAPER, SOFT, 3);
      if (kind === 0) {
        circle(c, x + 75, y + 62, 28, null, col, 5);
        poly(c, [[x + 52, y + 44], [x + 56, y + 20], [x + 70, y + 36]], col, 5);
        poly(c, [[x + 98, y + 44], [x + 94, y + 20], [x + 80, y + 36]], col, 5);
      } else if (kind === 1) {
        c.beginPath();
        c.ellipse(x + 75, y + 55, 22, 38, 0.6, 0, Math.PI * 2);
        stroke(c, "#4f8a4c", 5);
      } else {
        rrect(c, x + 30, y + 40, 90, 34, 8, null, INK, 5);
        circle(c, x + 52, y + 80, 11, PAPER, INK, 5);
        circle(c, x + 98, y + 80, 11, PAPER, INK, 5);
      }
    };
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 5; k++) draw((r + k) % 3, 90 + k * 170, 40 + r * 125);
    rrect(c, 760, 40, 80, 40, 8, col);
    text(c, "猫", 800, 70, 26, "#fff");
  },
  alexnet(c, col) {
    // Data, method and compute come together.
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(190, 120 + i * 36, 70, 22, 0, 0, Math.PI * 2);
      stroke(c, col, 5);
    }
    text(c, "数据", 190, 250, 32, INK);
    for (const [x, y] of [[430, 90], [430, 170], [520, 130], [520, 210], [610, 150]]) circle(c, x, y, 16, PAPER, col, 5);
    poly(c, [[430, 90], [520, 130], [610, 150], [520, 210], [430, 170], [520, 130]], SOFT, 3);
    text(c, "方法", 520, 270, 32, INK);
    rrect(c, 760, 80, 150, 150, 12, PAPER, INK, 6);
    for (let i = 0; i < 5; i++) {
      poly(c, [[780 + i * 28, 66], [780 + i * 28, 80]], INK, 5);
      poly(c, [[780 + i * 28, 230], [780 + i * 28, 244]], INK, 5);
    }
    text(c, "算力", 835, 292, 32, INK);
    text(c, "+", 330, 150, 60, col);
    text(c, "+", 690, 150, 60, col);
    arrow(c, 500, 320, 500, 395, col, 6);
    text(c, "2012 · 识图的突破", 500, 440, 30, col);
  },
  "alphago-zero"(c, col) {
    for (let i = 0; i < 6; i++) {
      poly(c, [[380 + i * 48, 105], [380 + i * 48, 345]], SOFT, 3);
      poly(c, [[380, 105 + i * 48], [620, 105 + i * 48]], SOFT, 3);
    }
    for (const [x, y, b] of [[428, 201, 1], [476, 249, 0], [524, 201, 1], [524, 297, 0], [572, 249, 1]])
      circle(c, x, y, 20, b ? INK : PAPER, INK, 3);
    c.beginPath();
    c.arc(500, 225, 200, -2.6, -0.55);
    stroke(c, col, 7);
    c.beginPath();
    c.arc(500, 225, 200, 0.55, 2.6);
    stroke(c, col, 7);
    arrow(c, 660, 110, 672, 122, col, 7);
    arrow(c, 340, 340, 328, 328, col, 7);
    text(c, "自我对弈", 500, 440, 32, col);
  },
  alphafold(c, col) {
    const beads = Array.from({ length: 8 }, (_, i) => [90 + i * 42, 225 + Math.sin(i * 1.1) * 40]);
    poly(c, beads, SOFT, 4);
    beads.forEach(([x, y], i) => circle(c, x, y, 16, ["#c9a74a", col, "#b9533f"][i % 3]));
    text(c, "一串氨基酸", 240, 330, 28, INK);
    arrow(c, 450, 225, 560, 225, INK, 6);
    const helix = [];
    for (let t = 0; t <= 1; t += 0.02) helix.push([620 + t * 290, 225 + Math.sin(t * Math.PI * 6) * 70 * (1 - t * 0.4)]);
    poly(c, helix, col, 14);
    poly(c, helix, PAPER, 4);
    text(c, "折成立体形状", 765, 370, 28, INK);
  },
  transformer(c, col) {
    const words = ["杯子", "太小", "球", "放不", "进去"],
      xs = words.map((_, i) => 140 + i * 180),
      weight = [0.62, 0, 0.24, 0.08, 0.06];
    words.forEach((w, i) => {
      rrect(c, xs[i] - 70, 320, 140, 80, 14, i === 1 ? col : PAPER, i === 1 ? null : SOFT, 3);
      text(c, w, xs[i], 372, 34, i === 1 ? "#fff" : INK);
    });
    weight.forEach((w, i) => {
      if (i === 1) return;
      c.beginPath();
      c.moveTo(xs[1], 315);
      c.quadraticCurveTo((xs[1] + xs[i]) / 2, 315 - 120 - w * 240, xs[i], 315);
      stroke(c, w > 0.3 ? WARM : col, 3 + w * 22);
    });
    text(c, "“太小”最留意“杯子”", 500, 80, 30, INK);
  },
  gpt(c, col) {
    rrect(c, 90, 110, 150, 220, 8, PAPER, SOFT, 4);
    rrect(c, 240, 110, 150, 220, 8, PAPER, SOFT, 4);
    lines(c, 110, 150, 110, 6, 28);
    lines(c, 260, 150, 110, 6, 28);
    arrow(c, 420, 220, 520, 220, INK, 6);
    text(c, "今天天气真", 560, 140, 38, INK, "left", true);
    [["好", 0.62], ["热", 0.28], ["蓝", 0.1]].forEach(([w, p], i) => {
      text(c, w, 590, 225 + i * 70, 34, INK);
      c.fillStyle = i ? SOFT : col;
      c.fillRect(630, 198 + i * 70, 280 * p, 34);
    });
    text(c, "猜下一个词", 750, 430, 28, col);
  },
  chatgpt(c, col) {
    rrect(c, 160, 40, 680, 380, 26, PAPER, SOFT, 4);
    bubble(c, 430, 70, 360, 80, col, null, false);
    text(c, "帮我想个故事开头", 610, 122, 32, "#fff");
    bubble(c, 210, 190, 420, 80, "#efe6d2", null, true);
    lines(c, 240, 220, 360, 2, 26, INK);
    for (let i = 0; i < 3; i++) circle(c, 260 + i * 36, 350, 10, SOFT);
    text(c, "重要的事，要核对", 640, 362, 28, "#b9533f");
  },
  "open-weights"(c, col) {
    poly(c, [[230, 140], [330, 80], [610, 80], [510, 140], [230, 140]], col, 6);
    poly(c, [[610, 80], [610, 300], [510, 360]], col, 6);
    rrect(c, 230, 140, 280, 220, 4, PAPER, col, 6);
    text(c, "0.12  −0.8", 370, 220, 34, INK);
    text(c, "1.3   0.05", 370, 280, 34, INK);
    arrow(c, 760, 90, 760, 300, INK, 8);
    poly(c, [[690, 330], [830, 330]], INK, 8);
    rrect(c, 640, 360, 240, 60, 10, PAPER, "#b9533f", 4);
    text(c, "先读许可证", 760, 401, 28, "#b9533f");
  },
  "openai-path"(c, col) {
    poly(c, [[80, 330], [920, 330]], SOFT, 14);
    [["2015", "成立"], ["2018", "GPT"], ["2022", "ChatGPT"], ["2026", "GPT-6"]].forEach(([y, w], i) => {
      const x = 170 + i * 220;
      poly(c, [[x, 330], [x, 170]], INK, 5);
      rrect(c, x, 150, 120, 60, 6, i === 2 ? col : PAPER, col, 4);
      text(c, y, x + 60, 192, 28, i === 2 ? "#fff" : col);
      text(c, w, x, 400, 28, INK);
    });
  },
  "deepseek-path"(c, col) {
    poly(c, [[300, 50], [640, 50], [640, 380], [600, 405], [560, 380], [520, 405], [480, 380], [440, 405], [400, 380], [360, 405], [300, 380], [300, 50]], SOFT, 5);
    text(c, "训练账单", 470, 110, 36, INK, "center", true);
    rrect(c, 330, 150, 280, 50, 8, col);
    text(c, "最后一次训练", 470, 186, 28, "#fff");
    lines(c, 340, 250, 260, 4, 34);
    text(c, "之前的研究？", 470, 360, 26, "#9a8f78");
    magnifier(c, 760, 210, 80, INK);
    text(c, "算了什么？", 760, 410, 28, col);
  },
  "google-path"(c, col) {
    rrect(c, 120, 90, 760, 280, 140, null, SOFT, 26);
    rrect(c, 180, 140, 640, 180, 90, null, col, 10);
    circle(c, 300, 92, 20, col);
    circle(c, 640, 322, 20, WARM);
    text(c, "长跑：一代代研究", 500, 215, 30, INK);
    text(c, "冲刺：产品竞争", 500, 265, 30, col);
  },
  "many-paths"(c, col) {
    circle(c, 160, 225, 36, col);
    const leaves = [[700, 60], [760, 140], [790, 225], [760, 310], [700, 390], [560, 225]];
    leaves.forEach(([x, y], i) => {
      c.beginPath();
      c.moveTo(196, 225);
      c.quadraticCurveTo(420, y, x - 30, y);
      stroke(c, i % 2 ? SOFT : col, 6);
      circle(c, x, y, 28, PAPER, col, 5);
    });
    text(c, "芯片", 860, 72, 26, INK, "left");
    text(c, "云平台", 830, 150, 26, INK, "left");
    text(c, "大模型", 860, 236, 26, INK, "left");
    text(c, "手机", 830, 320, 26, INK, "left");
    text(c, "科学", 770, 400, 26, INK, "left");
    text(c, "开源社区", 560, 290, 26, INK);
  },
  gan(c, col) {
    circle(c, 170, 200, 70, null, col, 7);
    for (const [x, y, k] of [[140, 170, "#b9533f"], [195, 160, WARM], [215, 215, "#4f8a4c"]]) circle(c, x, y, 13, k);
    text(c, "生成器", 170, 330, 30, INK);
    arrow(c, 270, 200, 400, 200, col, 6);
    rrect(c, 420, 120, 160, 160, 8, PAPER, INK, 5);
    circle(c, 500, 200, 34, null, SOFT, 5);
    arrow(c, 600, 200, 720, 200, col, 6);
    magnifier(c, 800, 180, 60, INK);
    text(c, "判别器", 800, 330, 30, INK);
    arrow(c, 780, 390, 200, 390, SOFT, 5, [16, 12]);
    text(c, "被识破，就再画得更像", 490, 438, 26, col);
  },
  "diffusion-models"(c, col) {
    const rand = seeded(7);
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 175,
        noise = 1 - i / 4;
      rrect(c, x, 100, 150, 150, 10, PAPER, SOFT, 3);
      for (let k = 0; k < 160 * noise; k++) {
        c.fillStyle = rand() > 0.5 ? INK : SOFT;
        c.fillRect(x + 6 + rand() * 136, 106 + rand() * 136, 5, 5);
      }
      if (i >= 2) {
        const a = 0.35 + (i - 2) * 0.3;
        for (let p = 0; p < 6; p++) {
          const t = (p * Math.PI) / 3;
          c.globalAlpha = a;
          circle(c, x + 75 + Math.cos(t) * 26, 175 + Math.sin(t) * 26, 18, col);
          c.globalAlpha = 1;
        }
        circle(c, x + 75, 175, 14, WARM);
      }
    }
    arrow(c, 120, 310, 880, 310, INK, 5);
    text(c, "一步步去掉噪点", 500, 380, 30, col);
  },
  clip(c, col) {
    rrect(c, 110, 90, 280, 260, 10, PAPER, INK, 5);
    circle(c, 250, 230, 56, null, col, 6);
    poly(c, [[205, 195], [190, 150], [228, 180]], col, 6);
    poly(c, [[295, 195], [310, 150], [272, 180]], col, 6);
    circle(c, 232, 222, 6, INK);
    circle(c, 268, 222, 6, INK);
    rrect(c, 600, 160, 300, 120, 14, PAPER, SOFT, 4);
    text(c, "一只小狗", 750, 232, 36, INK, "center", true);
    poly(c, [[400, 220], [590, 220]], WARM, 7, [16, 10]);
    circle(c, 495, 220, 24, WARM);
    text(c, "图与文配成对", 500, 410, 30, col);
  },
  multimodal(c, col) {
    c.beginPath();
    c.moveTo(110, 120);
    c.quadraticCurveTo(190, 50, 270, 120);
    c.quadraticCurveTo(190, 190, 110, 120);
    stroke(c, col, 6);
    circle(c, 190, 120, 22, col);
    rrect(c, 420, 90, 40, 60, 6, null, col, 6);
    poly(c, [[460, 90], [500, 60], [500, 180], [460, 150]], col, 6);
    for (const r of [30, 55]) {
      c.beginPath();
      c.arc(510, 120, r, -0.7, 0.7);
      stroke(c, col, 5);
    }
    rrect(c, 720, 70, 170, 110, 8, PAPER, col, 5);
    lines(c, 745, 105, 120, 3, 24, INK);
    for (const [x, y] of [[190, 175], [470, 195], [805, 185]]) poly(c, [[x, y], [500, 330]], SOFT, 4);
    rrect(c, 420, 320, 160, 80, 14, col);
    text(c, "一起判断", 500, 372, 30, "#fff");
  },
  reasoning(c, col) {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i === 4 ? col : SOFT;
      c.fillRect(160 + i * 130, 360 - i * 60, 130, 20 + i * 60);
      text(c, String(i + 1), 225 + i * 130, 345 - i * 60, 30, i === 4 ? "#fff" : INK);
    }
    poly(c, [[835, 90], [865, 120], [915, 60]], "#3d7d55", 10);
    c.beginPath();
    c.ellipse(260, 110, 110, 60, 0, 0, Math.PI * 2);
    stroke(c, col, 5);
    text(c, "先想一想", 260, 122, 30, col);
  },
  embodied(c, col) {
    rrect(c, 130, 360, 220, 40, 8, SOFT);
    poly(c, [[240, 360], [300, 200], [520, 170], [610, 260]], col, 16);
    circle(c, 300, 200, 18, PAPER, INK, 5);
    circle(c, 520, 170, 16, PAPER, INK, 5);
    poly(c, [[595, 270], [585, 310]], INK, 8);
    poly(c, [[625, 270], [635, 310]], INK, 8);
    c.fillStyle = "#2d5c97";
    c.fillRect(578, 318, 64, 64);
    poly(c, [[740, 390], [880, 390], [880, 330], [740, 330], [740, 390]], WARM, 6, [14, 10]);
    bubble(c, 660, 60, 260, 90, PAPER, SOFT, true);
    text(c, "放到这里", 790, 118, 32, INK);
  },
  future(c, col) {
    rrect(c, 230, 100, 260, 300, 10, PAPER, SOFT, 5);
    rrect(c, 490, 100, 260, 300, 10, PAPER, SOFT, 5);
    text(c, "？", 620, 300, 160, col, "center", true);
    lines(c, 260, 160, 200, 6, 36);
    poly(c, [[800, 380], [900, 120]], INK, 14);
    poly(c, [[792, 400], [800, 380]], WARM, 14);
    for (const [x, y] of [[180, 120], [860, 70], [150, 340]]) star(c, x, y, 18, WARM);
  },
};

export function hasPanelArt(id) {
  return Object.hasOwn(art, id);
}

/** Draw the illustration for `id` scaled into the box; returns false if none exists. */
export function drawPanelArt(c, id, x, y, w, h, color) {
  if (!hasPanelArt(id)) return false;
  const k = Math.min(w / 1000, h / 450);
  c.save();
  c.translate(x + (w - 1000 * k) / 2, y + (h - 450 * k) / 2);
  c.scale(k, k);
  c.lineCap = "round";
  c.lineJoin = "round";
  c.textBaseline = "alphabetic";
  try {
    art[id](c, color);
  } finally {
    c.restore();
  }
  return true;
}
