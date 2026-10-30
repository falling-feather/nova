import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDay, textPages } from '../src/reading.ts';

test('翻页保留长文、换行及emoji，不以截断或省略号丢失原文', () => {
  for (const text of ['通知\n'.repeat(150), '甲乙🌳ABC '.repeat(1000), '', '\n'.repeat(30)]) {
    const pages = textPages(text);
    assert.equal(pages.join(''), text);
    assert.ok(pages.every(page => page.split('\n').length <= 7));
  }
});
test('显示日期按北京时间处理跨日，ISO存档时间不被改写', () => {
  assert.equal(localDay('2026-10-14T15:59:59Z'), '2026-10-14');
  assert.equal(localDay('2026-10-14T16:00:00Z'), '2026-10-15');
});
