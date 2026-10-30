export function materialTextures(root) {
  const textures = new Set();
  root.traverse((object) => {
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material))
        if (value?.isTexture && !value.isRenderTargetTexture)
          textures.add(value);
    }
  });
  return [...textures];
}

// These tagged, uncompressed 2D resources use RGBA8. This is an allocation
// estimate from dimensions, not a driver-reported GPU-memory measurement.
export function textureAllocationSummary(textures) {
  const groups = new Map();
  for (const texture of new Set(textures)) {
    const category = texture.userData.museumResource;
    if (!category || texture.isRenderTargetTexture) continue;
    let { width, height } = texture.image;
    let bytes = width * height * 4;
    if (texture.generateMipmaps)
      while (width > 1 || height > 1) {
        width = Math.max(1, Math.floor(width / 2));
        height = Math.max(1, Math.floor(height / 2));
        bytes += width * height * 4;
      }
    if (!groups.has(category))
      groups.set(category, { category, count: 0, bytes: 0, dimensions: {} });
    const group = groups.get(category);
    group.count++;
    group.bytes += bytes;
    const dimensions = `${texture.image.width}×${texture.image.height}`;
    group.dimensions[dimensions] = (group.dimensions[dimensions] || 0) + 1;
  }
  return {
    basis: "RGBA8 surface and panel textures including mipmaps; excludes other textures, render targets and driver overhead",
    totalBytes: [...groups.values()].reduce((sum, group) => sum + group.bytes, 0),
    groups: [...groups.values()],
  };
}

export const yieldToBrowser = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Fence polling lets the loading UI stay responsive while GPU work completes.
// gl.finish() would synchronously freeze the entire browser's main thread.
export async function waitForGPU(renderer) {
  const gl = renderer.getContext();
  if (gl.isContextLost())
    throw new Error("GPU context lost during preparation");
  const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!fence) throw new Error("Unable to create GPU preparation fence");
  gl.flush();
  const started = performance.now();
  try {
    for (;;) {
      const status = gl.clientWaitSync(fence, 0, 0);
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED)
        return;
      if (status === gl.WAIT_FAILED || gl.isContextLost())
        throw new Error("GPU preparation failed");
      if (performance.now() - started > 60000)
        throw new Error("GPU preparation timed out");
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  } finally {
    gl.deleteSync(fence);
  }
}

export async function runPreparation(
  tasks,
  onProgress,
  yieldFrame = yieldToBrowser,
) {
  const receipt = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    onProgress(i / tasks.length, task.label);
    await yieldFrame();
    const start = performance.now();
    await task.run();
    receipt.push({
      label: task.label,
      ms: Math.round(performance.now() - start),
    });
  }
  onProgress(1, "画面准备完成");
  return receipt;
}
