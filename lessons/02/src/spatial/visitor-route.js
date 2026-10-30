import clipping from "polygon-clipping";
import { spatialPlan, specById } from "./layout.js";
import { floorPolygons } from "./topology.js";
import { segmentFootprint } from "./surfaces.js";
export const visitorRoute = spatialPlan.visitorRoute;
export const routePaths = [
  ...visitorRoute.paths,
  ...visitorRoute.loops.map((loop) => {
    const room = specById[loop.room];
    return {
      id: loop.room + "-ring",
      loop,
      points: Array.from({ length: 129 }, (_, i) => {
        const a = (i * Math.PI * 2) / 128;
        return [
          room.centerX + Math.cos(a) * loop.radius,
          room.centerZ + Math.sin(a) * loop.radius,
        ];
      }),
    };
  }),
  ...visitorRoute.spurs,
];
export function routePolygons(width = visitorRoute.width) {
  const circle = (x, z, r, n = 32) =>
    Array.from({ length: n + 1 }, (_, i) => [
      x + Math.cos((i * Math.PI * 2) / n) * r,
      z + Math.sin((i * Math.PI * 2) / n) * r,
    ]);
  const strips = routePaths.flatMap((p) => {
    if (p.loop) {
      const r = specById[p.loop.room];
      return [
        [
          circle(r.centerX, r.centerZ, p.loop.radius + width / 2, 128),
          circle(
            r.centerX,
            r.centerZ,
            p.loop.radius - width / 2,
            128,
          ).reverse(),
        ],
      ];
    }
    return [
      ...p.points
        .slice(1)
        .map((b, i) => segmentFootprint(p.points[i], b, width)),
      ...p.points.slice(1, -1).map(([x, z]) => [circle(x, z, width / 2)]),
    ];
  });
  return clipping.intersection(clipping.union(...strips), floorPolygons);
}
export const carpetPolygons = routePolygons();
export const carpetBorder = clipping.difference(
  routePolygons(visitorRoute.width + 0.075),
  carpetPolygons,
);
