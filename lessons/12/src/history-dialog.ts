import { h, modal } from "../../../shared/creator/dom.ts";
import type { LogKind, Run } from "./engine/types.ts";
export const LOG_KIND_LABELS: Record<LogKind, string> = { observe: "观测", action: "动作", decision: "判断", plan: "规划", verify: "核验", environment: "环境变化", stop: "停止" };
export function showRunHistory(root: HTMLElement, runs: Run[]) {
  let selected = Math.max(0, runs.length - 1),
    page = 0;
  const dialog = modal(root, "最近八次真实试验", ""),
    body = dialog.querySelector<HTMLElement>(".dialog-body")!;
  function draw() {
    const run = runs[selected];
    if (!run) {
      body.innerHTML = "<p>尚无真实试验。先读环境，再执行一个动作。</p>";
      return;
    }
    const logs = run.logs,
      pages = Math.max(1, Math.ceil(logs.length / 4));
    page = Math.min(page, pages - 1);
    body.innerHTML = `<label class="dialog-field">选择一次运行<select id="history-run">${runs.map((r, i) => `<option value="${i}" ${i === selected ? "selected" : ""}>${i + 1} · ${r.config.mode === "planner" ? "目标规划" : "固定工作流"} · ${r.calls}次调用 / ${r.waterUsedMl}mL · ${h(r.stopMessage || "尚未结束")}</option>`).join("")}</select></label><div class="dialog-grid"><section><h3>这次运行自己的配置</h3><p>初始湿度 ${run.config.initial.moisture}% · 温度 ${run.config.initial.temperature}°C · 水箱 ${run.config.initial.tankMl}mL</p><p>调用上限 ${run.config.limits.maxCalls} 次 · 用水上限 ${run.config.limits.maxWaterMl}mL</p><p>故障：${
      Object.entries(run.config.faults)
        .filter(([, on]) => on)
        .map(
          ([key]) =>
            ({
              pumpBlocked: "管道堵塞",
              sensorOffline: "探针离线",
              weatherShift: "天气突变",
              repeatRequest: "重复请求",
            })[key],
        )
        .join("、") || "没有注入故障"
    }</p><p>结果：${h(run.stopMessage || "执行尚未结束")}</p><p>这里是只读回看，不会重新执行工具，也不会修改当前草稿。</p></section><section class="history-log-list">${logs
      .slice(page * 4, page * 4 + 4)
      .map(
        (log) =>
          `<article><b>${log.index + 1} · ${LOG_KIND_LABELS[log.kind] ?? h(log.kind)}</b><p>${h(log.summary)}</p><small>${log.world.moisture}% / ${log.world.temperature}°C · ${log.calls}次调用 · ${log.waterUsedMl}mL实际用水</small></article>`,
      )
      .join(
        "",
      )}</section></div><div class="dialog-actions"><button id="history-prev" ${page === 0 ? "disabled" : ""}>← 前页</button><span>${page + 1} / ${pages}</span><button id="history-next" ${page + 1 >= pages ? "disabled" : ""}>后页 →</button></div>`;
    body.querySelector("#history-run")!.addEventListener("change", (event) => {
      selected = Number((event.target as HTMLSelectElement).value);
      page = 0;
      draw();
    });
    body.querySelector("#history-prev")!.addEventListener("click", () => {
      page--;
      draw();
    });
    body.querySelector("#history-next")!.addEventListener("click", () => {
      page++;
      draw();
    });
  }
  draw();
}
