// Shared visible-control actions for the course's Playwright regression tools.
export async function operate(page,locator){
 const dock=await locator.evaluate(el=>el.closest('.workbench-dock')?.id);
 if(dock){
  if(!await page.locator(`#${dock}`).isVisible())await page.locator(`.dock-rail [data-dock="${dock.replace('dock-','')}"]`).click();
 }else if(!await locator.evaluate(el=>!!el.closest('dialog'))){
  const close=page.locator('.workbench-dock:not([hidden]) [data-action="dock-close"]');
  while(await close.count())await close.first().click();
 }
 const pageInfo=await locator.evaluate(el=>{
  const record=el.closest('.proof,.ticket,.term'),list=record?.parentElement;
  const pager=list?.nextElementSibling;
  if(!record?.hidden||!pager?.matches('.record-pager'))return null;
  return {id:list.dataset.pagerId,index:[...list.children].indexOf(record),size:Number(pager.dataset.pageSize)};
 });
 if(pageInfo){
  const pager=page.locator(`.record-pager[data-list="${pageInfo.id}"]`);
  await pager.getByRole('combobox',{name:'跳到记录页'}).selectOption(String(Math.floor(pageInfo.index/pageInfo.size)));
 }
 await locator.click();
 const lesson=page.locator('dialog[open][data-kind="preparation"]');
 if(await lesson.count())await lesson.locator('[data-action="knowledge-continue"]').click();
}
export async function dismissPracticeOffer(page){
 if(await page.locator('dialog[open][data-kind="practice-welcome"]').count()){
  await page.locator('[data-action="practice-defer"]').click();
 }
}
export async function completePractice(page){
 await page.locator('dialog[open][data-kind="practice-welcome"]').waitFor();
 await page.locator('[data-action="practice-start"]').click();
 await page.locator('body[data-practice="0"]').waitFor({state:"attached"});
 await page.locator('.drawer-photos [data-photo-id="t001"]').click();
 await page.locator('body[data-practice="1"]').waitFor({state:"attached"});
 await page.locator('[data-filter="green"]').click();
 await page.locator('body[data-practice="2"]').waitFor({state:"attached"});
 await page.locator('.label-card [data-action="review"]').click();
 await page.locator('body[data-practice="3"]').waitFor({state:"attached"});
 await page.locator('.label-choice [data-value="1"]').click();
 await page.locator('body[data-practice="4"]').waitFor({state:"attached"});
 await page.locator('[data-action="teach"]').click();
 await page.locator('.coach-card [data-action="practice-reflect"]:not([disabled])').waitFor({timeout:15000});
 await page.locator('[data-action="practice-reflect"]').click();
 await page.locator('.test-box').click();
 await page.locator('.practice-check').waitFor();
 await page.locator('[data-action="practice-inspection-done"]').click();
 await page.locator('.coach-card [data-action="practice-answer"][data-value="wrong"]').click();
 await page.locator('.coach-feedback').waitFor();
 await page.locator('.coach-card [data-action="practice-answer"][data-value="right"]').click();
 await page.locator('[data-action="practice-finish"]').click();
 await page.locator('body[data-practice=""]').waitFor({state:"attached"});
}
