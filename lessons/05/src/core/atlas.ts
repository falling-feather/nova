type RectPhoto={cell:number;rect?:number[];atlasSize?:number[]};
export function photoRectangle(photo:RectPhoto):[number,number,number,number] {
  const rect=photo.rect,size=photo.atlasSize;
  if(!rect||rect.length!==4||!size||size.length!==2||[...rect,...size].some(v=>!Number.isFinite(v))||rect[0]<0||rect[1]<0||rect[2]<=0||rect[3]<=0||rect[0]+rect[2]>size[0]||rect[1]+rect[3]>size[1])throw new Error("照片范围超出了原图集");
  return [...rect] as [number,number,number,number];
}
export function previewGeometry(photo:RectPhoto){
  const [x,y,w,h]=photoRectangle(photo),[width,height]=photo.atlasSize!;
  return {sizeX:width/w*100,sizeY:height/h*100,positionX:width===w?0:x/(width-w)*100,positionY:height===h?0:y/(height-h)*100,ratio:w/h};
}
