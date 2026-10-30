(function(){
  'use strict';
  const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const descriptions={
    observe:['换一种方式看。','移动取样框，或改变它的大小。局部的纹理与完整的轮廓，会带来不同的信息。'],
    attention:['让词语彼此关联。','点击一个词，观察连接如何改变。相关程度决定每条线的粗细。'],
    diffusion:['在噪声中，看见形状。','拖动显影滑块，看散乱的颗粒逐渐形成轮廓，再尝试另一个随机起点。'],
    assemble:['亲手改变一个网络。','增减层数与每层节点，观察连接数量如何变化。更多连接也意味着更多参数。']
  };
  function open(kind){
    if(!descriptions[kind])return;
    $('experiment-title').textContent=descriptions[kind][0];$('experiment-description').textContent=descriptions[kind][1];
    const host=$('experiment-content');
    if(kind==='observe')observation(host);else if(kind==='attention')attention(host);else if(kind==='diffusion')diffusion(host);else assembly(host);
  }
  function observation(host){
    host.innerHTML='<div class="experiment-stage" id="sample-stage"><img src="assets/specimen.png" alt="蓝色线稿银杏观察标本"><div class="sample-window" id="sample-window"></div></div><div class="experiment-controls"><label>取样范围 <input id="sample-size" type="range" min="55" max="250" value="110"></label><button id="sample-reset">回到全貌</button></div><p class="experiment-note">观察提示：只有一小片叶脉时，你还能够判断它是什么植物吗？也试试用方向键移动取样框。</p>';
    const stage=$('sample-stage'),windowEl=$('sample-window');stage.tabIndex=0;stage.setAttribute('role','group');stage.setAttribute('aria-label','移动取样框，方向键也可操作');
    let x=.5,y=.5;
    const draw=()=>{windowEl.style.left=x*100+'%';windowEl.style.top=y*100+'%';windowEl.style.width=windowEl.style.height=$('sample-size').value+'px';};
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();x=Math.max(.07,Math.min(.93,(e.clientX-r.left)/r.width));y=Math.max(.1,Math.min(.9,(e.clientY-r.top)/r.height));draw();});
    stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();x=Math.max(.07,Math.min(.93,x+(e.key==='ArrowRight'?.06:e.key==='ArrowLeft'?-.06:0)));y=Math.max(.1,Math.min(.9,y+(e.key==='ArrowDown'?.08:e.key==='ArrowUp'?-.08:0)));draw();});
    $('sample-size').oninput=draw;$('sample-reset').onclick=()=>{$('sample-size').value=250;x=y=.5;draw();};draw();
  }
  function attention(host){
    const words=['这片','银杏','轻轻','摇动'],weights=[[.15,.65,.05,.15],[.1,.25,.1,.55],[.05,.1,.2,.65],[.05,.6,.25,.1]];
    host.innerHTML='<div class="experiment-stage"><svg id="attention-diagram" viewBox="0 0 600 280" role="img" aria-label="词语之间的相关程度连线"></svg></div><div class="token-controls">'+words.map((w,i)=>'<button data-word="'+i+'" aria-pressed="false">'+w+'</button>').join('')+'</div><p class="experiment-note">这是人工设定关系权重的概念示意，用来观察加权连接，不代表真实语言模型的计算结果。</p>';
    function draw(selected){
      const svg=$('attention-diagram');svg.replaceChildren();
      const add=(name,attrs,txt)=>{const n=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(txt)n.textContent=txt;svg.append(n);return n;};
      for(let i=0;i<4;i++){
        const x=100+i*133,w=weights[selected][i];
        add('path',{d:`M${100+selected*133} 224Q${(100+selected*133+x)/2} ${15+i*10} ${x} 100`,fill:'none',stroke:'#245ed7','stroke-width':1+w*7,opacity:.15+w});
        add('circle',{cx:x,cy:85,r:25,fill:'#f8f9f7',stroke:'#245ed7','stroke-width':.8});
        add('text',{x,y:90,'text-anchor':'middle',fill:'#245ed7','font-size':14,'font-family':'SimSun,serif'},words[i]);
        add('text',{x,y:42,'text-anchor':'middle',fill:'#768499','font-size':12,'font-family':'Georgia'},Math.round(w*100)+'%');
      }
      add('circle',{cx:100+selected*133,cy:232,r:27,fill:'#245ed7'});add('text',{x:100+selected*133,y:237,'text-anchor':'middle',fill:'white','font-size':14,'font-family':'SimSun,serif'},words[selected]);
      host.querySelectorAll('[data-word]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.word)===selected)));
    }
    host.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>draw(Number(b.dataset.word)));draw(1);
  }
  function diffusion(host){
    host.innerHTML='<div class="experiment-stage"><svg id="noise-diagram" viewBox="0 0 600 290" role="img" aria-label="颗粒从无序位置移动成叶片轮廓"></svg></div><div class="experiment-controls"><label>显影 <input id="noise-amount" type="range" min="0" max="100" value="12"></label><button id="noise-seed">换一个起点</button><output class="experiment-output" id="noise-output">12%</output></div><p class="experiment-note">这是颗粒位置插值的可视化示意，用于体验“从无序到形状”；真正的扩散模型需要学习逐步去噪。</p>';
    const svg=$('noise-diagram');let seed=1;const dots=[];
    for(let i=0;i<550;i++){const c=document.createElementNS(NS,'circle');c.setAttribute('r',i%3===0?1.1:.7);c.setAttribute('fill',i%8===0?'#737d8b':'#245ed7');svg.append(c);dots.push(c);}
    function hash(n){const v=Math.sin(n*127.1+seed*311.7)*43758.5453;return v-Math.floor(v);}
    function draw(){const v=Number($('noise-amount').value)/100,e=v*v*(3-2*v);dots.forEach((d,i)=>{
      const a=(i%110)/110*Math.PI*1.6-Math.PI*.8,r=50+Math.floor(i/110)*18;
      const tx=300+Math.sin(a)*r,ty=227-Math.cos(a)*r;
      const nx=20+hash(i+1)*560,ny=10+hash(i+2000)*270;
      d.setAttribute('cx',nx+(tx-nx)*e);d.setAttribute('cy',ny+(ty-ny)*e);
      d.setAttribute('opacity',.25+e*.5);
    });$('noise-output').value=Math.round(v*100)+'%';}
    $('noise-amount').oninput=draw;$('noise-seed').onclick=()=>{seed++;draw();};draw();
  }
  function assembly(host){
    host.innerHTML='<div class="experiment-stage"><svg id="network-diagram" viewBox="0 0 600 290" role="img" aria-label="可调整结构的全连接网络"></svg></div><div class="experiment-controls"><label>隐藏层 <input id="network-layers" type="range" min="1" max="4" value="2"></label><label>每层节点 <input id="network-width" type="range" min="2" max="6" value="3"></label><output class="experiment-output" id="network-output"></output></div><p class="experiment-note">两端为 3 个输入与 2 个输出节点，中间为全连接隐藏层。此处统计连接权重，不计偏置项；结构更多并不保证效果更好。</p>';
    function draw(){const layers=Number($('network-layers').value),width=Number($('network-width').value),sizes=[3,...Array(layers).fill(width),2];let markup='',connections=0;
      const pos=(l,n)=>({x:58+l*(484/(sizes.length-1)),y:145+(n-(sizes[l]-1)/2)*36});
      for(let l=0;l<sizes.length-1;l++)for(let a=0;a<sizes[l];a++)for(let b=0;b<sizes[l+1];b++){const p=pos(l,a),q=pos(l+1,b);markup+=`<path d="M${p.x} ${p.y}L${q.x} ${q.y}" stroke="#245ed7" stroke-width=".8" opacity=".2"/>`;connections++;}
      sizes.forEach((count,l)=>{for(let n=0;n<count;n++){const p=pos(l,n);markup+=`<circle cx="${p.x}" cy="${p.y}" r="9" fill="#f8f9f7" stroke="#245ed7" stroke-width="1.2"/><circle cx="${p.x}" cy="${p.y}" r="2.4" fill="#245ed7"/>`;}markup+=`<text x="${pos(l,0).x}" y="267" text-anchor="middle" fill="#7b889b" font-size="10" font-family="SimSun,serif">${l===0?'输入':l===sizes.length-1?'输出':'隐藏层 '+l}</text>`;});
      $('network-diagram').innerHTML=markup;$('network-output').value=`${layers} 个隐藏层 · ${sizes.reduce((a,b)=>a+b,0)} 个节点 · ${connections} 个连接权重`;
    }
    $('network-layers').oninput=$('network-width').oninput=draw;draw();
  }
  window.NovaAtlasExperiments={open};
})();
