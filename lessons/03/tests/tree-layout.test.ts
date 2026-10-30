import test from "node:test";
import assert from "node:assert/strict";
import { CANOPY_SUPPORTS } from "../src/core/terrain.ts";
import { HABITATS } from "../src/content/habitats.ts";
import { treeSites } from "../src/render/environment/tree-layout.ts";

test("房屋避让不能删除树冠桥声明的承重树", () => {
  const sites = treeSites();
  for (const support of CANOPY_SUPPORTS) {
    if (support.kind === "library-tree") continue;
    assert.ok(
      sites.some((site) => site.supportId === support.id),
      support.id,
    );
  }
});

test("装饰树仍然避让建筑，图书树屋不重复叠加第二棵承重树", () => {
  const sites = treeSites();
  const buildings = HABITATS.flatMap((habitat) => habitat.buildings);
  assert.equal(
    sites.some((site) => site.special === "library-tree"),
    false,
  );
  for (const site of sites.filter((site) => !site.supportId)) {
    assert.ok(
      !buildings.some(
        (building) =>
          Math.abs(building.x - site.x) < building.footprintWidth * 0.62,
      ),
    );
  }
  assert.equal(new Set(sites.map((site) => site.x)).size, sites.length);
});
