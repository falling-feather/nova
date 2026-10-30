/* Offline ambient occlusion on static furnishings; dynamic lighting stays live. */
(function (g) {
  "use strict";
  const T = THREE;
  function apply(world) {
    for (const [id, bake] of Object.entries(TownRoomAO)) {
      const room = world.interiorRooms.find((r) => r.id === id),
        meshes = [];
      if (!room) throw new Error("Missing baked room: " + id);
      room.group.traverse((mesh) => {
        if (mesh.isMesh && !mesh.isInstancedMesh && !mesh.material.transparent)
          meshes.push(mesh);
      });
      if (
        meshes.length !== bake.meshes.length ||
        meshes.some(
          (mesh, i) =>
            mesh.geometry.attributes.position.count !== bake.meshes[i].vertices,
        )
      )
        throw new Error(
          "Room occlusion is stale; rebuild the authored bake: " + id,
        );
      const texture = TownArt.occlusion(id);
      TownArt.track(
        "room-uv:" + id,
        fetch("assets/shading/rooms/" + bake.uv1.file)
          .then((response) => {
            if (!response.ok)
              throw new Error("Room UV asset could not be loaded: " + id);
            return response.arrayBuffer();
          })
          .then((buffer) => {
            if (buffer.byteLength !== bake.uv1.bytes)
              throw new Error("Invalid room UV asset length: " + id);
            const attributes = bake.meshes.map((item) => {
              const uv = new Float32Array(
                buffer,
                item.uvByteOffset,
                item.vertices * 2,
              );
              for (const value of uv)
                if (!Number.isFinite(value) || value < 0 || value > 1)
                  throw new Error("Invalid room UV coordinates: " + id);
              return new T.BufferAttribute(uv, 2);
            });
            meshes.forEach((mesh, i) => {
              mesh.geometry.setAttribute("uv1", attributes[i]);
              const shared = mesh.material,
                material = shared.clone();
              // Three's Material.copy intentionally omits compilation callbacks.
              material.onBeforeCompile = shared.onBeforeCompile;
              material.customProgramCacheKey = shared.customProgramCacheKey;
              material.aoMap = texture;
              material.aoMapIntensity = 0.72;
              mesh.material = material;
            });
          }),
      );
    }
  }
  g.TownRoomShading = { apply };
})(globalThis);
