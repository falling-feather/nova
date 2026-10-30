import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.(js|json|css|html)$/.test(entry.name) ? [full] : [];
  });
}

test("every character the museum prints is inside the bundled serif subset", () => {
  const covered = new Set(
    fs.readFileSync(path.join(root, "public/fonts/tc-serif.chars.txt"), "utf8"),
  );
  const missing = new Set();
  for (const file of [path.join(root, "index.html"), ...sources(path.join(root, "src"))])
    for (const character of fs.readFileSync(file, "utf8"))
      if (character.codePointAt(0) >= 0x2e80 && !covered.has(character))
        missing.add(character);
  assert.deepEqual(
    [...missing],
    [],
    "run: python scripts/subset-fonts.py",
  );
});
