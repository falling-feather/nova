/**
 * Signs in the halls use the catalogue's serif (a subset of Noto Serif SC
 * served with the page), so they look the same on every machine. A character
 * outside the subset falls back, glyph by glyph, to the system serifs.
 */
export const SERIF = '"Thought Court Serif","Noto Serif SC","SimSun",serif';

/** Canvas text never waits for a web font, so both weights load first. */
export function loadCanvasFonts(timeout = 4000) {
  if (typeof document === "undefined" || !document.fonts?.load)
    return Promise.resolve();
  const faces = ["400", "600"].map((weight) =>
    document.fonts.load(`${weight} 32px "Thought Court Serif"`, "思想之庭"),
  );
  return Promise.race([
    Promise.all(faces),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]).catch(() => {});
}
