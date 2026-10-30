/** A deliberately small visual descriptor: colour cells, silhouette occupancy,
 * and paper colour. Keeping paper colour makes dataset bias observable. */
export function extractImageFeatures(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number[] {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    pixels.length !== width * height * 4
  )
    return [];
  const background = [0, 0, 0];
  let borderCount = 0;
  let visible = 0;
  const border = Math.max(1, Math.floor(Math.min(width, height) * 0.08));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = pixels[i + 3] / 255;
      visible += alpha;
      if (
        x < border ||
        x >= width - border ||
        y < border ||
        y >= height - border
      ) {
        for (let c = 0; c < 3; c++)
          background[c] += (pixels[i + c] / 255) * alpha + 1 - alpha;
        borderCount++;
      }
    }
  if (visible < width * height * 0.1) return [];
  for (let c = 0; c < 3; c++) background[c] /= borderCount;

  const grid = 6;
  const sums = new Float64Array(grid * grid * 4);
  const counts = new Uint32Array(grid * grid);
  let foreground = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const cell =
        Math.min(grid - 1, Math.floor((y * grid) / height)) * grid +
        Math.min(grid - 1, Math.floor((x * grid) / width));
      const alpha = pixels[i + 3] / 255;
      let contrast = 0;
      for (let c = 0; c < 3; c++) {
        const value = (pixels[i + c] / 255) * alpha + 1 - alpha;
        sums[cell * 4 + c] += value;
        contrast += (value - background[c]) ** 2;
      }
      if (contrast > 0.025) {
        sums[cell * 4 + 3]++;
        foreground++;
      }
      counts[cell]++;
    }
  if (foreground < width * height * 0.008) return [];
  const result: number[] = [];
  for (let cell = 0; cell < grid * grid; cell++) {
    for (let c = 0; c < 3; c++)
      result.push(sums[cell * 4 + c] / Math.max(1, counts[cell]));
    result.push((sums[cell * 4 + 3] / Math.max(1, counts[cell])) * 0.7);
  }
  result.push(
    ...background.map((value) => value * 3.4),
    foreground / (width * height),
  );
  return result;
}
