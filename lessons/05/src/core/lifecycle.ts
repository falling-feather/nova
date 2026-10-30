import {createSession,runInspection,placeExhibit,type Session} from "./session.ts";
import {ATTRIBUTES,type AnalyzedPhoto,type Models} from "./types.ts";
import {predict} from "./model.ts";
export function modelStamp(models:Models){return JSON.stringify(models);}
export function restartExperiment(previous:Session):Session{const fresh=createSession();fresh.experiment=previous.experiment+1;return fresh;}
export function inspectionRequest(s:Session,box:number){return {stage:s.stage,attribute:s.active,box,stamp:modelStamp(s.models),experiment:s.experiment};}
export function commitInspection(s:Session,request:ReturnType<typeof inspectionRequest>,photos:AnalyzedPhoto[]){
  if(s.experiment!==request.experiment||s.stage!==request.stage||s.active!==request.attribute||modelStamp(s.models)!==request.stamp)return null;
  if(photos.some(p=>p.role!=="test"||p.testStage!==request.stage||p.testBox!==request.box))throw new Error("检验材料不属于这次打开的盒子");
  return runInspection(s,photos,request.attribute,request.box);
}
export function arrangeExhibition(s:Session,photos:AnalyzedPhoto[]):AnalyzedPhoto[]{
  if(s.stage!==5||!s.locked)throw new Error("请先封存这次使用的模型");
  const stamp=modelStamp(s.models),changed=stamp!==s.wallVersion,pending:AnalyzedPhoto[]=[];
  for(const photo of photos){
    const existing=s.wall[photo.id],values=ATTRIBUTES.map(a=>({attribute:a,probability:predict(s.models[a],photo.features)}));
    if(existing?.by==="student"){
      existing.probability=existing.attribute==="reserve"?Math.max(...values.map(v=>v.probability)):predict(s.models[existing.attribute],photo.features);continue;
    }
    if(existing&&!changed)continue;
    if(values.some(v=>v.probability>=.35&&v.probability<=.65)){delete s.wall[photo.id];pending.push(photo);continue;}
    const positive=values.find(v=>v.probability>.65);
    if(positive)placeExhibit(s,photo,positive.attribute,false);
    else s.wall[photo.id]={attribute:"reserve",by:"model",probability:Math.max(...values.map(v=>v.probability))};
  }
  s.wallVersion=stamp;return pending;
}
