/** 返回地址校验属于共享组件；本章只提供持续可见的挂载位置。 */
export function mountReturn(root: HTMLElement) {
  (window as unknown as { NovaCourseLinks?: { mountReturn(): void } }).NovaCourseLinks?.mountReturn();
  const host = root.querySelector<HTMLElement>('[data-nova-return-host]');
  if (!host || root.querySelector('#nova-course-return')) return;
  const link = document.createElement('a');
  link.className = 'nova-course-return';
  link.id = 'nova-course-return';
  link.textContent = '← 返回奇点';
  link.href = new URL('../../courses/?chapter=9', location.href).href;
  link.target = '_top';
  host.prepend(link);
}
