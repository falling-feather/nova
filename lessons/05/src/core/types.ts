export const ATTRIBUTES = ["flower", "green", "quality"] as const;
export type Attribute = typeof ATTRIBUTES[number];
export type Features = [number, number, number, number, number, number];
export type Labels = Record<Attribute, boolean>;
export type Model = { weights: Features; bias: number; steps: number };
export type Models = Record<Attribute, Model>;
export type Filter = "original" | "green" | "red" | "white" | "edges" | "exposure";
export type Photo = {
  id: string; name: string; atlas: string; cell: number;
  role: "train" | "test" | "exhibit";
  batch: number; testStage?: number; testBox?: number;
  flower: boolean; shape: number; submittedFlip: Attribute[];
  rect?:number[]; atlasSize?:number[];
};
export type AnalyzedPhoto = Photo & { features: Features; truth: Labels; submitted: Labels };
export const FEATURE_NAMES = ["绿色占比", "红粉占比", "白色占比", "清晰度", "明暗失衡", "花形轮廓"] as const;
export const ATTRIBUTE_NAMES: Record<Attribute, string> = { flower: "花朵", green: "绿色为主", quality: "拍得好" };
export const RATES = { light: 0.5, medium: 1.5, heavy: 6 } as const;
export type RateName = keyof typeof RATES;
