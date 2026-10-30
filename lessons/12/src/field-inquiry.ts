import type {Run,RunConfig} from './engine/types.ts';
import {TOOL_LABELS} from './engine/world.ts';

export const FIELD_SCENARIOS=[
  {id:'morning',time:'08:00',title:'接班的早晨',subtitle:'干燥苗床，先补水再核验',question:'一次浇水后，能直接宣布完成吗？',icon:'sun'},
  {id:'heatwave',time:'12:30',title:'热浪突然到来',subtitle:'第一项动作后：升温、失水',question:'遇到计划外变化，哪种方式会调整动作？',icon:'heat'},
  {id:'blocked',time:'16:00',title:'收到了，却没出水',subtitle:'控制器接受请求，管道堵塞',question:'什么证据能让系统发现故障并停止？',icon:'water'},
] as const;
export type FieldScenario=typeof FIELD_SCENARIOS[number]['id'];
export function scenarioConfig(base:RunConfig,id:FieldScenario):RunConfig{
  const config=structuredClone(base);
  config.initial={moisture:25,temperature:24,tankMl:120,shade:false,vent:false,revision:0};
  config.faults={pumpBlocked:id==='blocked',weatherShift:id==='heatwave',sensorOffline:false,repeatRequest:false};
  return config;
}
export function decisionTrace(run:Run){
  return run.logs.filter(l=>l.kind==='action'&&l.receipt).map(l=>({
    label:TOOL_LABELS[l.receipt!.input.tool],
    applied:l.receipt!.applied,
    amount:l.receipt!.input.amount,
    summary:l.summary,
  }));
}
export function compareDecisions(a:Run,b:Run){
  const conditions=(r:Run)=>JSON.stringify({...r.config,mode:'workflow'});
  return {sameConditions:conditions(a)===conditions(b),a:decisionTrace(a),b:decisionTrace(b)};
}
