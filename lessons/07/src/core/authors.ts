// 特刊上标明谁写的字：保留下来的字字原稿算 AI，学生改写或新加的字算学生。
/** Mark which characters of the edited text were kept from the typesetter's draft. */
export function authors(draft: string, edited: string): { text: string; by: "ai" | "student" }[] {
  const a = Array.from(draft), b = Array.from(edited), m = a.length, n = b.length;
  const L = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: { text: string; by: "ai" | "student" }[] = [];
  const push = (ch: string, by: "ai" | "student") => { const last = out.at(-1); if (last && last.by === by) last.text += ch; else out.push({ text: ch, by }); };
  let i = 0, j = 0;
  while (j < n) {
    if (i < m && a[i] === b[j]) { push(b[j], "ai"); i++; j++; }
    else if (i < m && L[i + 1][j] >= L[i][j + 1]) i++;
    else { push(b[j], "student"); j++; }
  }
  return out;
}
