import type { App } from "../app.ts";
import { type Recipe } from "../core/recipe.ts";
import { forwardNoise, fromBytes, toBytes } from "../core/diffusion.ts";
import { gaussian } from "../core/rng.ts";
import { base64ToBytes, bytesToBase64 } from "../state.ts";
import { h, textSegments } from "../ui/dom.ts";
import { button, choice, column, field, figures, note, picture, row, tag, text } from "../ui/components.ts";
import { SandTray, type Brush } from "../ui/tray.ts";

export const SEEDS=[23,101,427,851,1024,1736];
export const TARGETS:Recipe[]=[{seed:23,steps:20,w:3,cls:0},{seed:101,steps:20,w:1,cls:6},{seed:777,steps:20,w:6,cls:2}];
export const free=(seed:number,steps=20):Recipe=>({seed,steps,w:0,cls:-1});
export const encodeImage=(x:Float32Array)=>bytesToBase64(toBytes(x));
export const decodeImage=(x:unknown):Float32Array|null=>{if(typeof x!=="string")return null;try{const b=base64ToBytes(x);return b.length===1024?fromBytes(b):null;}catch{return null;}};
export const noiseAt=(a:App,x:Float32Array,k:number,seed=a.state.tideSeed)=>forwardNoise(x,k-1,a.meta.schedule.alphasCumprod,gaussian(seed,1024));
export const tideAt=(a:App,signal:number)=>{const t=a.meta.schedule.alphasCumprod.findIndex(x=>Math.sqrt(x)<=signal);return t<0?999:t;};
export function requireDrawing(a:App){
  const d=a.drawing;if(d)return d;
  const tray=new SandTray();tray.setLabel("先留下属于你的原画");
  a.mount(tray.el,column(h("h2",{},"潮水在等你的画"),text("这项实验使用你自己的32×32原画。可以亲手画，也可以借一幅再改。"),button("去起笔",()=>a.go(1),"primary")));
  return null;
}
export interface Editor {tray:SandTray;image:Float32Array;undo:Float32Array[];dirty:boolean;brush:Brush;commit:(x:Float32Array)=>void;}
export function editor(a:App,key:string,initial:Float32Array,onChange?:(x:Float32Array)=>void):Editor{
  const d=a.memory<Editor>(key,()=>{
    const tray=new SandTray();
    const value:Editor={tray,image:Float32Array.from(initial),undo:[],dirty:false,brush:"groove",commit:()=>{}};
    tray.canvas.addEventListener("pointerdown",()=>{value.undo.push(Float32Array.from(value.tray.value));if(value.undo.length>20)value.undo.shift();},true);
    return value;
  });
  d.commit=x=>{d.image=Float32Array.from(x);d.dirty=true;onChange?.(d.image);};
  d.tray.setPalette(a.loc.palette);d.tray.show(d.image);d.tray.setBrush(d.brush,1.6);d.tray.startBrushing(d.commit);
  return d;
}
export function brushTools(d:Editor){
  return (["groove","smooth","flatten"] as const).map((key,i)=>{
    const b=button("",()=>{d.brush=key;d.tray.setBrush(key,1.6);for(const e of b.parentElement?.querySelectorAll(".brush-tool")??[]){e.classList.toggle("selected",e===b);e.setAttribute("aria-pressed",String(e===b));}},"brush-tool model-input "+(d.brush===key?"selected":""));
    b.dataset.brush=key;b.append(h("span",{},["画笔","沙刷","橡皮"][i]));b.setAttribute("aria-label",["画笔","沙刷","橡皮"][i]);b.setAttribute("aria-pressed",String(d.brush===key));return b;
  }).concat([button("撤销",()=>{const x=d.undo.pop();if(x){d.tray.show(x);d.commit(x);}},"tool-button model-input")]);
}
export function knowledge(a:App,prompt:string,options:string[],correct:number){
  return button("说说我的发现",()=>a.modal("依据刚才的操作",column(text(prompt,"lead"),choice(options,undefined,i=>{
    if(i!==correct){a.toast("回看眼前的材料与计算，再试一次。");return;}
    a.ev().explained=true;a.save();a.closeModal();a.done();
  }),note("这里检查概念与操作的关系；不会替你评定作品好坏。"))),"secondary");
}
/** 长说明按段编辑与回看；不拿文字长度作为学习门槛。 */
export function writing(a:App,label:string,value:string,onChange:(v:string)=>void,max=1200){
  let draft=value;
  const split=(v:string)=>textSegments(v);
  return button((draft?"查看 / 修改":"写下")+label,()=>{
    let pages=split(draft),page=0;
    const render=()=>{
      const editor=field(label,pages[page],v=>{pages[page]=v;draft=pages.join("");onChange(draft);if(v.split("\n").length>5){pages=split(draft);render();}},{multiline:true,max:Math.min(120,max-pages.filter((_,i)=>i!==page).join("").length),placeholder:"依据自己的操作与结果，留下一句说明。"});
      a.modal(label,column(editor,row(button("上一段",()=>{page--;render();},"secondary",page===0),text((page+1)+" / "+pages.length),button("下一段",()=>{page++;render();},"secondary",page===pages.length-1),button("续一段",()=>{if(!pages.at(-1)?.trim()||draft.length>=max)return;pages.push("");page=pages.length-1;render();},"secondary")),button("保存文字，回到活动",()=>{onChange(pages.join(""));a.closeModal();},"primary")),true);
    };render();
  },"secondary");
}
export function reading(a:App,label:string,value:string){
  return button(label,()=>{let page=0;const parts=textSegments(value,200,5),count=parts.length;const render=()=>a.modal(label,column(text(parts[page]),row(button("上一页",()=>{page--;render();},"secondary",page===0),text((page+1)+" / "+count),button("下一页",()=>{page++;render();},"secondary",page===count-1))));render();},"secondary");
}
export function observation(a:App,labels=["变化明显","变化不明显 / 证据不足","不符合我的预测"]){
  const e=a.ev();return button("记录这次观察与解释",()=>{
    const ids=a.step===9?[e.singleWork,e.multiWork]:((e.timings as {seed:number;steps:number}[])??[]).slice(-2).map(t=>a.state.album.find(w=>w.recipe.seed===t.seed&&w.recipe.steps===t.steps&&w.recipe.cls===-1)?.id);
    const works=ids.map(id=>a.state.album.find(w=>w.id===id)).filter(w=>!!w);
    a.modal("依据这次真实结果",column(works.length?figures(works.map(w=>picture(decodeImage(w!.preview),w!.recipe.steps+"步 · 起点 "+w!.recipe.seed,{size:128})),2):null,choice(labels,e.observation as number|undefined,i=>{e.observation=i;a.save();},true),field("我的解释",String(e.reason??""),v=>{e.reason=v;a.save();},{multiline:true,max:1200,placeholder:"我在两幅真实结果中看到……"}),button("保存这次观察",()=>{if(a.done())a.closeModal();},"primary")),true);
  },"secondary");
}
export function numeric(label:string,value:number,min:number,max:number,onChange:(n:number)=>void,step=1){
  const input=h("input",{type:"number",min,max,step,value,"aria-label":label,class:"model-input"});
  input.onchange=()=>{const n=Number(input.value);if(!Number.isFinite(n)||n<min||n>max||(step===1&&!Number.isInteger(n))){input.value=String(value);return;}onChange(n);};
  return h("label.number-tool",{},h("span",{},label),input);
}
export function select(label:string,values:{value:string;label:string}[],value:string,onChange:(v:string)=>void,disabled=false){
  const input=h("select",{"aria-label":label,class:disabled?"":"model-input",disabled},...values.map(v=>h("option",{value:v.value},v.label)));
  input.value=value;input.onchange=()=>onChange(input.value);
  return h("label.select-tool",{},h("span",{},label),input);
}
export function recipeControls(a:App,onChange=()=>a.refresh(),mix=false){
  const r=a.recipe,change=()=>{a.save();onChange();};
  const panel=column(numeric("贝壳编号",r.seed,1,9999,n=>{r.seed=n;change();}),select("收沙步数",[2,5,10,20,30,50].map(n=>({value:String(n),label:n+" 步"})),String(r.steps),v=>{r.steps=Number(v);change();}),select("条件签",[{value:"-1",label:"不抽签 · 自由生成"},...a.meta.classes.map((c,i)=>({value:String(i),label:c.zh}))],String(r.cls),v=>{r.cls=Number(v);if(r.cls<0){r.w=0;delete r.mix;}else if(r.w===0)r.w=3;change();}),numeric("条件力度",r.w,0,15,n=>{r.w=n;change();},.1));
  panel.classList.add("recipe-controls");
  if(mix&&r.cls>=0)panel.append(select("第二支签",[{value:"",label:"不混合"},...a.meta.classes.map((c,i)=>({value:String(i),label:c.zh}))],r.mix?String(r.mix.cls):"",v=>{if(v==="")delete r.mix;else r.mix={cls:Number(v),ratio:.5};change();}));
  return panel;
}
export function recipeTags(a:App,r:Recipe){return row(tag("种子 "+r.seed),tag(r.cls<0?"自由生成":a.meta.classes[r.cls].zh),tag(r.steps+" 步"),r.cls>=0?tag("力度 "+r.w):null);}

