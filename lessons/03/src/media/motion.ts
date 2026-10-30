export interface MotionFrame {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
export interface MotionResult {
  direction: "left" | "right" | "still" | "unknown";
  displacement: number;
}

function foregroundCenter(frame: MotionFrame): number | undefined {
  const { data, width, height } = frame;
  const background = [0, 0, 0];
  let count = 0;
  const band = Math.max(1, Math.floor(Math.min(width, height) * 0.06));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (x >= band && x < width - band && y >= band && y < height - band)
        continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) background[c] += data[i + c];
      count++;
    }
  for (let c = 0; c < 3; c++) background[c] /= count;
  let mass = 0;
  let weightedX = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const contrast = Math.sqrt(
        background.reduce(
          (sum, value, c) => sum + (data[i + c] - value) ** 2,
          0,
        ),
      );
      if (contrast < 46 || data[i + 3] < 128) continue;
      const weight = Math.min(1, (contrast - 46) / 80);
      mass += weight;
      weightedX += x * weight;
    }
  return mass > width * height * 0.005 ? weightedX / mass : undefined;
}

/** Foreground-centroid tracking assumes an unchanged paper background and one
 * visible object. It does not infer action or direction from a single image. */
export function detectMotion(frames: MotionFrame[]): MotionResult {
  const unknown: MotionResult = { direction: "unknown", displacement: 0 };
  if (frames.length < 2) return unknown;
  const { width, height } = frames[0];
  if (
    width < 2 ||
    height < 2 ||
    frames.some(
      (frame) =>
        frame.width !== width ||
        frame.height !== height ||
        frame.data.length !== width * height * 4,
    )
  )
    return unknown;
  const centers = frames.map(foregroundCenter);
  if (centers.some((center) => center === undefined)) return unknown;
  const actual = centers as number[];
  const displacement = actual[actual.length - 1] - actual[0];
  const threshold = Math.max(1.5, width * 0.015);
  const steps = actual.slice(1).map((center, i) => center - actual[i]);
  if (
    steps.some((step) => step > threshold) &&
    steps.some((step) => step < -threshold)
  )
    return { direction: "unknown", displacement };
  return {
    direction:
      Math.abs(displacement) <= threshold
        ? "still"
        : displacement > 0
          ? "right"
          : "left",
    displacement,
  };
}
