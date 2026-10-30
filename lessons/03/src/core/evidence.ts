import type { ForestState, Observation } from "./types.ts";
import type { Activity } from "../content/activities.ts";
import type { SpecimenOptions } from "../media/types.ts";
import { datasetKey } from "./dataset.ts";
const pair = (
  shots: Observation[],
  check: (a: Observation, b: Observation) => boolean,
) => shots.some((a, i) => shots.slice(i + 1).some((b) => check(a, b)));
function sameExcept(
  a: SpecimenOptions,
  b: SpecimenOptions,
  except: (keyof SpecimenOptions)[],
) {
  return (
    ["kind", "variant", "background", "angle", "light", "occlusion"] as const
  ).every((key) => except.includes(key) || a[key] === b[key]);
}

/** Counted actions are useful feedback, but completion also checks the materials
 * and learning versions those actions actually produced. */
export function materialRequirements(
  state: ForestState,
  activity: Activity,
): string[] {
  const id = activity.id,
    events = state.evidence[id]?.events ?? [],
    shots = state.observations.filter((s) => s.activityId === id),
    missing: string[] = [];
  const heard = state.sounds.filter(
    (s) =>
      s.activityId === id &&
      events.some(
        (e) =>
          e.action === "listen" &&
          e.value ===
            `${s.via === "text" ? "文字辅助:" : ""}${s.kind}:${s.noise}:${s.variant}`,
      ),
  );
  if (id === "02" && new Set(heard.map((s) => s.kind)).size < 2)
    missing.push("要听两种不一样的声音，同一种听两遍不算");
  if (
    id === "06" &&
    !pair(
      shots,
      (a, b) =>
        sameExcept(a.options, b.options, ["occlusion"]) &&
        a.options.occlusion !== b.options.occlusion,
    )
  )
    missing.push("同一个玩具，只挪叶子，前后各拍一张");
  if (
    id === "07" &&
    !heard.some((a, i) =>
      heard.slice(i + 1).some((b) => a.kind === b.kind && a.noise !== b.noise),
    )
  )
    missing.push("同一种声音，在吵的地方和安静的地方各录一次");
  if (
    id === "08" &&
    !pair(
      shots,
      (a, b) =>
        sameExcept(a.options, b.options, ["angle", "light"]) &&
        (a.options.angle !== b.options.angle ||
          a.options.light !== b.options.light),
    )
  )
    missing.push("同一个玩具，只转角度或调光线，前后各拍一张");
  if (id === "09") {
    if (
      !pair(
        shots,
        (a, b) =>
          sameExcept(a.options, b.options, ["background"]) &&
          a.options.background !== b.options.background,
      )
    )
      missing.push("其他都不动，只换背景纸，拍一组对照");
    if (
      !pair(
        shots,
        (a, b) =>
          sameExcept(a.options, b.options, ["kind", "variant"]) &&
          a.options.kind !== b.options.kind,
      )
    )
      missing.push("背景和光线不动，只换玩具，再拍一组");
  }
  const latest = state.models.at(-1);
  if (["17", "18", "19", "23"].includes(id)) {
    if (!latest || datasetKey(latest.examples) !== datasetKey(state.examples))
      missing.push("例子册改过了，先让小助手重新学一遍");
    if (
      id === "17" &&
      !events.some(
        (e) =>
          e.action === "compare" &&
          e.value.split(":")[1] === String(latest?.version),
      )
    )
      missing.push("重新学完后，比一比它学前学后的回答");
    const tests = state.results.filter(
      (r) => r.activityId === id && r.modelVersion === latest?.version,
    );
    if (id === "18" && !tests.length)
      missing.push("用重新学过的小助手再考一次");
    if (["19", "23"].includes(id) && !tests.some((r) => r.heldout))
      missing.push("用重新学过的小助手，考一张它没见过的新照片");
    if (id === "19")
      for (const [kind, background] of [
        ["car", "yellow"],
        ["block", "blue"],
      ]) {
        if (
          !shots.some(
            (s) =>
              s.options.kind === kind &&
              s.options.background === background &&
              state.examples.some(
                (e) => e.image === s.image && e.label === kind,
              ),
          )
        )
          missing.push(
            `把${kind === "car" ? "黄纸上的小车" : "蓝纸上的积木"}放进例子册`,
          );
      }
    if (
      id === "23" &&
      !["maple", "ginkgo"].every((kind) =>
        state.examples.some((e) => e.label === kind),
      )
    )
      missing.push("例子册里要有枫叶和银杏叶两种");
  }
  if (id === "20") {
    const frozen = [...events]
      .reverse()
      .find((e) => e.action === "freeze")?.value;
    const tests = state.results.filter(
      (r) => r.activityId === id && String(r.modelVersion) === frozen,
    );
    if (
      !tests.some((r) => !r.heldout) ||
      new Set(tests.filter((r) => r.heldout).map((r) => r.image)).size < 2
    )
      missing.push("用同一个封存的版本，考一张老照片和两张不一样的新照片");
  }
  return missing;
}
