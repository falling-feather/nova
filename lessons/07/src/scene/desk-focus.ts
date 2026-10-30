import type { BokehPass } from "three/addons/postprocessing/BokehPass.js";

/** Nine colour samples keep the shallow tabletop focus affordable on the exhibition laptop. */
export function configureDeskFocus(pass: BokehPass) {
  pass.materialBokeh.fragmentShader = /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform float nearClip, farClip, focus, aspect, aperture, maxblur;
    #include <packing>
    float distanceAt(vec2 uv) {
      return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tDepth,uv)),nearClip,farClip);
    }
    void main() {
      float depth=distanceAt(vUv);
      float blur=min(max(abs(depth-focus)-1.4,0.0)*aperture,maxblur)*.52;
      vec2 radius=vec2(blur,blur*aspect);
      vec4 sum=texture2D(tColor,vUv)*2.0;
      float weight=2.0;
      for(int i=0;i<8;i++) {
        float angle=float(i)*.785398163;
        vec2 sampleUv=clamp(vUv+vec2(cos(angle),sin(angle))*radius,vec2(0.0),vec2(1.0));
        // A blurred background may not borrow the colour of a nearer, sharp type block.
        float accept=1.0-smoothstep(.12,.8,depth-distanceAt(sampleUv));
        sum+=texture2D(tColor,sampleUv)*accept;
        weight+=accept;
      }
      gl_FragColor=vec4(sum.rgb/weight,1.0);
    }
  `;
  pass.materialBokeh.needsUpdate = true;
}
