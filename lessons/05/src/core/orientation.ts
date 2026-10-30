import {createSession,type Session} from "./session.ts";
import {decodeSession} from "./storage.ts";
export type PracticeEvent={kind:"photo"|"filter"|"review"|"label"|"learned"|"reflect"|"inspection"|"understood";value?:string};
export type Orientation={schema:1;status:"new"|"active"|"paused"|"done"|"skipped";step:number;practice:Session|null};
export const ORIENTATION_KEY="nova-light-apprentice-orientation-v1";
export function newOrientation():Orientation{return {schema:1,status:"new",step:0,practice:null};}
export function startPractice(o:Orientation):Orientation{return {...o,status:"active",step:0,practice:createSession()};}
const EVENTS:[PracticeEvent["kind"],string?][]=[["photo","t001"],["filter","green"],["review"],["label","1"],["learned"],["reflect"],["inspection"],["understood"]];
export function advancePractice(o:Orientation,event:PracticeEvent) {
  if(o.status!=="active")return false;
  const expected=EVENTS[o.step];if(!expected||expected[0]!==event.kind||expected[1]!==undefined&&expected[1]!==event.value)return false;
  o.step++;return true;
}
export function decodeOrientation(raw:string|null):Orientation {
  if(!raw)return newOrientation();
  try {
    if(raw.length>512000)throw new Error("invalid");
    const o=JSON.parse(raw) as Orientation;
    if(o.schema!==1||!["new","active","paused","done","skipped"].includes(o.status)||!Number.isInteger(o.step)||o.step<0||o.step>8)return newOrientation();
    if(o.status==="active"||o.status==="paused"){
      if(!o.practice)return newOrientation();const loaded=decodeSession(JSON.stringify(o.practice));if(loaded.warning||loaded.state.stage!==1)return newOrientation();
      o.practice=loaded.state;
    }else o.practice=null;
    return o;
  }catch{return newOrientation();}
}
