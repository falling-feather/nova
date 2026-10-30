

import '../../../shared/linkage/course-links.js';
import { browserSessionStore } from './storage.ts';
import { startBlueprint } from './blueprint.ts';

void browserSessionStore().then(startBlueprint).catch(error => {
  const root = document.getElementById('app')!;
  root.innerHTML = '<header class="topbar"><div data-nova-return-host></div><strong>温室行动实验室</strong></header><main class="startup-error"><h1>本机学习记录暂时无法读取</h1><p>请刷新重试，或返回奇点。原记录保留。</p><p id="startup-detail"></p></main>';
  document.getElementById('startup-detail')!.textContent = error instanceof Error ? error.message : String(error);
  (window as unknown as { NovaCourseLinks?: { mountReturn(): void } }).NovaCourseLinks?.mountReturn();
});
