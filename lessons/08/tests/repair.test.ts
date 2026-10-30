import test from "node:test";
import assert from "node:assert/strict";
import {repairRecord} from "../src/core/repair.ts";
test("修复对照冻结当时原稿、手工及模型结果，继续编辑不改变已存材料",()=>{
  const source=new Float32Array(1024),manual=new Float32Array(1024),model=new Float32Array(1024);
  source[0]=1;manual[1]=1;model[0]=1;
  const record=repairRecord(source,manual,model,"real-model"),original={...record};
  source.fill(-1);manual.fill(1);model.fill(0);
  assert.deepEqual(record,original);assert.equal(record.master,100);assert.equal(record.modelVersion,"real-model");
  assert.notEqual(record.manualImage,record.modelImage);
});
