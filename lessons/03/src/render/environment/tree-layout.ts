import { CANOPY_SUPPORTS } from "../../core/terrain.ts";
import { HABITATS } from "../../content/habitats.ts";

/** Structural trees retain their bridge identity; decorative trees may yield to a house. */
export function treeSites() {
  const sites = CANOPY_SUPPORTS.map((support) => ({
    x: support.kind === "camp-tree" ? 17840 : support.x,
    special: support.kind,
    supportId: support.id as string | null,
  }));
  for (const x of [
    600, 1760, 5060, 6150, 6820, 8170, 13250, 14800, 16150, 22700, 27800, 30280,
    32070, 34850, 35720,
  ])
    sites.push({ x, special: "tree", supportId: null });
  const buildings = HABITATS.flatMap((habitat) => habitat.buildings);
  return [...new Map(sites.map((site) => [site.x, site])).values()]
    .map((site, index) => ({ ...site, index }))
    .filter((site) => {
      // The library building owns its complete structural trunk and crown.
      if (site.special === "library-tree") return false;
      return (
        site.supportId !== null ||
        !buildings.some(
          (building) =>
            Math.abs(building.x - site.x) < building.footprintWidth * 0.62,
        )
      );
    });
}
