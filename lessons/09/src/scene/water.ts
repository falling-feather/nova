import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import plan from '../spatial/plan.json';

/** Planar scene reflection with world-space ripples; no painted reflection panorama. */
export function createGardenWater() {
  const pool = plan.garden.pool;
  const mirror = new Reflector(new T.PlaneGeometry(pool.width - 0.09, pool.length - 0.09), {
    textureWidth: 512,
    textureHeight: 512,
    color: '#418d83',
    clipBias: 0.004,
    multisample: 0,
  });
  mirror.name = '水庭 · 实时倒影';
  mirror.position.set(pool.x, 0.113, pool.z);
  mirror.rotation.x = -Math.PI / 2;
  mirror.camera.layers.set(1);
  const material = mirror.material as T.ShaderMaterial;
  material.transparent = true;
  material.uniforms.waterTime = { value: 0 };
  material.uniforms.rainAmount = { value: 0 };
  material.vertexShader =
    'varying vec3 waterPoint; varying vec3 eyeDirection;\n' + material.vertexShader;
  material.vertexShader = material.vertexShader.replace(
    'vUv = textureMatrix * vec4( position, 1.0 );',
    `vUv = textureMatrix * vec4( position, 1.0 );
    waterPoint=(modelMatrix*vec4(position,1.)).xyz;
    eyeDirection=cameraPosition-waterPoint;`
  );
  material.fragmentShader =
    'uniform float waterTime; uniform float rainAmount; varying vec3 waterPoint; varying vec3 eyeDirection;\n' +
    material.fragmentShader;
  material.fragmentShader = material.fragmentShader.replace(
    'vec4 base = texture2DProj( tDiffuse, vUv );',
    `
    vec2 p=waterPoint.xz;
    vec2 wave=vec2(sin(p.y*5.1+waterTime*.7+sin(p.x*2.3)),cos(p.x*4.3-waterTime*.5+p.y*1.5));
    vec2 refUv=vUv.xy/vUv.w+wave*.0022;
    vec4 base=texture2D(tDiffuse,refUv);
    vec2 rainCell=floor(p*1.7),rainLocal=fract(p*1.7)-.5;
    float rainSeed=fract(sin(dot(rainCell,vec2(12.9898,78.233)))*437.58);
    float age=fract(waterTime*.62+rainSeed);
    float ring=exp(-abs(length(rainLocal)-age*.65)*85.)*(1.-age)*rainAmount;`
  );
  material.fragmentShader = material.fragmentShader.replace(
    'vec4( blendOverlay( base.rgb, color ), 1.0 )',
    `vec4(
    mix(color*.7,base.rgb,.24+.54*pow(1.-abs(normalize(eyeDirection).y),2.5))
    +vec3(.08,.13,.12)*pow(max(0.,sin(p.y*18.+sin(p.x*9.+waterTime)) * cos(p.x*15.-waterTime*.45)),16.)+vec3(.16,.23,.2)*ring,1.)`
  );
  const render = mirror.onBeforeRender.bind(mirror);
  let lastPose = '',
    stamp = 0;
  mirror.onBeforeRender = (renderer, scene, camera, ...args) => {
    if (scene.overrideMaterial) return;
    const signature =
      stamp +
      '|' +
      camera.matrixWorld.elements.join(',') +
      '|' +
      camera.projectionMatrix.elements.join(',');
    if (signature === lastPose) return;
    render(renderer, scene, camera, ...args);
    lastPose = signature;
  };
  return {
    mirror,
    update(time: number) {
      material.uniforms.waterTime.value = time;
      stamp = Math.floor(time * 2);
    },
    setRain(value: boolean) {
      material.uniforms.rainAmount.value = value ? 1 : 0;
    },
    invalidate() {
      lastPose = '';
    },
  };
}
