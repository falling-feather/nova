/**
 * The catalogue's long-form articles, one per collection item, kept apart from
 * the archive records so each reads as an essay. The format is plain text: a
 * blank line starts a new paragraph, and a line that begins with "## " is a
 * section heading. Every fact here should also be traceable to the item's
 * sources; the articles tell the story, the dossier keeps the evidence.
 */
import origins from "./origins.js";
import rules from "./rules.js";
import learning from "./learning.js";
import games from "./games.js";
import generation from "./generation.js";
import frontiers from "./frontiers.js";
import industry from "./industry.js";
import companies from "./companies.js";

export const articles = Object.freeze({
  ...origins,
  ...rules,
  ...learning,
  ...games,
  ...generation,
  ...frontiers,
  ...industry,
  ...companies,
});

const latin = /[ -ɏ]/;
/** Lines inside a block join without a space, except between Latin words. */
function joinLines(block) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce(
      (text, line) =>
        text + (text && latin.test(text.at(-1)) && latin.test(line[0]) ? " " : "") + line,
      "",
    );
}

export function articleBlocks(text = "") {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map(joinLines)
    .filter(Boolean)
    .map((line) =>
      /^\[\[figure:[a-z0-9-]+\]\]$/.test(line)
        ? { type: "figure", id: line.slice(9,-2) }
        : line.startsWith("## ")
        ? { type: "h", text: line.slice(3).trim() }
        : { type: "p", text: line },
    );
}

export const articleText = (text = "") =>
  articleBlocks(text)
    .filter(block=>block.type!=="figure")
    .map((block) => block.text.replace(/\*\*(.+?)\*\*/g,'$1'))
    .join(" ");

/** Minutes for a young reader, at roughly 300 characters a minute. */
export const readingMinutes = (text = "") =>
  Math.max(1, Math.round(articleText(text).length / 300));
