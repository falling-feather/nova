import * as THREE from "three";
import {
  carpetPolygons,
  carpetBorder,
  visitorRoute,
} from "../spatial/visitor-route.js";
import { horizontalSurface } from "./surfaces.js";
import { canvasTexture, mesh, M, group } from "./materials.js";

export function buildVisitorRoute(parent) {
  const route = group(parent);
  route.name = "blue-visitor-route";
  const weave = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = "#314c73";
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) {
      c.fillStyle = x % 8 ? "#38557b" : "#2b456a";
      c.fillRect(x, 0, 1, h);
    }
    for (let y = 0; y < h; y += 4) {
      c.fillStyle = y % 8 ? "#c4cfe51a" : "#1220381f";
      c.fillRect(0, y, w, 1);
    }
  });
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  const material = new THREE.MeshLambertMaterial({
    map: weave,
    color: "#dce5f3",
  });
  const rug = mesh(
    route,
    horizontalSurface(carpetPolygons, 0.028, true, 0.6),
    material,
  );
  rug.name = "continuous-carpet";
  rug.castShadow = false;
  const edge = mesh(route, horizontalSurface(carpetBorder, 0.028), M.bronze);
  edge.castShadow = false;
  const arrows = visitorRoute.arrows.map(([x, z, dx, dz]) => {
    const nx = -dz,
      nz = dx;
    const points = [
      [-0.19, -0.2],
      [0.19, 0],
      [-0.19, 0.2],
      [-0.11, 0],
    ].map(([u, v]) => [x + dx * u + nx * v, z + dz * u + nz * v]);
    return [[...points, points[0]]];
  });
  const sign = mesh(
    route,
    horizontalSurface(arrows, 0.031),
    new THREE.MeshBasicMaterial({ color: "#decba0" }),
  );
  sign.castShadow = false;
  return route;
}
