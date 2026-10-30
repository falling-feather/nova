import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { sampleRegion } from "./render-region.js";

// Edge-aware, one-sided depth reconstruction, as used by Three r183 GTAOShader.
// Reuses the main opaque depth instead of drawing the museum's geometry twice.
export class DepthNormals {
  constructor(source, camera) {
    this.source = source;
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      uniforms: {
        tDepth: { value: source.depthTexture },
        region: { value: new THREE.Vector4() },
        sourceSize: { value: new THREE.Vector2() },
        inverseProjection: { value: camera.projectionMatrixInverse },
      },
      vertexShader: `varying vec2 screenUv;
        void main(){screenUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: `varying vec2 screenUv;
        uniform sampler2D tDepth;
        uniform vec4 region;uniform vec2 sourceSize;uniform mat4 inverseProjection;
        float depthAt(vec2 uv){return texture2D(tDepth,clamp(uv*region.xy,region.zw,region.xy-region.zw)).r;}
        vec3 positionAt(vec2 uv,float d){vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
        void main(){
          float c=depthAt(screenUv);
          if(c>=1.){gl_FragColor=vec4(.5,.5,1.,1.);return;}
          vec2 dx=vec2(1./sourceSize.x,0.),dy=vec2(0.,1./sourceSize.y);
          float l=depthAt(screenUv-dx),r=depthAt(screenUv+dx),b=depthAt(screenUv-dy),t=depthAt(screenUv+dy);
          float el=abs(2.*l-depthAt(screenUv-2.*dx)-c),er=abs(2.*r-depthAt(screenUv+2.*dx)-c);
          float eb=abs(2.*b-depthAt(screenUv-2.*dy)-c),et=abs(2.*t-depthAt(screenUv+2.*dy)-c);
          vec3 centre=positionAt(screenUv,c);
          vec3 x=el<er?centre-positionAt(screenUv-dx,l):positionAt(screenUv+dx,r)-centre;
          vec3 y=eb<et?centre-positionAt(screenUv-dy,b):positionAt(screenUv+dy,t)-centre;
          vec3 normal=normalize(cross(x,y));
          gl_FragColor=vec4(normal*.5+.5,1.);
        }`,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  render(renderer, target) {
    sampleRegion(this.source, this.material.uniforms.region.value);
    this.material.uniforms.sourceSize.value.set(
      this.source.viewport.z,
      this.source.viewport.w,
    );
    this.material.uniforms.inverseProjection.value =
      this.camera.projectionMatrixInverse;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }
  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}
