import type {} from "../../../shared/linkage/platform-client.d.ts";
import "./ui/styles.css";
import "./ui/workbench.css";
import "./ui/guidance.css";
import "../../../shared/linkage/course-links.js";
import { loadCatalog } from "./content/catalog.ts";
import { PhotoLibrary } from "./render/photos.ts";
import { decodeSession, SAVE_KEY, PREVIOUS_EXPERIMENT_KEY, type StorageLike } from "./core/storage.ts";
import { ORIENTATION_KEY } from "./core/orientation.ts";
import { Workbench } from "./ui/workbench.ts";
import { escape } from "./ui/dom.ts";
async function start() {
  const app=document.querySelector<HTMLElement>("#app")!;
  try {
    const platform = await window.NovaPlatformReady;
if (platform) await platform.ready;
    const localPort: StorageLike = { getItem: key => localStorage.getItem(key), setItem: (key, raw) => localStorage.setItem(key, raw) };
    const storage = platform ? await platform.openChapter({
      chapter: 5, keys: [SAVE_KEY, PREVIOUS_EXPERIMENT_KEY, ORIENTATION_KEY],
      validate: (key, raw) => key === ORIENTATION_KEY || !decodeSession(raw).warning,
    }) : localPort;
    const catalog=await loadCatalog();
    let raw:string|null=null,storageWarning="";
    try{raw=storage.getItem(SAVE_KEY);}catch{storageWarning="这台电脑暂时存不下进度；可以照常操作，结束前记得导出实验记录。";}
    const loaded=decodeSession(raw),workbench=new Workbench(app,loaded.state,new PhotoLibrary(catalog),storage);
    if(import.meta.env.DEV)(window as unknown as {__workbench:Workbench}).__workbench=workbench;
    await workbench.start();if(loaded.warning||storageWarning)workbench.notify(loaded.warning||storageWarning);
  }catch(error){app.innerHTML=`<div class="loading-screen"><span>NOVA 奇点 · 第五章</span><h1>灯箱还没能点亮</h1><p>${escape(error instanceof Error?error.message:error)}</p><button onclick="location.reload()">重新加载</button></div>`;}
}
void start();
