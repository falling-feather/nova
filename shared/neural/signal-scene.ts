import type {SceneContext} from './scene.ts';
import {trainingBar,shape} from './scene.ts';
import {graphMarkup} from './visuals.ts';
export function signalScene(c:SceneContext):string {
  const m=c.w.model,[layer,node]=c.selected,key=c.selected.join(':'),masked=c.w.mask.units.includes(key);
  return `<div class="play-layout signal-layout">
    <section class="chart-table signal-machine" aria-label="网络装置拼装台">
      <div class="table-heading"><div><span class="eyebrow">信号工房 · ${shape(m.hidden)}</span><h2>让信号走过你搭的装置</h2></div><div class="model-scores"><span>训练 <b data-live="train-score">—</b></span><span>验证 <b data-live="validation-score">—</b></span></div><button data-action="controls">参数与激活</button></div>
      <div class="component-rack"><button id="spare-neuron" class="component-token" ${c.busy?'disabled':''} aria-label="拖动备用节点到任一隐藏层添加节点">◉ 备用节点 <span>拖入下面的层槽</span></button><button data-action="add-layer" ${m.hidden.length>=3||c.busy?'disabled':''}>＋ 隐藏层</button><button data-action="remove-layer" ${m.hidden.length<=1||c.busy?'disabled':''}>－ 末层</button><span class="rack-note">相邻层密集连接 · 改结构从新起点开始</span></div>
      <div class="layer-slots">${m.hidden.map((n,k)=>`<div data-drop-layer="${k}" aria-label="第${k+1}层节点槽"><span>隐藏层 ${k+1} · ${n}个</span><button data-add-node="${k}" ${n>=8||c.busy?'disabled':''} aria-label="添加第${k+1}层节点">＋</button></div>`).join('')}</div>
      <div id="network-board" class="network-board">${graphMarkup(m,c.w.probe,c.w.mask,c.selected)}</div>
      <p class="connection-caption">点节点检视 · 点连线拔插信号 <span>青色正权重／铜色负权重，粗细对应绝对值</span></p>
      ${trainingBar(c)}
    </section>
    <aside class="instrument signal-instrument" aria-label="输入和节点响应">
      <div class="instrument-heading"><h3>${c.dataView==='test'?'封存输入':c.dataView==='validation'?'新调查输入':'训练输入'}</h3><div class="input-view-actions"><button data-view="${c.dataView==='train'?'validation':'train'}">${c.dataView==='test'?'编辑当前':c.dataView==='train'?'看验证':'看训练'}</button><button data-action="dataset">资料</button></div></div>
      <div class="input-board"><canvas id="map" width="350" height="210" tabindex="0" aria-label="拖动二维输入探针，观察网络信号及输出变化"></canvas></div>
      <div class="input-pair"><label>x<input id="probe-x" type="range" min="-1" max="1" step=".02" value="${c.w.probe[0]}" aria-label="输入x"></label><label>y<input id="probe-y" type="range" min="-1" max="1" step=".02" value="${c.w.probe[1]}" aria-label="输入y"></label></div>
      <div class="response-heading"><h4>L${layer+1} · ${node+1}号响应</h4><b data-live="node">—</b></div>
      <div class="response-display"><canvas id="node-map" width="350" height="180" aria-label="当前节点对二维输入的真实响应采样，不叠加目标轮廓"></canvas><span>浅 → 深：响应低 → 高</span></div>
      <div class="signal-readout"><span>加权输入 <b data-live="sum">—</b></span><span>预测 <b data-live="probability">—</b></span></div>
      <div class="plug-controls"><button data-action="mask-node">${masked?'接回':'屏蔽'}这个节点</button><button data-action="restore-mask">接回全部</button><button data-action="remove-train">删除后重训</button></div>
    </aside>
  </div>`;
}
