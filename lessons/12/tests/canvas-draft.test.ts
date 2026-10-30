import {test} from 'node:test';import assert from 'node:assert/strict';
import {decodeCanvas,makeDraft,firstWorkflow} from '../src/canvas-draft.ts';
import {validateWorkflow} from '../src/engine/workflow.ts';
test('未接完的画布可以保存，但不能冒充可运行工作流',()=>{const draft=makeDraft(firstWorkflow());delete draft.workflow.nodes[0].next;assert.deepEqual(decodeCanvas(JSON.stringify(draft)),draft);assert.ok(validateWorkflow(draft.workflow).length>0);});
test('草稿仍拒绝错误端口类型及非有限坐标',()=>{const draft=makeDraft(firstWorkflow());draft.workflow.nodes[0].next='water';assert.throws(()=>decodeCanvas(JSON.stringify(draft)));const valid=makeDraft(firstWorkflow());valid.positions.sense.x=Infinity;assert.throws(()=>decodeCanvas(JSON.stringify(valid)));});
