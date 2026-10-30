/* Shared surface library: original procedural micro-detail plus raw CC0 PBR maps. */
(function (g) {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    pending = [],
    maps = new Map(),
    materials = new Map(),
    errors = [];
  const loader = new T.TextureLoader();
  function loadMap(key, url, colorSpace, repeating = true) {
    if (maps.has(key)) return maps.get(key);
    let finish;
    pending.push(new Promise((r) => (finish = r)));
    const t = loader.load(
      url,
      () => {
        // Atlas views share the source image and may exist before it has decoded.
        for (const view of maps.values())
          if (view.source === t.source) view.needsUpdate = true;
        finish();
      },
      undefined,
      () => {
        errors.push(key);
        finish();
      },
    );
    t.wrapS = t.wrapT = repeating ? T.RepeatWrapping : T.ClampToEdgeWrapping;
    t.colorSpace = colorSpace;
    t.anisotropy = 8;
    maps.set(key, t);
    return t;
  }
  function sourced(id, channel) {
    const key = id + "-" + channel;
    return loadMap(
      key,
      "assets/pbr/" + key + ".jpg",
      channel === "Diffuse" ? T.SRGBColorSpace : T.NoColorSpace,
    );
  }
  function generated(name, repeating = true) {
    return loadMap(
      "art:" + name,
      "assets/art/" + name + ".png",
      T.SRGBColorSpace,
      repeating,
    );
  }
  function printTexture(index, atlas = "naturalist-prints") {
    const key = atlas + ":print:" + index;
    if (maps.has(key)) return maps.get(key);
    if (!Number.isInteger(index) || index < 0 || index > 3)
      throw new RangeError("Unknown print atlas index");
    const texture = generated(atlas, false).clone();
    // A small inset avoids neighbouring panel bleed in mip levels.
    texture.repeat.set(0.488, 0.488);
    texture.offset.set(
      (index % 2) * 0.5 + 0.006,
      (index < 2 ? 0.5 : 0) + 0.006,
    );
    texture.needsUpdate = true;
    maps.set(key, texture);
    return texture;
  }
  function micro(kind) {
    if (maps.has(kind)) return maps.get(kind);
    const n = 256,
      c = document.createElement("canvas");
    c.width = c.height = n;
    const ctx = c.getContext("2d"),
      data = ctx.createImageData(n, n),
      r = TownCore.rng(1058 + kind.length * 17);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let value = 225 + (r() - 0.5) * 28;
        if (kind === "cloth")
          value =
            209 +
            (x % 4 < 2 ? 12 : -5) +
            (y % 4 < 2 ? 12 : -5) +
            (r() - 0.5) * 12;
        if (kind === "roof")
          value =
            220 +
            Math.sin(x * 0.17 + Math.sin(y * 0.023)) * 7 +
            (r() - 0.5) * 20;
        if (kind === "stone")
          value =
            217 +
            Math.sin(x * 0.086 + Math.sin(y * 0.024) * 3) * 8 +
            (r() - 0.5) * 25;
        if (kind === "ceramic") value = 238 + (r() - 0.5) * 8;
        const i = (y * n + x) * 4;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = value;
        data.data[i + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    maps.set(kind, t);
    return t;
  }
  W.artMat = function (kind, color = 0xffffff) {
    const key = kind + ":" + color;
    if (materials.has(key)) return materials.get(key);
    const SurfaceMaterial =
      kind === "cloth" ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
    const m = new SurfaceMaterial({
      color,
      roughness: 0.8,
      metalness: 0,
    });
    m.userData.surface = kind;
    if (kind === "wood") {
      m.map = generated("honey-oak");
      m.bumpMap = m.map;
      m.bumpScale = 0.0035;
      m.roughness = 0.7;
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
 vec4 woodTexel=texture2D(map,vMapUv);float woodL=dot(woodTexel.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb *= .30+sqrt(max(woodL,0.))*1.05;diffuseColor.a*=woodTexel.a;
#endif`,
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\n#ifdef USE_MAP\nroughnessFactor=clamp(roughnessFactor*(.78+texture2D(map,vMapUv).g*.5),.35,.94);\n#endif",
        );
      };
      m.customProgramCacheKey = () => "chunting-oak-v4";
    } else if (kind === "plaster") {
      m.map = generated("ivory-plaster");
      m.bumpMap = m.map;
      m.bumpScale = 0.009;
      m.roughness = 0.93;
    } else if (kind === "stone") {
      m.map = generated("warm-limestone");
      m.bumpMap = m.map;
      m.bumpScale = 0.01;
      m.roughness = 0.91;
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
 vec4 stoneTexel=texture2D(map,vMapUv);float stoneL=dot(stoneTexel.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb *= .18+stoneL*1.42;
#endif`,
        );
      };
      m.customProgramCacheKey = () => "chunting-limestone-v3";
    } else if (kind === "roof") {
      m.map = generated("slate-cleft");
      m.bumpMap = m.map;
      m.bumpScale = 0.009;
      m.roughness = 0.88;
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
 vec4 slate=texture2D(map,vMapUv);float slateL=dot(slate.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=.45+slateL*.90;
#endif`,
        );
      };
      m.customProgramCacheKey = () => "chunting-slate-v2";
    } else if (kind === "cloth") {
      m.map = generated("linen-cotton");
      m.map.repeat.set(4, 4);
      m.bumpMap = m.map;
      m.bumpScale = 0.0014;
      m.roughness = 0.91;
      m.sheen = 0.42;
      m.sheenRoughness = 0.88;
      m.sheenColor.setHex(0xe0d7c4);
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          "#ifdef USE_MAP\nvec4 linen=texture2D(map,vMapUv);float linenL=dot(linen.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=.66+sqrt(max(linenL,0.))*.5;diffuseColor.a*=linen.a;\n#endif",
        );
      };
      m.customProgramCacheKey = () => "chunting-woven-linen-v1";
    } else if (kind === "leather") {
      m.map = generated("fine-leather");
      m.map.repeat.set(3, 3);
      m.bumpMap = m.map;
      m.bumpScale = 0.0007;
      m.roughness = 0.56;
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          "#ifdef USE_MAP\nvec4 leather=texture2D(map,vMapUv);float leatherL=dot(leather.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=.7+sqrt(max(leatherL,0.))*.5;diffuseColor.a*=leather.a;\n#endif",
        );
      };
      m.customProgramCacheKey = () => "chunting-fine-leather-v1";
    } else if (kind === "bread") {
      m.map = generated("bread-crust");
      m.bumpMap = m.map;
      m.bumpScale = 0.004;
      m.roughness = 0.87;
      m.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "attribute float breadCut; varying float vBreadCut;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n vBreadCut=breadCut;",
        );
        shader.fragmentShader =
          "varying float vBreadCut;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          "#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.87,.64,.32),smoothstep(.08,.9,vBreadCut)*.82);",
        );
      };
      m.customProgramCacheKey = () => "chunting-scored-bread-v1";
    } else if (kind === "metal") {
      m.roughness = 0.36;
      m.metalness = 0.62;
    } else if (kind === "leaf") {
      m.roughness = 0.9;
      m.side = T.DoubleSide;
      m.emissive = new T.Color(color).multiplyScalar(0.045);
    } else {
      m.map = micro(kind);
      m.bumpMap = m.map;
      m.bumpScale = kind === "stone" ? 0.065 : kind === "roof" ? 0.025 : 0.012;
      m.roughness = kind === "ceramic" ? 0.46 : kind === "cloth" ? 0.97 : 0.84;
    }
    materials.set(key, m);
    return m;
  };
  W.artGeometry = function () {
    if (!this._artGeometries) this._artGeometries = {};
    return this._artGeometries;
  };
  W.artInstance = function (
    geo,
    mat,
    position,
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    color = null,
  ) {
    if (!this._artBatches) this._artBatches = new Map();
    const key = geo.uuid + ":" + mat.uuid;
    let b = this._artBatches.get(key);
    if (!b) {
      b = { geo, mat, list: [], colors: [] };
      this._artBatches.set(key, b);
    }
    const o = this.dummy;
    o.position.set(
      position[0],
      position[1] + TownLayout.terrainHeight(position[0], position[2]),
      position[2],
    );
    o.scale.set(...scale);
    o.rotation.set(...rotation);
    o.updateMatrix();
    b.list.push(o.matrix.clone());
    b.colors.push(color);
  };
  W.flushArt = function () {
    if (!this._artBatches) return;
    for (const b of this._artBatches.values()) {
      const mesh = new T.InstancedMesh(b.geo, b.mat, b.list.length);
      b.list.forEach((m, i) => {
        mesh.setMatrixAt(i, m);
        if (b.colors[i] !== null) mesh.setColorAt(i, new T.Color(b.colors[i]));
      });
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
      if (b.mat.userData.thinFoliage) {
        this.thinFoliage = this.thinFoliage || [];
        this.thinFoliage.push(mesh);
      }
    }
    this._artBatches.clear();
  };
  W.contactShadow = function (x, z, rx, rz, opacity = 0.25) {
    if (!this._contactTexture) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d"),
        d = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      d.addColorStop(0, "rgba(40,48,33,.68)");
      d.addColorStop(0.48, "rgba(40,48,33,.3)");
      d.addColorStop(1, "rgba(40,48,33,0)");
      ctx.fillStyle = d;
      ctx.fillRect(0, 0, 128, 128);
      this._contactTexture = new T.CanvasTexture(c);
      this._contactGeo = new T.PlaneGeometry(1, 1);
      this._contactMat = new T.MeshBasicMaterial({
        map: this._contactTexture,
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
    }
    this.artInstance(
      this._contactGeo,
      this._contactMat,
      [x, 0.035, z],
      [rx * 2, rz * 2, 1],
      [-Math.PI / 2, 0, 0],
    );
  };
  g.TownArt = {
    ready: () => Promise.all(pending),
    errors,
    maps,
    materials,
    source: sourced,
    generated,
    printTexture,
    photoTexture: (index) => printTexture(index, "photographers-prints"),
    modelTexture: (descriptor) => {
      const texture = loadMap(
        "model:" + JSON.stringify(descriptor),
        descriptor.url,
        descriptor.colorSpace,
        false,
      );
      texture.flipY = descriptor.flipY;
      texture.channel = descriptor.channel;
      texture.wrapS = descriptor.wrapS;
      texture.wrapT = descriptor.wrapT;
      texture.repeat.fromArray(descriptor.repeat);
      texture.offset.fromArray(descriptor.offset);
      texture.rotation = descriptor.rotation;
      return texture;
    },
    occlusion: (id) => {
      const texture = loadMap(
        "room-ao:" + id,
        "assets/shading/rooms/" + id + "-ao.png",
        T.NoColorSpace,
        false,
      );
      texture.channel = 1;
      return texture;
    },
    track: (key, promise) =>
      pending.push(
        promise.catch((error) => {
          errors.push(key);
          console.error("Scene asset failed:", key, error);
        }),
      ),
  };
})(globalThis);
