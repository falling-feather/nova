import { Matrix4, Vector4 } from "three";

// Render into a smaller rectangle of existing GPU storage. Only a browser resize
// may resize the storage itself; walking must not repeatedly allocate targets.
export function setRenderRegion(target, scale) {
  const w = Math.max(1, Math.round(target.width * scale));
  const h = Math.max(1, Math.round(target.height * scale));
  target.viewport.set(0, 0, w, h);
  target.scissor.copy(target.viewport);
  target.scissorTest = true;
}
export function sampleRegion(target, out = new Vector4()) {
  return out.set(
    target.viewport.z / target.width,
    target.viewport.w / target.height,
    0.5 / target.width,
    0.5 / target.height,
  );
}

// Clip a conservative outer polygon in homogeneous coordinates, before dividing
// by W. Projecting a box directly fails when the floor crosses the near plane.
export class ReflectionBounds {
  constructor(radius) {
    this.points = Array.from(
      { length: 32 },
      (_, i) =>
        new Vector4(
          (Math.cos((i * Math.PI) / 16) * radius) / Math.cos(Math.PI / 32),
          (Math.sin((i * Math.PI) / 16) * radius) / Math.cos(Math.PI / 32),
          0,
          1,
        ),
    );
    this.matrix = new Matrix4();
    this.rect = new Vector4();
  }
  project(mirror, camera, width, height, padding = 4) {
    this.matrix
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(mirror.matrixWorld);
    let vertices = this.points.map((p) => p.clone().applyMatrix4(this.matrix));
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        if (!vertices.length) return null;
        const output = [];
        let previous = vertices.at(-1),
          last = previous.w + sign * previous.getComponent(axis);
        for (const current of vertices) {
          const distance = current.w + sign * current.getComponent(axis);
          if (distance >= 0 !== last >= 0)
            output.push(
              previous.clone().lerp(current, last / (last - distance)),
            );
          if (distance >= 0) output.push(current);
          previous = current;
          last = distance;
        }
        vertices = output;
      }
    if (!vertices.length) return null;
    let left = 1,
      right = -1,
      bottom = 1,
      top = -1;
    for (const p of vertices) {
      const x = p.x / p.w,
        y = p.y / p.w;
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.min(bottom, y);
      top = Math.max(top, y);
    }
    const x = Math.max(0, Math.floor(((left + 1) * width) / 2) - padding);
    const y = Math.max(0, Math.floor(((bottom + 1) * height) / 2) - padding);
    const w =
      Math.min(width, Math.ceil(((right + 1) * width) / 2) + padding) - x;
    const h =
      Math.min(height, Math.ceil(((top + 1) * height) / 2) + padding) - y;
    // Three's reflected camera reverses the screen X axis (its up vector is
    // reflected too). The capture rectangle must match its texture matrix.
    return w > 0 && h > 0 ? this.rect.set(width - x - w, y, w, h) : null;
  }
}
