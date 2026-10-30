/** Regression drivers navigate authored sheets through the same buttons as students. */
export function uiControls(page) {
  const cmd=(name,value,scope=page)=>scope.locator(`[data-cmd="${name}"]${value===undefined?'':`[data-value="${value}"]`}`).filter({visible:true}).first();
  const reveal=async(selector,scope=page)=>{
    const all=scope.locator(selector),visible=all.filter({visible:true}).first();
    await all.first().waitFor({state:'attached'});
    if(await visible.isVisible())return visible;
    const key=await all.first().evaluate(el=>el.closest('[data-sheet-key]')?.dataset.sheetKey);
    if(!key)throw Error(`No reachable sheet for ${selector}`);
    const host=page.locator(`[data-sheet-key=${JSON.stringify(key)}]`);
    for(let i=0;i<60&&!await visible.isVisible();i++) {
      const next=host.locator('[data-sheet-move="1"]'),previous=host.locator('[data-sheet-move="-1"]');
      if(await next.isEnabled())await next.click();else {while(await previous.isEnabled())await previous.click();if(!await next.isEnabled())break;}
    }
    if(!await visible.isVisible())throw Error(`Unreachable ${selector}`);
    return visible;
  };
  const click=async(name,value,scope=page)=>{
    const selector=`[data-cmd="${name}"]${value===undefined?'':`[data-value="${value}"]`}`;
    await(await reveal(selector,scope)).click();
    if(name!=='guide-start'&&await cmd('guide-start').isVisible())await cmd('guide-start').click();
  };
  const field=async(name,value,scope=page)=>await(await reveal(`[data-field="${name}"]`,scope)).fill(value);
  return {cmd,reveal,click,field};
}
