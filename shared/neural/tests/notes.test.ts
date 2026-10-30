import test from 'node:test';
import assert from 'node:assert/strict';
import {noteParts} from '../notes.ts';
test('long and newline-heavy notes paginate without losing or adding source text',()=>{
  for(const text of ['这是原来的长记录。'.repeat(600),'\n'.repeat(30),'第一行\n第二行\n第三行\n第四行\n第五行\n第六行']){
    const parts=noteParts(text);assert.equal(parts.join(''),text);
    assert.ok(parts.every(p=>p.split('\n').length<=5),'each page fits five explicit lines');
  }
});
