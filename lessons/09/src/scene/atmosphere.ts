import * as T from 'three';
import { random } from './geometry.ts';

/** Weather follows the course calendar. Rain stays outside the conservatory footprint. */
export function createConservatoryAtmosphere(scene: T.Scene) {
  const rng = random(90418),
    time = { value: 0 },
    rainPositions: number[] = [],
    phases: number[] = [];
  for (let i = 0; i < 650; i++) {
    const a = rng() * Math.PI * 2,
      radius = 8 + Math.sqrt(rng()) * 17;
    const x = Math.cos(a) * radius,
      z = Math.sin(a) * radius,
      phase = rng() * 8;
    rainPositions.push(x, 0, z, x + 0.035, -0.24 - rng() * 0.13, z);
    phases.push(phase, phase);
  }
  const rainGeometry = new T.BufferGeometry();
  rainGeometry.setAttribute('position', new T.Float32BufferAttribute(rainPositions, 3));
  rainGeometry.setAttribute('rainPhase', new T.Float32BufferAttribute(phases, 1));
  const rainMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time, color: { value: new T.Color('#d4e6dc') } },
    vertexShader: `uniform float time;attribute float rainPhase;varying float fade;
      void main(){vec3 p=position;p.y+=mod(rainPhase-time*(4.8+rainPhase*.08),8.);fade=smoothstep(0.,.6,p.y)*(1.-smoothstep(6.5,8.,p.y));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:
      'uniform vec3 color;varying float fade;void main(){gl_FragColor=vec4(color,.28*fade);}',
  });
  const rain = new T.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  rain.visible = false;
  rain.name = '园历第五日 · 窗外小雨';
  scene.add(rain);
  const pollenPositions: number[] = [];
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2,
      r = Math.sqrt(rng()) * 5.5;
    pollenPositions.push(Math.cos(a) * r, 1.3 + rng() * 2.6, Math.sin(a) * r);
  }
  const pollenGeometry = new T.BufferGeometry();
  pollenGeometry.setAttribute('position', new T.Float32BufferAttribute(pollenPositions, 3));
  const pollenMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time, color: { value: new T.Color('#e4d5ac') } },
    vertexShader: `uniform float time;varying float fade;
      void main(){vec3 p=position;p.x+=sin(time*.16+position.z)*.12;p.y+=sin(time*.22+position.x)*.10;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(8./max(1.,-mv.z),1.,2.3);fade=.22+sin(time*.35+position.x*4.)*.08;}`,
    fragmentShader:
      'uniform vec3 color;varying float fade;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(color,fade*(1.-smoothstep(.1,.5,r)));}',
  });
  const pollen = new T.Points(pollenGeometry, pollenMaterial);
  pollen.frustumCulled = false;
  pollen.name = '温室微尘';
  scene.add(pollen);
  let rainy = false,
    low = false;
  return {
    setWeather(weather: string) {
      rainy = weather.includes('雨');
    },
    setQuality(smooth: boolean) {
      low = smooth;
    },
    update(seconds: number, reduced: boolean) {
      time.value = seconds;
      rain.visible = rainy && !reduced;
      pollen.visible = !rainy && !reduced && !low;
    },
    dispose() {
      rainGeometry.dispose();
      rainMaterial.dispose();
      pollenGeometry.dispose();
      pollenMaterial.dispose();
    },
  };
}
