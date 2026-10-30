import {textSlices} from './text-slices.ts';
/** Long edits address slices of the authoritative field; all text remains in that one field. */
export class EditorSheets {
  private pages=new Map<string,number>();
  private read:(field:string)=>string;
  private refresh:()=>void;
  constructor(root:HTMLElement,read:(field:string)=>string,refresh:()=>void) {
    this.read=read; this.refresh=refresh;
    root.addEventListener("click",event=>{
      const button=(event.target as Element).closest<HTMLElement>("[data-edit-turn]"); if(!button)return;
      const sheet=button.closest<HTMLElement>(".editor-sheet")!,field=sheet.dataset.editField!;
      const total=textSlices(this.read(field),120).length;
      this.pages.set(field,Math.max(0,Math.min(total-1,(this.pages.get(field)??0)+Number(button.dataset.editTurn)))); this.refresh();
    });
  }
  merge(element:HTMLInputElement):string {
    if(element.dataset.editOffset===undefined)return element.value;
    const full=this.read(element.dataset.field!), start=Number(element.dataset.editOffset),length=Number(element.dataset.editLength);
    const value=full.slice(0,start)+element.value+full.slice(start+length);
    element.dataset.editLength=String(element.value.length);
    return value;
  }
  prepare(host:HTMLElement) {
    for(const element of host.querySelectorAll<HTMLTextAreaElement>("textarea[data-field]")) {
      const field=element.dataset.field!,full=this.read(field),limit=120;
      let sheet=element.closest<HTMLElement>(".editor-sheet");
      if(!sheet){sheet=document.createElement("div");sheet.className="editor-sheet";sheet.dataset.editField=field;element.before(sheet);sheet.append(element);}
      let nav=sheet.querySelector<HTMLElement>(".editor-navigation");
      if(!nav){nav=document.createElement("nav");nav.className="editor-navigation";nav.setAttribute("aria-label","文字编辑翻页");nav.innerHTML='<button type="button" data-edit-turn="-1">← 前段</button><span></span><button type="button" data-edit-turn="1">后段 →</button>';sheet.append(nav);}
      const slices=textSlices(full,limit),total=slices.length;
      let page=Math.min(this.pages.get(field)??0,total-1);
      const active=element===document.activeElement;
      const caret=active?Number(element.dataset.editOffset??0)+(element.selectionStart??0):0;
      if(active&&element.value.length>limit)page=Math.max(0,slices.findIndex(s=>caret>=s.start&&caret<=s.end));
      this.pages.set(field,page);
      const offset=slices[page].start,value=full.slice(offset,slices[page].end);
      element.dataset.editOffset=String(offset);element.dataset.editLength=String(value.length);
      if(element.value!==value){element.value=value;if(active)element.setSelectionRange(Math.max(0,caret-offset),Math.max(0,caret-offset));}
      element.rows=6; element.style.height="196px";
      nav.querySelector("span")!.textContent=`${page+1} / ${total} 段`;
      (nav.querySelector('[data-edit-turn="-1"]') as HTMLButtonElement).disabled=page===0;
      (nav.querySelector('[data-edit-turn="1"]') as HTMLButtonElement).disabled=page===total-1;
      nav.hidden=total===1;
    }
  }
}
