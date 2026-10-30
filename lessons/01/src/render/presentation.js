/* Physically lit stylized presentation; does not own course or save state. */
(function (g) {
  "use strict";
  const T = THREE;
  // A picture-book look for primary-school players, installed once for every
  // material. Grading lives inside tone mapping, so the composer's OutputPass,
  // direct low-quality rendering and saved course photos share one look:
  // PBR Neutral, then cheerful saturation, shade that stays a soft lilac-blue
  // instead of grey, warm honey highlights and a gentle S-curve (display gamma).
  const GRADE = `vec3 CustomToneMapping( vec3 color ) {
	vec3 neutral = NeutralToneMapping( color );
	vec3 g = pow( max( neutral, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) );
	float luma = dot( g, vec3( 0.2126, 0.7152, 0.0722 ) );
	g += mix( vec3( -0.004, 0.006, 0.038 ), vec3( 0.026, 0.012, -0.020 ), smoothstep( 0.16, 0.8, luma ) );
	g = g + 0.035 * ( 1.0 - g ) * ( 1.0 - smoothstep( 0.0, 0.45, luma ) );
	g = mix( g, g * g * ( 3.0 - 2.0 * g ), 0.12 );
	float graded = dot( g, vec3( 0.2126, 0.7152, 0.0722 ) );
	g = mix( vec3( graded ), g, 1.16 );
	return pow( saturate( g ), vec3( 2.2 ) );
}`;
  // One drifting cloud field paints the sky's clouds and casts their soft
  // shadows over the town, so every shadow passes under a cloud overhead.
  // x, y: drift; z: shadow depth; w: layer height in metres.
  const CLOUD = { value: new T.Vector4(0, 0, 0, 120) };
  const CLOUD_NOISE = `
float cloudHash( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * 0.1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
float cloudValue( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( cloudHash( i ), cloudHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( cloudHash( i + vec2( 0.0, 1.0 ) ), cloudHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
// Broad soft blobs for the shadows of passing clouds.
float cloudShape( vec2 p ) {
	return cloudValue( p ) * 0.65 + cloudValue( mat2( 1.6, 1.2, -1.2, 1.6 ) * p + 5.2 ) * 0.35;
}
`;
  const SUN_SHADOW =
    "vDirectionalShadowCoord[ i ] ) : 1.0;",
    DIRECT_CALL =
      "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
  const CLOUD_SHADE = `
		{
			mat3 cloudToWorld = transpose( mat3( viewMatrix ) );
			vec3 cloudPoint = cloudToWorld * geometryPosition + cameraPosition;
			vec3 cloudSun = cloudToWorld * directLight.direction;
			vec2 cloudAt = cloudPoint.xz + cloudSun.xz * ( cloudDrift.w - cloudPoint.y ) / max( cloudSun.y, 0.2 );
			directLight.color *= 1.0 - cloudDrift.z * smoothstep( 0.52, 0.68, cloudShape( cloudAt * 0.012 + cloudDrift.xy ) );
		}`;
  function installStyle(renderer) {
    const identity = "vec3 CustomToneMapping( vec3 color ) { return color; }";
    if (T.ShaderChunk.tonemapping_pars_fragment.includes(identity))
      T.ShaderChunk.tonemapping_pars_fragment =
        T.ShaderChunk.tonemapping_pars_fragment.replace(identity, GRADE);
    renderer.toneMapping = T.CustomToneMapping;
    // The shadowed sun dims where a cloud passes over; materials without their
    // own compile hook receive the shared drift from the prototype.
    if (!T.ShaderChunk.lights_pars_begin.includes("cloudShape")) {
      T.ShaderChunk.lights_pars_begin =
        "uniform vec4 cloudDrift;" + CLOUD_NOISE + T.ShaderChunk.lights_pars_begin;
      T.ShaderChunk.lights_fragment_begin = T.ShaderChunk.lights_fragment_begin.replace(
        SUN_SHADOW,
        SUN_SHADOW + CLOUD_SHADE,
      );
      // Lamps, windows and room lights skip all shading wherever they add
      // nothing: switched off by day, or out of reach. So the light pool can
      // stay in every shader and no lamp ever changes which shaders exist.
      for (const info of [
        "getPointLightInfo( pointLight, geometryPosition, directLight );",
        "getSpotLightInfo( spotLight, geometryPosition, directLight );",
      ]) {
        const chunk = T.ShaderChunk.lights_fragment_begin,
          call = chunk.indexOf(DIRECT_CALL, chunk.indexOf(info));
        T.ShaderChunk.lights_fragment_begin =
          chunk.slice(0, call) + "if ( directLight.visible ) " + chunk.slice(call);
      }
    }
    T.Material.prototype.onBeforeCompile = function (shader) {
      shader.uniforms.cloudDrift = CLOUD;
    };
  }
  // Materials that compile through their own hook get the drift added on top.
  function shareClouds(root) {
    root.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (!m || m.userData.cloudShared) continue;
        m.userData.cloudShared = true;
        if (!Object.prototype.hasOwnProperty.call(m, "onBeforeCompile")) continue;
        const own = m.onBeforeCompile;
        m.onBeforeCompile = function (shader, renderer) {
          own.call(this, shader, renderer);
          shader.uniforms.cloudDrift = CLOUD;
        };
      }
    });
  }
  // Day sky and a sunset that keeps a warm band toward the low sun.
  const SKY_FRAGMENT = `varying vec3 vDirection;uniform float uNight;uniform vec3 uHaze;uniform vec3 uZenith;uniform vec3 uGround;uniform float uLighting;uniform vec3 uSun;
void main(){vec3 d=normalize(vDirection);float up=max(d.y,0.);float sunDot=max(dot(d,uSun),0.);
vec3 day=mix(uHaze,uZenith,sqrt(up));day=mix(day,mix(uGround,day,smoothstep(-.06,.12,d.y)),uLighting);
day+=vec3(1.,.84,.57)*pow(sunDot,160.)*.6+vec3(1.,.9,.72)*pow(sunDot,7.)*.1;
vec2 skyAz=normalize(d.xz+vec2(1e-5)),sunAz=normalize(uSun.xz);
float toward=pow(max(dot(skyAz,sunAz),0.),2.2);
vec3 dusk=mix(mix(vec3(.86,.6,.55),vec3(1.22,.6,.3),toward),vec3(.15,.16,.34),pow(up,.42));
dusk=mix(dusk,vec3(.4,.3,.35),smoothstep(.02,-.12,d.y));
dusk+=vec3(1.25,.72,.36)*(pow(sunDot,18.)*.45+pow(sunDot,700.)*1.6);
vec3 col=mix(day,dusk,uNight);
gl_FragColor=vec4(col,1.);}`;
  const SUN_DAY = new T.Vector3(-52, 44, 22),
    SUN_DUSK = new T.Vector3(-64, 15, 13);
  // Afternoon → sunset palette; allocated once rather than every frame.
  const LIGHT = Object.fromEntries(
    Object.entries({
      sunDay: 0xffe8c6,
      sunDusk: 0xffa463,
      skyDay: 0xbdd6f7,
      skyDusk: 0xa8acd8,
      groundDay: 0x8f8a70,
      groundDusk: 0x97735f,
      ambientDay: 0xf5f0e7,
      ambientDusk: 0xc4b8d6,
      bounceDay: 0xd4e4fa,
      bounceDusk: 0x9ca3d6,
      fogDay: 0xd1dfe1,
      fogDusk: 0xb08a84,
      horizonDay: 0xffffff,
      horizonDusk: 0x8f7584,
      backgroundDay: 0xc5dfea,
      backgroundDusk: 0x6f6b92,
      lampDay: 0xffe7cf,
      lampNight: 0xffbd79,
      windowNight: 0xffc184,
    }).map(([key, hex]) => [key, new T.Color(hex)]),
  );
  function updateSunShadow(app, room, night) {
    const shadow = app.sun.shadow;
    const changed = shadow.userData?.room !== room;
    const target = app.sun.target.position;
    if (room)
      target.set(room.x, 2 + TownLayout.terrainHeight(room.x, room.z), room.z);
    else target.set(0, 0, 0);
    // Shift light and target together: the sun keeps the same world direction.
    // The indoor map covers the room and its nearby casters instead of spending
    // most of its texels on unseen woodland, so small props retain contact shadows.
    // Toward dusk it sinks lower in the west, lengthening every shadow.
    app.sun.position.lerpVectors(SUN_DAY, SUN_DUSK, night).add(target);
    app.sky?.material.uniforms.uSun.value
      .copy(app.sun.position)
      .sub(target)
      .normalize();
    // Direction keeps easing, but an infinitesimal night tail must not bypass
    // the transition/12-frame refresh gate in update(). Only coverage changes
    // require an immediate extra shadow render.
    if (!changed) return;
    shadow.userData = { room };
    const radius = room ? Math.max(room.w, room.d) * 0.7 + 4 : 58;
    Object.assign(shadow.camera, {
      left: -radius,
      right: radius,
      top: radius,
      bottom: -radius,
      near: 1,
      far: 150,
    });
    shadow.camera.updateProjectionMatrix();
    shadow.normalBias = room ? 0.004 : 0.022;
    shadow.bias = room ? -0.000025 : -0.00007;
    shadow.radius = room ? 3.2 : 2.2;
    shadow.needsUpdate = true;
    app.renderer.shadowMap.needsUpdate = true;
  }
  function setupLocalLights(app) {
    app.localLightSources = [
      ...app.world.buildings.map((house) => ({
        house,
        x: house.x + house.w * 0.2,
        y: 2.7 + TownLayout.terrainHeight(house.x, house.z),
        z: house.front - 1.4,
      })),
      ...app.world.lamps,
    ];
    // Always present in the scene (dark ones cost almost nothing, see
    // installStyle), so switching lamps never needs new shaders.
    app.localLights = Array.from({ length: 4 }, () => {
      const light = new T.PointLight(0xffc184, 0, 12, 2);
      app.scene.add(light);
      return light;
    });
  }
  function updateLocalLights(app, viewpoint, night, dt) {
    const room = app.world.buildings.find(
      (b) =>
        Math.abs(viewpoint.x - b.x) < b.w / 2 &&
        Math.abs(viewpoint.z - b.z) < b.d / 2,
    );
    // The same four light slots serve windows and street lanterns. Indoors,
    // only that room may light the view; unshadowed street lights cannot leak in.
    const wanted = app.localLightSources
      .filter((source) => (room ? source.house === room : night > 0.001))
      .sort(
        (a, b) =>
          Math.hypot(a.x - viewpoint.x, a.z - viewpoint.z) -
          Math.hypot(b.x - viewpoint.x, b.z - viewpoint.z),
      )
      .slice(0, app.localLights.length);
    const claimed = new Set(
      app.localLights
        .map((light) => light.userData.source)
        .filter((source) => wanted.includes(source)),
    );
    const blend = app.world.reduced ? 1 : 1 - Math.exp(-8 * dt);
    for (const light of app.localLights) {
      let source = light.userData.source;
      if (
        !wanted.includes(source) &&
        (light.intensity < 0.02 || app.world.reduced)
      ) {
        source = wanted.find((candidate) => !claimed.has(candidate));
        light.userData.source = source;
        light.intensity = 0;
        if (source) {
          claimed.add(source);
          light.position.set(source.x, source.y, source.z);
          light.distance = source.house ? 12 : 11;
        }
      }
      const target =
        source && wanted.includes(source)
          ? source.house
            ? night * 24 + (room === source.house ? 1.5 * (1 - night) : 0)
            : night * 46
          : 0;
      light.intensity += (target - light.intensity) * blend;
      light.color.lerpColors(
        LIGHT.lampDay,
        source?.house ? LIGHT.windowNight : LIGHT.lampNight,
        night,
      );
    }
  }
  function setup(app) {
    installStyle(app.renderer);
    app.renderer.toneMappingExposure = 1.05;
    app.renderer.shadowMap.type = T.PCFShadowMap;
    app.renderer.shadowMap.autoUpdate = false;
    app.sun.color.setHex(0xfff2db);
    app.sun.position.set(-52, 44, 22);
    app.sun.shadow.mapSize.set(4096, 4096);
    app.sun.shadow.normalBias = 0.022;
    app.sun.shadow.bias = -0.00007;
    app.sun.shadow.radius = 2.2;
    app.scene.add(app.sun.target);
    const env = new T.Scene(),
      skyMat = new T.ShaderMaterial({
        side: T.BackSide,
        uniforms: {
          uNight: { value: 0 },
          uHaze: { value: new T.Color(0x75b0df).multiplyScalar(1.12) },
          uZenith: { value: new T.Color(0x75b0df).multiplyScalar(0.7) },
          uGround: { value: new T.Color().setRGB(0.1, 0.09, 0.07) },
          uLighting: { value: 0 },
          uSun: { value: SUN_DAY.clone().normalize() },
        },
        vertexShader:
          "varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: SKY_FRAGMENT,
        depthWrite: false,
      });
    // The visible panorama is display-referred; its blue must not reduce the
    // radiance used to light shaded faces and shelves throughout the town.
    const environmentSky = skyMat.clone();
    environmentSky.uniforms.uHaze.value.setRGB(0.75, 0.8, 0.85);
    environmentSky.uniforms.uZenith.value.setRGB(0.25, 0.48, 0.78);
    // Ground reflection must not emit the same radiance as the horizon over
    // the entire lower hemisphere: that erased the shade under eaves and crowns.
    environmentSky.uniforms.uLighting.value = 1;
    env.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), environmentSky));
    const pmrem = new T.PMREMGenerator(app.renderer);
    app.envTarget = pmrem.fromScene(env, 0.05, 0.1, 150);
    app.scene.environment = app.envTarget.texture;
    app.scene.environmentIntensity = 0.42;
    pmrem.dispose();
    env.children[0].geometry.dispose();
    env.children[0].material.dispose();
    app.sky = new T.Mesh(new T.SphereGeometry(350, 32, 16), skyMat);
    app.sky.frustumCulled = false;
    app.sky.renderOrder = -100;
    app.scene.add(app.sky);
    app.scene.fog = new T.Fog(0xd9e3df, 90, 270);
    let horizonComplete;
    app.horizonReady = new Promise((resolve) => (horizonComplete = resolve));
    const horizonTexture = new T.TextureLoader().load(
      "assets/environment/spring-horizon.png",
      () => horizonComplete(),
      undefined,
      () => {
        app.visualErrors.push("spring-horizon");
        horizonComplete();
      },
    );
    horizonTexture.colorSpace = T.SRGBColorSpace;
    horizonTexture.wrapS = T.MirroredRepeatWrapping;
    horizonTexture.repeat.set(4, 1.5);
    horizonTexture.offset.y = 0.2;
    horizonTexture.anisotropy = 8;
    const horizonMaterial = new T.MeshBasicMaterial({
      map: horizonTexture,
      side: T.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    horizonMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphamap_fragment>",
        "#include <alphamap_fragment>\n diffuseColor.a *= smoothstep(0.,.04,vMapUv.y)*(1.-smoothstep(.58,1.,vMapUv.y));",
      );
    };
    horizonMaterial.customProgramCacheKey = () => "chunting-horizon-fade";
    app.horizon = new T.Mesh(
      new T.CylinderGeometry(175, 175, 110, 128, 1, true),
      horizonMaterial,
    );
    app.horizon.position.y = 42;
    app.horizon.rotation.y = 0.35;
    app.horizon.renderOrder = -90;
    app.scene.add(app.horizon);
    setupLocalLights(app);
    app.bounce = new T.DirectionalLight(0xd4e4fa, 0.48);
    app.bounce.position.set(30, 19, -40);
    app.scene.add(app.bounce);
    app.windowFill = new T.SpotLight(0xfff1de, 0, 12, 0.95, 0.65, 2);
    app.windowFill.castShadow = true;
    app.windowFill.shadow.mapSize.set(1024, 1024);
    app.windowFill.shadow.camera.near = 0.1;
    app.windowFill.shadow.camera.far = 12;
    app.windowFill.shadow.normalBias = 0.004;
    app.windowFill.shadow.bias = -0.000025;
    app.windowFill.shadow.radius = 3.2;
    app.windowFill.shadow.autoUpdate = false;
    app.windowFill.position.set(0, 2.55, 0);
    app.windowFill.target.position.set(0, 1.15, -1.7);
    app.roomLightMix = 0;
    app.scene.add(app.windowFill, app.windowFill.target);
    app.hearthLight = new T.SpotLight(0xffc079, 0, 8, 1.05, 0.75, 2);
    app.hearthLight.castShadow = true;
    app.hearthLight.shadow.mapSize.set(512, 512);
    app.hearthLight.shadow.camera.near = 0.08;
    app.hearthLight.shadow.camera.far = 8;
    app.hearthLight.shadow.normalBias = 0.012;
    app.hearthLight.shadow.autoUpdate = false;
    app.scene.add(app.hearthLight, app.hearthLight.target);
    app.renderer.shadowMap.needsUpdate = true;
    shareClouds(app.scene);
    // Lights also shine on the badge layer. The badge pass then keeps the
    // same light setup as the town, so shadow shaders (built from the light
    // setup left by the previous draw) never come in two versions.
    for (const light of [
      app.sun,
      app.hemi,
      app.ambient,
      app.bounce,
      app.windowFill,
      app.hearthLight,
      ...app.localLights,
    ])
      light.layers.enable(1);
  }
  function update(app, night, dt = 1 / 60) {
    app.renderer.toneMappingExposure = 1.0 - 0.05 * night;
    // Clouds drift with the breeze; their shadows fade toward dusk and indoors.
    if (!app.world.reduced) {
      CLOUD.value.x += dt * 0.021;
      CLOUD.value.y += dt * 0.008;
    }
    CLOUD.value.z = 0.3 * (1 - night) * (1 - 0.7 * (app.roomLightMix || 0));
    const viewpoint = app.focus ? app.activeCamera.position : app.player;
    app.sun.color.lerpColors(LIGHT.sunDay, LIGHT.sunDusk, night);
    updateLocalLights(app, viewpoint, night, dt);
    const room = app.world.buildings.find(
      (b) =>
        Math.abs(viewpoint.x - b.x) < b.w / 2 + 0.8 &&
        Math.abs(viewpoint.z - b.z) < b.d / 2 + 0.8,
    );
    const indoor = !!room && (app.mode !== "overview" || !!app.focus);
    updateSunShadow(app, indoor ? room : null, night);
    app.roomLightMix = app.world.reduced
      ? Number(indoor)
      : app.roomLightMix +
        (Number(indoor) - app.roomLightMix) * (1 - Math.exp(-6 * dt));
    if (room) {
      const base = TownLayout.terrainHeight(room.x, room.z);
      // A broad, shadowed window key lights the working side of a room. Unlike
      // an unshadowed fill it preserves the small objects' contact with the table.
      const reach = Math.min(2.8, room.w * 0.24);
      app.windowFill.userData.dayIntensity = 36 * (reach / 2.8) ** 2;
      app.windowFill.position.set(room.x - reach, base + 2.55, room.z - 0.35);
      app.windowFill.target.position.set(
        room.x + 0.2,
        base + 1.15,
        room.z - 1.7,
      );
    }
    app.windowFill.intensity =
      (app.windowFill.userData.dayIntensity || 0) *
      app.roomLightMix *
      (1 - night);
    const shadowRoom = indoor ? room : null;
    if (
      !app.windowFill.shadow.map ||
      (indoor &&
        (app.windowFill.userData.shadowRoom !== shadowRoom ||
          app.frame % 12 === 0))
    )
      app.windowFill.shadow.needsUpdate = true;
    app.windowFill.userData.shadowRoom = shadowRoom;
    if (!app.lowQuality && app.windowFill.shadow.needsUpdate)
      app.renderer.shadowMap.needsUpdate = true;
    const hearth = app.world.bakeryHearth;
    if (hearth) {
      const t = app.world.reduced ? 0 : app.time;
      hearth.time.value = t;
      app.hearthLight.position.set(hearth.x, 1.03, hearth.z + 0.22);
      app.hearthLight.target.position.set(hearth.x - 0.7, 1.15, hearth.z + 4);
      app.hearthLight.intensity =
        room?.id === "bakery"
          ? 14 + Math.sin(t * 3.1) * 0.8 + Math.sin(t * 6.7) * 0.4
          : 0;
      app.hearthLight.shadow.needsUpdate =
        !app.hearthLight.shadow.map ||
        (room?.id === "bakery" && app.frame % 12 === 0);
      // Even an initially dark shadow-casting light needs a valid first map:
      // an uninitialised shadow sampler poisons the PBR light accumulation.
      if (!app.lowQuality && !app.hearthLight.shadow.map)
        app.renderer.shadowMap.needsUpdate = true;
    }
    // Every night-lit surface follows the same continuous curve: window glass,
    // building lamps and street lantern bulbs. Bloom only exists after sunset.
    const glow = night * night * (3 - 2 * night);
    app.world.windowMaterials?.forEach((m) => {
      m.emissive.setHex(0xffc783);
      m.emissiveIntensity = glow * 1.45;
      m.opacity = 0.24 + night * 0.14;
    });
    app.world.lampMaterials?.forEach(
      (m) => (m.emissiveIntensity = 0.22 + glow * 2.6),
    );
    if (app.world.lanternGlow)
      app.world.lanternGlow.emissiveIntensity = 0.14 + glow * 2.4;
    if (app.post?.bloom) {
      // A soft daylight halation, and lit lanterns and windows after sunset.
      app.post.bloom.strength = 0.12 * (1 - glow) + 0.62 * glow;
      app.post.bloom.threshold = 0.86 + 0.09 * glow;
      // The whole-town view reads as a little model village.
      const tilt = app.mode === "overview" && !app.focus ? 1 : 0;
      app.post.tilt += (tilt - app.post.tilt) * (app.world.reduced ? 1 : 1 - Math.exp(-5 * dt));
      for (const pass of app.post.tiltPasses) {
        pass.enabled = app.post.tilt > 0.01;
        pass.uniforms.uAmount.value = app.post.tilt;
      }
      // On computers that had to step the resolution down, the daylight glow
      // goes first and, at the lowest step, the contact shading as well.
      // Contact shading is also skipped in the whole-town view, where it is
      // only a few pixels wide.
      const scale = app.renderScale ?? 1,
        tier = scale <= 0.75 + 1e-6 ? 2 : scale <= 0.85 + 1e-6 ? 1 : 0;
      app.post.bloom.enabled = tier === 0 || glow > 0.01;
      app.post.ao.enabled = app.post.tilt < 0.5 && tier < 2;
    }
    app.horizon.material.color.lerpColors(LIGHT.horizonDay, LIGHT.horizonDusk, night);
    app.sun.intensity = 4.1 * (1 - night) + 1.9 * night;
    // A generous sky fill keeps every shaded side readable and colourful.
    app.hemi.intensity =
      (0.8 - 0.14 * app.roomLightMix) * (1 - night) + 0.82 * night;
    app.hemi.color.lerpColors(LIGHT.skyDay, LIGHT.skyDusk, night);
    app.hemi.groundColor.lerpColors(LIGHT.groundDay, LIGHT.groundDusk, night);
    app.ambient.color.lerpColors(LIGHT.ambientDay, LIGHT.ambientDusk, night);
    app.ambient.intensity = 0.04 * (1 - night) + 0.08 * night;
    app.bounce.color.lerpColors(LIGHT.bounceDay, LIGHT.bounceDusk, night);
    app.bounce.intensity = 0.38 * (1 - night) + 0.3 * night;
    app.scene.environmentIntensity =
      (0.5 - 0.18 * app.roomLightMix) * (1 - night) + 0.32 * night;
    app.sky.material.uniforms.uNight.value = night;
    // Close cameras (activities, photos) end before the sky dome; they see this.
    app.scene.background.lerpColors(LIGHT.backgroundDay, LIGHT.backgroundDusk, night);
    app.scene.fog.color.lerpColors(LIGHT.fogDay, LIGHT.fogDusk, night);
    app.scene.fog.near = 90 - 15 * night;
    app.scene.fog.far = 270 - 50 * night;
    if (app.frame % 12 === 0 || Math.abs(night - app.nightTarget) > 0.01)
      app.renderer.shadowMap.needsUpdate = true;
    app.world.updateWater?.(app.time, night);
    app.world.updateSkyClouds?.(app.time, night, app.world.reduced);
    app.world.updateLawn?.(app.activeCamera, app.player, app.mode);
    app.world.updateAmbient?.(app.media?.active ? 0 : dt, app.time, viewpoint, night);
    app.world.updateFlora?.(
      app.world.reduced ? 0 : 0.016,
      app.time,
      app.world.reduced,
    );
    app.world.updateGardens?.(
      app.time,
      app.world.reduced,
      app.activeCamera,
      app.lowQuality,
    );
  }
  function makePost(app) {
    const composer = new T.EffectComposer(app.renderer);
    const render = new T.RenderPass(app.scene, app.activeCamera);
    const ao = new T.GTAOPass(
      app.scene,
      app.activeCamera,
      innerWidth / 2,
      innerHeight / 2,
    );
    // Contact shading grounds props without the heavy grime of a realistic AO.
    ao.blendIntensity = 0.42;
    ao.updateGtaoMaterial({
      radius: 0.42,
      thickness: 1,
      scale: 1,
      samples: 8,
    });
    ao.setSceneClipBox(
      new T.Box3(new T.Vector3(-62, -3, -60), new T.Vector3(62, 30, 58)),
    );
    const renderAO = ao.render.bind(ao);
    ao.render = (...args) => {
      // The normal override cannot reproduce vertex wind. Thin foliage uses its
      // own transmitted light + cast shadows instead of a second opaque AO silhouette.
      const excluded = [
        ...app.world.waterMeshes,
        ...(app.world.thinFoliage || []),
        ...(app.world.markerMeshes || []),
        ...(app.world.inkMeshes || []),
        ...(app.world.effectMeshes || []),
        app.world.navLine,
      ];
      if (app.post.skipThinFoliage) {
        for (const batch of app.world._flora.batches.values())
          if (
            batch.kind === "grass" ||
            batch.kind === "canopy" ||
            batch.kind === "leaf" ||
            batch.kind === "petal"
          )
            excluded.push(batch.mesh);
      }
      const vis = excluded.map((x) => x.visible);
      excluded.forEach((x) => (x.visible = false));
      try {
        return renderAO(...args);
      } finally {
        excluded.forEach((x, i) => (x.visible = vis[i]));
      }
    };
    // Linear-HDR bloom: a faint halation on sunlit whites by day, then halos
    // round the lit lanterns, warm windows and the low sun after sunset.
    const bloom = new T.UnrealBloomPass(
      new T.Vector2(innerWidth, innerHeight),
      0,
      0.55,
      0.95,
    );
    // A lone specular spark must not become a glowing orb: cap what may bloom.
    bloom.materialHighPassFilter.fragmentShader =
      bloom.materialHighPassFilter.fragmentShader.replace(
        /texture2D\(\s*tDiffuse\s*,\s*vUv\s*\)/,
        "min( texture2D( tDiffuse, vUv ), vec4( 5.0 ) )",
      );
    bloom.materialHighPassFilter.needsUpdate = true;
    // Tilt-shift: two blur passes that soften the top and bottom of the
    // whole-town view, so the village reads as a little model on a table.
    const tiltPasses = [new T.Vector2(1, 0), new T.Vector2(0, 1)].map((dir) => {
      const pass = new T.ShaderPass(TILT_SHIFT);
      pass.uniforms.uDir.value.copy(dir);
      pass.enabled = false;
      return pass;
    });
    // Activity badges are drawn over the blurred town, so they stay readable.
    const badges = new T.RenderPass(app.scene, app.activeCamera);
    badges.clear = false;
    badges.enabled = false;
    const drawBadges = badges.render.bind(badges);
    badges.render = (...args) => {
      const scene = app.scene,
        background = scene.background,
        layers = badges.camera.layers.mask;
      scene.background = null;
      badges.camera.layers.set(1);
      try {
        drawBadges(...args);
      } finally {
        scene.background = background;
        badges.camera.layers.mask = layers;
      }
    };
    const output = new T.OutputPass();
    // FXAA also lays a gentle warm vignette over the frame, like the edge of
    // an illustrated page: one full-screen pass instead of two.
    const fxaa = new T.ShaderPass(T.FXAAShader);
    fxaa.uniforms.uAspect = { value: 16 / 9 };
    fxaa.material.fragmentShader = fxaa.material.fragmentShader
      .replace("uniform vec2 resolution;", "uniform vec2 resolution;\nuniform float uAspect;")
      .replace(
        "gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );",
        `gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );
 vec2 pageQ = ( vUv - 0.5 ) * vec2( uAspect, 1.0 );
 float pageEdge = smoothstep( 0.42, 1.08, length( pageQ * vec2( 0.82, 1.0 ) ) );
 gl_FragColor.rgb *= mix( vec3( 1.0 ), vec3( 0.88, 0.84, 0.86 ), pageEdge * 0.75 );`,
      );
    fxaa.material.needsUpdate = true;
    composer.addPass(render);
    composer.addPass(ao);
    composer.addPass(bloom);
    tiltPasses.forEach((pass) => composer.addPass(pass));
    composer.addPass(badges);
    composer.addPass(output);
    composer.addPass(fxaa);
    app.post = {
      composer,
      render,
      ao,
      bloom,
      tiltPasses,
      tilt: 0,
      badges,
      fxaa,
      skipThinFoliage: true,
    };
    resizePost(app);
  }
  const PASS_VERTEX =
    "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
  const TILT_SHIFT = {
    uniforms: {
      tDiffuse: { value: null },
      uDir: { value: new T.Vector2() },
      uPixel: { value: new T.Vector2(1 / 1600, 1 / 900) },
      uAmount: { value: 0 },
    },
    vertexShader: PASS_VERTEX,
    fragmentShader: `uniform sampler2D tDiffuse;uniform vec2 uDir;uniform vec2 uPixel;uniform float uAmount;varying vec2 vUv;
void main(){
 float blur=uAmount*smoothstep(.12,.48,abs(vUv.y-.5))*2.2;
 vec4 sum=vec4(0.);float total=0.;
 for(int i=-7;i<=7;i++){float w=exp(-float(i*i)/24.);sum+=texture2D(tDiffuse,vUv+uDir*uPixel*float(i)*blur)*w;total+=w;}
 gl_FragColor=sum/total;}`,
  };
  function resizePost(app) {
    if (!app.post) return;
    const pr = app.renderer.getPixelRatio();
    app.post.composer.setPixelRatio(pr);
    app.post.composer.setSize(innerWidth, innerHeight);
    app.post.ao.setSize(
      Math.round(innerWidth * pr * 0.5),
      Math.round(innerHeight * pr * 0.5),
    );
    app.post.fxaa.material.uniforms.resolution.value.set(
      1 / (innerWidth * pr),
      1 / (innerHeight * pr),
    );
    for (const pass of app.post.tiltPasses)
      pass.uniforms.uPixel.value.set(1 / (innerWidth * pr), 1 / (innerHeight * pr));
    app.post.fxaa.uniforms.uAspect.value = innerWidth / innerHeight;
  }
  function render(app) {
    if (!app.lowQuality && app.post) {
      const camera = app.activeCamera,
        // While the town is blurred, its badges wait for their own pass.
        late = app.post.tiltPasses[0].enabled && camera.layers.isEnabled(1);
      app.post.render.camera = camera;
      app.post.ao.camera = camera;
      app.post.badges.camera = camera;
      app.post.badges.enabled = late;
      if (late) camera.layers.disable(1);
      try {
        app.post.composer.render();
      } finally {
        if (late) camera.layers.enable(1);
      }
    } else app.renderer.render(app.scene, app.activeCamera);
  }
  g.TownPresentation = {
    setup,
    update,
    makePost,
    resizePost,
    render,
    setupLocalLights,
    updateLocalLights,
    updateSunShadow,
    sunPath: { day: SUN_DAY, dusk: SUN_DUSK },
    sky: { fragment: SKY_FRAGMENT, clouds: CLOUD },
  };
})(globalThis);
