import * as THREE from "three";
import { box, cylinder } from "./geometry.ts";
import type { Palette } from "./materials.ts";

type BoxPart = readonly [
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rotation?: number,
];

/** Slender joinery shares a unit box; dimensions remain in metres. */
export function boxwork(parts: BoxPart[], material: THREE.Material) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    material,
    parts.length,
  );
  const transform = new THREE.Object3D();
  parts.forEach(([w, h, d, x, y, z, rotation = 0], i) => {
    transform.position.set(x, y, z);
    transform.rotation.set(0, 0, rotation);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.joinery = true;
  return mesh;
}

/** Fold joinery from differently rotated buildings into one instance group per material. */
export function consolidateJoinery(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<THREE.Material, THREE.InstancedMesh[]>();
  root.traverse((object) => {
    if (
      !(object instanceof THREE.InstancedMesh) ||
      !object.userData.joinery ||
      Array.isArray(object.material)
    )
      return;
    const group = groups.get(object.material) ?? [];
    group.push(object);
    groups.set(object.material, group);
  });
  const local = new THREE.Matrix4();
  const transform = new THREE.Matrix4();
  for (const [material, meshes] of groups) {
    const count = meshes.reduce((sum, mesh) => sum + mesh.count, 0);
    const combined = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      material,
      count,
    );
    let at = 0;
    for (const mesh of meshes) {
      const toRoot = inverse.clone().multiply(mesh.matrixWorld);
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, local);
        transform.multiplyMatrices(toRoot, local);
        combined.setMatrixAt(at++, transform);
      }
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.dispose();
    }
    combined.castShadow = combined.receiveShadow = true;
    root.add(combined);
  }
}

export function timber(
  from: THREE.Vector3,
  to: THREE.Vector3,
  width: number,
  depth: number,
  material: THREE.Material,
) {
  const direction = to.clone().sub(from);
  const mesh = box(width, direction.length(), depth, material, 0, 0, 0, 0);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return mesh;
}

