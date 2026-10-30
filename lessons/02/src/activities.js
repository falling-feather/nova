/** Simplified keyword demonstration, not the original ELIZA implementation. */
export function elizaReply(input) {
  const t = String(input ?? "")
    .trim()
    .slice(0, 160);
  if (!t)
    return {
      rule: "空输入",
      text: "写下一句日常想法，看看程序会匹配哪条规则。",
    };
  if (t.includes("喜欢")) {
    const subject = t
      .split("喜欢")
      .slice(1)
      .join("喜欢")
      .replace(/[。！？!?]$/, "");
    return {
      rule: "喜欢",
      text: "能再说说，你为什么喜欢" + (subject || "这件事") + "吗？",
    };
  }
  if (t.includes("因为"))
    return { rule: "因为", text: "这个原因对你来说，为什么重要？" };
  if (t.includes("想"))
    return { rule: "想", text: "如果这个想法实现了，你希望先改变什么？" };
  return { rule: "默认句式", text: "你能换一种说法，再具体描述一下吗？" };
}
