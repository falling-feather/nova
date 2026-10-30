import test from "node:test";
import assert from "node:assert/strict";
import { SamplingControl } from "../src/core/sampling-control.ts";

test("逐步模式每次只放行一个真实模型帧，继续模式放行后续帧",async()=>{
  const c=new SamplingControl(true);let reached=0;
  const p=(async()=>{for(let i=0;i<3;i++){reached++;await c.afterFrame();}})();
  await Promise.resolve();assert.equal(reached,1);
  c.next();await new Promise(resolve=>setImmediate(resolve));assert.equal(reached,2);
  c.resume();await p;assert.equal(reached,3);
});
test("暂停在帧边界生效，停止解除等待且不产生后续帧",async()=>{
  const c=new SamplingControl();c.pause();let reached=0;
  const p=(async()=>{reached++;await c.afterFrame();reached++;})();
  await Promise.resolve();assert.equal(reached,1);c.stop();
  await assert.rejects(p,{name:"AbortError"});assert.equal(reached,1);
});
