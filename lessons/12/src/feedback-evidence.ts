import type {Run} from './engine/types.ts';
export interface FeedbackEvidence {request:string;execution:string;verification:string;requested:boolean;applied:boolean;verified:boolean;}

/** A command being accepted is not evidence of an environmental change or of goal completion. */
export function feedbackEvidence(run:Run|null):FeedbackEvidence {
  const action=run?[...run.logs].reverse().find(log=>log.receipt&&log.receipt.input.tool!=='observe')?.receipt:undefined;
  const verified=run?.status==='succeeded';
  return {
    request:action?(action.accepted?'请求已收到':'请求被拒绝'):verified?'无需额外动作':'等待工具请求',
    execution:action?(action.applied?'环境已改变':'未产生实际变化'):verified?'初始状态已满足':'等待执行回执',
    verification:verified?'新观测核验通过':run?.status==='needs-human'||run?.status==='stopped'?'未完成 · 需检查':'还需观测与核验',
    requested:!!action?.accepted,applied:!!action?.applied,verified,
  };
}
