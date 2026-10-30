export type PlanePoint=readonly [number,number];
export type Quad=readonly [PlanePoint,PlanePoint,PlanePoint,PlanePoint];

/** Unit-square homography used by both the rendered DOM plane and its pointer input. */
function homography(q:Quad){
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
  const dx1=x1-x2,dx2=x3-x2,dy1=y1-y2,dy2=y3-y2;
  const sx=x0-x1+x2-x3,sy=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  if(Math.abs(den)<1e-8)return null;
  const g=(sx*dy2-dx2*sy)/den,h=(dx1*sy-sx*dy1)/den;
  return {a:x1-x0+g*x1,b:x3-x0+h*x3,c:x0,d:y1-y0+g*y1,e:y3-y0+h*y3,f:y0,g,h};
}

export function quadMatrix(q:Quad,width:number,height:number):string|null {
  const m=homography(q);if(!m)return null;
  return `matrix3d(${m.a/width},${m.d/width},0,${m.g/width},${m.b/height},${m.e/height},0,${m.h/height},0,0,1,0,${m.c},${m.f},0,1)`;
}

/** Inverse homography of a CSS-projected plane, shared by painting and pixel inspection. */
export function screenToUnit(q:Quad,point:PlanePoint):[number,number]|null {
  const m=homography(q);if(!m)return null;
  const {a,b,c:x0,d,e,f:y0,g,h}=m,[x,y]=point;
  const A=a-x*g,B=b-x*h,D=d-y*g,E=e-y*h,det=A*E-B*D;
  if(Math.abs(det)<1e-8)return null;
  return [((x-x0)*E-B*(y-y0))/det,(A*(y-y0)-(x-x0)*D)/det];
}