export function columnFoot(p: Palette) {
  const g = new THREE.Group();
  g.add(box(0.45, 0.12, 0.45, p.stone, 0, 0.06, 0, 0.025));
  const profile = [
    [0.195, 0.11],
    [0.195, 0.16],
    [0.16, 0.19],
    [0.155, 0.3],
    [0.19, 0.34],
    [0.19, 0.39],
    [0.13, 0.41],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const base = new THREE.Mesh(new THREE.LatheGeometry(profile, 12), p.stone);
  base.castShadow = base.receiveShadow = true;
  g.add(base);
  return g;
}

export function latticeWindow(p: Palette, width = 1.64, height = 2.03) {
  const g = new THREE.Group();
  const halfW = width / 2;
  const halfH = height / 2;
  const lowerRail = -halfH + 0.55;
  g.add(
    box(width + 0.16, height + 0.15, 0.075, p.darkWood, 0, 0, -0.085, 0),
    box(width - 0.1, height - 0.13, 0.045, p.ivory, 0, 0, -0.034, 0),
    box(width - 0.1, 0.47, 0.065, p.wood, 0, -halfH + 0.3, 0.009, 0.008),
    box(width + 0.25, 0.095, 0.24, p.wood, 0, -halfH - 0.055, 0.015, 0.015),
  );
  const frame: BoxPart[] = [
    [0.075, height, 0.135, -halfW, 0, 0.015],
    [0.075, height, 0.135, halfW, 0, 0.015],
    [width + 0.06, 0.075, 0.135, 0, halfH, 0.015],
    [width + 0.06, 0.075, 0.135, 0, -halfH, 0.015],
    [width, 0.08, 0.11, 0, lowerRail, 0.016],
  ];
  const leafWidth = width / 3;
  for (const x of [-width / 6, width / 6])
    frame.push([0.06, height, 0.12, x, 0, 0.022]);
  for (let leaf = 0; leaf < 3; leaf++) {
    const x = (leaf - 1) * leafWidth;
    const panelWidth = leafWidth - 0.14;
    const panelY = -halfH + 0.3;
    frame.push(
      [panelWidth, 0.024, 0.018, x, panelY - 0.14, 0.055],
      [panelWidth, 0.024, 0.018, x, panelY + 0.14, 0.055],
      [0.024, 0.28, 0.018, x - panelWidth / 2, panelY, 0.055],
      [0.024, 0.28, 0.018, x + panelWidth / 2, panelY, 0.055],
    );
    // A pair of lozenges and straight rails form a restrained traditional lattice.
    const top = halfH - 0.09;
    const cellHeight = (top - lowerRail) / 2;
    frame.push([leafWidth, 0.033, 0.065, x, lowerRail + cellHeight, 0.037]);
    for (let row = 0; row < 2; row++) {
      const y = lowerRail + cellHeight * (row + 0.5);
      const radius = leafWidth * 0.31;
      const side = radius * Math.SQRT2;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          frame.push([
            side,
            0.025,
            0.06,
            x + (sx * radius) / 2,
            y + (sy * radius) / 2,
            0.036,
            (-sx * sy * Math.PI) / 4,
          ]);
      frame.push(
        [
          0.027,
          (cellHeight - 2 * radius) / 2,
          0.06,
          x,
          y - cellHeight / 4 - radius / 2,
          0.036,
        ],
        [
          0.027,
          (cellHeight - 2 * radius) / 2,
          0.06,
          x,
          y + cellHeight / 4 + radius / 2,
          0.036,
        ],
      );
    }
  }
  g.add(boxwork(frame, p.darkWood));
  return g;
}

export function eaveBracket(p: Palette) {
  const shape = new THREE.Shape();
  shape.moveTo(0.075, 0);
  shape.lineTo(0.58, 0);
  shape.lineTo(0.58, -0.075);
  shape.quadraticCurveTo(0.29, -0.08, 0.19, -0.32);
  shape.lineTo(0.075, -0.32);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.13,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.008,
    bevelSegments: 1,
    curveSegments: 5,
  });
  geometry.translate(0, 0, -0.065);
  const mesh = new THREE.Mesh(geometry, p.wood);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function wallCap(p: Palette, width: number) {
  const g = new THREE.Group();
  g.add(box(width + 0.1, 0.1, 0.59, p.stone, 0, -0.025, 0, 0.012));
  for (const side of [-1, 1]) {
    const under = box(
      width + 0.18,
      0.055,
      0.38,
      p.roof,
      0,
      0.09,
      side * 0.15,
      0,
    );
    under.rotation.x = side * 0.32;
    g.add(under);
  }
  const count = Math.ceil(width / 0.205);
  const tiles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(
      0.065,
      0.074,
      0.385,
      8,
      1,
      true,
      Math.PI / 2,
      Math.PI,
    ),
    p.roof,
    count * 2,
  );
  const transform = new THREE.Object3D();
  let at = 0;
  for (const side of [-1, 1])
    for (let i = 0; i < count; i++) {
      transform.position.set(
        ((i + 0.5) * width) / count - width / 2,
        0.135,
        side * 0.16,
      );
      transform.rotation.set(Math.PI / 2 + side * 0.32, 0, 0);
      transform.updateMatrix();
      tiles.setMatrixAt(at++, transform.matrix);
    }
  tiles.castShadow = tiles.receiveShadow = true;
  g.add(tiles);
  const ridge = cylinder(0.08, width + 0.18, p.roof, 0, 0.205, 0, 10);
  ridge.rotation.z = Math.PI / 2;
  g.add(ridge);
  return g;
}

