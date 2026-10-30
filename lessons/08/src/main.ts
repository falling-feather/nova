import "./ui/styles.css";
import "./ui/coastal-workbench.css";
import "../../../shared/linkage/course-links.js";
import { App } from "./app.ts";
import { loadMeta } from "./model/client.ts";
import { PracticeLibrary } from "./model/practice.ts";
import { openRepository } from "./persistence.ts";
import { h } from "./ui/dom.ts";
async function start(){
  const root=document.querySelector<HTMLElement>("#app")!;
  try{
    const base=new URL("models/",document.baseURI);
    const [meta,practice]=await Promise.all([loadMeta(new URL("sand-master.json",base).href),PracticeLibrary.load(base.href)]);
    const repository=await openRepository(),loaded=repository.read(),app=new App(root,meta,practice,loaded.state,repository);
    await app.start();if(loaded.warning)app.toast(loaded.warning);
    if(import.meta.env.DEV)(window as unknown as {__tides:App}).__tides=app;
  }catch(error){root.replaceChildren(h("div.boot",{},h("span",{},"潮汐沙画节"),h("h1",{},"实验材料还没准备好"),h("p",{},error instanceof Error?error.message:String(error)),h("button",{onclick:()=>location.reload()},"重新准备")));}
}
void start();
