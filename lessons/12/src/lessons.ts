export const lessons = [
  { title: '说完成，不等于做成', question: '一句“已浇水”，能让土壤变湿吗？', task: '先留一句声明，再亲手浇水并读取传感器。对照文字、实际出水和观测。', concept: '声明没有改变世界。工具回执说明调用发生；再次观测才能验证实际结果。', prompt: '哪条证据只能证明说了，哪条能证明环境改变？' },
  { title: '接通可靠的工作流', question: '怎样让行动接回可靠的观测？', task: '从积木端口接线，改浇水量，再单步看判断走向。试试把行动直接接到完成。', concept: '工作流沿预先连接的出口执行。分支与循环可以读取反馈，完成仍须新观测。', prompt: '你的回路如何核验结果？哪条接线改变了执行？' },
  { title: '谁来决定下一步', question: '热浪来了，下一步由谁决定？', task: '设置动作后热浪，留一组同条件对照。看编排走哪条线，搜索为何换了一步。', concept: '两种方式都有反馈。编排按已接出口前进；BFS从新观测搜索，执行第一步后重新读取。', prompt: '引用两次运行，说明下一步分别从哪里来。' },
  { title: '给行动划边界', question: '什么时候停止，反而是正确的？', task: '试试管道堵塞、探针离线、缺许可或预算不足。查看真实停止原因，再调整复验。', concept: '命令接受不等于实际执行。缺可靠观测、越界或连续无进展时，应停止或找人。', prompt: '哪个失败能换计划解决，哪个需要人检查设备？' },
  { title: '面对新的一天', question: '昨天成功，今天也一定可靠吗？', task: '抽取陌生状态，先预测，再试验。回看关键一步，只改一个变量后复验并导出方案。', concept: '一次成功不能证明普遍可靠。可运行配置、失败、修订和适用边界都是作品的一部分。', prompt: '引用一次实际回放，解释修订和仍需人判断的边界。' },
] as const;

export const guide = [
  { title: '先读眼前的温室', text: '点温室里的观测探针。右边会出现它实际读到的湿度、温度和水箱。', tool: 'observe' },
  { title: '动手，再看证据', text: '把水壶拖到种植床，或点水壶发送20mL请求。然后再读探针，看湿度和水箱怎样变。', tool: 'water' },
  { title: '接出你自己的回路', text: '点积木输出端，再点另一块的输入端；也可以拖端口接线。单步运行，看下一步是否改变。', tool: 'board' },
] as const;

/** 长旧记录按字数和换行分页；不把被裁切的内容藏在滚动区。 */
export function textPages(text: string, limit = 180, columns = 25, maxLines = 8): string[] {
  const pages: string[] = []; let page = ''; let column = 0; let lines = 1; let count = 0;
  for (const char of text) {
    const nextColumn = char === '\n' ? 0 : column + 1;
    const nextLines = lines + (char === '\n' || nextColumn > columns ? 1 : 0);
    if (count >= limit || nextLines > maxLines) { pages.push(page); page = ''; column = 0; lines = 1; count = 0; }
    page += char; count += 1;
    if (char === '\n') { column = 0; lines += 1; } else if (column >= columns) { column = 1; lines += 1; } else column += 1;
  }
  if (page || pages.length === 0) pages.push(page);
  return pages;
}
