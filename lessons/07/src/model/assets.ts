import {
  Dictionary,
  Tokenizer,
  type TokenizerData,
  type WordList,
} from "./tokenizer.ts";
import {
  TinyTransformer,
  type ModelMeta,
  type ForwardResult,
} from "./transformer.ts";
export interface MapWord {
  text: string;
  id: number;
  cluster: string;
  x: number;
  y: number;
}
export interface NameMap {
  method: string;
  words: MapWord[];
  clusters: { key: string; name: string; x: number; y: number }[];
  senses: Record<"fruit" | "device", { name: string; layers: number[][] }>;
  sensesMethod: string;
}
export interface Models {
  tokenizer: Tokenizer;
  dictionary: Dictionary;
  council: TinyTransformer;
  press: TinyTransformer;
  map: NameMap;
  basket: string[];
}
export const assetUrl = (path: string) => new URL(path, document.baseURI).href;
async function read<T>(path: string): Promise<T> {
  const r = await fetch(assetUrl(path));
  if (!r.ok) throw Error(`无法读取 ${path} (${r.status})`);
  return r.json();
}
async function model(name: string) {
  const meta = await read<ModelMeta>(`models/${name}.json`);
  const response = await fetch(assetUrl(`models/${name}.bin`));
  if (!response.ok) throw Error(`无法读取${name}模型`);
  return new TinyTransformer(meta, await response.arrayBuffer());
}
export async function loadModels(
  status: (text: string) => void,
): Promise<Models> {
  status("整理字架与旧报纸…");
  const [tokenizerData, words, map, basket] = await Promise.all([
    read<TokenizerData>("models/tokenizer.json"),
    read<WordList>("models/words.json"),
    read<NameMap>("models/name-map.json"),
    read<{ lines: string[] }>("models/basket.json"),
  ]);
  const dictionary = new Dictionary(words),
    tokenizer = new Tokenizer(tokenizerData, dictionary);
  status("唤醒议事厅与排印车间…");
  const [council, press] = await Promise.all([
    model("council"),
    model("press"),
  ]);
  if (
    council.config.vocab !== tokenizer.size ||
    press.config.vocab !== tokenizer.size
  )
    throw Error("字表与模型不匹配");
  return { tokenizer, dictionary, map, basket: basket.lines, council, press };
}

export class CouncilCache {
  private entries = new Map<
    string,
    { tokens: string[]; ids: number[]; result: ForwardResult }
  >();
  constructor(privateModels: Models) {
    this.models = privateModels;
  }
  private models: Models;
  run(text: string, masked = -1) {
    return this.runTokens(this.models.tokenizer.tokens(text), masked);
  }
  runTokens(pieces: readonly string[], masked = -1) {
    const key = `${masked}:${JSON.stringify(pieces)}`;
    if (this.entries.has(key)) return this.entries.get(key)!;
    const tokens = [...pieces],
      ids = tokens.map((t) => this.models.tokenizer.id(t));
    if (masked >= 0) ids[masked] = 2;
    const result = this.models.council.forward(
      ids,
      masked >= 0 ? [masked] : [],
    );
    const data = { tokens, ids, result };
    this.entries.set(key, data);
    if (this.entries.size > 24)
      this.entries.delete(this.entries.keys().next().value!);
    return data;
  }
}
