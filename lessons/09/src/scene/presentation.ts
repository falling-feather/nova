import * as T from 'three';

/** Chapter 1's picture-book treatment: honey highlights, cool open shade, restrained contrast. */
export function installGardenPresentation(renderer: T.WebGLRenderer) {
  const identity = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
  const grade = `// conservatory-picture-book-v2
  vec3 CustomToneMapping( vec3 color ) {
    vec3 g = pow(max(NeutralToneMapping(color), vec3(0.0)), vec3(1.0 / 2.2));
    float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
    g += mix(vec3(-0.004, 0.006, 0.038), vec3(0.026, 0.012, -0.020), smoothstep(0.16, 0.8, l));
    g += 0.035 * (1.0 - g) * (1.0 - smoothstep(0.0, 0.45, l));
    g = mix(g, g * g * (3.0 - 2.0 * g), 0.12);
    g = mix(vec3(dot(g, vec3(0.2126, 0.7152, 0.0722))), g, 1.16);
    return pow(saturate(g), vec3(2.2));
  }`;
  if (!T.ShaderChunk.tonemapping_pars_fragment.includes('conservatory-picture-book-v2'))
    T.ShaderChunk.tonemapping_pars_fragment = T.ShaderChunk.tonemapping_pars_fragment.replace(
      identity,
      grade
    );
  renderer.toneMapping = T.CustomToneMapping;
  renderer.toneMappingExposure = 1.0;
}

export function createGardenSky() {
  const material = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new T.Color('#74add8') },
      horizon: { value: new T.Color('#cde4e9') },
      cloud: { value: new T.Color('#fffae9') },
      overcast: { value: 0 },
    },
    vertexShader:
      'varying vec3 skyDirection; void main(){skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 skyDirection; uniform vec3 zenith,horizon,cloud; uniform float overcast;
      float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec3 d=normalize(skyDirection);float up=max(d.y,0.);
        vec3 color=mix(horizon,zenith,sqrt(up));
        vec2 p=d.xz/max(.16,d.y)*2.0;
        float n=noise(p)*.7+noise(p*2.1+4.3)*.3;
        float veil=smoothstep(.58-overcast*.12,.8,n)*smoothstep(.02,.2,up);
        color=mix(color,cloud,veil*.78);
        color=mix(color,horizon,overcast*.35);
        gl_FragColor=vec4(color,1.0);
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(95, 32, 16), material);
  sky.name = '柔光天空';
  sky.renderOrder = -20;
  return sky;
}