export function bonsai(
  p: Palette,
  foliage: THREE.MeshStandardMaterial,
  variant: number,
) {
  const g = new THREE.Group();
  g.add(
    box(1.25, 0.13, 0.96, p.stone, 0, 0.065, 0, 0.035),
    box(1.1, 0.12, 0.79, p.roof, 0, 0.18, 0, 0.025),
    box(1.22, 0.28, 0.12, p.roof, 0, 0.35, -0.39, 0.035),
    box(1.22, 0.28, 0.12, p.roof, 0, 0.35, 0.39, 0.035),
    box(0.12, 0.28, 0.68, p.roof, -0.55, 0.35, 0, 0.025),
    box(0.12, 0.28, 0.68, p.roof, 0.55, 0.35, 0, 0.025),
    box(1.06, 0.07, 0.69, p.darkWood, 0, 0.415, 0, 0),
  );
  const mirror = variant % 2 === 0 ? 1 : -1;
  const trunk = [
    new THREE.Vector3(-0.12 * mirror, 0.42, 0.01),
    new THREE.Vector3(0.05 * mirror, 0.77, -0.035),
    new THREE.Vector3(-0.11 * mirror, 1.15, 0.045),
    new THREE.Vector3(0.07 * mirror, 1.55, 0),
    new THREE.Vector3(0.02 * mirror, 1.99, -0.06),
  ];
  const twigs: { from: THREE.Vector3; to: THREE.Vector3; radius: number }[] =
    [];
  for (let i = 0; i < trunk.length - 1; i++)
    twigs.push({ from: trunk[i], to: trunk[i + 1], radius: 0.082 - i * 0.016 });
  const pads: { point: THREE.Vector3; spread: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = i * 2.39 + variant * 0.7;
    const tier = Math.floor(i / 3);
    const origin = trunk[Math.min(3, 1 + Math.floor(i / 4))].clone();
    const reach = 0.62 - tier * 0.1;
    const end = new THREE.Vector3(
      origin.x + Math.cos(a) * reach,
      1.05 + tier * 0.27 + (i % 3) * 0.075,
      origin.z + Math.sin(a) * reach * 0.68,
    );
    const elbow = origin.clone().lerp(end, 0.62);
    elbow.y -= 0.085;
    twigs.push({ from: origin, to: elbow, radius: 0.032 - tier * 0.005 });
    twigs.push({ from: elbow, to: end, radius: 0.017 - tier * 0.002 });
    pads.push({ point: end, spread: 0.27 - tier * 0.024 });
  }
  pads.push({ point: trunk[4], spread: 0.23 });
  const branches = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.7, 1, 1, 8),
    p.darkWood,
    twigs.length,
  );
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  twigs.forEach(({ from, to, radius }, i) => {
    const direction = to.clone().sub(from);
    transform.position.copy(from).add(to).multiplyScalar(0.5);
    transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    transform.scale.set(radius, direction.length(), radius);
    transform.updateMatrix();
    branches.setMatrixAt(i, transform.matrix);
  });
  branches.castShadow = branches.receiveShadow = true;
  g.add(branches);
  const leavesPerPad = 32;
  const leaves = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    foliage,
    pads.length * leavesPerPad,
  );
  const tint = new THREE.Color();
  let at = 0;
  pads.forEach(({ point, spread }, pad) => {
    for (let i = 0; i < leavesPerPad; i++) {
      const a = i * 2.39996 + pad;
      const radius = Math.sqrt((i + 0.5) / leavesPerPad) * spread;
      transform.position.set(
        point.x + Math.cos(a) * radius,
        point.y +
          0.04 +
          0.08 * Math.sin(i * 1.81) +
          0.09 * (1 - radius / spread),
        point.z + Math.sin(a) * radius * 0.75,
      );
      transform.rotation.set(0.25 * Math.sin(i), a, 0.3 * Math.cos(i * 1.7));
      transform.scale.set(0.065, 0.022, 0.112);
      transform.updateMatrix();
      leaves.setMatrixAt(at, transform.matrix);
      const tone = 0.77 + ((i * 7 + pad * 13) % 9) * 0.035;
      leaves.setColorAt(at++, tint.setRGB(tone, tone, tone * 0.92));
    }
  });
  leaves.castShadow = leaves.receiveShadow = true;
  g.add(leaves);
  g.rotation.y = variant * 1.17;
  return g;
}
