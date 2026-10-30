import fs from "node:fs/promises";
import path from "node:path";

/** Isolated test page; production builds never contain this fixture or its hooks. */
export async function createCourseHarness(output) {
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(
    path.join(output, "course-harness.html"),
    `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<body><div class="forest-ui"><div class="panel-host" id="test-panels"></div></div>
<script type="module">
import '/src/ui/styles.css';import '/src/ui/workbench.css';
import {createState,completeActivity} from '/src/core/state.ts';
import {writeSave,readSave} from '/src/core/storage.ts';
import {activityById} from '/src/content/activities.ts';
import {createSeedExamples} from '/src/media/specimens.ts';import {loadSpecimenArt} from '/src/media/specimen-art.ts';
import {fitExamples} from '/src/media/classifier.ts';
import {renderWorkbench} from '/src/ui/workbench.ts';import {AudioPlayer} from '/src/media/audio.ts';
await loadSpecimenArt();let state=createState();state.preferences.reducedMotion=true;
state.models=[fitExamples(createSeedExamples(),1)];const audio=new AudioPlayer();let dispose;
const host=document.querySelector('#test-panels');
window.lessonHarness={
  get state(){return state},
  roundtrip(){
    let raw='';const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v},removeItem(){}};
    writeSave(storage,state);const loaded=readSave(storage);
    if(!loaded.writable)throw Error(loaded.warning);state=loaded.state;
  },
  open(id){dispose?.();dispose=renderWorkbench(host,state,activityById(id),audio,{
    close(){dispose?.();dispose=undefined;host.replaceChildren()},changed(){},
    message(message){window.harnessMessage=message},
    complete(id){window.harnessResult=completeActivity(state,id)}
  })},
};
document.body.style.background='linear-gradient(135deg,#476a54,#b0bd86)';
</script></body></html>`,
    "utf8",
  );
}
