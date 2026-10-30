/** 只在实际模型帧之间停等；不会插入装饰帧或改变采样公式。 */
export class SamplingControl {
  paused: boolean;
  private stopped=false;
  private release?:()=>void;
  private reject?: (reason:DOMException)=>void;
  constructor(stepping=false){this.paused=stepping;}
  pause(){this.paused=true;}
  resume(){this.paused=false;this.release?.();this.clear();}
  next(){this.paused=true;this.release?.();this.clear();}
  stop(){this.stopped=true;this.reject?.(new DOMException("本次采样已停止","AbortError"));this.clear();}
  private clear(){this.release=undefined;this.reject=undefined;}
  async afterFrame(){
    if(this.stopped)throw new DOMException("本次采样已停止","AbortError");
    if(this.paused)await new Promise<void>((resolve,reject)=>{this.release=resolve;this.reject=reject;});
    if(this.stopped)throw new DOMException("本次采样已停止","AbortError");
  }
}
