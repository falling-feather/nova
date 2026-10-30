// 在 Web Worker 里运行沙画师傅（ONNX），避免生成时卡住画面。
// 统一服务没有跨源隔离，WASM 按单线程运行。

import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

type InitMsg = { type: "init"; modelUrl: string };
type EpsMsg = { type: "eps"; id: number; x: Float32Array; t: Float32Array; cond: Float32Array; batch: number; condDim: number };

let session: ort.InferenceSession | null = null;

self.onmessage = async (event: MessageEvent<InitMsg | EpsMsg>) => {
  const msg = event.data;
  try {
    if (msg.type === "init") {
      // WASM 运行库由 Vite 随本章一起打包，按相对地址加载
      ort.env.wasm.numThreads = 1;
      // 开发服务器不会改写运行库内部的动态 URL，显式交给 Vite 解析，避免读到 HTML 回退页。
      ort.env.wasm.wasmPaths = { wasm:new URL(wasmUrl,import.meta.url).href };
      const started = performance.now();
      const bytes = new Uint8Array(await (await fetch(msg.modelUrl)).arrayBuffer());
      session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      (self as unknown as Worker).postMessage({ type: "ready", ms: performance.now() - started, bytes: bytes.length });
      return;
    }
    if (!session) throw new Error("沙画师傅还没准备好");
    const feeds = {
      x: new ort.Tensor("float32", msg.x, [msg.batch, 1, 32, 32]),
      t: new ort.Tensor("float32", msg.t, [msg.batch]),
      cond: new ort.Tensor("float32", msg.cond, [msg.batch, msg.condDim]),
    };
    const out = await session.run(feeds);
    const eps = Float32Array.from(out.eps.data as Float32Array);
    (self as unknown as Worker).postMessage({ type: "eps", id: msg.id, eps }, [eps.buffer]);
  } catch (error) {
    (self as unknown as Worker).postMessage({ type: "error", id: (msg as EpsMsg).id ?? -1, message: error instanceof Error ? error.message : String(error) });
  }
};
