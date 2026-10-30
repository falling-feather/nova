import {test} from "node:test";
import assert from "node:assert/strict";
import {photoRectangle,previewGeometry} from "../src/core/atlas.ts";
test("nonuniform atlas rows use explicit pixel bounds instead of nominal grid guesses",()=>{
 const rect=photoRectangle({cell:8,rect:[518,246,244,228],atlasSize:[1536,1024]});
 assert.deepEqual(rect,[518,246,244,228]);
});
test("preview CSS bounds select the same source rectangle as pixel analysis",()=>{
 const g=previewGeometry({cell:0,rect:[6,6,244,244],atlasSize:[1536,1024]});
 assert.ok(Math.abs(g.sizeX-629.5081967213)<1e-8);
 assert.ok(Math.abs(g.positionX-.4643962848)<1e-8);
 assert.equal(g.ratio,1);
});
test("out of bounds or zero sized atlas rectangles are rejected",()=>{
 assert.throws(()=>photoRectangle({cell:0,rect:[1500,0,100,100],atlasSize:[1536,1024]}),/照片范围/);
 assert.throws(()=>photoRectangle({cell:0,rect:[0,0,0,100],atlasSize:[1536,1024]}),/照片范围/);
});
