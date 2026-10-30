// GPU timings are asynchronous. Each carries its render scale, so a late result
// cannot lower a new budget twice. Without queries, RAF cadence and main-thread
// work are used; intentionally skipped render frames are not GPU load.
export class FrameBudget {
  constructor(mode = "auto") {
    this.scale = 1;
    this.minimum = mode === "fine" ? 0.5 : 0.45;
    this.pause();
  }
  pause() {
    this.samples = [];
    this.duration = 0;
    this.headroom = 0;
  }
  calibrate(ms) {
    if (Number.isFinite(ms) && ms > 25) {
      this.scale = Math.max(
        this.minimum,
        Math.min(1, Math.floor(Math.sqrt(19 / ms) * 20) / 20),
      );
    }
    this.pause();
  }
  observe({
    elapsed,
    frameInterval = elapsed,
    cpuMs = 0,
    gpuMs = null,
    scale = this.scale,
  }) {
    if (!Number.isFinite(elapsed) || elapsed <= 0 || elapsed > 1000) {
      this.pause();
      return false;
    }
    if (Math.abs(scale - this.scale) > 0.001) return false;
    const hasGpuTiming = Number.isFinite(gpuMs) && gpuMs > 0;
    const cost = Math.max(
      Number.isFinite(cpuMs) && cpuMs > 0 ? cpuMs : 0,
      hasGpuTiming ? gpuMs : frameInterval,
    );
    // A stable 60 Hz RAF is evidence to try one small recovery step, not proof
    // of zero GPU work. Hysteresis still backs off promptly if that probe fails.
    const recoveryLimit = hasGpuTiming ? 16 : 1000 / 60 + 1;
    if (!Number.isFinite(cost) || cost <= 0) return false;
    if (cost >= recoveryLimit) this.headroom = 0;
    this.samples.push(cost);
    this.duration += elapsed;
    if (this.samples.length < 8 || this.duration < 450) return false;
    // A median hides recurring missed refreshes when fewer than half the
    // frames stall. The upper quartile catches that pattern, while one isolated
    // upload/OS hiccup still cannot lower the budget of a complete window.
    const frameCost = [...this.samples].sort((a, b) => a - b)[
      Math.floor(this.samples.length * 0.75)
    ];
    const before = this.scale;
    if (frameCost > 21.5) {
      const estimate = this.scale * Math.sqrt(17.5 / frameCost);
      this.scale = Math.max(
        this.minimum,
        Math.floor(
          Math.max(this.scale - 0.2, Math.min(this.scale - 0.05, estimate)) *
            20,
        ) / 20,
      );
      this.headroom = 0;
    } else if (frameCost < recoveryLimit) {
      this.headroom += this.duration;
      if (this.headroom >= 3000) {
        this.scale = Math.min(1, Math.round((this.scale + 0.05) * 20) / 20);
        this.headroom = 0;
      }
    } else this.headroom = 0;
    this.samples = [];
    this.duration = 0;
    return this.scale !== before;
  }
}

export class GpuTimer {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.extension = this.gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.pending = [];
    this.active = null;
  }
  begin(scale, elapsed, frameInterval = elapsed) {
    const gl = this.gl,
      ext = this.extension;
    if (!ext || this.active || this.pending.length >= 6 || gl.isContextLost())
      return false;
    const query = gl.createQuery();
    if (!query) return false;
    this.active = { query, scale, elapsed, frameInterval };
    gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    return true;
  }
  end(cpuMs = 0) {
    if (!this.active) return;
    this.active.cpuMs = cpuMs;
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }
  poll() {
    const gl = this.gl;
    if (!this.extension || gl.isContextLost()) return [];
    if (gl.getParameter(this.extension.GPU_DISJOINT_EXT)) {
      this.clear();
      return [];
    }
    const results = [];
    while (
      this.pending.length &&
      gl.getQueryParameter(this.pending[0].query, gl.QUERY_RESULT_AVAILABLE)
    ) {
      const result = this.pending.shift();
      results.push({
        ...result,
        gpuMs: gl.getQueryParameter(result.query, gl.QUERY_RESULT) / 1e6,
      });
      gl.deleteQuery(result.query);
    }
    return results;
  }
  clear() {
    this.end();
    for (const { query } of this.pending) this.gl.deleteQuery(query);
    this.pending = [];
  }
}
