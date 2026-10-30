import type { KnownKind } from "./types.ts";
export interface MessageAnalysis {
  keywords: string[];
  candidates: KnownKind[];
  operation: string;
}

// Classroom keyword rules, deliberately inspectable; this is not an LLM or ASR.
const RULES: { label: KnownKind; words: string[] }[] = [
  { label: "car", words: ["小车", "汽车", "车轮", "轮子", "toy car"] },
  { label: "block", words: ["积木", "方块", "木块", "block"] },
  { label: "bell", words: ["铃铛", "铃声", "会响", "摇响", "bell"] },
  { label: "radio", words: ["播放器", "收音机", "喇叭", "播放录音", "radio"] },
  { label: "maple", words: ["枫叶", "枫树", "掌状", "maple"] },
  { label: "ginkgo", words: ["银杏", "扇形", "ginkgo"] },
  { label: "leaf", words: ["叶子", "叶片", "树叶", "叶脉", "leaf"] },
  { label: "pinecone", words: ["松果", "松塔", "鳞片", "pinecone"] },
];

export function parseMessage(text: string): MessageAnalysis {
  const normalized = text.toLowerCase().trim();
  const keywords: string[] = [];
  const candidates: KnownKind[] = [];
  for (const { label, words } of RULES) {
    let positive = false;
    let negated = false;
    for (const word of words) {
      let position = normalized.indexOf(word);
      while (position >= 0) {
        if (!keywords.includes(word)) keywords.push(word);
        const prefix = normalized.slice(Math.max(0, position - 7), position);
        if (/(?:不要|不是|别找|排除|不找|非)[^，。；、,;]{0,3}$/.test(prefix))
          negated = true;
        else positive = true;
        position = normalized.indexOf(word, position + word.length);
      }
    }
    if (positive && !negated) candidates.push(label);
  }
  // A specific leaf name is more useful than duplicating its generic parent.
  if (candidates.includes("maple") || candidates.includes("ginkgo")) {
    const index = candidates.indexOf("leaf");
    if (index >= 0) candidates.splice(index, 1);
  }
  let operation = candidates.length
    ? "按文字里的线索找东西，再对照资料核对"
    : "没读到认识的东西名字，需要补充名字或样子";
  if (/颜色|红色|黄色|蓝色|绿色/.test(normalized))
    operation = /按颜色|颜色整理|颜色分/.test(normalized)
      ? "按颜色整理"
      : `${operation}，还要核对颜色`;
  if (/用途|用来|收纳/.test(normalized))
    operation = "按用途整理，并核对材料说明";
  if (/声音|听|录音/.test(normalized)) operation += "，还要分清声音内容和放声音的东西";
  return { keywords, candidates, operation };
}
