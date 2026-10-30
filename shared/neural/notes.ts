// Pagination is presentation only; joining pages preserves the original text.
export function noteParts(text:string,rows=5):string[] {
  if(!text)return [''];const parts:string[]=[],chars=Array.from(text);let page='',column=0,lines=1;
  for(const char of chars){if(lines>rows||(char==='\n'&&lines===rows)){parts.push(page);page='';column=0;lines=1;}page+=char;if(char==='\n'){lines++;column=0;}else if(++column>=22){lines++;column=0;}}
  parts.push(page);return parts;
}
