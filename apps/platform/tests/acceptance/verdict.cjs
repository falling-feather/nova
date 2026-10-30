function desktopFailures(report, requested) {
  const failures=[];
  for(const item of report.pending||[])failures.push(`第${item.chapter}章未就绪：${item.reason}`);
  for(const error of report.errors||[])failures.push(String(error));
  for(const chapter of requested){
    const result=(report.results||[]).find(r=>r.chapter===chapter);
    if(!result){failures.push(`第${chapter}章没有实测结果`);continue;}
    if(result.error)failures.push(`第${chapter}章流程失败：${result.error}`);
    if(!result.returned)failures.push(`第${chapter}章未实际返回对应详情`);
    if(result.buildMode!=='static-production')failures.push(`第${chapter}章不是生产构建`);
    for(const field of ['errors','failedResources','failedRequests'])if(result[field]?.length)failures.push(`第${chapter}章${field}：${result[field].length}`);
    for(const state of ['entry','workspace'])for(const width of [1366,1440]){
      const snap=result.snapshots?.find(s=>s.state===state&&s.layout?.viewport?.width===width),label=`第${chapter}章 ${state} ${width}`;
      if(!snap){failures.push(`${label}未测`);continue;}
      const l=snap.layout;
      if(l.pageOverflow.x>2||l.pageOverflow.y>2||l.counts.nestedScrolls>0)failures.push(`${label}存在滚动`);
      const modalEntry=state==='entry'&&l.returnLink?.suspendedByModal===true;
      if(!l.returnLink?.found||!l.returnLink.inViewport||(!l.returnLink.hitTest&&!modalEntry))failures.push(`${label}返回不可用`);
    }
  }
  return failures;
}
module.exports={desktopFailures};
