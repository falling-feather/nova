const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/content/layout.js');
require('../src/content/curriculum.js');
global.Learning = {};
global.TownMedia = {};
global.TownIcons = {};
require('../src/ui/base.js');

test('activity screens retain every original evidence key exactly once', () => {
  for (const [id, groups] of Object.entries(TownUI.screenGroups)) {
    const keys = groups.flat();
    assert.equal(new Set(keys).size, keys.length, id);
    assert.deepEqual(keys, Curriculum.get(id).required, id);
  }
});
test('orders, transcript editing and publication share their activity screen', () => {
  assert.ok(TownUI.screenGroups.everyday.some(group => group.includes('translate') && group.includes('checkOrder')));
  assert.ok(TownUI.screenGroups.everyday.some(group => group.includes('transcribe') && group.includes('publish')));
});
