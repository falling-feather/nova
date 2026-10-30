import test from 'node:test';
import assert from 'node:assert/strict';
import { splitText } from '../src/ui/paging.ts';
test('长资料、换行与中文标点可完整翻阅，不裁掉字符', () => {
  for (const value of ['资料与来源。'.repeat(150), '甲\n'.repeat(80), '🙂\n全文保留\r\n'.repeat(40)]) {
    const pages = splitText(value);
    assert.equal(pages.join(''), value);
    assert.ok(pages.length > 1);
    for (const page of pages) assert.ok(Array.from(page).length <= 147);
  }
});
