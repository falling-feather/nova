import { Mesh, Matrix4, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Static transform-only groups may be flattened inside their semantic owner.
// Room, fixture, item, animated model, hidden and callback boundaries are kept.
export function batchStaticMeshes(root) {
  let removedDrawables = 0;
  root.updateMatrixWorld(true);
  function ownerBatches(owner) {
    const buckets = new Map(),
      inverse = new Matrix4().copy(owner.matrixWorld).invert();
    function collect(node) {
      for (const o of [...node.children]) {
        if (!o.visible) continue;
        if (
          Object.keys(o.userData).length ||
          (o.onBeforeRender !== Mesh.prototype.onBeforeRender && o.isMesh)
        ) {
          if (o.children.length) ownerBatches(o);
          continue;
        }
        if (!o.isMesh) {
          collect(o);
          continue;
        }
        if (o.children.length) {
          ownerBatches(o);
          continue;
        }
        if (
          o.isReflector ||
          o.isInstancedMesh ||
          Array.isArray(o.material) ||
          o.material.transparent ||
          o.geometry.morphAttributes.position
        )
          continue;
        const g = o.geometry,
          transform = new Matrix4().multiplyMatrices(inverse, o.matrixWorld);
        const position = new Vector3().setFromMatrixPosition(transform);
        const layout = Object.entries(g.attributes)
          .map(
            ([k, a]) =>
              `${k}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`,
          )
          .sort()
          .join("/");
        // Eight-metre cells: each draw call costs more than the little
        // off-screen geometry a larger batch brings along.
        const cell = position
          .toArray()
          .map((v) => Math.floor((v + 4) / 8))
          .join(",");
        const key = `${cell}/${o.material.uuid}/${o.castShadow}/${o.receiveShadow}/${o.layers.mask}/${o.renderOrder}/${!!g.index}/${layout}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push({ object: o, transform });
      }
    }
    collect(owner);
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const geometries = list.map(({ object, transform }) =>
        object.geometry.clone().applyMatrix4(transform),
      );
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!geometry) throw new Error("Incompatible static geometry layout");
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const first = list[0].object,
        batch = new Mesh(geometry, first.material);
      batch.name = "static-material-batch";
      batch.castShadow = first.castShadow;
      batch.receiveShadow = first.receiveShadow;
      batch.layers.mask = first.layers.mask;
      batch.renderOrder = first.renderOrder;
      for (const { object } of list) object.removeFromParent();
      owner.add(batch);
      removedDrawables += list.length - 1;
    }
    function prune(node) {
      for (const o of [...node.children])
        if (o.isGroup && o.visible && !Object.keys(o.userData).length) {
          prune(o);
          if (!o.children.length) o.removeFromParent();
        }
    }
    prune(owner);
  }
  ownerBatches(root);
  return { removedDrawables };
}
