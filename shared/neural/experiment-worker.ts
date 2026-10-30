import {train,estimateCost} from './network.ts';
import type {Model,Point} from './network.ts';
import {compare} from './session.ts';
import type {Workspace} from './session.ts';
type Request = {id:number;kind:'train';model:Model;data:Point[];steps:number}|{id:number;kind:'compare';workspace:Workspace;a:Model;b:Model;seeds:number[];mode:'steps'|'budget';limit:number;prediction:string};
self.onmessage=(event:MessageEvent<Request>)=>{
  const request=event.data;
  try {
    if(request.kind==='train') {
      const start=performance.now();train(request.model,request.data,request.steps);
      self.postMessage({id:request.id,kind:'train',model:request.model,cost:estimateCost(request.model,request.data.length,request.steps),elapsed:performance.now()-start});
    } else self.postMessage({id:request.id,kind:'compare',comparison:compare(request.workspace,request.a,request.b,request.seeds,request.mode,request.limit,request.prediction)});
  } catch(e) {self.postMessage({id:request.id,error:e instanceof Error?e.message:String(e)});}
};
