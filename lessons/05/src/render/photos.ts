import { ASSET_BASE } from "../content/catalog.ts";
import { extractFeatures, filterPixels } from "../core/features.ts";
import { photoRectangle, previewGeometry } from "../core/atlas.ts";
import type { AnalyzedPhoto, Filter, Photo } from "../core/types.ts";
export class PhotoLibrary {
  private images=new Map<string,Promise<HTMLImageElement>>();
  private analyzed=new Map<string,AnalyzedPhoto>();
  readonly catalog:Photo[];
  constructor(catalog:Photo[]) {this.catalog=catalog;}
  image(file:string) {
    let item=this.images.get(file);
    if(!item){item=new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();image.decoding="async";image.onload=()=>resolve(image);
      image.onerror=()=>{this.images.delete(file);reject(new Error("照片素材没能加载："+file));};image.src=ASSET_BASE+file;
    });this.images.set(file,item);}
    return item;
  }
  // Warm the remaining atlases one at a time while the student is busy at the desk.
  prefetch(files:string[]) {
    const queue=[...new Set(files)].filter(f=>!this.images.has(f));
    const next=()=>{const file=queue.shift();if(!file)return;void this.image(file).catch(()=>undefined).finally(()=>idle(next));};
    idle(next);
  }
  cached(id:string){return this.analyzed.get(id)??null;}
  private crop(image:HTMLImageElement,photo:Photo) {
    if(image.naturalWidth!==photo.atlasSize?.[0]||image.naturalHeight!==photo.atlasSize?.[1])throw new Error("原图集尺寸与照片记录不一致");
    return photoRectangle(photo);
  }
  async analyze(photo:Photo):Promise<AnalyzedPhoto> {
    const cached=this.analyzed.get(photo.id);if(cached)return cached;
    const image=await this.image(photo.atlas),canvas=document.createElement("canvas");canvas.width=canvas.height=128;
    const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("浏览器无法读取照片像素");
    context.drawImage(image,...this.crop(image,photo),0,0,128,128);
    const features=extractFeatures(context.getImageData(0,0,128,128).data,128,128,photo.shape);
    const truth={flower:photo.flower,green:features[0]>=0.35,quality:features[3]>=0.22&&features[4]<=0.55},submitted={...truth};
    for(const attribute of photo.submittedFlip)submitted[attribute]=!submitted[attribute];
    const analyzed={...photo,features,truth,submitted};this.analyzed.set(photo.id,analyzed);return analyzed;
  }
  // Renders the print at display resolution; filters reuse the same pixel rules as the clue readings.
  async render(photo:Photo,filter:Filter,width=512) {
    const image=await this.image(photo.atlas),rect=this.crop(image,photo),canvas=document.createElement("canvas");
    canvas.width=Math.max(64,Math.round(width));canvas.height=Math.round(canvas.width*rect[3]/rect[2]);
    const context=canvas.getContext("2d",{willReadFrequently:filter!=="original"});if(!context)throw new Error("浏览器无法显示灯箱");
    context.imageSmoothingQuality="high";context.drawImage(image,...rect,0,0,canvas.width,canvas.height);
    if(filter!=="original"){const pixels=context.getImageData(0,0,canvas.width,canvas.height);pixels.data.set(filterPixels(pixels.data,canvas.width,canvas.height,filter));context.putImageData(pixels,0,0);}
    return canvas;
  }
}
function idle(fn:()=>void){if("requestIdleCallback" in window)requestIdleCallback(()=>fn(),{timeout:2500});else setTimeout(fn,400);}
export function photoStyle(photo:Photo) {
  const g=previewGeometry(photo);
  return `background-image:url("${ASSET_BASE}${photo.atlas}");background-size:${g.sizeX}% ${g.sizeY}%;background-position:${g.positionX}% ${g.positionY}%;aspect-ratio:${g.ratio}`;
}
