/* Dependency-free WebGL renderer: calibrated image planes + authored 3D meshes + scene capture.
   This is a raster renderer with analytic studio lighting, not ray tracing or a physics engine. */
(function (g) {
    'use strict';
    const M = g.NovaMath;
    const VS = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute vec3 aColor;
attribute vec4 aInstance0,aInstance1,aInstance2,aInstance3;uniform float uInstanced;uniform mat4 uModel,uVP,uLightVP;uniform mat3 uNormal;varying vec3 vPosition,vNormal,vColor;varying vec2 vUV;varying vec4 vLight;
void main(){mat4 model=uModel;if(uInstanced>.5)model=mat4(aInstance0,aInstance1,aInstance2,aInstance3);vec4 p=model*vec4(aPosition,1.);vPosition=p.xyz;vNormal=uInstanced>.5?normalize(mat3(model)*aNormal):normalize(uNormal*aNormal);vColor=aColor;vUV=aUV;vLight=uLightVP*p;gl_Position=uVP*p;}`;
    const FS = `precision highp float;varying vec3 vPosition,vNormal,vColor;varying vec2 vUV;
varying vec4 vLight;uniform sampler2D uTexture,uShadow;uniform float uDepthPass,uShadowEnabled,uEconomy;uniform vec4 uColor;uniform vec3 uEye;uniform float uKind,uRoughness,uAccent,uHaze;
float visibility(float nl){
 if(uShadowEnabled<.5)return 1.;vec3 p=vLight.xyz/vLight.w*.5+.5;
 if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;
 float sum=0.;float bias=max(.0018,.0038*(1.-nl));
 for(int i=0;i<=1;i++)for(int j=0;j<=1;j++){
  vec3 d=texture2D(uShadow,p.xy+(vec2(float(i),float(j))-.5)*.0017).rgb;
  float z=dot(d,vec3(1.,1./255.,1./65025.));sum+=smoothstep(-.0004,.0004,z-p.z+bias);
 }return sum/4.;
}
void main(){
 if(uDepthPass>.5){float z=gl_FragCoord.z;vec3 e=fract(z*vec3(1.,255.,65025.));e-=e.yzz*vec3(1./255.,1./255.,0.);gl_FragColor=vec4(e,1.);return;}
 vec4 tex=texture2D(uTexture,vUV);vec3 base=uColor.rgb*vColor;float alpha=uColor.a;
 if(uKind>2.5&&uKind<3.5){gl_FragColor=vec4(tex.rgb*base,tex.a*alpha);if(gl_FragColor.a<.004)discard;return;}
 if(uKind>3.5&&uKind<4.5){gl_FragColor=vec4(base,alpha);return;}
 // Economy lighting avoids per-fragment exponentials, feather microgrooves and shadow sampling.
 // It keeps the same 3D normals, silhouette and depth; it is not a screenshot replacement.
 if(uEconomy>.5){
  vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
  vec3 view=normalize(uEye-vPosition);float rim=1.-max(dot(n,view),0.);rim*=rim;
  float key=max(dot(n,normalize(vec3(-.6,1.1,1.4))),0.);
  float fill=max(dot(n,normalize(vec3(1.4,.2,.5))),0.);
  vec3 light=base*(.76+.18*key+.06*fill)+rim*.016;
  if(uKind>.5&&uKind<1.5){vec3 refl=reflect(-view,n);float strip=1.-smoothstep(.025,.23,abs(refl.x-.3));light=base*(.46+.26*key)+vec3(strip*.30+rim*.10);}
  if(uKind>4.5)light=base*(.81+.17*key)+rim*vec3(.025,.04,.10);
  light=mix(light,vec3(.988,.993,1.),uHaze*(1.-smoothstep(-1.72,-.55,vPosition.y))*.86);
  gl_FragColor=vec4(clamp(light,0.,1.),alpha);return;
 }
 base=pow(base,vec3(2.2));
 vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
 vec3 V=normalize(uEye-vPosition);vec3 key=normalize(vec3(-.6,1.1,1.4)),fill=normalize(vec3(1.4,.2,.5));
 float nl=max(dot(N,key),0.),nf=max(dot(N,fill),0.);
 float fres=pow(1.-max(dot(N,V),0.),3.5);vec3 R=reflect(-V,N);
 float broad=exp(-pow((R.x+.45)/.38,2.))*smoothstep(-.4,.5,R.y);
 float strip=exp(-pow((R.x-.3)/(.035+uRoughness*.15),2.))*(.25+.75*smoothstep(-.5,.6,R.y));
 float spec=pow(max(dot(N,normalize(key+V)),0.),mix(150.,16.,uRoughness));
 float shadow=visibility(nl);float ao=(.92+.08*clamp(vPosition.y,-1.,1.))*(.65+.35*shadow);
 vec3 lit=base*(.56+.31*nl*shadow+.12*nf)*ao+vec3(spec*.11+broad*.045+strip*.060);
 if(uKind>.5&&uKind<1.5){lit=base*(.17+.34*nl*shadow+.18*nf)*ao+vec3(broad*.55+strip*.62+spec*.4+fres*.19);}
 if(uKind>1.5&&uKind<2.5){
  float rib=1.-smoothstep(.008,.036,abs(vUV.x-.5));
  float barbs=sin((vUV.y*170.+abs(vUV.x-.5)*30.)*6.28318);
  lit*=.95+barbs*.018+rib*.075;lit+=vec3(fres*.08);
 }
 if(uKind>4.5){
  float reflection=sin(R.x*9.+R.y*6.+R.z*4.);float dark=smoothstep(.72,.84,reflection)*.36;
  lit=vec3(.87,.91,.965)+vec3(nl*.12+strip*.24-dark);
  lit+=.055*fres*cos(vec3(0.,2.1,4.2)+R.y*12.+R.x*8.);
 }
 lit+=uAccent*fres*vec3(.015,.06,.34);
 vec3 srgb=pow(clamp(lit,0.,1.),vec3(1./2.2));
 srgb=mix(srgb,vec3(.988,.993,1.),uHaze*(1.-smoothstep(-1.72,-.55,vPosition.y))*.86);
 gl_FragColor=vec4(srgb,alpha);
}`;
    const IMAGE_VS = `attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uModel,uVP;varying vec2 vUV;void main(){vUV=aUV;gl_Position=uVP*uModel*vec4(aPosition,1.);}`;
    const IMAGE_FS = `precision mediump float;varying vec2 vUV;uniform sampler2D uTexture;uniform vec4 uColor;void main(){vec4 c=texture2D(uTexture,vUV)*uColor;if(c.a<.004)discard;gl_FragColor=c;}`;
    class Renderer {
        constructor(canvas, { alpha = false, antialias = globalThis.NOVA_CONFIG?.antialias ?? false, preserve = false } = {}) {
            this.canvas = canvas;
            this.gl = canvas.getContext('webgl', { alpha, antialias, powerPreference: 'high-performance', preserveDrawingBuffer: preserve });
            if (!this.gl)
                throw new Error('WebGL unavailable');
            const gl = this.gl;
            this.meshCount = 0;
            this.textureCount = 0;
            this.draws = 0;
            const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                throw Error(gl.getShaderInfoLog(s)); return s; };
            const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
            this.program = gl.createProgram();
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
                throw Error(gl.getProgramInfoLog(this.program));
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.useProgram(this.program);
            const iv = compile(gl.VERTEX_SHADER, IMAGE_VS), ifrag = compile(gl.FRAGMENT_SHADER, IMAGE_FS);
            this.imageProgram = gl.createProgram();
            gl.attachShader(this.imageProgram, iv);
            gl.attachShader(this.imageProgram, ifrag);
            gl.linkProgram(this.imageProgram);
            if (!gl.getProgramParameter(this.imageProgram, gl.LINK_STATUS))
                throw Error(gl.getProgramInfoLog(this.imageProgram));
            gl.deleteShader(iv);
            gl.deleteShader(ifrag);
            this.iu = {};
            ['Model', 'VP', 'Texture', 'Color'].forEach(k => this.iu[k] = gl.getUniformLocation(this.imageProgram, 'u' + k));
            this.ia = { Position: gl.getAttribLocation(this.imageProgram, 'aPosition'), UV: gl.getAttribLocation(this.imageProgram, 'aUV') };
            this.a = {};
            ['Position', 'Normal', 'UV', 'Color'].forEach(k => this.a[k] = gl.getAttribLocation(this.program, 'a' + k));
            this.u = {};
            ['Model', 'VP', 'Normal', 'Texture', 'Color', 'Eye', 'Kind', 'Roughness', 'Accent', 'Haze', 'LightVP', 'Shadow', 'DepthPass', 'ShadowEnabled', 'Instanced', 'Economy'].forEach(k => this.u[k] = gl.getUniformLocation(this.program, 'u' + k));
            this.white = this.texture({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) });
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.enable(gl.BLEND);
            if(alpha)gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
            else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.CULL_FACE);
            this.target = null;
            this.shadowTarget = null;
            this.shadowDraws = 0;
            this.instancing = globalThis.NOVA_CONFIG?.disableInstancing ? null : gl.getExtension('ANGLE_instanced_arrays');
            this.instanceAttributes = [0, 1, 2, 3].map(i => gl.getAttribLocation(this.program, 'aInstance' + i));
            this.instanceBuffer = gl.createBuffer();
            this.instanceCapacity = 0;
        }
        resize(w, h, dpr = 1) { const width = Math.max(1, Math.round(w * dpr)), height = Math.max(1, Math.round(h * dpr)); if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.deleteTarget();
        } this.w = w; this.h = h; this.dpr = dpr; this.gl.viewport(0, 0, width, height); }
        mesh(data) { const gl = this.gl, vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); this.meshCount++; return { vbo, count: data.length / 11 }; }
        deleteMesh(mesh) { if (mesh?.vbo) {
            this.gl.deleteBuffer(mesh.vbo);
            mesh.vbo = null;
            this.meshCount--;
        } }
        texture(source) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); if (source.data)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, source.width, source.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.data);
        else
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.textureCount++; return t; }
        deleteTexture(t) { if (t) {
            this.gl.deleteTexture(t);
            this.textureCount--;
        } }
        clear(c = [1, 1, 1, 1]) { const gl = this.gl; gl.clearColor(...c); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); this.draws = 0; }
        clearDepth() { this.gl.clear(this.gl.DEPTH_BUFFER_BIT); }
        camera(vp, eye = [0, 0, 10]) { this.vp = vp; this.eye = eye; const gl = this.gl; gl.useProgram(this.program); gl.uniformMatrix4fv(this.u.VP, false, vp); gl.uniform3fv(this.u.Eye, eye); }
        image(mesh, model, material) {
            const gl = this.gl, u = this.iu;
            gl.useProgram(this.imageProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
            gl.enableVertexAttribArray(this.ia.Position);
            gl.vertexAttribPointer(this.ia.Position, 3, gl.FLOAT, false, 44, 0);
            gl.enableVertexAttribArray(this.ia.UV);
            gl.vertexAttribPointer(this.ia.UV, 2, gl.FLOAT, false, 44, 24);
            gl.uniformMatrix4fv(u.Model, false, model);
            gl.uniformMatrix4fv(u.VP, false, this.vp);
            gl.uniform4fv(u.Color, [...(material.color || [1, 1, 1]), material.opacity ?? 1]);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, material.texture || this.white);
            gl.uniform1i(u.Texture, 0);
            gl.depthMask(material.depthWrite !== false);
            if (material.depthTest === false)
                gl.disable(gl.DEPTH_TEST);
            else
                gl.enable(gl.DEPTH_TEST);
            gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
            this.draws++;
            gl.useProgram(this.program);
        }
        draw(mesh, model, material = {}, instances = null) {
            if (!mesh?.count || material.opacity === 0)
                return;
            if (material.kind === 3) {
                this.image(mesh, model, material);
                return;
            }
            const gl = this.gl, u = this.u;
            gl.useProgram(this.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
            let offset = 0;
            for (const [k, size] of [['Position', 3], ['Normal', 3], ['UV', 2], ['Color', 3]]) {
                const a = this.a[k];
                gl.enableVertexAttribArray(a);
                gl.vertexAttribPointer(a, size, gl.FLOAT, false, 44, offset);
                offset += size * 4;
            }
            gl.uniform1f(u.Economy, this.economy ? 1 : 0);
            gl.uniform1f(u.Instanced, instances ? 1 : 0);
            gl.uniformMatrix4fv(u.Model, false, model);
            gl.uniformMatrix3fv(u.Normal, false, M.normalMatrix(model));
            gl.uniform4fv(u.Color, [...(material.color || [1, 1, 1]), material.opacity ?? 1]);
            gl.uniform1f(u.Kind, material.kind ?? 0);
            gl.uniform1f(u.Roughness, material.roughness ?? .3);
            gl.uniform1f(u.Accent, material.accent ?? 0);
            gl.uniform1f(u.Haze, material.haze ?? 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, material.texture || this.white);
            gl.uniform1i(u.Texture, 0);
            gl.depthMask(material.depthWrite !== false);
            if (material.depthTest === false)
                gl.disable(gl.DEPTH_TEST);
            else
                gl.enable(gl.DEPTH_TEST);
            if (instances) {
                const flat = new Float32Array(instances.length * 16);
                instances.forEach((m, i) => flat.set(m, i * 16));
                gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
                if (flat.byteLength > this.instanceCapacity) {
                    this.instanceCapacity = flat.byteLength;
                    gl.bufferData(gl.ARRAY_BUFFER, this.instanceCapacity, gl.DYNAMIC_DRAW);
                }
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, flat);
                this.instanceAttributes.forEach((a, i) => { gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 4, gl.FLOAT, false, 64, i * 16); this.instancing.vertexAttribDivisorANGLE(a, 1); });
                this.instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, mesh.count, instances.length);
                this.instanceAttributes.forEach(a => { this.instancing.vertexAttribDivisorANGLE(a, 0); gl.disableVertexAttribArray(a); });
                gl.uniform1f(u.Instanced, 0);
            }
            else
                gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
            this.draws++;
        }
        drawInstanced(mesh, models, material = {}) { if (!models.length)
            return; if (!this.instancing) {
            for (const model of models)
                this.draw(mesh, model, material);
            return;
        } this.draw(mesh, models[0], material, models); }
        ensureTarget() { const gl = this.gl, w = this.canvas.width, h = this.canvas.height; if (this.target && this.target.w === w && this.target.h === h)
            return this.target; this.deleteTarget(); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const fb = gl.createFramebuffer(), depth = gl.createRenderbuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
            throw Error('Incomplete scene capture framebuffer'); gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.textureCount++; this.target = { tex, fb, depth, w, h }; return this.target; }
        capture(drawScene) { const gl = this.gl, t = this.ensureTarget(); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); drawScene(); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); return t.tex; }
        deleteTarget() { if (!this.target)
            return; const gl = this.gl, t = this.target; gl.deleteFramebuffer(t.fb); gl.deleteRenderbuffer(t.depth); this.deleteTexture(t.tex); this.target = null; }
        noShadow() { this.gl.useProgram(this.program); this.gl.uniform1f(this.u.ShadowEnabled, 0); this.shadowDraws = 0; }
        shadow(drawScene, { eye = [-3, 5, 5], target = [0, 0, 0], span = 8, size = 1024 } = {}) {
            const gl = this.gl;
            gl.useProgram(this.program);
            if (!this.shadowTarget) {
                const tex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                const fb = gl.createFramebuffer(), depth = gl.createRenderbuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
                gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
                if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
                    throw Error('Incomplete shadow target');
                this.shadowTarget = { tex, fb, depth, size };
                this.textureCount++;
            }
            const t = this.shadowTarget, light = M.mul(M.ortho(-span / 2, span / 2, -span / 2, span / 2, .1, 30), M.lookAt(eye, target));
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.white);
            gl.uniform1i(this.u.Shadow, 1);
            gl.uniform1f(this.u.DepthPass, 1);
            gl.uniform1f(this.u.ShadowEnabled, 0);
            gl.uniformMatrix4fv(this.u.LightVP, false, light);
            gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
            gl.viewport(0, 0, t.size, t.size);
            this.camera(light, eye);
            this.clear([1, 1, 1, 1]);
            drawScene();
            this.shadowDraws = this.draws;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.u.DepthPass, 0);
            gl.uniform1f(this.u.ShadowEnabled, 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, t.tex);
            gl.uniform1i(this.u.Shadow, 1);
            gl.activeTexture(gl.TEXTURE0);
        }
        dispose() {
            if(this.disposed)return;this.disposed=true;this.deleteTarget();
            if(!this.gl.isContextLost())this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
        diagnostics() { return { drawCalls: this.draws + this.shadowDraws, meshes: this.meshCount, textures: this.textureCount, width: this.canvas.width, height: this.canvas.height, instancing: !!this.instancing, economyLighting: !!this.economy, api: 'WebGL 1 / custom raster renderer' }; }
    }
    g.NovaGL = { Renderer };
})(globalThis);
