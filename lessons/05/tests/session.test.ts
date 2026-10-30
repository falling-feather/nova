import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, editLabel, reviewPhoto, labelOf, teachPhoto, undoLearning, inspectPhoto, runInspection, setRate, selectPhoto, lockModels, placeExhibit, availableBatches } from "../src/core/session.ts";
import type { AnalyzedPhoto } from "../src/core/types.ts";
const sample: AnalyzedPhoto = { id: "t001", name: "绿叶", atlas: "a.png", cell: 0, role: "train", batch: 1, flower: false, shape: 0.1, submittedFlip: [], features: [0.8, 0, 0, 0.5, 0.1, 0.1], truth: {flower:false,green:true,quality:true}, submitted: {flower:false,green:true,quality:true} };
const heldout: AnalyzedPhoto = {...sample,id:"v001",role:"test",testStage:1,testBox:0};
test("correcting a label does not train or change any prediction", () => {
  const s = createSession(), before = structuredClone(s.models);
  editLabel(s, sample.id, "green", false);
  assert.deepEqual(s.models, before); assert.equal(s.edits[sample.id].green, false);
});
test("single-photo learning changes only selected attribute and records real update", () => {
  const s = createSession(); s.active = "green";
  const receipt = teachPhoto(s, sample, ["green"]);
  assert.equal(s.models.green.steps, 1); assert.equal(s.models.flower.steps, 0);
  assert.ok(s.models.green.weights[0] > 0);
  assert.equal(receipt.updates[0].beforeProbability, 0.5);
  assert.deepEqual(s.learnedIds, ["t001"]);
});
test("undo restores parameters but test images remain permanently exposed", () => {
  const s = createSession(), before = structuredClone(s.models);
  teachPhoto(s, heldout, ["green"]);
  assert.deepEqual(s.contaminatedIds, ["v001"]);
  assert.equal(undoLearning(s), true); assert.deepEqual(s.models, before);
  assert.deepEqual(s.contaminatedIds, ["v001"]);
  assert.equal(runInspection(s, [heldout], "green").eligible, 0);
});
test("checking photos never changes parameters and accuracy uses only unseen eligible images", () => {
  const s = createSession(); teachPhoto(s, heldout, ["green"]);
  const before = structuredClone(s.models);
  inspectPhoto(s, sample); const result = runInspection(s, [heldout,{...heldout,id:"v002"}], "green");
  assert.deepEqual(s.models, before); assert.equal(result.eligible, 1);
  assert.equal(result.rows.length, 2); assert.equal(result.rows[0].excluded, true);
});
test("rate change and selection do not train", () => {
  const s = createSession(), before = structuredClone(s.models);
  setRate(s, "heavy"); selectPhoto(s, "t010", "train");
  assert.deepEqual(s.models, before); assert.equal(s.rate, "heavy");
});
test("diverse flower batch opens only after flower inspection", () => {
  const s = createSession(); s.stage = 3;
  assert.deepEqual(availableBatches(s), [2]);
  runInspection(s, [{...heldout,testStage:3}], "flower");
  assert.deepEqual(availableBatches(s), [2,3]);
});
test("sealed exhibition makes training impossible, inference still works", () => {
  const s = createSession(); s.stage=5; lockModels(s);
  const before = structuredClone(s.models);
  assert.throws(() => teachPhoto(s,sample,["green"]), /封存/);
  const decision = placeExhibit(s,{...sample,role:"exhibit",id:"e001"},"green",true);
  assert.equal(decision.by, "student"); assert.deepEqual(s.models, before);
  assert.equal(s.wall.e001.attribute,"green");
});
test("attempting undo while sealed preserves the receipt and model", () => {
  const s=createSession();teachPhoto(s,sample,["green"]);lockModels(s);
  const before=structuredClone(s);
  assert.throws(()=>undoLearning(s),/封存/);
  assert.deepEqual(s,before);
});
test("flower delivery cannot be triggered by checking a different attribute", () => {
  const s=createSession();s.stage=3;runInspection(s,[heldout],"green");
  assert.equal(s.flowerDelivery,false);
});
test("undo preserves the record of trying a learning amount", () => {
  const s=createSession();setRate(s,"heavy");teachPhoto(s,sample,["green"]);undoLearning(s);
  assert.deepEqual(s.ratesTried,["heavy"]);
});
test("checking a submission never rewrites its label or the model",()=>{
 const wrong={...sample,submitted:{...sample.submitted,green:false},submittedFlip:["green" as const]};
 const s=createSession(),before=structuredClone(s.models);reviewPhoto(s,wrong.id);
 assert.ok(s.reviewedIds.includes(wrong.id));assert.equal(labelOf(s,wrong,"green"),false,"the student still has to correct it");
 editLabel(s,wrong.id,"green",true);
 assert.equal(labelOf(s,wrong,"green"),true);assert.ok(s.reviewedIds.includes(wrong.id));assert.deepEqual(s.models,before);
});
test("learning uses the student's corrected label, not the submitted one",()=>{
 const wrong={...sample,submitted:{...sample.submitted,green:false},submittedFlip:["green" as const]};
 const s=createSession();editLabel(s,wrong.id,"green",true);
 const receipt=teachPhoto(s,wrong,["green"]);assert.equal(receipt.targets.green,true);assert.ok(s.models.green.weights[0]>0);
});
