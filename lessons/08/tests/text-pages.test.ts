import test from "node:test";
import assert from "node:assert/strict";
import {textSegments} from "../src/ui/dom.ts";
test("长说明分页仍保留完整原文、换行及表情，不能截断UTF-16字符",()=>{
  const value=("🌊观察\r\n结果可能不符合预测。\n\n").repeat(45),parts=textSegments(value);
  assert.equal(parts.join(""),value);
  assert.ok(parts.every(p=>Array.from(p).length<=120&&(p.match(/\n/g)??[]).length<=4));
  assert.ok(parts.every(p=>!p.includes("\uFFFD")));
});
