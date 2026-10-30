/** UTF-16 offsets for DOM editing, with boundaries that keep Unicode code points intact. */
export function textSlices(text:string,limit:number) {
  const slices:{start:number;end:number}[]=[];
  for(let start=0;start<text.length;) {
    let end=Math.min(text.length,start+limit);
    if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;
    slices.push({start,end});start=end;
  }
  return slices.length?slices:[{start:0,end:0}];
}
