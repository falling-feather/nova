import "./style.css";
import "../../../shared/linkage/course-links.js";
import { loadModels } from "./model/assets.ts";
import { ProgressStorage, openProgressPort } from "./core/storage.ts";
import { Course } from "./course/course.ts";
import { Workshop } from "./scene/workshop.ts";
import { App } from "./ui/app.ts";

const root = document.querySelector<HTMLElement>("#app")!;
const status = (text: string) => {
  const label = document.querySelector("#load-status");
  if (label) label.textContent = text;
};
async function start() {
  const storageReady = openProgressPort();
  performance.mark("workshop-start");
  const modelsReady = loadModels(status);
  const fontsReady = document.fonts.load('600 24px "Workshop Serif"');
  const sceneHost = document.createElement("div");
  sceneHost.id = "scene";
  document.body.prepend(sceneHost);
  const workshop = new Workshop(sceneHost);
  const [models, , , port] = await Promise.all([
    modelsReady,
    workshop.initialize(),
    fontsReady,
    storageReady,
  ]);
  const store = new ProgressStorage(port);
  performance.mark("workshop-assets-ready");
  performance.measure(
    "workshop-startup",
    "workshop-start",
    "workshop-assets-ready",
  );
  const course = new Course(models, store);
  const curtain = root.querySelector<HTMLElement>(".loading");
  if (curtain) {
    curtain.id = "startup-curtain";
    document.body.append(curtain);
  }
  status("正在校准案头的光影…");
  new App(root, course, workshop);
  Object.defineProperty(window, "workshopDiagnostics", {
    value: () => workshop.snapshot(),
    writable: false,
  });
  window.addEventListener("pagehide", () => {
    course.flush();
    void store.flushQueued().catch(() => {
      /* public platform status reports a failed queue */
    });
  });
  await workshop.prepareFirstFrame();
  root.dataset.ready = "true";
  curtain?.remove();
}
start().catch((error) => {
  console.error(error);
  document.getElementById("startup-curtain")?.remove();
  root.innerHTML =
    '<div class="loading error-screen"><span>活字印书局</span><h1>灯还没点亮。</h1><p>课程资源或三维渲染未能加载。请检查本地服务，使用支持 WebGL 2 的浏览器重试。</p><button class="primary" id="retry">重新打开</button><details><summary>查看原因</summary><pre></pre></details></div>';
  root.querySelector("pre")!.textContent =
    error instanceof Error ? error.message : String(error);
  root
    .querySelector("#retry")!
    .addEventListener("click", () => location.reload());
});
