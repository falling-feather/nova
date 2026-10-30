import { evaluateRows, trainStep } from "./model.ts";
import type { DenseModel, NumericRow, LossPoint } from "./types.ts";
let cancelled = false;
self.onmessage = async (
  e: MessageEvent<{
    kind: "train" | "stop";
    model: DenseModel;
    train: NumericRow[];
    validation: NumericRow[];
    steps: number;
  }>,
) => {
  if (e.data.kind === "stop") {
    cancelled = true;
    return;
  }
  cancelled = false;
  const { model, train, validation, steps } = e.data,
    history: LossPoint[] = [];
  const point = () => ({
    step: model.steps,
    train: evaluateRows(model, train).loss,
    validation: evaluateRows(model, validation).loss,
  });
  history.push(point());
  try {
    for (let i = 0; i < steps && !cancelled; i++) {
      trainStep(model, train);
      if ((i + 1) % 10 === 0 || i + 1 === steps) {
        history.push(point());
        self.postMessage({
          kind: "progress",
          steps: model.steps,
          model,
          history,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    self.postMessage({ kind: "done", model, history, cancelled });
  } catch (error) {
    self.postMessage({
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
