/* Synchronous, shared geometry from verified build-time glTF imports. */
(function () {
  "use strict";
  const T = THREE,
    types = { Float32Array, Uint16Array, Uint32Array };
  function decode(record) {
    const Type = types[record.type];
    if (!Type) throw new Error("Unsupported prop array type");
    const raw = atob(record.data),
      bytes = new Uint8Array(raw.length);
    if (raw.length % Type.BYTES_PER_ELEMENT)
      throw new Error("Invalid prop array length");
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Type(bytes.buffer);
  }
  TownWorld.prototype.propParts = function (id) {
    this._propParts ||= new Map();
    if (this._propParts.has(id)) return this._propParts.get(id);
    const source = TownPropAssetsData[id];
    if (!source) throw new Error("Missing admitted prop: " + id);
    const materials = source.materials.map((descriptor) => {
      const p = descriptor.params,
        Material =
          descriptor.type === "physical"
            ? T.MeshPhysicalMaterial
            : T.MeshStandardMaterial;
      const material = new Material({
        ...p,
        color: new T.Color().fromArray(p.color),
        emissive: new T.Color().fromArray(p.emissive),
        normalScale: new T.Vector2().fromArray(p.normalScale),
      });
      material.name = descriptor.name;
      material.userData.surface = "imported";
      for (const [name, texture] of Object.entries(descriptor.maps))
        material[name] = TownArt.modelTexture(texture);
      return material;
    });
    const parts = source.parts.map((part) => {
      const geometry = new T.BufferGeometry();
      for (const [name, attr] of Object.entries(part.attributes))
        geometry.setAttribute(
          name,
          new T.BufferAttribute(decode(attr), attr.itemSize),
        );
      if (part.index)
        geometry.setIndex(new T.BufferAttribute(decode(part.index), 1));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return { geometry, material: materials[part.material] };
    });
    this._propParts.set(id, parts);
    return parts;
  };
})();
