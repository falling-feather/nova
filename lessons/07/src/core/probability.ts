/** Display the original distribution, including its undisplayed probability mass. */
export function probabilityLabel(probability: number): string {
  if (probability === 0) return "0%";
  const value = probability * 100;
  if (value < 0.0001) return "<0.0001%";
  return value.toFixed(value < 0.01 ? 4 : value < 1 ? 3 : 2) + "%";
}
