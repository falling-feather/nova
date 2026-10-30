/* Walkable terrain, procedural setts, banks, atmospheric sky and shared planar water. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    L = TownLayout;
  const v3 = (a) => new T.Vector3(...a);
  // Woodland relief is separate from the small, authoritative playable terrace.
  function woodlandHeight(x, z) {
    const distance = Math.hypot(
      Math.max(Math.abs(x) - 61, 0),
      Math.max(Math.abs(z) - 58, 0),
    );
    const t = Math.min(1, distance / 32),
      blend = t * t * (3 - 2 * t),
      rim = T.MathUtils.smoothstep(Math.hypot(x, z), 148, 210);
    return (
      -1.2 +
      blend *
        (1.8 +
          1.2 * Math.sin(x * 0.032 + z * 0.018) +
          0.9 * Math.cos(z * 0.047 - x * 0.011) +
          0.5 * Math.sin(x * 0.072 + z * 0.061)) -
      rim * 24
    );
  }
  // World-space value noise shared by the meadow tone and the paving edges.
  const GROUND_NOISE = `
float groundHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(groundHash(i),groundHash(i+vec2(1,0)),f.x),mix(groundHash(i+vec2(0,1)),groundHash(i+vec2(1,1)),f.x),f.y);}
`;
  // Procedural setts: an irregular running bond on the streets and concentric
  // rings around the fountain. Stones are evaluated per pixel from world metres,
  // so they keep a real scale next to the characters without instanced pavers.
  const PAVING = `
uniform sampler2D pavingMask;uniform sampler2D pavingStone;
float pvRect(vec2 q,vec2 b,float r){vec2 e=abs(q)-b+r;return length(max(e,0.))+min(max(e.x,e.y),0.)-r;}
void pvStreet(vec2 p,out vec2 local,out vec2 halfSize,out float id){
 const float rowH=.24;float row=floor(p.y/rowH);
 float len=.29+groundHash(vec2(row,7.))*.1;
 float x=p.x/len+groundHash(vec2(row,3.))*3.;float k=floor(x);
 float b0=k+(groundHash(vec2(k,row))-.5)*.5,b1=k+1.+(groundHash(vec2(k+1.,row))-.5)*.5;
 if(x<b0){b1=b0;k-=1.;b0=k+(groundHash(vec2(k,row))-.5)*.5;}
 else if(x>=b1){b0=b1;k+=1.;b1=k+1.+(groundHash(vec2(k+1.,row))-.5)*.5;}
 local=vec2((x-(b0+b1)*.5)*len,p.y-(row+.5)*rowH);
 halfSize=vec2((b1-b0)*.5*len,rowH*.5);id=groundHash(vec2(k*1.37+11.,row*.73+5.));}
void pvPlaza(vec2 v,out vec2 local,out vec2 halfSize,out float id){
 float r=length(v);bool curb=r>7.28;
 float ringW=curb?.44:.25,ring=curb?99.:floor(r/ringW),rc=curb?7.5:(ring+.5)*ringW;
 float circ=6.2831853*rc,n=max(6.,floor(circ/(curb?.62:.31))),seg=circ/n;
 float a=(atan(v.y,v.x)/6.2831853+.5)*n+groundHash(vec2(ring,9.))*3.;
 float k=floor(a);local=vec2((fract(a)-.5)*seg,r-rc);
 halfSize=vec2(seg*.5,ringW*.5);id=groundHash(vec2(k+17.,ring*1.31+3.));}
`;
  function meadowMaterial(map, mask = null, paving = null) {
    // Plane v increases toward -z; the world-space lookup increases toward +z.
    const m = new T.MeshStandardMaterial({
      map,
      color: 0xffffff,
      roughness: 0.96,
      normalMap: TownArt.source("grass_ground", "nor_gl"),
      normalScale: new T.Vector2(0.34, -0.34),
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.meadowDetail = {
        value: TownArt.source("grass_ground", "Diffuse"),
      };
      if (mask) shader.uniforms.meadowMask = { value: mask };
      if (paving) {
        shader.uniforms.pavingMask = { value: paving.mask };
        shader.uniforms.pavingStone = { value: paving.stone };
      }
      shader.vertexShader = "varying vec2 vMeadowXZ;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n vMeadowXZ=(modelMatrix*vec4(position,1.)).xz;",
      );
      shader.fragmentShader =
        "varying vec2 vMeadowXZ;uniform sampler2D meadowDetail;" +
        (mask ? "uniform sampler2D meadowMask;" : "") +
        GROUND_NOISE +
        (paving ? PAVING : "") +
        "\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
    float meadowCoverage=${mask ? "texture2D(meadowMask,vMapUv).r" : "1."};
    // Two rotated scales break the 3.6 m repeat of the grass photograph; broad
    // warm/cool drifts read as a mown lawn with drier and lusher patches.
    float meadowBroad=groundNoise(vMeadowXZ*.055),meadowLocal=groundNoise(vMeadowXZ*.21+7.);
    vec3 grassDetail=mix(texture2D(meadowDetail,vMeadowXZ*.28).rgb,
      texture2D(meadowDetail,mat2(.8,-.6,.6,.8)*vMeadowXZ*.19+.37).rgb,smoothstep(.3,.7,meadowLocal));
    float grassLight=dot(grassDetail,vec3(.2126,.7152,.0722));
    vec3 grassTone=mix(vec3(.46,.57,.31),vec3(1.14,1.16,.88),smoothstep(.025,.26,grassLight));
    vec3 meadowDrift=mix(vec3(.9,.97,.9),vec3(1.1,1.05,.84),meadowBroad)*(.92+.16*meadowLocal);
    diffuseColor.rgb*=mix(vec3(1.),grassTone*meadowDrift,meadowCoverage*.83);
    ${paving ? PAVING_ALBEDO : ""}
   `,
      );
      if (paving)
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,pvRough,pvCover);",
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        T.ShaderChunk.normal_fragment_maps
          .replaceAll(
            "texture2D( normalMap, vNormalMapUv )",
            "texture2D( normalMap, vMeadowXZ * .28 )",
          )
          .replace(
            "mapN.xy *= normalScale;",
            "mapN.xy *= normalScale * meadowCoverage;",
          ) +
          (paving
            ? "\n normal=normalize(mix(normal,normalize((viewMatrix*vec4(pvNormal,0.)).xyz),pvCover*pvDetail));"
            : ""),
      );
    };
    m.customProgramCacheKey = () =>
      "chunting-meadow-v2-" + !!mask + "-" + !!paving;
    // Register before TownArt.ready() takes its snapshot of outstanding local assets.
    TownArt.source("grass_ground", "Diffuse");
    return m;
  }
  // Runs inside map_fragment; later chunks read pvCover, pvRough and pvNormal.
  const PAVING_ALBEDO = `
    float pvCover=0.,pvRough=.97,pvDetail=0.;vec3 pvNormal=vec3(0.,1.,0.);
    float pvMask=texture2D(pavingMask,vMapUv).r;
    if(pvMask>.004){
      vec2 pvP=vMeadowXZ,pvV=pvP-vec2(0.,8.);float pvR=length(pvV);
      bool pvPlazaStone=pvR<7.72;
      vec2 pvLocal,pvHalf;float pvId;
      if(pvPlazaStone)pvPlaza(pvV,pvLocal,pvHalf,pvId);else pvStreet(pvP,pvLocal,pvHalf,pvId);
      vec2 pvRadial=pvV/max(pvR,1e-4),pvTangent=vec2(-pvRadial.y,pvRadial.x);
      vec2 pvToWorld=pvPlazaStone?pvTangent*pvLocal.x+pvRadial*pvLocal.y:pvLocal;
      // Whole stones survive or drop out according to the mask at their own centre.
      vec2 pvC=pvP-pvToWorld;
      float pvCentre=texture2D(pavingMask,vec2((pvC.x+60.)/120.,1.-(pvC.y+57.)/114.)).r;
      float pvEdge=groundNoise(pvP*1.7);
      float pvKeep=step(groundHash(vec2(pvId*91.,4.)),smoothstep(.32,.8,pvCentre+(pvEdge-.5)*.22));
      vec2 pvB=pvHalf-vec2(.009+groundHash(vec2(pvId,2.))*.007);
      float pvRound=min(.055,min(pvB.x,pvB.y)*.62);
      float pvD=pvRect(pvLocal,pvB,pvRound);
      const float pvE=.004;
      vec2 pvG=vec2(pvRect(pvLocal+vec2(pvE,0.),pvB,pvRound)-pvRect(pvLocal-vec2(pvE,0.),pvB,pvRound),
        pvRect(pvLocal+vec2(0.,pvE),pvB,pvRound)-pvRect(pvLocal-vec2(0.,pvE),pvB,pvRound))/(2.*pvE);
      if(pvPlazaStone)pvG=pvTangent*pvG.x+pvRadial*pvG.y;
      float pvFw=max(length(dFdx(pvP)),length(dFdy(pvP)));
      pvDetail=1.-smoothstep(.03,.085,pvFw);
      float pvAA=max(pvFw*1.1,.0015);
      float pvStone=(1.-smoothstep(-pvAA,pvAA,pvD))*pvKeep;
      float pvMix=mix(.86*pvKeep,pvStone,pvDetail);
      // Rounded shoulders tilt the normal outward; each sett also sits a little unevenly.
      float pvSlope=(1.-smoothstep(0.,.04,-pvD))*.8;
      vec2 pvTilt=(vec2(groundHash(vec2(pvId,5.)),groundHash(vec2(pvId,6.)))-.5)*.07;
      pvNormal=mix(vec3(0.,1.,0.),normalize(vec3(pvG.x*pvSlope+pvTilt.x,1.,pvG.y*pvSlope+pvTilt.y)),pvStone);
      float pvPick=groundHash(vec2(pvId,8.));
      vec3 pvTint=pvPick<.3?vec3(.5,.43,.34):pvPick<.55?vec3(.46,.43,.38):pvPick<.8?vec3(.55,.48,.38):vec3(.5,.41,.34);
      if(pvPlazaStone)pvTint=pvR>7.28?vec3(.36,.35,.32):mix(pvTint,vec3(.58,.52,.42),.3);
      pvTint*=.88+.24*groundHash(vec2(pvId,10.));
      float pvGrain=dot(texture2D(pavingStone,pvP*.45+pvId*7.).rgb,vec3(.2126,.7152,.0722));
      vec3 pvStoneColor=pvTint*(.7+pvGrain*.55)*mix(.78,1.02,smoothstep(0.,.06,-pvD));
      // Joints are packed sand, darker where the stones shade them, mossier near verges.
      vec3 pvJoint=diffuseColor.rgb*vec3(.6,.56,.48)*mix(.7,1.,smoothstep(0.,.012,pvD));
      pvJoint=mix(pvJoint,vec3(.15,.2,.08),(1.-pvCentre)*.55*pvEdge);
      pvCover=smoothstep(.06,.4,pvMask);
      diffuseColor.rgb=mix(diffuseColor.rgb,mix(pvJoint,pvStoneColor,pvMix),pvCover);
      pvRough=mix(.97,.84+.08*groundHash(vec2(pvId,12.)),pvMix);
    }
  `;
  W.groundHeight = function (x, z) {
    if (Math.abs(x) < 1.8 && z > 39.05 && z < 53.75) return 0.235;
    if (Math.abs(x - 34) < 1.3 && z < -21.3 && z > -28) return 0.185;
    const room = this.buildings.find(
      (b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2,
    );
    if (room) return room.floorY ?? 0.1725;
    const dx = x - 33,
      dz = z - 30;
    if (
      Math.abs(dz) < (3.85 * Math.sqrt(3)) / 2 &&
      Math.abs(dx) < 3.85 - Math.abs(dz) / Math.sqrt(3)
    )
      return 0.135;
    return L.terrainHeight(x, z) + 0.04;
  };
  W.bevelBox = function () {
    const c = this.artGeometry();
    if (c.bevelBox) return c.bevelBox;
    const s = new T.Shape(),
      r = 0.065;
    s.moveTo(-0.5 + r, -0.5);
    s.lineTo(0.5 - r, -0.5);
    s.quadraticCurveTo(0.5, -0.5, 0.5, -0.5 + r);
    s.lineTo(0.5, 0.5 - r);
    s.quadraticCurveTo(0.5, 0.5, 0.5 - r, 0.5);
    s.lineTo(-0.5 + r, 0.5);
    s.quadraticCurveTo(-0.5, 0.5, -0.5, 0.5 - r);
    s.lineTo(-0.5, -0.5 + r);
    s.quadraticCurveTo(-0.5, -0.5, -0.5 + r, -0.5);
    const geo = new T.ExtrudeGeometry(s, {
      depth: 0.92,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.018,
      bevelSegments: 2,
      curveSegments: 3,
      steps: 1,
    });
    geo.translate(0, 0, -0.46);
    geo.scale(1 / 1.036, 1 / 1.036, 1);
    c.bevelBox = geo;
    return geo;
  };
  W.detailBox = function (kind, color, p, size, rotation = [0, 0, 0]) {
    this.artInstance(
      this.bevelBox(),
      this.artMat(kind, color),
      p,
      size,
      rotation,
    );
  };
  W.createGroundGeometry = function () {
    const n = L.northTerrace,
      xs = [
        ...new Set([
          ...Array.from({ length: 181 }, (_, i) => -60 + (i * 2) / 3),
          -n.edgeWidth,
          -n.halfWidth,
          -n.stairBlendWidth,
          -n.stairHalfWidth,
          n.stairHalfWidth,
          n.stairBlendWidth,
          n.halfWidth,
          n.edgeWidth,
        ]),
      ].sort((a, b) => a - b),
      boundaries = Array.from(
        { length: n.steps },
        (_, i) => n.stairFront - i * n.stepDepth,
      ),
      zs = Array.from({ length: 172 }, (_, i) => -57 + (i * 2) / 3)
        .filter((z) => boundaries.every((edge) => Math.abs(edge - z) > 1e-6))
        .map((z) => ({ z, sample: z }));
    // Duplicate rows at each stair edge make a vertical riser, avoiding the
    // diagonal soil wedges a regular heightfield would push through treads.
    for (const z of boundaries)
      zs.push({ z, sample: z - 1e-7 }, { z, sample: z + 1e-7 });
    zs.sort((a, b) => a.z - b.z || a.sample - b.sample);
    const positions = [],
      uvs = [],
      indices = [];
    for (const row of zs)
      for (const x of xs) {
        const z = row.z;
        const pond = Math.hypot(
          (x - L.pond.x) / L.pond.rx,
          (z - L.pond.z) / L.pond.rz,
        );
        let y = L.terrainHeight(x, row.sample);
        if (pond < 1) y = -0.7 * Math.pow(1 - pond, 0.4);
        if (z > 44 && z < 53)
          y = Math.min(y, -0.9 * Math.sin(((z - 44) / 9) * Math.PI));
        // The sett bed sits 3 cm proud of the lawn, so feet at the shared
        // standing height (+4 cm) rest on the stones rather than hover over them.
        else if (Math.hypot(x - L.plaza.x, row.sample - L.plaza.z) > 3.1)
          y +=
            0.032 *
            (1 - T.MathUtils.smoothstep(pavedDistance(x, row.sample), -0.3, 0.35));
        positions.push(x, y, z);
        uvs.push((x + 60) / 120, 1 - (z + 57) / 114);
      }
    for (let row = 0; row < zs.length - 1; row++)
      for (let col = 0; col < xs.length - 1; col++) {
        const a = row * xs.length + col,
          b = a + 1,
          c = a + xs.length,
          d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  };
  W.makeNorthTerrace = function () {
    const n = L.northTerrace,
      group = new T.Group();
    group.name = "terrain/north-terrace";
    const builder = this.architectureBuilder(group),
      stone = this.artMat ? this.artMat("stone", 0xc2ad8b) : this.mat(0xc2ad8b),
      cap = this.artMat ? this.artMat("stone", 0xd4c19e) : this.mat(0xd4c19e);
    for (let i = 0; i < n.steps; i++) {
      const top = (i + 1) * n.stepRise + 0.04,
        front = n.stairFront - i * n.stepDepth,
        z = front - n.stepDepth / 2;
      // Five large dressed stones per tread, one level across the whole road.
      for (let col = 0; col < 5; col++) {
        const width = (n.stairHalfWidth * 2) / 5,
          x = -n.stairHalfWidth + (col + 0.5) * width;
        builder.add(
          "box",
          stone,
          x,
          (top - 0.055) / 2,
          z,
          width - 0.014,
          top - 0.055,
          n.stepDepth,
        );
        builder.add(
          "box",
          cap,
          x,
          top - 0.0275,
          z,
          width - 0.008,
          0.055,
          n.stepDepth,
        );
      }
    }
    // Low stone courses dress the exposed front court edge; they sit on the
    // grass slope and stop either side of the entire walkable central stair.
    for (const side of [-1, 1])
      for (let col = 0; col < 6; col++) {
        const x = side * (3.55 + col * 0.72),
          z = n.front - 0.18;
        builder.add("box", stone, x, n.height - 0.11, z, 0.69, 0.24, 0.3);
        builder.add("box", cap, x, n.height + 0.022, z, 0.72, 0.04, 0.36);
      }
    builder.finish();
    group.userData.terrain = "north-terrace";
    this.scene.add(group);
    return group;
  };
  // Where setts may be laid: the authoritative roads a little inside their
  // verges, plus the plaza with its curb ring. Bridge, pond and stair stay clear.
  function pavedDistance(x, z) {
    if (z > 39.1 && Math.abs(x) < 4.5) return Infinity;
    if (Math.hypot((x - L.pond.x) / 10, (z - L.pond.z) / 8) < 1) return Infinity;
    return Math.min(
      L.roadDistance(x, z) + 0.2,
      Math.hypot(x - L.plaza.x, z - L.plaza.z) - 7.74,
    );
  }
  W.pavingMask = function () {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1946;
    const c = canvas.getContext("2d"),
      sx = canvas.width / 120,
      sz = canvas.height / 114,
      X = (x) => (x + 60) * sx,
      Z = (z) => (z + 57) * sz;
    c.fillStyle = "#000";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = c.fillStyle = "#fff";
    c.lineCap = "round";
    c.lineJoin = "round";
    c.filter = "blur(1.5px)";
    for (const road of L.roads) {
      c.beginPath();
      road.p.forEach(([x, z], i) =>
        i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)),
      );
      c.lineWidth = (road.w - 0.4) * sx;
      c.stroke();
    }
    c.beginPath();
    c.arc(X(L.plaza.x), Z(L.plaza.z), 7.74 * sx, 0, Math.PI * 2);
    c.fill();
    c.filter = "none";
    c.fillStyle = "#000";
    c.fillRect(X(-4.5), Z(39.1), 9 * sx, 20 * sz);
    c.beginPath();
    c.ellipse(X(L.pond.x), Z(L.pond.z), 10 * sx, 8 * sz, 0, 0, Math.PI * 2);
    c.fill();
    const texture = new T.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  };
  W.makeGround = function () {
    this.ground.geometry.dispose();
    this.ground.geometry = this.createGroundGeometry();
    this.ground.rotation.x = 0;
    const cv = document.createElement("canvas");
    cv.width = 4096;
    cv.height = 3891;
    const c = cv.getContext("2d"),
      sx = cv.width / 120,
      sz = cv.height / 114,
      X = (x) => (x + 60) * sx,
      Z = (z) => (z + 57) * sz,
      r = TownCore.rng(71);
    c.fillStyle = "#7c9252";
    c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 13000; i++) {
      c.fillStyle = i % 3 ? "rgba(225,226,138,.035)" : "rgba(44,80,41,.025)";
      c.beginPath();
      c.ellipse(
        r() * cv.width,
        r() * cv.height,
        10 + r() * 90,
        5 + r() * 40,
        r() * 6.3,
        0,
        6.3,
      );
      c.fill();
    }
    c.lineCap = "round";
    c.lineJoin = "round";
    // Low-frequency damp earth connects stone groups to grass. Roads are painted
    // afterwards so the bank tint never erases the authoritative walking route.
    const damp = (x, z, radius) => {
      const g = c.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), radius * sx);
      g.addColorStop(0, "rgba(77,92,48,.38)");
      g.addColorStop(0.55, "rgba(137,130,78,.23)");
      g.addColorStop(1, "rgba(137,130,78,0)");
      c.fillStyle = g;
      c.fillRect(
        X(x - radius),
        Z(z - radius),
        radius * 2 * sx,
        radius * 2 * sz,
      );
    };
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      damp(
        L.pond.x + Math.cos(a) * L.pond.rx,
        L.pond.z + Math.sin(a) * L.pond.rz,
        1.6 + r() * 1.5,
      );
    }
    for (let x = -56; x < 57; x += 2.8)
      for (const z of [43.7, 53.1]) damp(x, z, 1.7 + r() * 1.1);
    // The broad earth tone follows the actual planted drifts instead of applying
    // an equally wide dirt halo around every road. Paving is painted afterwards.
    for (const { p } of this.gardenContours())
      for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1],
          [bx, bz] = p[i];
        const length = Math.hypot(bx - ax, bz - az);
        for (let d = 0; d < length; d += 0.9)
          damp(
            ax + ((bx - ax) * d) / length,
            az + ((bz - az) * d) / length,
            1.8,
          );
      }
    for (const road of L.roads) {
      c.beginPath();
      road.p.forEach(([x, z], i) =>
        i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)),
      );
      c.strokeStyle = "#9c9970";
      c.filter = "blur(8px)";
      c.lineWidth = (road.w + 0.55) * sx;
      c.stroke();
      c.strokeStyle = "#b6a487";
      c.filter = "blur(5px)";
      c.lineWidth = (road.w - 0.18) * sx;
      c.stroke();
      c.filter = "none";
    }
    c.fillStyle = "#b6a58a";
    c.filter = "blur(7px)";
    c.beginPath();
    c.arc(X(0), Z(8), 7.5 * sx, 0, 7);
    c.fill();
    c.filter = "none";
    // Short, varied soil/grass incursions soften the visual edge only; the
    // authoritative path width and all collision/navigation geometry stay clear.
    for (let z = -42; z < 43; z += 0.37)
      for (let x = -49; x < 49; x += 0.41) {
        const edge = Math.min(
          L.roadDistance(x, z),
          Math.hypot(x, z - 8) - L.plaza.r,
        );
        if (edge < -0.35 || edge > 0.65 || r() > 0.55) continue;
        const g = c.createRadialGradient(
          X(x),
          Z(z),
          0,
          X(x),
          Z(z),
          sx * (0.12 + r() * 0.2),
        );
        g.addColorStop(
          0,
          r() > 0.28 ? "rgba(93,117,55,.42)" : "rgba(104,93,62,.28)",
        );
        g.addColorStop(1, "rgba(93,117,55,0)");
        c.fillStyle = g;
        c.fillRect(X(x - 0.4), Z(z - 0.4), sx * 0.8, sz * 0.8);
      }
    for (const b of L.buildings) {
      const g = c.createRadialGradient(
        X(b.x),
        Z(b.z),
        1,
        X(b.x),
        Z(b.z),
        b.w * sx * 0.7,
      );
      g.addColorStop(0, "rgba(44,58,34,.34)");
      g.addColorStop(1, "rgba(44,58,34,0)");
      c.fillStyle = g;
      c.fillRect(X(b.x - b.w), Z(b.z - b.d), b.w * 2 * sx, b.d * 2 * sz);
    }
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 2048;
    maskCanvas.height = 1946;
    const mc = maskCanvas.getContext("2d");
    mc.scale(maskCanvas.width / cv.width, maskCanvas.height / cv.height);
    mc.fillStyle = "#fff";
    mc.fillRect(0, 0, cv.width, cv.height);
    mc.strokeStyle = "#000";
    mc.fillStyle = "#000";
    mc.lineCap = "round";
    mc.lineJoin = "round";
    // The same authoritative road and plaza shapes mask albedo AND normals. The
    // feather lies outside the stone route; no grass micro-detail reaches setts.
    mc.filter = "blur(4px)";
    for (const road of L.roads) {
      mc.beginPath();
      road.p.forEach(([x, z], i) =>
        i ? mc.lineTo(X(x), Z(z)) : mc.moveTo(X(x), Z(z)),
      );
      mc.lineWidth = (road.w + 0.7) * sx;
      mc.stroke();
    }
    mc.beginPath();
    mc.arc(X(0), Z(8), 7.9 * sx, 0, Math.PI * 2);
    mc.fill();
    const mask = new T.CanvasTexture(maskCanvas);
    mask.anisotropy = 8;
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    this.groundTexture = tex;
    this.ground.material = meadowMaterial(tex, mask, {
      mask: this.pavingMask(),
      stone: TownArt.generated("warm-limestone"),
    });
    this.makeNorthTerrace();
    const outerGeometry = new T.PlaneGeometry(900, 900, 150, 150);
    outerGeometry.rotateX(-Math.PI / 2);
    const op = outerGeometry.attributes.position,
      tones = [];
    const low = new T.Color(0x4e683b),
      high = new T.Color(0x8fa263),
      edgeTone = new T.Color(0x7c9252);
    for (let i = 0; i < op.count; i++) {
      const x = op.getX(i),
        z = op.getZ(i);
      op.setY(i, woodlandHeight(x, z));
      const distance = Math.hypot(
          Math.max(Math.abs(x) - 60, 0),
          Math.max(Math.abs(z) - 57, 0),
        ),
        tone = low
          .clone()
          .lerp(
            high,
            0.5 +
              0.22 * Math.sin(x * 0.052 + z * 0.037) +
              0.18 * Math.cos(z * 0.083),
          );
      tone.lerp(edgeTone, 1 - T.MathUtils.smoothstep(distance, 0, 30));
      tones.push(tone.r, tone.g, tone.b);
    }
    outerGeometry.setAttribute("color", new T.Float32BufferAttribute(tones, 3));
    outerGeometry.computeVertexNormals();
    const outerMaterial = meadowMaterial(null);
    outerMaterial.vertexColors = true;
    const outer = new T.Mesh(outerGeometry, outerMaterial);
    outer.name = "terrain/woodland";
    outer.receiveShadow = true;
    this.scene.add(outer);
  };
  W.bankStoneGeometry = function () {
    const cache = this.artGeometry();
    if (!cache.rock) {
      const g = new T.IcosahedronGeometry(1, 2),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          n = 1 + 0.06 * Math.sin(x * 12 + z * 7 + y * 17);
        p.setXYZ(i, x * n, y * n, z * n);
      }
      g.computeVertexNormals();
      // Equal-position corners must share a shading normal. Icosahedron triangles
      // are initially non-indexed; leaving them split makes pebbles look folded.
      const sums = new Map(),
        normals = g.attributes.normal;
      const keyOf = (i) =>
        [p.getX(i), p.getY(i), p.getZ(i)]
          .map((n) => Math.round(n * 1e5))
          .join(":");
      for (let i = 0; i < p.count; i++) {
        const key = keyOf(i),
          n = new T.Vector3().fromBufferAttribute(normals, i);
        if (sums.has(key)) sums.get(key).add(n);
        else sums.set(key, n);
      }
      for (let i = 0; i < p.count; i++) {
        const n = sums.get(keyOf(i)).normalize();
        normals.setXYZ(i, n.x, n.y, n.z);
      }
      cache.rock = g;
    }
    return cache.rock;
  };
  W.bankStone = function (x, z, s = 1, ry = 0, aspect = 1) {
    this.artInstance(
      this.bankStoneGeometry(),
      this.artMat("stone", 0xa7aba0),
      [x, 0.15 * s, z],
      [s, (0.34 + aspect * 0.16) * s, (0.53 + aspect * 0.2) * s],
      [Math.sin(x + z) * 0.13, ry, Math.cos(x * 2) * 0.13],
      [0xe1d5ba, 0xc0c2ad, 0xd1c4a5][Math.abs(Math.round(x * 9 + z)) % 3],
    );
  };
  W.makeBridge = function () {
    for (let i = 0; i < 32; i++)
      this.detailBox(
        "wood",
        i % 3 ? 0xc89b66 : 0xdbc092,
        [0, 0.13, 39.2 + i * 0.46],
        [3.6, 0.21, 0.44],
        [0, 0, ((i % 3) - 1) * 0.005],
      );
    for (const side of [-1, 1]) {
      for (let z = 39.4; z < 53.8; z += 2.05) {
        this.detailBox(
          "stone",
          0xbba98a,
          [side * 1.96, 0.43, z],
          [0.58, 0.84, 0.58],
        );
        this.detailBox(
          "stone",
          0xcdbb98,
          [side * 1.96, 0.9, z],
          [0.65, 0.13, 0.65],
        );
      }
      for (const y of [0.52, 1.05])
        this.detailBox(
          "wood",
          0xb78956,
          [side * 1.93, y, 46.4],
          [0.16, 0.14, 14.7],
        );
      this.block(side * 1.95, 46.4, 0.52, 14.7);
    }
    this.detailBox("wood", 0x9b754d, [3.15, 1.82, 39.6], [0.3, 3.64, 0.3]);
    this.detailBox("wood", 0x9b754d, [4.3, 3.4, 39.6], [2.6, 0.25, 0.26]);
    this.board(
      4.14,
      2.55,
      39.56,
      "春汀小镇",
      "欢迎你来玩！",
      3.1,
      0,
      "#6c7652",
    );
    this.block(3.15, 39.6, 0.45, 0.45);
  };
  W.makeWater = function () {
    this.waterMeshes = [];
    this.waterUniforms = [];
    this.reflectionTarget = new T.WebGLRenderTarget(768, 512, {
      type: T.HalfFloatType,
    });
    this.reflectionCamera = new T.PerspectiveCamera();
    this.reflectionMatrix = new T.Matrix4();
    const vertex = `varying vec3 vWorld;varying vec2 vUv;uniform float uTime;
void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);
world.y+=sin(world.x*.72+world.z*.31+uTime*.42)*.006+sin(world.z*.93-world.x*.22-uTime*.31)*.004;
vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
    const fragment = `precision highp float;
varying vec3 vWorld;varying vec2 vUv;
uniform sampler2D uReflection;uniform mat4 uReflectionMatrix;
uniform float uTime,uNight,uCircle,uReflectionReady;
void main(){
 vec2 p=(vUv-.5)*2.;float edge=length(p);
 if(uCircle>.5&&edge>1.)discard;
 float wx=sin(vWorld.x*.72+vWorld.z*.31+uTime*.42);
 float wz=sin(vWorld.z*.93-vWorld.x*.22-uTime*.31);
 vec3 n=normalize(vec3(wx*.021+wz*.007,1.,wz*.024-wx*.006));
 vec3 view=normalize(cameraPosition-vWorld);
 float fresnel=pow(1.-max(dot(n,view),0.),3.);
 vec4 uvp=uReflectionMatrix*vec4(vWorld,1.);
 vec2 uv=uvp.xy/uvp.w+n.xz*.014;
 vec3 refl=mix(vec3(.40,.61,.66),texture2D(uReflection,clamp(uv,0.001,.999)).rgb,uReflectionReady);
 // The basin remains exact; only sediment and depth contours meander inside it.
 float shore=uCircle>.5?(1.-edge)*7.:min(vUv.y,1.-vUv.y)*9.5;
 float contour=sin(vWorld.x*.7+vWorld.z*.39)*.15+sin(vWorld.z*1.3)*.08;
 float depth=smoothstep(.05,3.1,max(0.,shore+contour));
 vec3 base=mix(vec3(.31,.48,.33),vec3(.075,.29,.31),depth);
 float ribbon=sin(vWorld.x*2.5+vWorld.z*4.1+wx*.65+uTime*.32);
 float broken=smoothstep(.52,.94,sin(vWorld.x*1.43-vWorld.z*.8+wz));
 float glint=smoothstep(.976,.999,ribbon)*broken;
 base+=vec3(.35,.43,.36)*glint*.16;
 vec3 color=mix(base,refl,.14+fresnel*.52);
 float sun=pow(max(dot(reflect(-normalize(vec3(-.6,1.,.4)),n),view),0.),150.);
 color+=vec3(1.,.88,.64)*sun*.5*(1.-uNight*.7);
 // At dusk the mirrored sunset sky carries the colour; only the depths darken.
 color=mix(color,refl,uNight*fresnel*.35)*(1.-uNight*.3);gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
    const make = (x, z, w, d, circle) => {
      const uniforms = {
        uReflection: { value: this.reflectionTarget.texture },
        uReflectionMatrix: { value: this.reflectionMatrix },
        uTime: { value: 0 },
        uNight: { value: 0 },
        uCircle: { value: circle },
        uReflectionReady: { value: 0 },
      };
      const material = new T.ShaderMaterial({
        uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        side: T.DoubleSide,
      });
      const mesh = new T.Mesh(new T.PlaneGeometry(w, d, 50, 40), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.045, z);
      this.scene.add(mesh);
      this.waterMeshes.push(mesh);
      this.waterUniforms.push(uniforms);
      return mesh;
    };
    this.riverSurface = make(0, 48.4, 125, 9.5, 0);
    this.pondSurface = make(37, -31, L.pond.rx * 2, L.pond.rz * 2, 1);
    // Cluster intervals deliberately differ from individual stone intervals.
    // A large anchor, two shoulder stones and a few low toe stones replace the
    // previous bead-like continuous border, while keeping the same basin.
    const bankRng = TownCore.rng(4004);
    const cluster = (x, z, tangent, scale, pond = false) => {
      const offsets = [
        [0, 0, 1],
        [-0.91, 0.18, 0.62],
        [0.82, -0.12, 0.53],
        [-0.45, -0.56, 0.28],
        [0.54, -0.61, 0.23],
      ];
      for (const [along, across, size] of offsets) {
        const s = scale * size * (0.88 + bankRng() * 0.23),
          xx =
            x +
            Math.cos(tangent) * along * scale -
            Math.sin(tangent) * across * scale,
          zz =
            z +
            Math.sin(tangent) * along * scale +
            Math.cos(tangent) * across * scale;
        // Conservative enclosing radius includes rotation and the rock noise.
        const radius = s * 1.12;
        if (Math.abs(xx) < 1.8 + radius && zz + radius > 39 && zz - radius < 54)
          continue;
        if (
          Math.abs(xx - 34) < 1.7 + radius &&
          zz + radius > -28 &&
          zz - radius < -21.3
        )
          continue;
        this.bankStone(
          xx,
          zz,
          s,
          tangent + bankRng() * 1.8,
          pond ? 0.7 + bankRng() * 0.6 : 0.55 + bankRng() * 0.8,
        );
      }
    };
    for (const side of [-1, 1])
      for (let x = -55; x < 56; x += 3.1 + bankRng() * 1.6) {
        const bend = Math.sin(x * 0.42) * 0.23;
        cluster(
          x,
          48.4 + side * (4.65 + bend),
          side > 0 ? Math.PI : 0,
          0.82 + bankRng() * 0.48,
        );
      }
    for (let i = 0; i < 23; i++) {
      const a = (i / 23) * Math.PI * 2 + (bankRng() - 0.5) * 0.05,
        inset = 0.95 + Math.sin(a * 5) * 0.023;
      cluster(
        L.pond.x + Math.cos(a) * L.pond.rx * inset,
        L.pond.z + Math.sin(a) * L.pond.rz * inset,
        Math.atan2(L.pond.rz * Math.cos(a), -L.pond.rx * Math.sin(a)),
        0.63 + bankRng() * 0.55,
        true,
      );
    }
    this.block(-28, 48.6, 52, 8.8);
    this.block(28, 48.6, 52, 8.8);
    this.block(28.9, -31, 3, 10);
    this.block(40.3, -31, 6.5, 12);
    this.block(34.1, -34.8, 7.4, 5);
    for (let i = 0; i < 14; i++)
      this.detailBox(
        "wood",
        0xc39a6a,
        [34, 0.1, -21.6 - i * 0.47],
        [2.6, 0.17, 0.44],
      );
    for (const side of [-1, 1])
      for (const z of [-22, -24.5, -27.5])
        this.detailBox(
          "wood",
          0xb18d5f,
          [34 + side * 1.45, 0.55, z],
          [0.16, 1.1, 0.16],
        );
    this.makeLilyPads();
  };
  W.makeLilyPads = function () {
    const positions = [],
      colors = [],
      leaf = new T.Color(0x739748),
      vein = new T.Color(0xb3bc6d),
      petal = new T.Color(0xf8e5d7),
      heart = new T.Color(0xd4ac45);
    const tri = (a, b, c, tint) => {
      positions.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) colors.push(tint.r, tint.g, tint.b);
    };
    const r = TownCore.rng(4081);
    for (let i = 0; i < 38; i++) {
      // Five loose rafts retain open water in the center and in front of the dock.
      const sector = [0.25, 1.08, 2.72, 3.55, 4.7][i % 5],
        angle = sector + (r() - 0.5) * 0.43,
        radius = 5.1 + r() * 1.8,
        x = L.pond.x + Math.cos(angle) * radius,
        z = L.pond.z + Math.sin(angle) * radius * 0.72,
        size = 0.2 + r() * 0.25,
        twist = r() * 6.28;
      if (Math.abs(x - 34) < 2.15 && z > -28.5) continue;
      const point = (a, rr, y = 0) => [
        x + Math.cos(a + twist) * rr,
        0.083 + y,
        z + Math.sin(a + twist) * rr * 0.87,
      ];
      const tint = leaf.clone().lerp(vein, r() * 0.35);
      for (let j = 0; j < 24; j++) {
        const a = 0.14 + (j / 24) * 5.98,
          b = 0.14 + ((j + 1) / 24) * 5.98,
          rimA = size * (1 + Math.sin(a * 5) * 0.025),
          rimB = size * (1 + Math.sin(b * 5) * 0.025);
        tri(
          point(0, 0, 0.012),
          point(a, rimA, 0.017),
          point(b, rimB, 0.017),
          tint,
        );
        if (j % 3 === 1)
          tri(
            point(a, size * 0.1, 0.018),
            point(a - 0.018, size * 0.85, 0.02),
            point(a + 0.018, size * 0.85, 0.02),
            vein,
          );
      }
      if (i % 9 !== 0) continue;
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        tri(
          point(a - 0.55, 0.025, 0.045),
          point(a, size * 0.64, 0.11),
          point(a + 0.55, 0.025, 0.045),
          petal,
        );
        tri(
          point(a, 0, 0.09),
          point(a, 0.045, 0.095),
          point(a + 0.63, 0.045, 0.095),
          heart,
        );
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.67,
        side: T.DoubleSide,
      }),
    );
    mesh.name = "water/lily-rafts";
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  };

  const viewFrustum = new T.Frustum(),
    viewMatrix = new T.Matrix4(),
    waterBounds = new T.Sphere();
  W.reflectWater = function (renderer, camera, frame, low) {
    if (low || !this.reflectionTarget) return;
    // No visible water, no mirror pass. Water coming into view is mirrored at
    // once; while it stays in view, every eighth frame refreshes it.
    viewFrustum.setFromProjectionMatrix(
      viewMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    const inView = this.waterMeshes.some((o) => {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      waterBounds.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      return viewFrustum.intersectsSphere(waterBounds);
    });
    const appeared = inView && !this.waterInView;
    this.waterInView = inView;
    if (!inView || (!appeared && frame % 8 !== 0)) return;
    // Grass, flowers and petals are finer than the mirror target can resolve;
    // trees, banks, bridge and buildings carry the reflection.
    this.reflectionSkip ||= this.scene.children.filter(
      (o) =>
        /^garden-/.test(o.name) ||
        /^flora\/.*\/(grass|petal|heroPetal|heroLeaf|stem)$/.test(o.name) ||
        /^flora\/flora(Pollen|Bush|Fern)\//.test(o.name),
    );
    const oldTarget = renderer.getRenderTarget(),
      oldAuto = renderer.shadowMap.autoUpdate,
      oldNeeds = renderer.shadowMap.needsUpdate;
    if (
      !!this.reflectionCamera.isOrthographicCamera !==
      !!camera.isOrthographicCamera
    )
      this.reflectionCamera = camera.clone();
    const mirror = this.reflectionCamera;
    mirror.copy(camera, false);
    mirror.position.copy(camera.position);
    mirror.position.y = 0.09 - camera.position.y;
    const target = camera
      .getWorldDirection(new T.Vector3())
      .add(camera.position);
    target.y = 0.09 - target.y;
    mirror.up.copy(camera.up).reflect(new T.Vector3(0, 1, 0));
    mirror.lookAt(target);
    mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    this.reflectionMatrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(mirror.projectionMatrix)
      .multiply(mirror.matrixWorldInverse);
    const plane = new T.Plane(new T.Vector3(0, 1, 0), -0.06).applyMatrix4(
        mirror.matrixWorldInverse,
      ),
      clip = new T.Vector4(
        plane.normal.x,
        plane.normal.y,
        plane.normal.z,
        plane.constant,
      ),
      m = mirror.projectionMatrix.elements,
      q = new T.Vector4(
        Math.sign(clip.x),
        Math.sign(clip.y),
        1,
        1,
      ).applyMatrix4(mirror.projectionMatrix.clone().invert());
    clip.multiplyScalar(2 / clip.dot(q));
    m[2] = clip.x - m[3];
    m[6] = clip.y - m[7];
    m[10] = clip.z - m[11];
    m[14] = clip.w - m[15];
    const hidden = [...this.waterMeshes, ...this.reflectionSkip],
      visible = hidden.map((o) => o.visible);
    hidden.forEach((o) => (o.visible = false));
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    try {
      renderer.setRenderTarget(this.reflectionTarget);
      renderer.clear();
      renderer.render(this.scene, mirror);
      this.waterUniforms.forEach((u) => (u.uReflectionReady.value = 1));
    } finally {
      renderer.setRenderTarget(oldTarget);
      renderer.shadowMap.autoUpdate = oldAuto;
      renderer.shadowMap.needsUpdate = oldNeeds;
      hidden.forEach((o, i) => (o.visible = visible[i]));
    }
  };
  W.updateWater = function (time, night) {
    this.waterUniforms?.forEach((u) => {
      u.uTime.value = this.reduced ? 0 : time;
      u.uNight.value = night;
    });
  };
  W.makeDistantForest = function () {
    const r = TownCore.rng(21807),
      trunk = this.artMat("wood", 0x65583d);
    // Vertex shade survives instancing; no white emissive term washes out the grove.
    const leaf = new T.MeshStandardMaterial({
      color: 0xffffff,
      map: TownArt.generated("tree-foliage", false),
      alphaTest: 0.55,
      vertexColors: true,
      roughness: 0.93,
      side: T.DoubleSide,
    });
    leaf.userData.thinFoliage = true;
    const lod = [];
    for (let variant = 0; variant < 4; variant++) {
      const source = this.geo["floraCrown" + variant],
        p = [],
        c = [],
        uv = [];
      // Sample whole leaves across the full crown. The source owns the leaf
      // stride; slicing fixed 18-vertex chunks previously severed 24-vertex leaves
      // and discarded most of the lower half of every tree.
      const stride = source.userData.leafVertexCount;
      const leafCount = source.attributes.position.count / stride;
      const samples = Math.min(12, leafCount);
      for (let sample = 0; sample < samples; sample++) {
        const j = Math.floor(((sample + 0.25) * leafCount) / samples);
        const center = new T.Vector3();
        for (let k = 0; k < stride; k++)
          center.add(
            new T.Vector3().fromBufferAttribute(
              source.attributes.position,
              j * stride + k,
            ),
          );
        center.multiplyScalar(1 / stride);
        for (let k = 0; k < stride; k++) {
          const i = j * stride + k,
            v = new T.Vector3()
              .fromBufferAttribute(source.attributes.position, i)
              .sub(center)
              .multiplyScalar(1.35)
              .add(center);
          p.push(v.x, v.y, v.z);
          uv.push(source.attributes.uv.getX(i), source.attributes.uv.getY(i));
          c.push(
            source.attributes.color.getX(i),
            source.attributes.color.getY(i),
            source.attributes.color.getZ(i),
          );
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
      g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      lod.push(g);
    }
    const greens = [0xc8d2b4, 0xe5e7cb, 0xd7dfbd, 0xc9dbcb, 0xece2bd],
      trees = [];
    for (let i = 0; i < 520; i++) {
      const angle = r() * Math.PI * 2,
        ring = i < 180 ? 62 + r() * 31 : 93 + r() * 57;
      const x = Math.cos(angle) * ring,
        z = Math.sin(angle) * ring * 0.92 - 8;
      if (Math.abs(x) < 59 && z > -57 && z < 61) continue;
      // Broad clearings break the perimeter into overlapping groves, never a hedge.
      if (i > 180 && Math.sin(x * 0.056 + z * 0.037) > 0.83 && r() > 0.38)
        continue;
      const h = (i < 180 ? 5.5 : 7) + r() * (i < 180 ? 5.5 : 6),
        base = woodlandHeight(x, z) - 0.18,
        columnar = i % 5 === 0;
      trees.push({ x, z, h, base });
      this.artInstance(
        this.geo.floraBranch,
        trunk,
        [x, base + h * 0.26, z],
        [h * 0.029, h * 0.52, h * 0.029],
        [0, r() * 6.28, (r() - 0.5) * 0.055],
      );
      const twist = r() * 6.28;
      for (let k = 0; k < 7; k++) {
        const a = twist + k * 2.39996,
          top = k > 3,
          reach = columnar ? h * 0.035 : top ? h * 0.12 : h * 0.25,
          scale = h * (columnar ? 0.16 : 0.38 + r() * 0.075);
        this.artInstance(
          lod[(i + k) % 4],
          leaf,
          [
            x + Math.cos(a) * reach,
            base + h * (columnar ? 0.4 + k * 0.115 : top ? 0.71 : 0.49),
            z + Math.sin(a) * reach,
          ],
          [scale, scale * (columnar ? 1.55 : top ? 0.94 : 0.72), scale],
          [0, a, (r() - 0.5) * 0.3],
          greens[(i + k) % greens.length],
        );
        if (k < 2) {
          const start = new T.Vector3(x, base + h * 0.3, z),
            end = new T.Vector3(
              x + Math.cos(a) * reach,
              base + h * 0.5,
              z + Math.sin(a) * reach,
            ),
            delta = end.clone().sub(start),
            rot = new T.Euler().setFromQuaternion(
              new T.Quaternion().setFromUnitVectors(
                new T.Vector3(0, 1, 0),
                delta.clone().normalize(),
              ),
            );
          this.artInstance(
            this.geo.floraBranch,
            trunk,
            start.clone().lerp(end, 0.5).toArray(),
            [h * 0.016, delta.length(), h * 0.016],
            [rot.x, rot.y, rot.z],
          );
        }
      }
      // A few low crowns anchor trunks in the near woodland edge.
      if (i < 180 && i % 3 === 0)
        this.artInstance(
          lod[i % 4],
          leaf,
          [x + h * 0.19, base + 0.8, z - h * 0.12],
          [2.8, 1.5, 2.4],
          [0, twist, 0],
          greens[(i + 2) % greens.length],
        );
    }
    // Low interlocking understorey closes the bare gap below distant canopies.
    // These have the same curled-leaf silhouette as the crowns, with no billboards.
    for (let i = 0; i < 140; i++) {
      const tree = trees[Math.floor(r() * trees.length)],
        x = tree.x + (r() - 0.5) * 8,
        z = tree.z + (r() - 0.5) * 8;
      if (Math.abs(x) < 61 && z > -58 && z < 62) continue;
      const base = woodlandHeight(x, z) - 0.18,
        size = 3.7 + r() * 2.3;
      for (let k = 0; k < 2; k++)
        this.artInstance(
          lod[(i + k) % 4],
          leaf,
          [x + k * size * 0.44, base + size * 0.2, z - k * size * 0.18],
          [size, size * 0.4, size * 0.9],
          [0, r() * 6.28, 0],
          greens[(i + k + 3) % greens.length],
        );
    }
    const terrain = this.scene.getObjectByName("terrain/woodland").geometry,
      positions = terrain.attributes.position,
      colors = terrain.attributes.color;
    // Broad canopy occlusion adds depth to the remote understory without drawing
    // hundreds of overlapping transparent shadow cards or adding a shadow pass.
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      if (Math.abs(x) > 170 || Math.abs(z) > 170) continue;
      let shade = 1;
      for (const tree of trees) {
        const dx = x - tree.x,
          dz = z - tree.z,
          radius = tree.h * 0.57;
        if (Math.abs(dx) > radius || Math.abs(dz) > radius) continue;
        shade = Math.min(
          shade,
          0.69 + 0.31 * T.MathUtils.smoothstep(Math.hypot(dx, dz), 0, radius),
        );
      }
      colors.setXYZ(
        i,
        colors.getX(i) * shade,
        colors.getY(i) * shade,
        colors.getZ(i) * shade,
      );
    }
    colors.needsUpdate = true;
    this.woodlandTrees = trees;
  };
})();
