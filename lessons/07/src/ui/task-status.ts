import type { Course } from "../course/course.ts";
import { stationsForRoute } from "../content/lessons.ts";
import { button as b, escape as e } from "./dom.ts";
export function taskStatus(c: Course) {
  if (c.hub) return "";
  const sequence = stationsForRoute(c.progress.route),
    completed = sequence.filter((id) => c.progress.done[id]).length;
  const next = c.done
    ? "这次观察已装进手记，可继续探索。"
    : (c.checks.find((x) => !x.done)?.text ??
      (c.needsReview ? "有新发现了，把你的解释写进手记。" : "观察已留下。"));
  const action = !c.ready && !c.done ? b("提示", "hint") : "";
  const index = sequence.indexOf(c.id),
    position =
      index >= 0
        ? `${c.progress.route === "core" ? "核心路线" : "完整探索"} · ${index + 1}/${sequence.length}`
        : "深入研究";
  return `<div class="task-status-top"><span>${position}</span>${b("完成条件", "checklist")}</div><div class="task-meter" role="progressbar" aria-label="已完成环节" aria-valuemin="0" aria-valuemax="${sequence.length}" aria-valuenow="${completed}"><i style="width:${(completed / sequence.length) * 100}%"></i></div><div class="task-next"><p>${e(next)}</p>${action}</div>`;
}
