import {TOOL_LABELS} from './engine/world.ts';
import type {Run} from './engine/types.ts';

export function toolFeedback(run:Run|null){
  const last=run?.logs.at(-1);
  if(last?.kind==='decision'&&last.summary.startsWith('文字声明「'))return {kind:'statement' as const,title:'只留下了文字声明',applied:false,lines:['没有调用设备，环境数值未改变。','请亲手调用工具，再读取探针核验。']};
  const receipt=run?.lastReceipt??(run?[...run.logs].reverse().find(l=>l.receipt)?.receipt:undefined);
  if(!receipt)return null;
  if(receipt.input.tool==='observe')return {kind:'observation' as const,title:'读取探针',applied:false,lines:receipt.observation?.reliable?[`湿度 ${receipt.observation.moisture}% · 温度 ${receipt.observation.temperature}°C`,'这是新观测，不是环境改变。']:['关键读数缺失','不能用画面代替传感器观测。']};
  const lines:string[]=[];
  if(receipt.before.moisture!==receipt.after.moisture)lines.push(`湿度 ${receipt.before.moisture}% → ${receipt.after.moisture}%`);
  if(receipt.before.temperature!==receipt.after.temperature)lines.push(`温度 ${receipt.before.temperature} → ${receipt.after.temperature}°C`);
  if(receipt.before.tankMl!==receipt.after.tankMl)lines.push(`水箱 ${receipt.before.tankMl} → ${receipt.after.tankMl} mL`);
  if(!lines.length)lines.push(receipt.input.tool==='water'?`实际出水 ${receipt.deliveredMl} mL`:'环境没有改变',receipt.accepted?'请求已收到，仍需检查执行。':'请求没有被接受。');
  return {kind:'action' as const,title:TOOL_LABELS[receipt.input.tool],applied:receipt.applied,lines};
}
