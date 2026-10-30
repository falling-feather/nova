import {extractFeatures,FEATURE_NAMES,type FeatureMode} from './model.ts';
import type {PixelBuffer} from '../../../shared/creator/types.ts';
import {drawImage,h,modal} from '../../../shared/creator/dom.ts';
import {featureName} from '../../../shared/creator/network-view.ts';

/** Shows the authoritative extractor's actual values; changing this preview never trains a model. */
export function showFeatureLens(root:HTMLElement,image:PixelBuffer,label:string,initial:FeatureMode,use:(mode:FeatureMode)=>void){
  let mode=initial;
  const dialog=modal(root,'图像怎样变成模型的输入？','');
  const host=document.createElement('div');host.className='feature-lens';dialog.querySelector('.dialog-body')!.append(host);
  const render=()=>{
    const values=extractFeatures(image,mode),all=extractFeatures(image,'color-shape');
    const swatch=(offset:number)=>`rgb(${all.slice(offset,offset+3).map(v=>Math.round(v*255)).join(',')})`;
    host.innerHTML=`<div class="lens-concept"><span>核心概念 / 数据表示与特征</span><p>同一张图，可以被描述成不同的数值。换一套表示，再比较模型学到的规律。</p></div><nav class="lens-tabs" aria-label="预览特征表示">${(['color','shape','color-shape'] as const).map(key=>`<button data-lens-mode="${key}" aria-pressed="${key===mode}">${FEATURE_NAMES[key]}</button>`).join('')}</nav><div class="lens-spread"><figure class="lens-specimen"><div class="lens-image-frame"><canvas id="lens-source" aria-label="当前32×32输入图像"></canvas><span>32 × 32 / RGBA</span></div><figcaption>标签：<b>${h(label)}</b></figcaption><p>标签描述要学习的类别。下面的特征提取只读取像素，不读取标签。</p></figure><section class="lens-encoding"><header><h3>${FEATURE_NAMES[mode]}</h3><span><b>${values.length}</b> 维输入</span></header>${mode!=='shape'?`<div class="lens-swatches"><div><i style="background:${swatch(0)}"></i><span>规则划出的前景均色<small>${all.slice(0,3).map(v=>v.toFixed(3)).join(' · ')}</small></span></div><div><i style="background:${swatch(3)}"></i><span>边缘区域的背景均色<small>${all.slice(3,6).map(v=>v.toFixed(3)).join(' · ')}</small></span></div></div>`:''}${mode!=='color'?`<div class="lens-shape"><div class="lens-grid" role="img" aria-label="四乘四网格中实际前景覆盖率">${all.slice(6,22).map((v,i)=>`<div title="网格${Math.floor(i/4)+1}·${i%4+1}：${v.toFixed(4)}" style="--coverage:${v}">${Math.round(v*100)}<small>%</small></div>`).join('')}</div><dl>${all.slice(22).map((v,i)=>`<div><dt>${['宽度比','高度比','填充率','边缘密度'][i]}</dt><dd>${v.toFixed(3)}</dd></div>`).join('')}</dl></div>`:''}<div class="lens-vector" aria-label="实际输入特征向量">${values.map((v,i)=>`<span title="${h(featureName(mode,i))}：${v.toFixed(5)}"><i style="height:${Math.max(3,v*48)}px"></i><small>${i+1}</small></span>`).join('')}</div><p class="lens-method">本章用固定规则提取颜色与轮廓；这不是神经网络的注意力图。改变表示后，需要重新训练才能比较效果。</p></section></div><footer><span>下一步：固定验证资料，只改变输入线索，比较实际误判。</span><button class="primary" data-lens-use>采用这套输入线索</button></footer>`;
    drawImage(host.querySelector<HTMLCanvasElement>('#lens-source')!,image);
    host.querySelectorAll<HTMLButtonElement>('[data-lens-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.lensMode as FeatureMode;render();});
    host.querySelector<HTMLButtonElement>('[data-lens-use]')!.onclick=()=>{dialog.remove();use(mode);};
  };
  render();
}
