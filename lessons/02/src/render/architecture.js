import * as THREE from "three";
import { rooms } from "../content.js";
import { fixtureById } from "../spatial/layout.js";
import { M, group, mesh } from "./materials.js";
import { buildStructure } from "./building.js";
import { buildExhibitions } from "./exhibition.js";
import { buildFurnishings } from "./furnishings.js";
import { createMuseumFloor } from "./floor.js";
import { createFloorReflection } from "./reflections.js";
import { buildVisitorRoute } from "./visitor-route.js";

export function buildMuseum(scene, quality) {
  const root = group(scene);
  root.name = "seven-stage-museum";
  const floorGeometry = createMuseumFloor(),
    floor = mesh(root, floorGeometry, M.floor);
  floor.name = "continuous-museum-floor";
  floor.castShadow = false;
  const { roomGroups, corridors } = buildStructure(root),
    exhibition = buildExhibitions(roomGroups);
  buildFurnishings(roomGroups);
  buildVisitorRoute(root);
  const mirrors = [createFloorReflection(root, floorGeometry, quality)];
  const lights = [];
  for (const room of rooms) {
    const y = room.core ? room.coreHeight - 0.35 : room.h - 0.38;
    const fill = new THREE.RectAreaLight(
      "#ffecd1",
      2.5,
      room.core?.w ?? room.width - 1,
      room.core?.d ?? room.depth - 1,
    );
    fill.position.set(room.centerX, y, room.centerZ);
    fill.lookAt(room.centerX, 0, room.centerZ);
    fill.userData.roomId = room.id;
    scene.add(fill);
    lights.push(fill);
    if (room.shape === "circle") {
      const ambient = new THREE.PointLight("#fff1d8", 42, room.radius * 1.5, 2);
      ambient.position.set(room.centerX, room.h - 0.6, room.centerZ);
      ambient.userData.roomId = room.id;
      scene.add(ambient);
      lights.push(ambient);
    }
    const target =
      fixtureById[room.hallId + "-G1"] ?? fixtureById[room.hallId + "-T1"];
    const spot = new THREE.SpotLight("#fff1d8", 105, 18, 0.78, 0.8, 2);
    spot.position.set(target.x - 2.3, Math.min(6.3, y), target.z + 1.4);
    spot.target.position.set(target.x, 0.9, target.z);
    spot.castShadow = true;
    spot.shadow.mapSize.set(quality.exhibitShadow, quality.exhibitShadow);
    spot.shadow.normalBias = 0.025;
    spot.shadow.bias = -0.00012;
    spot.userData.roomId = room.id;
    scene.add(spot, spot.target);
    lights.push(spot);
  }
  return { root, roomGroups, corridors, mirrors, lights, ...exhibition };
}
