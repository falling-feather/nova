import test from "node:test";
import assert from "node:assert/strict";
import { items } from "../src/content.js";
import { articleBlocks, articleText } from "../src/content/articles/index.js";
import { readingFigures } from "../src/content/reading-figures.js";
import { inlineArticle } from "../src/ui/catalogue.js";
import { readingFigure } from "../src/ui/reading-figures.js";
test("all fifty articles retain their prose with curated emphasis and valid inline illustrations", () => {
  assert.equal(items.length, 50);
  let figures = 0;
  for (const item of items) {
    assert.ok(item.article.includes("**"), item.id);
    assert.ok(!articleText(item.article).includes("**"));
    assert.ok(!articleText(item.article).includes("[[figure:"));
    for (const block of articleBlocks(item.article))
      if (block.type === "figure") {
        assert.ok(readingFigures[block.id]);
        assert.match(readingFigure(block.id), /role="img"/);
        figures++;
      }
  }
  assert.equal(figures, 30);
});
test("emphasis does not enable arbitrary HTML in archive text", () => {
  assert.equal(
    inlineArticle("解释 **证据** <img src=x onerror=alert(1)>"),
    "解释 <strong>证据</strong> &lt;img src=x onerror=alert(1)&gt;",
  );
  assert.equal(
    articleText("## 标题\n\n**关键**内容\n\n[[figure:turing]]"),
    "标题 关键内容",
  );
});
