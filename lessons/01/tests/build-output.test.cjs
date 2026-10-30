const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
test("every embedded script in the standalone distribution parses without replacement-string corruption", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "../dist/index.html"),
    "utf8",
  );
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  assert.ok(
    scripts.length > 0,
    "the distribution must contain runnable scripts",
  );
  scripts.forEach((source, i) => {
    try {
      new vm.Script(source, { filename: "dist-script-" + i + ".js" });
    } catch (e) {
      throw new Error("Standalone script " + i + ": " + e.message);
    }
  });
});
