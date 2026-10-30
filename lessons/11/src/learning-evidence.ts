import {forwardDense} from '../../../shared/creator/model.ts';
import type {DenseModel,Gradient,NumericRow} from '../../../shared/creator/types.ts';

export function readSample(model:DenseModel,row:NumericRow){
  const probabilities=forwardDense(model,row.x).probabilities;
  const predicted=probabilities.indexOf(Math.max(...probabilities));
  return {expected:model.classes[row.label].name,predicted:model.classes[predicted].name,confidence:probabilities[predicted],correct:predicted===row.label,loss:-Math.log(Math.max(1e-15,probabilities[row.label]))};
}
export interface UpdateExplanation {
  sampleId:string;beforeLoss:number;afterLoss:number;beforeBias:number;afterBias:number;gradient:number;rate:number;layer:number;unit:number;
}
/** Reads a completed update. It does not apply another gradient or alter a saved model. */
export function explainUpdate(before:DenseModel,after:DenseModel,row:NumericRow,gradient:Gradient,selected:[number,number]):UpdateExplanation {
  const [k,j]=selected;
  return {sampleId:row.id,beforeLoss:readSample(before,row).loss,afterLoss:readSample(after,row).loss,beforeBias:before.layers[k].bias[j],afterBias:after.layers[k].bias[j],gradient:gradient.layers[k].bias[j],rate:before.learningRate,layer:k+1,unit:j+1};
}
