import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Materials } from './materials.ts';

/** Authored Blender meshes share the chapter's material palette and baked contact colors. */
export async function loadConservatoryProps(materials: Materials) {
  const gltf = await new GLTFLoader().loadAsync(
    import.meta.env.BASE_URL + 'art/models/conservatory-props.glb'
  );
  const surfaces = new Map<string, T.Material>();
  gltf.scene.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    object.castShadow = object.receiveShadow = true;
    const uv = object.geometry.attributes.uv;
    if (uv) for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    object.geometry.deleteAttribute('tangent');
    const mapMaterial = (original: T.Material) => {
      const name = original.name as keyof Materials;
      if (!(name in materials)) throw new Error('Unknown conservatory material: ' + name);
      if (!surfaces.has(name)) {
        const source = materials[name],
          material = source.clone();
        material.onBeforeCompile = source.onBeforeCompile;
        material.customProgramCacheKey = source.customProgramCacheKey;
        material.vertexColors = true;
        if (name === 'leaf' || name === 'linen') material.side = T.DoubleSide;
        surfaces.set(name, material);
      }
      return surfaces.get(name)!;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(mapMaterial)
      : mapMaterial(object.material);
  });
  return {
    place(parent: T.Object3D, name: string, x: number, y: number, z: number, scale = 1, yaw = 0) {
      const source = gltf.scene.getObjectByName(name);
      if (!source) throw new Error('Missing conservatory prop: ' + name);
      const instance = source.clone(true),
        mount = new T.Group();
      instance.position.set(0, 0, 0);
      mount.name = name;
      mount.add(instance);
      mount.position.set(x, y, z);
      mount.rotation.y = yaw;
      mount.scale.setScalar(scale);
      parent.add(mount);
      return mount;
    },
  };
}
export type ConservatoryProps = Awaited<ReturnType<typeof loadConservatoryProps>>;
