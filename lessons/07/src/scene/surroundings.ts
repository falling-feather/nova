import * as THREE from "three";

// Ground, horizon light and distant hills, so the courtyard stands on land instead of floating on a flat colour.
export const HAZE = 0x6f7c69;

function gradientDisc(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d")!;
  const fill = g.createRadialGradient(128, 128, 18, 128, 128, 128);
  fill.addColorStop(0, "#7f7c58");
  fill.addColorStop(0.35, "#6b7350");
  fill.addColorStop(1, "#4f5c42");
  g.fillStyle = fill;
  g.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function contactShadow(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const fill = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  fill.addColorStop(0, "rgba(18,22,14,0.75)");
  fill.addColorStop(0.62, "rgba(18,22,14,0.45)");
  fill.addColorStop(1, "rgba(18,22,14,0)");
  g.fillStyle = fill;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function skyDome(radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 48, 24);
  const haze = new THREE.Color(HAZE), warm = new THREE.Color(0xd6c79c), top = new THREE.Color(0x4e5f58);
  const colors: number[] = [], position = geometry.attributes.position, c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const t = position.getY(i) / radius;
    if (t <= 0) c.copy(haze);
    else if (t < 0.08) c.lerpColors(haze, warm, t / 0.08);
    else c.lerpColors(warm, top, Math.min(1, (t - 0.08) / 0.42));
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
}

export function makeSurroundings(courtyard: THREE.Object3D): THREE.Group {
  const group = new THREE.Group();
  group.name = "surroundings";
  const bounds = new THREE.Box3().setFromObject(courtyard), floor = bounds.min.y - 0.02, size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(96, 72),
    new THREE.MeshStandardMaterial({ map: gradientDisc(), color: 0xc9c4b4, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = floor;
  ground.receiveShadow = true;
  const hills = new THREE.Group(), hillMaterial = new THREE.MeshStandardMaterial({ color: 0x55664f, roughness: 1, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2 + Math.sin(i * 2.3) * 0.18, distance = 74 + (i % 3) * 7;
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), hillMaterial);
    hill.position.set(Math.cos(angle) * distance, floor - 2, Math.sin(angle) * distance);
    hill.scale.set(16 + (i % 4) * 5, 6 + (i % 3) * 3.5, 12 + (i % 2) * 6);
    hill.rotation.y = angle;
    hills.add(hill);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.45, size.z * 1.45), new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false, fog: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(centre.x + 1.2, floor + 0.01, centre.z + 0.8);
  group.add(skyDome(100), ground, shadow, hills);
  return group;
}
