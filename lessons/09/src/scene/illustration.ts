import * as T from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

/** Fine structural ink, sampled from the existing AO buffers; it adds no geometry pass. */
function composition(ao: GTAOPass, camera: T.PerspectiveCamera) {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      tNormal: { value: null },
      tAO: { value: null },
      resolution: { value: new T.Vector2(1, 1) },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
    },
    vertexShader:
      'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse,tDepth,tNormal,tAO;uniform vec2 resolution;uniform float cameraNear,cameraFar;varying vec2 vUv;
      float viewDepth(vec2 uv){float d=texture2D(tDepth,uv).x;return cameraNear*cameraFar/(cameraFar+d*(cameraNear-cameraFar));}
      void main(){
        vec4 base=texture2D(tDiffuse,vUv);base.rgb*=mix(vec3(1.),texture2D(tAO,vUv).rgb,.95);float z=viewDepth(vUv);
        vec3 n=texture2D(tNormal,vUv).xyz;float depthEdge=0.,normalEdge=0.;
        for(int i=0;i<4;i++){
          vec2 offset=i==0?vec2(1.,0.):i==1?vec2(-1.,0.):i==2?vec2(0.,1.):vec2(0.,-1.);
          vec2 q=vUv+offset/resolution*1.1;
          float neighbor=viewDepth(q),difference=abs(z-neighbor)/max(z,.3);
          depthEdge=max(depthEdge,smoothstep(.004,.02,difference));
          normalEdge=max(normalEdge,smoothstep(.25,.7,length(n-texture2D(tNormal,q).xyz))*(1.-smoothstep(.01,.03,difference)));
        }
        float ink=max(depthEdge*.15,normalEdge*.1)*(1.-smoothstep(22.,40.,z));
        vec3 color=base.rgb*mix(vec3(1.),vec3(.25,.34,.32),ink);
        gl_FragColor=vec4(color,base.a);
      }`,
  });
  pass.uniforms.tDepth.value = ao.depthTexture;
  pass.uniforms.tNormal.value = ao.normalTexture;
  pass.uniforms.tAO.value = ao.gtaoMap;
  return pass;
}

/** Reuse contact shading while the camera is still; camera motion refreshes it immediately. */
export class ContactShadingPass extends Pass {
  readonly occlusion: GTAOPass;
  private composite: ShaderPass;
  private camera: T.PerspectiveCamera;
  private lastCapture = -Infinity;
  private signature = '';
  constructor(scene: T.Scene, camera: T.PerspectiveCamera) {
    super();
    this.camera = camera;
    this.occlusion = new GTAOPass(scene, camera, 1, 1);
    this.occlusion.output = GTAOPass.OUTPUT.Off;
    this.occlusion.updateGtaoMaterial({
      radius: 0.45,
      distanceExponent: 1.6,
      thickness: 0.35,
      distanceFallOff: 1.1,
      scale: 1,
      samples: 12,
      screenSpaceRadius: false,
    });
    this.occlusion.updatePdMaterial({ radius: 4, rings: 2, samples: 8, depthPhi: 3, normalPhi: 4 });
    this.composite = composition(this.occlusion, camera);
  }
  invalidate() {
    this.lastCapture = -Infinity;
  }
  override setSize(width: number, height: number) {
    this.occlusion.setSize(
      Math.max(1, Math.round(width * 0.4)),
      Math.max(1, Math.round(height * 0.4))
    );
    this.composite.uniforms.resolution.value.set(width, height);
    this.invalidate();
  }
  override render(
    renderer: T.WebGLRenderer,
    write: T.WebGLRenderTarget,
    read: T.WebGLRenderTarget,
    delta: number,
    mask: boolean
  ) {
    const now = performance.now(),
      signature =
        this.camera.matrixWorld.elements.join(',') +
        '|' +
        this.camera.projectionMatrix.elements.join(',');
    if (signature !== this.signature || now - this.lastCapture >= 100) {
      this.occlusion.render(renderer, write, read, delta, mask);
      this.signature = signature;
      this.lastCapture = now;
    }
    this.composite.renderToScreen = this.renderToScreen;
    this.composite.render(renderer, write, read, delta, mask);
  }
  override dispose() {
    this.occlusion.dispose();
    this.composite.dispose();
  }
}
