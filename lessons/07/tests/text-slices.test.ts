import {test} from 'node:test';
import assert from 'node:assert/strict';
import {textSlices} from '../src/ui/text-slices.ts';
test('editing pages keep supplementary characters and reconstruct the complete field',()=>{
  const text='甲'.repeat(119)+'𰻞😀乙'.repeat(60);
  const pieces=textSlices(text,120).map(s=>text.slice(s.start,s.end));
  assert.equal(pieces.join(''),text);
  assert.equal(pieces.every(p=>!/[\uD800-\uDBFF]$/.test(p)&&!/^[\uDC00-\uDFFF]/.test(p)),true);
});
