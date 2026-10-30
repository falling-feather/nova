import type { Mode } from '../core/course.ts';

/** The three physical workstations expose different sources, not different training. */
export const SOURCE_CONCEPTS: Record<Mode, {name:string;description:string}> = {
  memory: {name:'参数记忆',description:'按训练中形成的参数回答；不会现场翻阅这本索引。'},
  notes: {name:'上下文',description:'把临时线索放进这次输入；模型参数保持不变。'},
  archive: {name:'检索增强',description:'先找相关原文，再放进输入；找到材料仍须核对回答。'},
};
