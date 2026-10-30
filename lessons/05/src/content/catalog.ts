import type { Photo } from "../core/types.ts";
import { photoRectangle } from "../core/atlas.ts";
export const ASSET_BASE = import.meta.env.BASE_URL + "assets/photos/";
export const BATCH_NAMES: Record<number,string>={1:"第一批投稿",2:"花朵投稿 · 第一批",3:"第二批 · 更多样子",4:"新到的投稿"};
export async function loadCatalog():Promise<Photo[]> {
  const response=await fetch(ASSET_BASE+"catalog.json");
  if(!response.ok)throw new Error("投稿清单未能加载，请检查本地素材");
  const data=await response.json() as {schema:number;photos:Photo[]};
  if(data.schema!==1||!Array.isArray(data.photos)||data.photos.length<270||new Set(data.photos.map(p=>p.id)).size!==data.photos.length)throw new Error("投稿清单不完整");
  for(const p of data.photos){
    if(!/^(t\d{3}|v[1-5][ab]\d{2}|e\d{3})$/.test(p.id)||!/^atlas-\d{2}\.png$/.test(p.atlas)||!Number.isInteger(p.cell)||p.cell<0||p.cell>=24||p.shape<0||p.shape>1)throw new Error("投稿记录无效");
    photoRectangle(p);
  }
  return data.photos;
}
