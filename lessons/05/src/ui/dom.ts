export function escape(value:unknown) {return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
export function button(label:string,action:string,extra="") {return `<button type="button" data-action="${action}" ${extra}>${label}</button>`;}
export function percent(v:number){return Math.round(v*100)+"%";}
export function signed(v:number){return (v>=0?"+":"")+v.toFixed(2);}
