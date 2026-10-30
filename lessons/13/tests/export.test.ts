import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exhibitionHtml } from '../src/export.ts';
import { createProject } from '../src/seed.ts';

test('离线展位脚本可解析，恶意闭合标签不会逃出数据块，完整项目仍可下载', () => {
  const p = createProject(); p.title = '</script><img src=x onerror=alert(1)>';
  const html = exhibitionHtml(p, 'http://127.0.0.1:5178/courses/?chapter=13');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0]![1]!));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /download='奇点共创展项目.json'/);
});
