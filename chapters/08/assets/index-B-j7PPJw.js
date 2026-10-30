(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})(),((e,t)=>()=>(t||(e((t={exports:{}}).exports,t,t.exports),e=null),t.exports))(((e,t)=>{(function(e){let n=e=>e===`127.0.0.1`||e===`localhost`;function r(e){let t=new URL(e),n=/^(.*?\/)(?:(?:archive\/)?chapters\/\d{2}(?:\/|$)|(?:courses|personal)(?:\/|$))/.exec(t.pathname);return n?new URL(n[1],t):new URL(`.`,t)}function i(e,t,n,i){if(!Number.isInteger(t))return null;let a=e.chapters.find(e=>e.n===t);if(!a)return null;let o=new URL(i),s=[`http:`,`https:`].includes(o.protocol)?o.origin:`http://127.0.0.1:${e.hub.port}`,c=[`http:`,`https:`].includes(o.protocol)?r(o.href):new URL(`/`,s),l=new URL(`courses/`,c);l.searchParams.set(`view`,String(Number.isFinite(n)?Math.max(0,Math.min(4,n)):0)),l.searchParams.set(`chapter`,String(t));let u=new URL(a.mount.replace(/^\//,``),c);return u.searchParams.set(`novaChapter`,String(t)),u.searchParams.set(`novaReturn`,l.href),{href:u.href,returnUrl:l.href}}function a(e){try{let t=new URL(e),i=t.searchParams.get(`novaChapter`),a=t.searchParams.get(`novaReturn`);if(!a||!i||!/^\d+$/.test(i)||Number(i)<1)return null;let o=new URL(a),s=t.protocol===`http:`&&o.protocol===`http:`&&n(t.hostname)&&n(o.hostname),c=new URL(`courses/`,r(s?o.href:t.href)).pathname;return![`http:`,`https:`].includes(o.protocol)||o.origin!==t.origin&&!s||o.username||o.password||![c,c+`index.html`].includes(o.pathname)||o.searchParams.get(`chapter`)!==i?null:(o.searchParams.delete(`embed`),o.href)}catch{return null}}let o=`nova-chapter-progress-v1:`;function s(e){return Number.isInteger(e)&&e>=1&&e<=13}function c(e){if(!e||!s(e.chapter)||!Number.isInteger(e.total)||e.total<1||e.total>1e3||!Number.isInteger(e.completed)||e.completed<0||e.completed>e.total)return null;let t=e.pathLabel===void 0?`学习活动`:e.pathLabel,n=e.artifactCount===void 0?0:e.artifactCount;return typeof t!=`string`||!t.trim()||t.length>48||!Number.isInteger(n)||n<0||n>1e4?null:{chapter:e.chapter,completed:e.completed,total:e.total,pathLabel:t.trim(),artifactCount:n}}function l(e,t,n=Date.now()){let r=c(t);if(!r||!Number.isFinite(n)||n<0)return{ok:!1,reason:`invalid`};let i={schema:`nova-chapter-progress`,version:1,...r,updatedAt:n};try{return!e||typeof e.setItem!=`function`?{ok:!1,reason:`unavailable`}:(e.setItem(o+r.chapter,JSON.stringify(i)),{ok:!0,value:i})}catch{return{ok:!1,reason:`unavailable`}}}function u(e,t){if(!s(t))return{status:`invalid`};let n;try{if(!e||typeof e.getItem!=`function`)return{status:`unavailable`};n=e.getItem(o+t)}catch{return{status:`unavailable`}}if(n===null)return{status:`missing`};try{let e=JSON.parse(n),r=c(e);return!r||e.schema!==`nova-chapter-progress`||e.version!==1||e.chapter!==t||!Number.isFinite(e.updatedAt)||e.updatedAt<0?{status:`invalid`}:{status:`ok`,value:{schema:e.schema,version:e.version,...r,updatedAt:e.updatedAt}}}catch{return{status:`invalid`}}}function d(){let t=e.document;if(!t||t.getElementById(`nova-course-return`))return;let n=a(e.location.href);if(!n){let t=new URL(e.location.href),i=r(t.href),a=/^(?:archive\/)?chapters\/(\d{2})\//.exec(t.pathname.slice(i.pathname.length));if(a){let e=Number(a[1]);s(e)&&(n=new URL(`courses/?chapter=`+e,i).href)}}let i=t.querySelector(`[data-nova-return-host]`);if(!n||!i)return;let o=t.createElement(`style`);o.textContent=`.nova-course-return{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:600 12px/1.3 system-ui,sans-serif;text-decoration:none;white-space:nowrap;touch-action:manipulation;pointer-events:auto}.nova-course-return:hover{filter:brightness(.85)}.nova-course-return:focus-visible{outline:2px solid currentColor;outline-offset:3px}.nova-course-return svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5}@media(max-width:600px){.nova-course-return{width:36px;min-width:36px;height:36px;justify-content:center;flex-shrink:0;padding:9px}.nova-course-return span{display:none}}`,t.head.append(o);let c=t.createElement(`a`);c.id=`nova-course-return`,c.className=`nova-course-return`,c.href=n,c.target=`_top`,c.setAttribute(`aria-label`,`返回奇点课程目录`),c.title=`返回目录`,c.innerHTML=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H4m5-5-5 5 5 5"/></svg><span>返回奇点</span>`,c.addEventListener(`pointerdown`,e=>e.stopPropagation()),c.addEventListener(`click`,e=>e.stopPropagation()),c.addEventListener(`keydown`,e=>{e.key===`Enter`&&e.stopPropagation()}),i.prepend(c)}let f={entry:i,returnUrl:a,siteRoot:r,mountReturn:d,recordProgress:l,readProgress:u,progressPrefix:o},p=typeof t==`object`&&t.exports;p&&(t.exports=f),(!p||e.document)&&(e.NovaCourseLinks=f),e.document&&typeof e.addEventListener==`function`&&e.addEventListener(`nova:progress`,t=>{let n;try{n=e.NovaPlatform?e.NovaPlatform.progressStorage():e.localStorage}catch{n=null}let r=l(n,t.detail);typeof e.CustomEvent==`function`&&e.dispatchEvent(new e.CustomEvent(`nova:progress-result`,{detail:r})),!r.ok&&e.console&&e.console.warn(`学习活动摘要未保存：`+r.reason)}),e.document&&(d(),e.document.readyState!==`complete`&&e.document.addEventListener(`DOMContentLoaded`,d,{once:!0})),e.document&&!e.NovaPlatformReady&&(e.NovaPlatformReady=new Promise(t=>{if(e.NovaPlatform){t(e.NovaPlatform);return}if(typeof e.document.createElement!=`function`||!e.document.head){t(null);return}let n=()=>{let n=m(`platform-client.js`);n.onload=()=>t(e.NovaPlatform||null),n.onerror=()=>t(null),e.document.head.append(n)};if(e.NovaStorageContract)n();else{let r=m(`storage-contract.js`);r.onload=n,r.onerror=()=>t(null),e.document.head.append(r)}}));function m(t){let n=e.document.createElement(`script`);return n.src=new URL(`platform/`+t,r(e.location.href)).href,n}})(typeof window>`u`?globalThis:window)}))();var e=[{id:`beach`,level:1,name:`潮汐沙滩`,time:`清晨`,palette:`dawn`,question:`往一幅画里加噪声，会发生什么？`},{id:`workshop`,level:2,name:`修复棚`,time:`上午`,palette:`morning`,question:`师傅怎样学会把乱沙收回来？`},{id:`market`,level:3,name:`贝壳市集`,time:`午后`,palette:`afternoon`,question:`从纯噪声出发，怎样画出一幅新画？`},{id:`stall`,level:4,name:`配方摊`,time:`黄昏`,palette:`dusk`,question:`怎样让师傅画我想要的东西？`},{id:`night`,level:5,name:`灯塔夜场`,time:`夜晚`,palette:`night`,question:`一场 AI 生成的演出，人要负责什么？`}],t=[{id:1,location:`beach`,title:`画一幅沙画`,task:`用手指在沙上画一幅画，或者从展位上借一幅。`,insight:`一幅图就是一片有厚有薄的沙：32×32 个格子，每格一个数。`},{id:2,location:`beach`,title:`一道道潮水`,task:`拖动潮水尺，从第 0 道一直拖到最后一道，再盯住一个格子看它怎么变。`,insight:`噪声水平越高，原画的系数越小、随机扰动的系数越大。本尺展示各水平的样子，不是实拍潮水。`},{id:3,location:`beach`,title:`还认得出吗`,task:`先猜到第几道就认不出了，再一幅幅看，标出你真正认不出的那一道。`,insight:`画是一点点丢掉的，不是突然消失的。`},{id:4,location:`beach`,title:`终点有什么相同`,task:`四幅画都被冲到最后一道，猜猜哪一片是你的画。`,insight:`冲到最后，各幅画接近同一种噪声分布；每个格子并不相同，原画信息却已经极少。`},{id:5,location:`beach`,title:`冲乱容易，复原难`,task:`试着把最后的乱沙抹回你的画，再看看师傅从这片乱沙里画出了什么。`,insight:`加噪谁都会；最后的乱沙几乎不保留原画信息。生成依靠学到的规律，并不保证找回原画。`,synthesis:!0},{id:6,location:`workshop`,title:`当一次师傅`,task:`你的画被冲乱了一半。用刷子把它抹回来，再和原画比一比。`,insight:`往回收很难：你得猜出哪些沙是被冲乱的。`},{id:7,location:`workshop`,title:`师傅的练习本`,task:`翻几页练习本：每一页都是一道“猜扰动”的题，看看师傅猜得准不准。`,insight:`训练时比较预测与真实扰动，用误差调整参数；和第五章一样，调整有依据，并非把误差直接照抄给参数。`},{id:8,location:`workshop`,title:`只收一步`,task:`让师傅一次只收一步：先看它猜出的扰动，再减掉一点。多收几步试试。`,insight:`每一步只往回收一小点，画是一步步显出来的。`},{id:9,location:`workshop`,title:`一步到位会怎样`,task:`让师傅面对一片纯乱沙，先一步到位，再一步步来，比较两幅结果，再看看它每一步心里猜的画。`,insight:`对本章训练好的师傅，多步生成通常比一步更有结构；原图估计随步骤变化，不是预存答案。`},{id:10,location:`workshop`,title:`我和师傅比一比`,task:`选择不同强弱的潮水，先亲手修，再比较模型的实际结果。`,insight:`噪声较轻时原图信息更多；修复效果仍要依据这次实际比较，模型的能力来自训练。`,synthesis:!0},{id:11,location:`market`,title:`捡一枚贝壳`,task:`捡一枚带编号的贝壳，看师傅从它那片乱沙里一步步画出一幅画，再拖胶片条回看。`,insight:`生成：从纯噪声出发，一步步去噪。`},{id:12,location:`market`,title:`再来一次`,task:`用同一枚贝壳再画一次，核对两幅是不是一模一样。`,insight:`同一模型、同一完整配方和相同计算环境下，本章的生成结果可以复现。`},{id:13,location:`market`,title:`换一枚`,task:`再捡几枚贝壳，排成一排；然后去练习本里找和每幅最像的一幅。`,insight:`不同种子往往产生不同结果。师傅现场计算图像；抽样对照不能排除它记住训练图的可能。`},{id:14,location:`market`,title:`分几次收沙`,task:`同一枚贝壳，分别收 2、5、20、50 次，比较效果和用时。`,insight:`更多步数通常需要更多计算；图像是否改善，要比较这次实际结果。`},{id:15,location:`market`,title:`我的第一张配方卡`,task:`把你最喜欢的一幅记成配方卡，再按配方码把它原样复现出来。`,insight:`配方记录种子、条件、力度和步数。同一模型与采样方式下可以复现，跨设备可能有细微差异。`,synthesis:!0},{id:16,location:`stall`,title:`抽签`,task:`抽几支题目签，用同一枚贝壳让师傅按题作画。`,insight:`条件把生成引向某个类别。`},{id:17,location:`stall`,title:`攥紧一点`,task:`先确认只改条件力度，再选两幅实际结果，用 A/B 解释你的观察。`,insight:`力度为0时不使用类别引导；更强不一定更好，要同时检查题目、轮廓与细节。`},{id:18,location:`stall`,title:`我的控制变量实验`,task:`自主研究种子、题目或步数中的一个，保持其他条件相同，留下 A/B 和结论。`,insight:`公平对照要固定其他条件；一组实验的结论只支持当前模型与这组结果。`},{id:19,location:`stall`,title:`两支签一起抽`,task:`选两支不同题目签，固定其他条件；选择实际 A/B 比例并记录观察。`,insight:`混合可能画出有趣的东西，也可能两不像：组合不一定行得通。`},{id:20,location:`stall`,title:`配方挑战`,task:`摊主拿出三幅画，找出能原样画出它们的配方。`,insight:`种子、题目、力度、步数各自起作用；配方对了，画就一模一样。`,synthesis:!0},{id:21,location:`night`,title:`选节目`,task:`从配方卡册里挑出 6 幅作品，编排夜场；说明一张未采用图的理由。`,insight:`策展：展示什么、按什么顺序、舍弃什么，由人根据用途决定。`},{id:22,location:`night`,title:`它画不出的`,task:`观众点了“长颈鹿”和“我家的小狗”，试试师傅能不能画。`,insight:`这位师傅只支持12种类别条件，没有接收任意文字和指定宠物身份的能力。`},{id:23,location:`night`,title:`打上标识`,task:`给节目单上的每幅作品加上“AI 生成”标识，导出一张，再检查文件里写了什么。`,insight:`向观众说明哪些内容由AI生成，并检查可见标签与文件说明；转存或截图可能使标识丢失。`},{id:24,location:`night`,title:`每一笔从哪来`,task:`打开致谢墙，看看师傅学过的涂鸦来自哪里，再把致谢写进节目单。`,insight:`训练数据来自真实的人，应当尊重与署名。`},{id:25,location:`night`,title:`夜场开演`,task:`开演！看完灯塔上的投影秀，回答潮伯的问题：这算谁的作品？`,insight:`作品里有人的选择、工具的计算，也有许多人画过的涂鸦。`,synthesis:!0}];function n(n){let r=t[n-1];return e.find(e=>e.id===r.location)}var r={beach:{lead:`夜场还没开始，潮水先来做客。留下一幅自己的画，看看随机扰动会怎样改变它。`,goal:`用同一幅画比较不同噪声水平，区分原图、随机扰动和最终沙面。`,souvenir:`我的原画与观察记录`,reflect:`最后的几片乱沙是每个格子都相同，还是整体规律相似？你观察到了什么？`,minutes:25},workshop:{lead:`带着清晨的疑问走进修复棚。师傅的练习本里，藏着每一步收沙的本领。`,goal:`比较自己的修复和模型结果，解释训练时猜噪声、生成时逐步去噪的区别。`,souvenir:`修复对照与练习本发现`,reflect:`师傅训练时看到了什么答案？夜场画新画时，它还拿得到那幅原画吗？`,minutes:30},market:{lead:`小贝把贝壳摆满栈道。每个编号都是一种随机起点，你来挑选今晚的第一幅作品。`,goal:`固定其他条件，只改变种子或步数；记录能否复现、画面和用时的变化。`,souvenir:`可复现的第一张配方`,reflect:`把配方交给同伴时，除了贝壳编号，还需要告诉对方什么？`,minutes:30},stall:{lead:`灯笼亮了。给师傅一支题目签，试试你能决定哪些事情，又有哪些事不能保证。`,goal:`分别改变类别、引导力度和混合比例，依据实际结果选择配方。`,souvenir:`条件对照与配方挑战`,reflect:`题目、种子和力度各改变了什么？这次哪一种力度更合适，你用什么现象判断？`,minutes:30},night:{lead:`海风带来了第一批观众。现在由你决定展出什么、怎样介绍，以及怎样交代来源。`,goal:`完成六幅作品的策展、标识和致谢，并说明人的选择与工具计算各自的作用。`,souvenir:`有来源说明的夜场海报`,reflect:`你的夜场里，哪些决定是你做的？哪些来自模型计算？你会怎样向观众介绍？`,minutes:35}},i=[{term:`像素`,step:1,meaning:`这张32×32的图由1024个数构成。沙面纹理帮助观看，真正送进模型的是这些数。`},{term:`噪声与分布`,step:4,meaning:`噪声是一组随机数。不同乱沙可以有相似的数值分布，不表示每个格子相同。`},{term:`训练`,step:7,meaning:`训练前我们知道加进去的扰动，用它检查模型猜得怎样，再调整参数。这里的师傅已经训练好，翻练习本不会现场重训。`},{term:`去噪`,step:8,meaning:`模型根据当前沙面和噪声水平预测扰动，再计算下一步沙面。预测可能有误，并不保证找回原画。`},{term:`原图估计`,step:9,meaning:`模型在当前一步对最终图像的估计。它是计算结果，不是机器真的在想象，也不是提前藏好的目标图。`},{term:`采样与种子`,step:12,meaning:`种子决定随机起点。本课程用确定性的采样方法；模型、配方和计算环境相同时可以逐格复现。`},{term:`生成与记忆`,step:13,meaning:`师傅按学到的规律计算新结果。抽样近邻比较只能帮助找相似图，不能证明模型从不记忆训练样本。`},{term:`采样步数`,step:14,meaning:`步数是生成时调用模型多少次，不是训练次数。多算几次通常更慢，效果是否改善要实际比较。`},{term:`条件与引导`,step:17,meaning:`题目签把生成引向一个类别，力度调整引导的强弱。它不是准确率，也不是越大越好。`},{term:`能力边界`,step:22,meaning:`本章小模型只接受12种类别条件，不能接收任意文字或辨认某个具体对象。这不代表所有生成模型都只能照搬学过的类别。`},{term:`生成内容标识`,step:23,meaning:`可见文字和文件里的来源说明帮助观众辨认。截图、裁切或转存可能丢失它们，分享时要再次检查。`},{term:`数据来源与贡献`,step:25,meaning:`数据由许多人绘制，模型完成计算，学生选择、比较和策展。说明各自贡献；这项课堂讨论不替代作品权利的具体判断。`}],a=[`按住沙盘画线；也可以点展位缩略图借画。看格子能看到模型读到的分辨率。`,`先拖潮水尺，再点沙盘的一格；也可用“观察中间一格”。两条读数是系数，不是相加等于100%的占比。`,`先锁定猜测，再选自己开始认不清的那幅。个人观察没有唯一正确的潮水刻度。`,`先凭观察选一片，再对照原画与直方图。不同随机数也能有相似分布。`,`先动刷子，再请师傅尝试。比较三幅图；相似度是像素比较，不是作品评分。`,`可用刷子拖动，也可整片抹匀。修完后按“和原画比一比”。`,`留意“真实加进去的扰动”和“师傅猜的扰动”。运行一页真实预测，想继续时再换一道练习。`,`一次按一次“收一步”，对照收之前、预测的扰动和收之后。需要时可以从头重看。`,`分别试“一步到位”和“一步步来”，再看早期的原图估计；结论针对本章这个模型。`,`选择不同潮水强弱，都先亲手修，再交给模型。记录哪一次更接近原画。`,`点带编号的贝壳生成，再点胶片格或拖动回看尺，观察一次中间过程。`,`固定全部配方，再完整计算一次。程序逐格核对，展示这台电脑上实际的结果。`,`选择不同编号作对照，再查抽样近邻。像素相似不等于查明了某张图的来源。`,`选择你想比较的步数。看当前实测用时，也看轮廓有没有改善。`,`点一张画保存配方，复制或输入配方码，再生成核对。配方必须完整一致。`,`点题目签或抽签，保留同一枚贝壳。选择不同题目作对照。`,`确认只改变条件力度，写下预测，生成至少两个取值；选入 A/B 并说明轮廓或细节，不把力度当正确率。`,`自主选种子、题目或步数中的一个。其余条件锁定；选实际 A/B 图，引用图像解释本次结果。`,`挑两支不同的签，只改变混合比例。选实际结果作 A/B，两不像与证据不足都可以如实记录。`,`先选目标图，再调整配方。目标都收20步；你的每次尝试会显示真实差异。`,`点作品加入节目单，用上下箭头排顺序；确认时选择一张未采用图，结合今晚的用途说明取舍。`,`看看签筒支持什么，再解释两个观众要求为什么超出了这位师傅的能力。`,`为六幅都加标识，再导出一幅，核对从PNG实际读回的说明。`,`看数据统计和真实涂鸦样本，再将来源致谢加入节目单。`,`六幅按配方现场重演后，说明你、模型与数据贡献者各自做了什么。可导出海报和学习手册。`],o=[{title:`DDPM：扩散模型的训练`,url:`https://arxiv.org/abs/2006.11239`},{title:`DDIM：本章采用的采样方法`,url:`https://arxiv.org/abs/2010.02502`},{title:`Classifier-Free Guidance：条件引导`,url:`https://arxiv.org/abs/2207.12598`},{title:`Quick, Draw!：涂鸦数据与许可`,url:`https://github.com/googlecreativelab/quickdraw-dataset`}],s=9999;function c(e){if(!e||typeof e!=`object`||Array.isArray(e))return!1;let t=e,n=(e,t,n)=>Number.isInteger(e)&&e>=t&&e<=n;return n(t.seed,1,9999)&&n(t.steps,1,50)&&n(t.cls,-1,11)&&Number.isFinite(t.w)&&t.w>=0&&t.w<=15&&(t.mix===void 0||!!t.mix&&typeof t.mix==`object`&&!Array.isArray(t.mix)&&n(t.mix.cls,0,11)&&Number.isFinite(t.mix.ratio)&&t.mix.ratio>=0&&t.mix.ratio<=1)}function l(e){let t={seed:Math.max(1,Math.min(s,Math.round(e.seed))),steps:Math.max(1,Math.min(50,Math.round(e.steps))),w:Math.round(Math.max(0,Math.min(15,e.w))*10)/10,cls:e.cls};if(e.mix&&e.cls>=0&&e.mix.cls>=0&&e.mix.cls!==e.cls){let n=Math.round(Math.max(0,Math.min(1,e.mix.ratio))*10)/10;n>0&&n<1?t.mix={cls:e.mix.cls,ratio:n}:n>=1&&(t.cls=e.mix.cls)}return t.cls<0&&(t.w=0),t}function u(e,t){let n=l(e);if(n.cls<0)return`${n.seed}-自由-${n.steps}`;let r=n.mix?`${t[n.cls].zh}${Math.round((1-n.mix.ratio)*10)}${t[n.mix.cls].zh}${Math.round(n.mix.ratio*10)}`:t[n.cls].zh;return`${n.seed}-${r}-${d(n.w)}-${n.steps}`}function d(e){return Number.isInteger(e)?String(e):e.toFixed(1)}function f(e,t){let n=e.trim().replace(/[—–－·\s]+/g,`-`).split(`-`).filter(Boolean);if(n.length<3)throw Error(`配方码要写成“贝壳-题目-力度-步数”，例如 427-鱼-3-20`);let r=Number(n[0]);if(!Number.isInteger(r)||r<1||r>9999)throw Error(`贝壳编号要是 1 到 ${s} 之间的整数`);let i=n[1];if(i===`自由`||i.toLowerCase()===`free`){let e=Number(n[2]);if(!Number.isInteger(e)||e<1||e>50)throw Error(`步数要是 1 到 50 之间的整数`);return{seed:r,steps:e,w:0,cls:-1}}if(n.length<4)throw Error(`有题目的配方还需要写力度和步数，例如 427-鱼-3-20`);let a=Number(n[2]),o=Number(n[3]);if(!Number.isFinite(a)||a<0||a>15)throw Error(`力度要是 0 到 15 之间的数`);if(!Number.isInteger(o)||o<1||o>50)throw Error(`步数要是 1 到 50 之间的整数`);let c=e=>t.findIndex(t=>t.zh===e||t.key===e.toLowerCase()),u=c(i);if(u>=0)return l({seed:r,steps:o,w:a,cls:u});let d=/^(\D+?)(\d{1,2})(\D+?)(\d{1,2})$/.exec(i);if(d){let e=c(d[1]),t=c(d[3]),n=Number(d[2]),i=Number(d[4]);if(e>=0&&t>=0&&n+i>0)return l({seed:r,steps:o,w:a,cls:e,mix:{cls:t,ratio:i/(n+i)}})}throw Error(`题目“${i}”不在签筒里`)}function p(e,t){let n=l(e),r=l(t);return n.seed===r.seed&&n.steps===r.steps&&n.w===r.w&&n.cls===r.cls&&(n.mix?.cls??-1)===(r.mix?.cls??-1)&&(n.mix?.ratio??0)===(r.mix?.ratio??0)}var m={guidance:`条件力度`,topic:`题目`,seed:`随机种子`,steps:`采样步数`,ratio:`混合比例`};function h(e,t){let n=e.fixed;if(!e.variable)return null;if(e.variable===`ratio`){if(!n.mix||n.cls<0||n.w<=0||n.cls===n.mix.cls||t.seed!==n.seed||t.steps!==n.steps||t.w!==n.w)return null;let e=l(t),r=n.mix.cls;return e.mix?e.cls===n.cls&&e.mix.cls===r?e.mix.ratio:e.cls===r&&e.mix.cls===n.cls?1-e.mix.ratio:null:e.cls===n.cls?0:e.cls===r?1:null}let r={guidance:`w`,topic:`cls`,seed:`seed`,steps:`steps`}[e.variable];return e.variable===`guidance`&&n.cls<0||e.variable===`topic`&&(n.w===0||t.mix)?null:p({...t,[r]:n[r]},n)?t[r]:null}function g(e,t,n){let r=h(e,t.recipe),i=h(e,n.recipe);return t.id!==n.id&&r!==null&&i!==null&&r!==i&&!!t.generation&&!!n.generation&&t.generation.model===n.generation.model}function _(e,t){let n=[];(!e.confirmed||!e.variable)&&n.push(`先确认研究变量与固定条件。`),e.prediction.trim()||n.push(`留下运行前的预测。`);let r=t.find(t=>t.id===e.a&&e.runs.includes(t.id)),i=t.find(t=>t.id===e.b&&e.runs.includes(t.id));return!r||!i?n.push(`从本次实际生成的结果中选择 A 和 B。`):!r.preview||!i.preview?n.push(`A/B 需要保留实际结果图，先重新生成缺少的图像。`):g(e,r,i)||n.push(`A/B 必须来自同一模型，只改变研究变量，且取值不同。`),e.observation===void 0&&n.push(`选择本次观察；变化不明显或不符预测也可以记录。`),e.conclusion.trim()||n.push(`依据 A/B 的差异或相似说明结论；简短解释也可以。`),n}function v(e){return e.experiments??[]}function y(e,t,n){if(!Array.isArray(e)||e.length>50)return!1;let r=new Set;return e.every(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return!1;let i=e;if(typeof i.id!=`string`||!i.id||r.has(i.id))return!1;r.add(i.id);let a=n===17?[`guidance`]:n===18?[`seed`,`topic`,`steps`]:n===19?[`ratio`]:Object.keys(m);return Number.isFinite(i.created)&&i.created>=0&&(i.variable===null||a.includes(i.variable))&&c(i.fixed)&&(i.variable!==`ratio`||!!i.fixed.mix&&i.fixed.cls>=0&&i.fixed.cls!==i.fixed.mix.cls&&i.fixed.w>0)&&(i.variable!==`topic`||!i.fixed.mix&&i.fixed.cls>=0&&i.fixed.w>0)&&typeof i.confirmed==`boolean`&&typeof i.prediction==`string`&&i.prediction.length<=1200&&typeof i.conclusion==`string`&&i.conclusion.length<=1200&&Array.isArray(i.runs)&&i.runs.length<=100&&new Set(i.runs).size===i.runs.length&&i.runs.every(e=>typeof e==`string`&&t.some(t=>t.id===e))&&[i.a,i.b].every(e=>e===void 0||typeof e==`string`&&i.runs.includes(e))&&(i.observation===void 0||Number.isInteger(i.observation)&&i.observation>=0&&i.observation<=2)&&(i.submittedAt===void 0||Number.isFinite(i.submittedAt)&&i.submittedAt>=0)&&(i.submittedAt===void 0||_(i,t).length===0)})}function b(e,t){return v(e.evidence[String(t)]??{}).flatMap((t,n)=>{let r=e.album.find(e=>e.id===t.a),i=e.album.find(e=>e.id===t.b);return r&&i?[{index:n+1,a:r,b:i,submitted:!!t.submittedAt}]:[]})}function x(e,t,n){let r=e.evidence[String(t)]??{},i=[],a=(e,t)=>{e&&i.push(t())};if(t===1&&a(e.drawing,()=>`原画：${e.drawingFrom===`booth`?`从展位借来`:`亲手绘制或修改`}，32 × 32 像素。`),t===2&&a(r.max!==void 0,()=>`最远观察到 ${r.max} / 1000；${Number(r.cell)>=0?`已放大一个像素`:`尚未放大像素`}。`),t===3&&(a(r.guess!==void 0,()=>`我的预测：${r.guess} / 1000。`),a(r.seen!==void 0,()=>`实际观察：在 ${r.seen} 处开始看不清。`)),t===4&&a(r.pick!==void 0,()=>`我选择并揭开了乱沙 ${[`A`,`B`,`C`,`D`][Number(r.pick)]}。`),(t===5||t===6)&&a(r.mine!==void 0,()=>`像素相似度：我的修复 ${r.mine}%；模型 ${r.master}%。`),t===7&&(a(r.pages,()=>`已观察 ${r.pages.length} 页不同练习。`),a(r.error!==void 0,()=>`最近一页的平均平方误差：${Number(r.error).toFixed(4)}。`)),t===8&&a(r.i!==void 0,()=>`已逐步观察 ${r.i} 次更新。`),t===9){let t=e.album.filter(e=>e.step===9).map(e=>e.recipe.steps);a(t.length,()=>`同一起点已计算：${t.join(`、`)} 步。`)}if(t===10)for(let[e,t]of[[`light`,`轻度`],[`medium`,`中度`],[`heavy`,`重度`]]){let n=r.scores?.[e];a(n,()=>`${t}：我的修复 ${n.mine}%；模型 ${n.master}%。`)}if(t===11&&a(r.seed!==void 0,()=>`选择种子 ${r.seed}；${r.scrubbed?`回看至第 ${Number(r.frameIndex??0)+1} 步`:`尚未回放过程`}。`),t===12&&a(r.code,()=>`配方 ${r.code}：${r.same?`两次重新计算的 1,024 个数值一致`:`本次逐格核对存在差异`}。`),t===13&&a(r.seeds,()=>`比较了 ${r.seeds.length} 个起点；${r.compared?`已查看抽样近邻`:`尚未查看近邻`}。`),t===14){a(r.guess!==void 0,()=>`运行前预测：${r.guess} 步更合适。`);for(let e of r.timings??[])i.push(`种子 ${e.seed} · ${e.steps} 步：${(e.ms/1e3).toFixed(2)} 秒（本机实测）。`)}if(t===15&&a(r.code,()=>`收好的配方：${r.code}；${r.reproduced?`重新计算复现成功`:`尚未核对复现`}。`),t===16&&a(r.tried,()=>`已比较题目：${r.tried.map(e=>n[e].zh).join(`、`)}。`),t===17&&a(r.swept,()=>`旧版操作记录：固定题目“${n[Number(r.cls??0)].zh}”，跑过力度 0、1、2、4、7、12；操作本身不代表已解释。`),t===18&&(a(r.a,()=>`旧版操作记录：固定种子，比较六种题目。`),a(r.b,()=>`旧版操作记录：固定题目“${n[Number(r.cls??2)].zh}”，比较六个种子。`)),t===19&&(a(r.mixed,()=>`旧版操作记录：比较过“${(r.pair??[0,1]).map(e=>n[e].zh).join(` / `)}”的五组混合比例。`),a(r.observation!==void 0,()=>`旧版观察：${Number(r.observation)===2?`暂时认不出`:`更像${n[(r.pair??[0,1])[Number(r.observation)]].zh}`}。`)),t>=17&&t<=19){for(let[a,o]of v(r).entries())if(o.variable||o.prediction||o.runs.length){i.push(`实验卡 ${a+1}：${o.variable?`只改变${m[o.variable]}`:`研究变量尚未选择`}；${o.submittedAt?`已提交完整记录`:`待完善`}。`),i.push(`基准配方：${u(o.fixed,n)}；其余条件保持不变。`),o.prediction&&i.push(`运行前预测：${o.prediction}`),i.push(`本卡实际生成 ${o.runs.length} 个不同配方。`);for(let[t,r]of[[`A`,o.a],[`B`,o.b]]){let a=e.album.find(e=>e.id===r);a&&i.push(`${t} 图：${u(a.recipe,n)}${a.generation?`；模型 ${a.generation.model}，${(a.generation.ms/1e3).toFixed(2)} 秒（首次本机实测）`:`；无可核对的运算元数据`}。`)}if(o.observation!==void 0){let e=t===19?[`更像${n[o.fixed.cls].zh}`,`更像${n[o.fixed.mix.cls].zh}`,`暂时认不出 / 两不像`]:[`观察到明显差异`,`变化不明显 / 证据不足`,`结果不符合我的预测`];i.push(`我的观察：${e[o.observation]}。`)}o.conclusion&&i.push(`依据 A/B 的解释：${o.conclusion}`)}}if(t===20){let e=r.attempts??[];a(e.length,()=>`留下 ${e.length} 次尝试，解开 ${(r.solved??[]).length} 个目标。`);for(let t of e.slice(-3))i.push(`目标 ${t.target+1} · ${u(t.recipe,n)}：${t.same?`逐格一致`:`仍有差异`}。`)}if(t===21){a(e.program.length,()=>`节目单：${e.program.length} 幅作品，按我的顺序编排。`);let t=e.album.find(e=>e.id===r.rejectedWork);a(t,()=>`未采用：${u(t.recipe,n)}；我的取舍理由：${r.rejectionReason??`尚未记录`}`)}return t===22&&a(r.answered,()=>`已解释 ${Object.keys(r.answered).length} 个超出本章输入范围的请求。`),t===23&&(a(r.labeled,()=>`已有 ${r.labeled.length} 幅作品加上可见的 AI 标识。`),a(r.checked,()=>`已从实际 PNG 读回说明；配方 ${r.fileInfo?.Recipe??`已核对`}。`)),t===24&&(a(r.sourceReviewed,()=>`已核对本章实际数据来源：Google Quick, Draw! Dataset · CC BY 4.0。`),a(r.credited,()=>e.creditText??`已在节目单中写入数据来源与致谢。`)),t===25&&(a(r.watched,()=>`已欣赏完当前节目单的六幅作品。`),a(r.picks,()=>`我的解释涉及：${r.picks.map(e=>({human:`我的选择与策展`,model:`模型的计算`,data:`数据贡献者`})[e]??e).join(`、`)}。`),a(r.reason,()=>`我的理由：${r.reason}`)),i}function S(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function C(e,t){let n=S(e),r=new Float32Array(t);for(let e=0;e<t;e+=2){let i=1-n(),a=n(),o=Math.sqrt(-2*Math.log(i));r[e]=o*Math.cos(2*Math.PI*a),e+1<t&&(r[e+1]=o*Math.sin(2*Math.PI*a))}return r}var w=1024;function T(e,t=1e3){if(e<=1)return[t-1];let n=[];for(let r=0;r<e;r++)n.push(Math.round((t-1)*(1-r/(e-1))));return n}function E(e,t,n,r){if(t<0)return Float32Array.from(e);let i=n[t],a=Math.sqrt(i),o=Math.sqrt(1-i),s=new Float32Array(e.length);for(let t=0;t<e.length;t++)s[t]=a*e[t]+o*r[t];return s}function D(e,t,n){if(!t)return e;if(!e)return t;let r=new Float32Array(e.length);for(let i=0;i<e.length;i++)r[i]=t[i]+n*(e[i]-t[i]);return r}function O(e,t,n,r){let i=Math.sqrt(n),a=Math.sqrt(1-n),o=Math.sqrt(r),s=Math.sqrt(1-r),c=new Float32Array(e.length),l=new Float32Array(e.length);for(let n=0;n<e.length;n++){let r=(e[n]-a*t[n])/i;r>1?r=1:r<-1&&(r=-1);let u=(e[n]-i*r)/a;c[n]=o*r+s*u,l[n]=r}return{next:c,x0:l}}async function ee(e,t){let n=t.ac.length,r=T(t.steps,n),i;t.start?(r=r.filter(e=>e<=t.start.t),r[0]!==t.start.t&&r.unshift(t.start.t),i=Float32Array.from(t.start.x)):i=C(t.seed,w);let a=[],o=()=>{if(t.shouldStop?.())throw new DOMException(`已离开这一环节`,`AbortError`)};for(let n=0;n<r.length;n++){o();let s=r[n],c=await k(e,i,s,t.cond,t.nullCond,t.w);o();let l=t.ac[s],u=n+1<r.length?t.ac[r[n+1]]:1,{next:d,x0:f}=O(i,c,l,u);i=d;let p={t:s,x:d,x0:f};a.push(p),await t.onFrame?.(p,n,r.length)}return o(),{image:i,frames:a}}async function k(e,t,n,r,i,a){if(a===0)return e(t,Float32Array.of(n),i,1);if(a===1)return e(t,Float32Array.of(n),r,1);let o=new Float32Array(t.length*2);o.set(t,0),o.set(t,t.length);let s=new Float32Array(r.length*2);s.set(r,0),s.set(i,r.length);let c=await e(o,Float32Array.of(n,n),s,2);return D(c.subarray(0,t.length),c.subarray(t.length),a)}function te(e,t,n){let r=Math.sqrt(n),i=Math.sqrt(1-n),a=new Float32Array(e.length);for(let n=0;n<e.length;n++)a[n]=Math.max(-1,Math.min(1,(e[n]-i*t[n])/r));return a}function ne(e){let t=new Float32Array(e[0].vec.length),n=e.reduce((e,t)=>e+t.weight,0)||1;for(let r of e)for(let e=0;e<t.length;e++)t[e]+=r.vec[e]*r.weight/n;return t}function re(e){let t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=Math.max(0,Math.min(255,Math.round((e[n]+1)*127.5)));return t}function ie(e){let t=new Float32Array(e.length);for(let n=0;n<e.length;n++)t[n]=e[n]/127.5-1;return t}function ae(e){return[...e.done,...e.verified??[]].sort((e,t)=>e-t)}function oe(e,t){if(!Number.isInteger(t)||t<1||t>25)throw Error(`无效环节`);let n=new Set(ae(e));n.add(t);let r=0;for(;n.has(r+1);)r++;e.done=Array.from({length:r},(e,t)=>t+1),e.verified=[...n].filter(e=>e>r).sort((e,t)=>e-t)}function se(e,t){let n=e.evidence[String(t)]??{},r=[],i=(e,t)=>{e||r.push(t)},a=()=>typeof n.reason==`string`&&!!n.reason.trim(),o=t=>e.album.find(e=>e.id===n[t]&&e.generation&&e.preview);if(t===1&&i(e.drawing,`先留下亲手绘制或借来修改的原画。`),t===2&&(i(Number(n.max)>0&&Number(n.cell)>=0,`改变潮水水平，再观察一格像素。`),i(n.explained,`比较原图信号与扰动怎样变化。`)),t===3&&(i(n.locked&&n.seen!==void 0,`先预测，再记录你开始看不清的位置。`),i(n.explained,`解释图像信号和随机扰动的变化。`)),t===4&&(i(n.pick!==void 0,`选一片乱沙并揭开来源。`),i(n.explained,`区分每格相同与分布相似。`)),(t===5||t===6)&&(i(n.manualImage&&n.modelImage,`留下一次手工与模型修复对照。`),i(n.explained,`说明修复结果是否保证找回原画。`)),t===7&&(i(Number.isFinite(n.error),`运行一页实际噪声预测并比较误差。`),i(n.explained,`区分检查已训练模型与现场训练。`)),t===8&&(i(Number(n.i)>0,`亲手执行一个真实去噪步骤。`),i(n.explained,`观察输入、噪声预测与更新的关系。`)),t===9){let e=o(`singleWork`),t=o(`multiWork`);i(e&&t&&e.generation.model===t.generation.model&&e.recipe.steps!==t.recipe.steps&&p({...e.recipe,steps:t.recipe.steps},t.recipe),`保留同一起点的一步与多步真实结果。`),i(n.observation!==void 0&&a(),`依据实际图像记录观察与解释，反例也可以。`)}if(t===10&&(i(Object.keys(n.scores??{}).length>=2,`在两种不同噪声水平下留下手工与模型比较。`),i(n.explained,`比较噪声强弱与修复难度，不把像素分数当审美。`)),t===11&&(i(o(`generatedWork`)&&n.scrubbed,`生成一幅实际作品并回看中间步骤。`),i(n.explained,`区分当前沙面与模型的原图估计。`)),t===12&&i(n.same===!0&&n.code,`按相同配方完整重算并逐格核对。`),t===13&&(i(new Set(n.seeds??[]).size>=2&&n.compared,`比较不同起点，并查一次真实抽样近邻。`),i(n.explained,`说明抽样相似不能证明模型从未记忆。`)),t===14){let e=n.timings??[];i(e.length>=2&&new Set(e.map(e=>e.seed)).size===1&&new Set(e.map(e=>e.steps)).size>=2&&e.every(e=>Number.isFinite(e.ms)&&e.ms>=0),`固定种子比较两种采样步数与实测耗时。`),i(n.observation!==void 0&&a(),`记录本次的效果观察，依据结果说明选择。`)}if(t===15&&i(n.code&&n.reproduced,`收好配方，再输入完整配方码重算核对。`),t===16&&(i(new Set(n.tried??[]).size>=2,`固定起点比较两种类别条件。`),i(n.explained,`说明条件引导能影响什么、不能保证什么。`)),t>=17&&t<=19&&i(v(n).some(t=>t.submittedAt!==void 0&&_(t,e.album).length===0),`留下只改一个变量的实际 A/B、预测、观察与解释。`),t===20&&i((n.attempts??[]).some(e=>e.same),`调整完整配方，至少复现一个实际目标。`),t===21&&(i(e.program.length===6,`选六幅不同作品组成节目单。`),i(e.album.some(t=>t.id===n.rejectedWork&&!e.program.includes(t.id))&&typeof n.rejectionReason==`string`&&!!n.rejectionReason.trim(),`选择真实未采用图，说明它与展演用途的关系。`)),t===22){let e=n.answered;i(e?.giraffe&&e.pet,`分别核对类别范围和指定身份两个观众请求。`)}return t===23&&(i(e.program.length===6&&e.program.every(e=>(n.labeled??[]).includes(e)),`为节目单上的每幅作品添加可见 AI 标识。`),i(n.checked&&e.program.includes(String(n.checkedWork)),`导出一幅并从 PNG 字节核对真实配方与来源。`)),t===24&&i(n.sourceReviewed&&n.credited&&e.creditText?.trim(),`核对实际数据来源，并保存你的贡献说明。`),t===25&&(i(n.watched&&n.watchedProgram===e.program.join(`|`),`查看当前节目单的实际重演。`),i([`human`,`model`,`data`].every(e=>(n.picks??[]).includes(e))&&a(),`联系你的策展，说明人、模型与数据绘画者的贡献。`)),r}var ce=class{paused;stopped=!1;release;reject;constructor(e=!1){this.paused=e}pause(){this.paused=!0}resume(){this.paused=!1,this.release?.(),this.clear()}next(){this.paused=!0,this.release?.(),this.clear()}stop(){this.stopped=!0,this.reject?.(new DOMException(`本次采样已停止`,`AbortError`)),this.clear()}clear(){this.release=void 0,this.reject=void 0}async afterFrame(){if(this.stopped||(this.paused&&await new Promise((e,t)=>{this.release=e,this.reject=t}),this.stopped))throw new DOMException(`本次采样已停止`,`AbortError`)}},le=class e{ac;table;nullCond;worker;seq=0;pending=new Map;cache=new Map;loadMs=0;meta;constructor(e,t){this.meta=e,this.worker=t,this.ac=Float64Array.from(e.schedule.alphasCumprod),this.table=e.embeddings.map(e=>Float32Array.from(e)),this.nullCond=this.table[this.table.length-1],t.onmessage=e=>{let t=e.data;if(t.type===`eps`||t.type===`error`){let e=this.pending.get(t.id);if(!e)return;this.pending.delete(t.id),t.type===`eps`?e.resolve(t.eps):e.reject(Error(t.message))}}}static async create(t,n){let r=new Worker(new URL(new URL(`worker-DfKwqDlo.js`,import.meta.url).href,``+import.meta.url),{type:`module`}),i=new Promise((e,t)=>{r.onmessage=n=>{n.data.type===`ready`?e(n.data.ms):n.data.type===`error`&&t(Error(n.data.message))},r.onerror=e=>t(Error(e.message||`沙画师傅没能启动`))});r.postMessage({type:`init`,modelUrl:n});try{let n=await i,a=new e(t,r);return a.loadMs=n,await a.warmUp(),a}catch(e){throw r.terminate(),e}}async warmUp(){let e=new Float32Array(2048),t=new Float32Array(2*this.meta.condDim);for(let n=0;n<8;n++)await this.eps(e,Float32Array.of(500,500),t,2)}get classes(){return this.meta.classes}get T(){return this.ac.length}eps=(e,t,n,r)=>new Promise((i,a)=>{let o=++this.seq;this.pending.set(o,{resolve:i,reject:a});let s=Float32Array.from(e),c=Float32Array.from(t),l=Float32Array.from(n);this.worker.postMessage({type:`eps`,id:o,x:s,t:c,cond:l,batch:r,condDim:this.meta.condDim},[s.buffer,c.buffer,l.buffer])});condFor(e){return e<0?this.nullCond:this.table[e]}condForRecipe(e){let t=l(e);return t.cls<0?this.nullCond:t.mix?ne([{vec:this.table[t.cls],weight:1-t.mix.ratio},{vec:this.table[t.mix.cls],weight:t.mix.ratio}]):this.table[t.cls]}async generate(e,t={}){let n=l(e),r=u(n,this.classes),i=performance.now();if(t.useCache!==!1&&!t.onFrame&&this.cache.has(r))return{image:this.cache.get(r),frames:[],ms:0};let a=await ee(this.eps,{seed:n.seed,steps:n.steps,w:n.cls<0?0:n.w,cond:this.condForRecipe(n),nullCond:this.nullCond,ac:this.ac,onFrame:t.onFrame,shouldStop:t.shouldStop});return this.cache.set(r,a.image),{...a,ms:performance.now()-i}}async restore(e,t,n=20,r,i){let a=performance.now();return{...await ee(this.eps,{seed:1,steps:n,w:0,cond:this.nullCond,nullCond:this.nullCond,ac:this.ac,start:{x:e,t},onFrame:r,shouldStop:i}),ms:performance.now()-a}}async look(e,t,n=-1,r=0){let i=await k(this.eps,e,t,this.condFor(n),this.nullCond,n<0?0:r);return{eps:i,x0:te(e,i,this.ac[t])}}};async function ue(e){let t=await fetch(e);if(!t.ok)throw Error(`没能读到模型说明（${t.status}）`);return t.json()}var de=`nova-tides-course-v1`,fe=`nova-tides-course-guesses`;function pe(){return{version:1,current:1,done:[],drawing:null,drawingFrom:null,tideSeed:2026,album:[],program:[],evidence:{}}}function me(e){if(!e)return{state:pe()};try{let t=JSON.parse(e),n=e=>!!e&&typeof e==`object`&&!Array.isArray(e),r=(e,t,n)=>typeof e==`number`&&Number.isInteger(e)&&e>=t&&e<=n,i=e=>typeof e==`string`&&ge(e).length===1024,a=e=>typeof e==`number`&&Number.isFinite(e),o=c,s=(e,s)=>{if(!n(e))return!1;let c={pages:`number`,seeds:`number`,tried:`number`,pair:`number`,solved:`number`,tries:`number`,labeled:`string`,picks:`string`,viewed:`string`};for(let[l,u]of Object.entries(e)){if(c[l]&&(!Array.isArray(u)||u.some(e=>typeof e!==c[l]||typeof e==`number`&&(!Number.isSafeInteger(e)||e<0)))||[`guess`,`seen`,`pick`,`mine`,`master`,`before`,`page`,`i`,`seed`,`cls`,`error`,`observation`].includes(l)&&!a(u)||[`logged`,`brushed`,`same`,`compared`,`reproduced`,`swept`,`a`,`b`,`checked`,`credited`,`sourceReviewed`,`watched`,`locked`,`explained`,`scrubbed`,`mixed`].includes(l)&&typeof u!=`boolean`||[`code`,`reason`,`checkedWork`,`showProgram`,`watchedProgram`].includes(l)&&typeof u!=`string`||[`manualImage`,`modelImage`,`sourceImage`,`draftSource`,`manualDraft`].includes(l)&&!i(u))return!1;let e={index:[0,5],frame:[0,49],frameIndex:[0,49],k:[0,1e3],max:[0,1e3],cell:[-1,1023],observation:[0,2]};if(e[l]&&!r(u,...e[l])||l===`timings`&&(!Array.isArray(u)||u.some(e=>!n(e)||!r(e.steps,1,50)||!r(e.seed,1,9999)||!a(e.ms)||Number(e.ms)<0))||l===`fileInfo`&&(!n(u)||Object.values(u).some(e=>typeof e!=`string`))||l===`experiments`&&!y(u,t.album,s)||[`rejectedWork`,`rejectionReason`].includes(l)&&typeof u!=`string`||l===`attempts`&&(!Array.isArray(u)||u.some(e=>!n(e)||!r(e.target,0,2)||!o(e.recipe)||!a(e.similarity)||typeof e.same!=`boolean`||!i(e.preview)))||l===`answered`&&(!n(u)||Object.values(u).some(e=>typeof e!=`string`))||l===`scores`&&(!n(u)||Object.values(u).some(e=>!n(e)||typeof e.mine!=`number`||typeof e.master!=`number`||!Number.isFinite(e.mine)||!Number.isFinite(e.master))))return!1}return!(e.pair!==void 0&&(!e.pair.length||e.pair.length!==2||e.pair.some(e=>!r(e,0,11)))||e.tried!==void 0&&e.tried.some(e=>!r(e,0,11))||e.cls!==void 0&&!r(e.cls,-1,11)||e.rejectedWork!==void 0&&!t.album.some(t=>t.id===e.rejectedWork))};if(!n(t)||t.version!==1||!r(t.current,1,25)||!Array.isArray(t.done)||t.done.some((e,t)=>e!==t+1)||t.done.length>25||t.verified!==void 0&&(!Array.isArray(t.verified)||new Set(t.verified).size!==t.verified.length||t.verified.some(e=>!r(e,1,25)||t.done.includes(e)))||t.workspace!==void 0&&(!n(t.workspace)||!o(t.workspace.recipe)||!r(t.workspace.tide,0,1e3)||[t.workspace.muted,t.workspace.introSeen].some(e=>e!==void 0&&typeof e!=`boolean`))||!r(t.tideSeed,1,9999)||![null,`hand`,`booth`].includes(t.drawingFrom)||t.drawing!==null&&(typeof t.drawing!=`string`||ge(t.drawing).length!==1024)||!Array.isArray(t.album)||!t.album.every(e=>n(e)&&typeof e.id==`string`&&e.id.length>0&&o(e.recipe)&&r(e.step,1,25)&&Number.isFinite(e.created)&&(e.title===void 0||typeof e.title==`string`)&&(e.preview===void 0||typeof e.preview==`string`&&ge(e.preview).length===1024)&&(e.generation===void 0||n(e.generation)&&typeof e.generation.model==`string`&&!!e.generation.model&&a(e.generation.ms)&&e.generation.ms>=0&&a(e.generation.computedAt)&&e.generation.computedAt>=0))||new Set(t.album.map(e=>e.id)).size!==t.album.length||!Array.isArray(t.program)||t.program.length>6||new Set(t.program).size!==t.program.length||!t.program.every(e=>t.album.some(t=>t.id===e))||t.evidence!==void 0&&(!n(t.evidence)||Object.entries(t.evidence).some(([e,t])=>!r(Number(e),1,25)||!s(t,Number(e))))||t.reflections!==void 0&&(!n(t.reflections)||Object.values(t.reflections).some(e=>typeof e!=`string`))||[t.welcomed,t.reducedMotion,t.largeText].some(e=>e!==void 0&&typeof e!=`boolean`)||t.programTitle!==void 0&&(typeof t.programTitle!=`string`||t.programTitle.length>60)||t.creditText!==void 0&&(typeof t.creditText!=`string`||t.creditText.length>500))throw Error(`格式不对`);let l={...pe()};for(let e of[`current`,`done`,`verified`,`workspace`,`drawing`,`drawingFrom`,`tideSeed`,`album`,`program`,`evidence`,`reflections`,`welcomed`,`reducedMotion`,`largeText`,`programTitle`,`creditText`])t[e]!==void 0&&Object.assign(l,{[e]:t[e]});return{state:l}}catch{return{state:pe(),rejectedRaw:e,warning:`上次的进度没能读出来，原记录已保留。这次可以临时体验；请在设置中先导出原记录，再选择保存新进度。`}}}function he(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t)}function ge(e){let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e++)n[e]=t.charCodeAt(e);return n}function _e(){return Math.random().toString(36).slice(2,10)}var ve=`nova-tides-device-v1`;function ye(e,t){if(e===`nova-tides-course-v1`)return!me(t).warning;if(e!==`nova-tides-course-guesses`)return!1;try{let e=JSON.parse(t);return Array.isArray(e)&&e.every(e=>e&&typeof e==`object`&&Number.isFinite(e.guess)&&Number.isFinite(e.seen))}catch{return!1}}async function be(e=window){let t=await e.NovaPlatformReady;return t?(await t.ready,new Se(await t.openChapter({chapter:8,keys:[de,fe],validate:ye}))):new Se}function xe(e){let t={...e};return delete t.largeText,delete t.reducedMotion,t.workspace&&(t.workspace={...t.workspace},delete t.workspace.muted),JSON.stringify(t)}var Se=class{rejectedRaw;constructor(e,t){this.storage=e,this.deviceStorage=t}storage;deviceStorage;port(){return this.storage??globalThis.localStorage}read(){let e=null;try{e=this.port().getItem(de)}catch{}let t=me(e);return this.rejectedRaw=t.rejectedRaw,t}write(e){return this.rejectedRaw===void 0&&(this.port().setItem(de,xe(e)),!0)}preferences(){try{let e=(this.deviceStorage??globalThis.localStorage).getItem(ve),t=e?JSON.parse(e):{};return{muted:t.muted===!0,reducedMotion:t.reducedMotion===!0}}catch{return{muted:!1,reducedMotion:!1}}}savePreferences(e){(this.deviceStorage??globalThis.localStorage).setItem(ve,JSON.stringify(e))}artifact(e){this.storage?.saveArtifact?.(e)}accept(e){let t=me(e);if(t.warning)throw Error(t.warning);return this.rejectedRaw=void 0,t.state}reset(){this.rejectedRaw=void 0}};function A(e){return String(e).replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function j(e,t={},...n){let[r,...i]=e.split(`.`),a=document.createElement(r);i.length&&(a.className=i.join(` `));for(let[e,n]of Object.entries(t))n!==void 0&&n!==!1&&(typeof n==`function`?a[e]=n:e===`class`?a.className+=(a.className?` `:``)+n:e===`html`?a.innerHTML=String(n):n===!0?a.setAttribute(e,``):a.setAttribute(e,String(n)));for(let e of n)e!=null&&e!==!1&&a.append(e);return a}function M(e,t=120,n=4){let r=[],i=[],a=0;for(let o of Array.from(e))(i.length>=t||a>=n)&&(r.push(i.join(``)),i=[],a=0),i.push(o),o===`
`&&a++;return(i.length||!r.length)&&r.push(i.join(``)),r}var Ce=()=>new Promise(e=>{let t=!1,n=()=>{t||(t=!0,e())};requestAnimationFrame(n),setTimeout(n,50)}),N={dawn:{sand:[236,210,172],groove:[150,112,86],light:[.65,-.45],warm:.08},morning:{sand:[240,219,178],groove:[158,122,82],light:[.6,-.6],warm:.02},afternoon:{sand:[238,206,152],groove:[150,110,66],light:[.55,-.7],warm:.05},dusk:{sand:[226,180,132],groove:[128,84,62],light:[.8,-.35],warm:.12},night:{sand:[40,52,82],groove:[16,22,40],light:[.2,-.9],warm:0}},we=new Map;function P(e){let t=we.get(e);if(t)return t;t=new Float32Array(e*e);let n=795581981;for(let e=0;e<t.length;e++)n^=n<<13,n^=n>>>17,n^=n<<5,t[e]=(n>>>0)/4294967296*2-1;return we.set(e,t),t}var F=new Map;function Te(e){let t=F.get(e);if(t)return t;let n=new Int32Array(e*4),r=new Float32Array(e*4);for(let t=0;t<e;t++){let i=(t+.5)*32/e-.5,a=Math.floor(i),o=i-a,s=1-o,c=[s*s*s/6,(3*o*o*o-6*o*o+4)/6,(-3*o*o*o+3*o*o+3*o+1)/6,o*o*o/6];for(let e=0;e<4;e++)n[t*4+e]=Math.min(31,Math.max(0,a-1+e)),r[t*4+e]=c[e]}return t={idx:n,w:r},F.set(e,t),t}function Ee(e,t){let{idx:n,w:r}=Te(t),i=new Float32Array(32*t);for(let a=0;a<32;a++)for(let o=0;o<t;o++){let s=0;for(let t=0;t<4;t++)s+=r[o*4+t]*e[a*32+n[o*4+t]];i[a*t+o]=s}let a=new Float32Array(t*t);for(let e=0;e<t;e++)for(let o=0;o<t;o++){let s=0;for(let a=0;a<4;a++)s+=r[e*4+a]*i[n[e*4+a]*t+o];a[e*t+o]=s}return a}function De(e,t,n={}){let r=e.width,i=e.getContext(`2d`),a=i.createImageData(r,r),o=a.data,s=n.mode??`sand`;if(s===`sand-cells`){let e=P(r),s=N[n.palette??`morning`];for(let n=0;n<r;n++)for(let i=0;i<r;i++){let a=t[Math.floor(n*32/r)*32+Math.floor(i*32/r)],c=Math.max(0,Math.min(1,(a+1)/2)),l=n*r+i,u=l*4,d=1+e[l]*.07;for(let e=0;e<3;e++)o[u+e]=(s.sand[e]*(1-c)+[103,88,66][e]*c)*d;o[u+3]=255}i.putImageData(a,0,0),n.grid&&Oe(i,r);return}if(s===`pixels`){for(let e=0;e<r;e++)for(let n=0;n<r;n++){let i=t[Math.floor(e*32/r)*32+Math.floor(n*32/r)],a=Math.max(0,Math.min(255,Math.round((i+1)*127.5))),s=(e*r+n)*4;o[s]=o[s+1]=o[s+2]=255-a,o[s+3]=255}i.putImageData(a,0,0),n.grid&&Oe(i,r);return}let c=N[n.palette??`morning`],l=Ee(t,r),u=P(r),[d,f]=c.light,p=.55,m=Math.hypot(d,f,p),h=r/32;for(let e=0;e<r;e++)for(let t=0;t<r;t++){let n=e*r+t,i=Math.max(-3,Math.min(3,l[n])),a=l[e*r+Math.max(0,t-1)],g=l[e*r+Math.min(r-1,t+1)],_=l[Math.max(0,e-1)*r+t],v=l[Math.min(r-1,e+1)*r+t],y=-(g-a)*.5*h*.9,b=-(v-_)*.5*h*.9,x=Math.max(.15,(-y*d-b*f+p)/(Math.hypot(y,b,1)*m)),S=Math.max(0,Math.min(1,(i+1)/2)),C=u[n],w=n*4;if(s===`glow`){let e=S**1.6;o[w]=Math.min(255,c.sand[0]*x+210*e+C*6),o[w+1]=Math.min(255,c.sand[1]*x+228*e+C*6),o[w+2]=Math.min(255,c.sand[2]*x+255*e+C*8)}else{let e=1+C*.07+(C>.93?.18:0);for(let t=0;t<3;t++){let n=c.sand[t]*(1-S*.78)+c.groove[t]*S*.78,r=t===0?1+c.warm:t===2?1-c.warm:1;o[w+t]=Math.max(0,Math.min(255,n*(.62+.48*x)*e*r))}}o[w+3]=255}i.putImageData(a,0,0),n.grid&&Oe(i,r)}function Oe(e,t){e.save(),e.strokeStyle=`rgba(60, 40, 20, 0.28)`,e.lineWidth=1,e.beginPath();for(let n=1;n<32;n++){let r=Math.round(n*t/32)+.5;e.moveTo(r,0),e.lineTo(r,t),e.moveTo(0,r),e.lineTo(t,r)}e.stroke(),e.restore()}function I(e,t,n=`secondary`,r=!1){let i=j(`button`,{type:`button`,class:`button ${n}`,disabled:r},e);return i.addEventListener(`click`,()=>{Promise.resolve().then(t).catch(e=>document.dispatchEvent(new CustomEvent(`tides:error`,{detail:e})))}),i}function ke(...e){return j(`div.row`,{},...e)}function L(...e){return j(`div.column`,{},...e)}function R(e,t=`copy`){return j(`p`,{class:t},e)}function z(e,t=``){return j(`div`,{class:`note ${t}`},e)}function B(e){return j(`span.tag`,{},e)}function Ae(e,t,n,r={}){let i=r.multiline?j(`textarea`,{rows:3}):j(`input`,{type:r.type??`text`});return i.value=t,i.setAttribute(`aria-label`,e),i.setAttribute(`maxlength`,String(r.max??240)),r.placeholder&&i.setAttribute(`placeholder`,r.placeholder),i.addEventListener(`input`,()=>n(i.value)),j(`label.field`,{},j(`span`,{},e),i)}function je(e,t,n,r=!1){return j(`div`,{class:`choices${r?` inline`:``}`,role:`group`},...e.map((e,r)=>{let i=I(e,()=>n(r),`choice${t===r?` selected`:``}`);return i.setAttribute(`aria-pressed`,String(t===r)),i}))}function Me(e,t,n,r,i,a,o=e=>String(e)){let s=j(`output`,{},o(t)),c=j(`input`,{type:`range`,min:n,max:r,step:i,value:t,"aria-label":e});return c.style.setProperty(`--fill`,`${(t-n)/(r-n)*100}%`),c.addEventListener(`input`,()=>{let e=Number(c.value);s.textContent=o(e),c.style.setProperty(`--fill`,`${(e-n)/(r-n)*100}%`),a(e)}),{el:j(`label.range`,{},j(`span.range-heading`,{},j(`span`,{},e),s),c),input:c,out:s}}function Ne(e,t=`morning`,n=`sand`,r=384,i=`实验图像`){let a=j(`canvas.experiment-canvas`,{width:r,height:r,role:`img`,"aria-label":i});return De(a,e,{palette:t,mode:n}),a}function V(e,t,n={}){let r=j(`figure`,{class:`picture${n.selected?` selected`:``}`}),i=j(`div.picture-media`);if(e?i.append(Ne(e,n.palette,n.mode,n.size??320,t)):i.append(j(`div.image-empty`,{},j(`span`,{},`⌁`),R(n.empty??`等你动手揭晓`,`small`))),n.action){let e=I(``,n.action,`picture-action`);e.setAttribute(`aria-label`,t),n.selected!==void 0&&e.setAttribute(`aria-pressed`,String(n.selected)),e.append(i),r.append(e)}else r.append(i);return r.append(j(`figcaption`,{},t,n.subtitle?j(`small`,{},n.subtitle):null)),r}function Pe(e,t=e.length){let n=Math.max(1,t);return j(`div.figure-grid`,{style:`--columns:${n};--rows:${Math.max(1,Math.ceil(e.length/n))}`,"data-count":e.length},...e)}function Fe(e){if(e===`shell`)return j(`span.icon.shell-prop`,{"aria-hidden":`true`},j(`img`,{src:new URL(new URL(`shell-BueQ5Fmk.webp`,import.meta.url).href,``+import.meta.url).href,alt:``}));let t={view:`<path d="M10 8h4v12H4L7 8h3ZM24 8h-4v12h10L27 8h-3ZM14 12h6M10 8V4M24 8V4"/><circle cx="9" cy="23" r="6"/><circle cx="25" cy="23" r="6"/>`,art:`<rect x="4" y="5" width="26" height="25" rx="3"/><path d="m8 25 7-10 6 7 4-5 3 8"/><circle cx="24" cy="12" r="2"/>`,settings:`<path d="m13 3 8 0 1 5 4 2 4-1 3 7-4 3-1 4 2 4-7 4-3-4h-4l-3 3-7-4 2-4-1-4-4-3 3-7 4 1 4-2Z"/><circle cx="17" cy="17" r="5"/>`,wave:`<path d="M2 16c5 0 5-9 10-9s5 12 10 12 5-9 10-9M2 23c5 0 5-9 10-9s5 12 10 12"/>`,beach:`<path d="M16 27 4 13Q1 3 10 5l6 18 6-18q9-2 6 8L16 27ZM16 23V4M16 23 7 8M16 23 25 8"/>`,workshop:`<path d="M4 28V6q6-3 12 1 6-4 12-1v22q-6-3-12 1-6-4-12-1ZM16 7v22"/>`,market:`<path d="m3 14 13-11 13 11M6 12v16h20V12M12 28V18h8v10"/>`,stall:`<path d="M12 3h8M14 3v11L5 27q-1 2 2 2h18q3 0 2-2l-9-13V3M11 21h11"/>`,night:`<path d="M25 23A13 13 0 0 1 9 4a13 13 0 1 0 16 19Z"/>`,map:`<path d="m3 7 8-3 10 4 8-3v23l-8 3-10-4-8 3V7ZM11 4v23M21 8v23"/>`,book:`<path d="M6 4h21v26H6q-4-2 0-5h21M6 4q-4 0-4 4v20M9 10h13M9 15h13"/>`,shell:`<path d="M16 29 4 15C-2 1 32 1 28 15L16 29ZM16 28V6M16 28 8 8M16 28 24 8"/>`},n=j(`span.icon`,{"aria-hidden":`true`});return n.innerHTML=`<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t[e]??t.book}</svg>`,n}function Ie(e,t){let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=t,r.click(),setTimeout(()=>URL.revokeObjectURL(n),2e3)}function Le(e,t){let n=e.length,r=0,i=0;for(let a=0;a<n;a++)r+=e[a],i+=t[a];r/=n,i/=n;let a=0,o=0,s=0;for(let c=0;c<n;c++){let n=e[c]-r,l=t[c]-i;a+=n*l,o+=n*n,s+=l*l}return o<1e-12||s<1e-12?0:a/Math.sqrt(o*s)}function Re(e,t){return Math.round(Math.max(0,Le(e,t))*100)}function ze(e){let t=new Float32Array(w);for(let n=0;n<32;n++)for(let r=0;r<32;r++){let i=0,a=0;for(let t=-1;t<=1;t++)for(let o=-1;o<=1;o++){let s=n+t,c=r+o;s<0||s>=32||c<0||c>=32||(i+=e[s*32+c],a++)}t[n*32+r]=i/a}return t}function Be(e,t){let n=0;for(let r=0;r<e.length;r++){let i=e[r]-t[r];n+=i*i}return n/e.length}function Ve(e,t,n=1){let r=ze(e),i=t.map((e,t)=>({index:t,distance:Be(r,e)}));return i.sort((e,t)=>e.distance-t.distance),i.slice(0,n).map(e=>({...e,similarity:Math.round(Math.max(0,Le(r,t[e.index]))*100)}))}function He(e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;n++)if(e[n]!==t[n])return!1;return!0}function Ue(e,t,n,r){return{sourceImage:he(re(e)),manualImage:he(re(t)),modelImage:he(re(n)),mine:Re(t,e),master:Re(n,e),modelVersion:r,computedAt:Date.now()}}var We=256;function Ge(e,t=1){let n=new Uint8Array(w);for(let r=0;r<32;r++)for(let i=0;i<32;i++){let a=0;for(let n=0;n<8;n++){let o=(r*8+n)*We;for(let n=0;n<8;n++)a+=e[(o+i*8+n)*t]}n[r*32+i]=Math.round(a/64)}return n}function Ke(e,t=!1){let n=document.createElement(`canvas`);n.width=n.height=We;let r=n.getContext(`2d`,{willReadFrequently:!0});r.fillStyle=`#000`,r.fillRect(0,0,We,We),r.strokeStyle=r.fillStyle=`#fff`,r.lineWidth=14,r.lineCap=`round`,r.lineJoin=`round`;let i=t?qe(e):e=>[e[0]*We,e[1]*We];for(let t of e){if(!t.length)continue;let e=t.map(i);if(e.length===1)r.beginPath(),r.arc(e[0][0],e[0][1],7,0,Math.PI*2),r.fill();else{r.beginPath(),r.moveTo(e[0][0],e[0][1]);for(let t of e.slice(1))r.lineTo(t[0],t[1]);r.stroke()}}return ie(Ge(r.getImageData(0,0,We,We).data,4))}function qe(e){let t=e.flat(),n=t.map(e=>e[0]),r=t.map(e=>e[1]),i=Math.min(...n),a=Math.max(...n),o=Math.min(...r),s=Math.max(...r),c=Math.max(a-i,s-o,.001),l=(We-32-14)/c,u=(We-(a-i)*l)/2-i*l,d=(We-(s-o)*l)/2-o*l;return e=>[e[0]*l+u,e[1]*l+d]}function Je(e){let[[t,n],[r,i],[a,o],[s,c]]=e,l=r-a,u=s-a,d=i-o,f=c-o,p=t-r+a-s,m=n-i+o-c,h=l*f-u*d;if(Math.abs(h)<1e-8)return null;let g=(p*f-u*m)/h,_=(l*m-p*d)/h;return{a:r-t+g*r,b:s-t+_*s,c:t,d:i-n+g*i,e:c-n+_*c,f:n,g,h:_}}function Ye(e,t,n){let r=Je(e);return r?`matrix3d(${r.a/t},${r.d/t},0,${r.g/t},${r.b/n},${r.e/n},0,${r.h/n},0,0,1,0,${r.c},${r.f},0,1)`:null}function Xe(e,t){let n=Je(e);if(!n)return null;let{a:r,b:i,c:a,d:o,e:s,f:c,g:l,h:u}=n,[d,f]=t,p=r-d*l,m=i-d*u,h=o-f*l,g=s-f*u,_=p*g-m*h;return Math.abs(_)<1e-8?null:[((d-a)*g-m*(f-c))/_,(p*(f-c)-(d-a)*h)/_]}var Ze=class{el;canvas;label;image=new Float32Array(w).fill(-1);palette=`dawn`;mode=`sand`;grid=!0;tool=`view`;strokes=[];brush=`smooth`;radius=1.8;onChange=null;drawing=!1;last=null;frame=0;corners=[`tl`,`tr`,`br`,`bl`].map(e=>j(`span`,{class:`tray-corner `+e,"aria-hidden":`true`}));constructor(){this.canvas=j(`canvas.tray-canvas`,{width:512,height:512,"aria-label":`沙盘`}),this.label=j(`div.tray-label`),this.el=j(`div.tray`,{},j(`div.tray-frame`,{},this.canvas,...this.corners,j(`span.tray-depth`,{"aria-hidden":`true`}),j(`span.tray-mark`,{"aria-hidden":`true`},`32 × 32 模型画布 · 灰度`)),this.label),this.canvas.addEventListener(`pointerdown`,e=>this.down(e)),this.canvas.addEventListener(`pointermove`,e=>this.move(e)),this.canvas.addEventListener(`pointermove`,e=>{let t=this.pointAt(e.clientX,e.clientY);this.canvas.dispatchEvent(new CustomEvent(`sand:cursor`,{detail:t&&this.tool!==`view`?{point:t,radius:this.radius,brush:this.brush}:null}))}),this.canvas.addEventListener(`pointerleave`,()=>this.canvas.dispatchEvent(new CustomEvent(`sand:cursor`,{detail:null})));for(let e of[`pointerup`,`pointercancel`,`pointerleave`])this.canvas.addEventListener(e,()=>this.up())}get value(){return this.image}setPalette(e){this.palette=e,this.render()}setMode(e){this.mode=e,this.canvas.dataset.sandMode=e,this.render()}setGrid(e){this.grid=e,this.render()}setLabel(e){this.label.textContent=e,this.label.hidden=!e}show(e){this.image=Float32Array.from(e),this.render()}startDrawing(e,t){this.tool=`draw`,this.strokes=e.map(e=>e.slice()),this.onChange=e=>t(e,this.strokes),this.canvas.classList.add(`can-draw`),this.image=Ke(this.strokes),this.render()}undoStroke(){this.strokes.pop(),this.redrawStrokes()}clearStrokes(){this.strokes=[],this.redrawStrokes()}startBrushing(e){this.tool=`brush`,this.onChange=e,this.canvas.classList.add(`can-brush`)}setBrush(e,t){this.brush=e,t&&(this.radius=t)}stopTools(){this.tool=`view`,this.onChange=null,this.canvas.classList.remove(`can-draw`,`can-brush`)}pointAt(e,t){let n=Xe(this.corners.map(e=>{let t=e.getBoundingClientRect();return[t.x,t.y]}),[e,t]);return n?[Math.max(0,Math.min(1,n[0])),Math.max(0,Math.min(1,n[1]))]:null}down(e){if(this.tool===`view`)return;let t=this.pointAt(e.clientX,e.clientY);t&&(e.preventDefault(),this.canvas.setPointerCapture(e.pointerId),this.drawing=!0,this.last=t,this.tool===`draw`?(this.strokes.push([t]),this.redrawStrokes()):this.paint(t))}move(e){if(!this.drawing)return;let t=this.pointAt(e.clientX,e.clientY);if(t){if(this.tool===`draw`){let e=this.strokes[this.strokes.length-1],n=e[e.length-1];if(Math.hypot(t[0]-n[0],t[1]-n[1])<.006)return;e.push(t),this.scheduleStrokes()}else{let e=this.last,n=Math.hypot(t[0]-e[0],t[1]-e[1])*32,r=Math.max(1,Math.ceil(n/.5));for(let n=1;n<=r;n++)this.paint([e[0]+(t[0]-e[0])*n/r,e[1]+(t[1]-e[1])*n/r])}this.last=t}}up(){this.drawing&&(this.drawing=!1,this.tool===`draw`&&this.redrawStrokes())}scheduleStrokes(){this.frame||=requestAnimationFrame(()=>{this.frame=0,this.redrawStrokes()})}redrawStrokes(){this.image=Ke(this.strokes),this.render(),this.onChange?.(this.image)}paint(e){let t=e[0]*32-.5,n=e[1]*32-.5,r=this.radius,i=this.image,a=this.brush===`smooth`?Float32Array.from(i):i;for(let e=Math.max(0,Math.floor(n-r));e<=Math.min(31,Math.ceil(n+r));e++)for(let o=Math.max(0,Math.floor(t-r));o<=Math.min(31,Math.ceil(t+r));o++){let s=Math.hypot(o-t,e-n);if(s>r)continue;let c=(1-s/r)**1.5,l=e*32+o;if(this.brush===`groove`)i[l]+=c*.35*(1-i[l]);else if(this.brush===`flatten`)i[l]+=c*.35*(-1-i[l]);else{let t=0,n=0;for(let r=-1;r<=1;r++)for(let i=-1;i<=1;i++){let s=e+r,c=o+i;s<0||s>=32||c<0||c>=32||(t+=a[s*32+c],n++)}i[l]+=c*.5*(t/n-i[l])}}this.render(),this.onChange?.(i)}render(){De(this.canvas,this.image,{palette:this.palette,mode:this.mode===`glow`?`glow`:`sand-cells`,grid:this.grid}),this.canvas.dispatchEvent(new Event(`sand:render`))}},Qe=[23,101,427,851,1024,1736],$e=[{seed:23,steps:20,w:3,cls:0},{seed:101,steps:20,w:1,cls:6},{seed:777,steps:20,w:6,cls:2}],et=(e,t=20)=>({seed:e,steps:t,w:0,cls:-1}),tt=e=>he(re(e)),nt=e=>{if(typeof e!=`string`)return null;try{let t=ge(e);return t.length===1024?ie(t):null}catch{return null}},rt=(e,t,n,r=e.state.tideSeed)=>E(t,n-1,e.meta.schedule.alphasCumprod,C(r,1024)),it=(e,t)=>{let n=e.meta.schedule.alphasCumprod.findIndex(e=>Math.sqrt(e)<=t);return n<0?999:n};function at(e){let t=e.drawing;if(t)return t;let n=new Ze;return n.setLabel(`先留下属于你的原画`),e.mount(n.el,L(j(`h2`,{},`潮水在等你的画`),R(`这项实验使用你自己的32×32原画。可以亲手画，也可以借一幅再改。`),I(`去起笔`,()=>e.go(1),`primary`))),null}function ot(e,t,n,r){let i=e.memory(t,()=>{let e=new Ze,t={tray:e,image:Float32Array.from(n),undo:[],dirty:!1,brush:`groove`,commit:()=>{}};return e.canvas.addEventListener(`pointerdown`,()=>{t.undo.push(Float32Array.from(t.tray.value)),t.undo.length>20&&t.undo.shift()},!0),t});return i.commit=e=>{i.image=Float32Array.from(e),i.dirty=!0,r?.(i.image)},i.tray.setPalette(e.loc.palette),i.tray.show(i.image),i.tray.setBrush(i.brush,1.6),i.tray.startBrushing(i.commit),i}function st(e){return[`groove`,`smooth`,`flatten`].map((t,n)=>{let r=I(``,()=>{e.brush=t,e.tray.setBrush(t,1.6);for(let e of r.parentElement?.querySelectorAll(`.brush-tool`)??[])e.classList.toggle(`selected`,e===r),e.setAttribute(`aria-pressed`,String(e===r))},`brush-tool model-input `+(e.brush===t?`selected`:``));return r.dataset.brush=t,r.append(j(`span`,{},[`画笔`,`沙刷`,`橡皮`][n])),r.setAttribute(`aria-label`,[`画笔`,`沙刷`,`橡皮`][n]),r.setAttribute(`aria-pressed`,String(e.brush===t)),r}).concat([I(`撤销`,()=>{let t=e.undo.pop();t&&(e.tray.show(t),e.commit(t))},`tool-button model-input`)])}function ct(e,t,n,r){return I(`说说我的发现`,()=>e.modal(`依据刚才的操作`,L(R(t,`lead`),je(n,void 0,t=>{t===r?(e.ev().explained=!0,e.save(),e.closeModal(),e.done()):e.toast(`回看眼前的材料与计算，再试一次。`)}),z(`这里检查概念与操作的关系；不会替你评定作品好坏。`))),`secondary`)}function lt(e,t,n,r,i=1200){let a=n,o=e=>M(e);return I((a?`查看 / 修改`:`写下`)+t,()=>{let n=o(a),s=0,c=()=>{let l=Ae(t,n[s],e=>{n[s]=e,a=n.join(``),r(a),e.split(`
`).length>5&&(n=o(a),c())},{multiline:!0,max:Math.min(120,i-n.filter((e,t)=>t!==s).join(``).length),placeholder:`依据自己的操作与结果，留下一句说明。`});e.modal(t,L(l,ke(I(`上一段`,()=>{s--,c()},`secondary`,s===0),R(s+1+` / `+n.length),I(`下一段`,()=>{s++,c()},`secondary`,s===n.length-1),I(`续一段`,()=>{!n.at(-1)?.trim()||a.length>=i||(n.push(``),s=n.length-1,c())},`secondary`)),I(`保存文字，回到活动`,()=>{r(n.join(``)),e.closeModal()},`primary`)),!0)};c()},`secondary`)}function ut(e,t,n){return I(t,()=>{let r=0,i=M(n,200,5),a=i.length,o=()=>e.modal(t,L(R(i[r]),ke(I(`上一页`,()=>{r--,o()},`secondary`,r===0),R(r+1+` / `+a),I(`下一页`,()=>{r++,o()},`secondary`,r===a-1))));o()},`secondary`)}function dt(e,t=[`变化明显`,`变化不明显 / 证据不足`,`不符合我的预测`]){let n=e.ev();return I(`记录这次观察与解释`,()=>{let r=(e.step===9?[n.singleWork,n.multiWork]:(n.timings??[]).slice(-2).map(t=>e.state.album.find(e=>e.recipe.seed===t.seed&&e.recipe.steps===t.steps&&e.recipe.cls===-1)?.id)).map(t=>e.state.album.find(e=>e.id===t)).filter(e=>!!e);e.modal(`依据这次真实结果`,L(r.length?Pe(r.map(e=>V(nt(e.preview),e.recipe.steps+`步 · 起点 `+e.recipe.seed,{size:128})),2):null,je(t,n.observation,t=>{n.observation=t,e.save()},!0),Ae(`我的解释`,String(n.reason??``),t=>{n.reason=t,e.save()},{multiline:!0,max:1200,placeholder:`我在两幅真实结果中看到……`}),I(`保存这次观察`,()=>{e.done()&&e.closeModal()},`primary`)),!0)},`secondary`)}function ft(e,t,n,r,i,a=1){let o=j(`input`,{type:`number`,min:n,max:r,step:a,value:t,"aria-label":e,class:`model-input`});return o.onchange=()=>{let e=Number(o.value);!Number.isFinite(e)||e<n||e>r||a===1&&!Number.isInteger(e)?o.value=String(t):i(e)},j(`label.number-tool`,{},j(`span`,{},e),o)}function pt(e,t,n,r,i=!1){let a=j(`select`,{"aria-label":e,class:i?``:`model-input`,disabled:i},...t.map(e=>j(`option`,{value:e.value},e.label)));return a.value=n,a.onchange=()=>r(a.value),j(`label.select-tool`,{},j(`span`,{},e),a)}function mt(e,t=()=>e.refresh(),n=!1){let r=e.recipe,i=()=>{e.save(),t()},a=L(ft(`贝壳编号`,r.seed,1,9999,e=>{r.seed=e,i()}),pt(`收沙步数`,[2,5,10,20,30,50].map(e=>({value:String(e),label:e+` 步`})),String(r.steps),e=>{r.steps=Number(e),i()}),pt(`条件签`,[{value:`-1`,label:`不抽签 · 自由生成`},...e.meta.classes.map((e,t)=>({value:String(t),label:e.zh}))],String(r.cls),e=>{r.cls=Number(e),r.cls<0?(r.w=0,delete r.mix):r.w===0&&(r.w=3),i()}),ft(`条件力度`,r.w,0,15,e=>{r.w=e,i()},.1));return a.classList.add(`recipe-controls`),n&&r.cls>=0&&a.append(pt(`第二支签`,[{value:``,label:`不混合`},...e.meta.classes.map((e,t)=>({value:String(t),label:e.zh}))],r.mix?String(r.mix.cls):``,e=>{e===``?delete r.mix:r.mix={cls:Number(e),ratio:.5},i()})),a}function ht(e,t){return ke(B(`种子 `+t.seed),B(t.cls<0?`自由生成`:e.meta.classes[t.cls].zh),B(t.steps+` 步`),t.cls>=0?B(`力度 `+t.w):null)}function gt(e,t){t===1?_t(e):t===2||t===3?vt(e,t):t===4?yt(e):bt(e,t)}function _t(e){let t=ot(e,`drawing-editor`,e.drawing??new Float32Array(1024).fill(-1),()=>{e.state.drawingFrom=`hand`});t.tray.setLabel(`32 × 32 · 用画笔留下一幅原稿`);let n=()=>{t.image.some(e=>e>-.7)?(e.state.drawing=tt(t.image),e.state.drawingFrom??=`hand`,e.save(),e.done(1)):e.toast(`先画几笔，或者借一幅再改。`)};t.tray.canvas.onpointerup=()=>{t.dirty&&(e.state.drawing=tt(t.image),e.state.drawingFrom??=`hand`,e.save())};let r=Pe([[0,3],[2,2],[6,5]].map(([n,r])=>V(e.practice.byClass(n)[r].image,e.meta.classes[n].zh,{size:100,mode:`pixels`,action:()=>{t.image=Float32Array.from(e.practice.byClass(n)[r].image),t.tray.show(t.image),t.dirty=!0,e.state.drawingFrom=`booth`,e.state.drawing=tt(t.image),e.save()}})),3),i=I(`格线`,()=>{let e=i.getAttribute(`aria-pressed`)!==`true`;i.setAttribute(`aria-pressed`,String(e)),t.tray.setGrid(e)},`tool-button`);i.setAttribute(`aria-pressed`,`true`);let a=I(`画好后，点木尺试试潮水`,()=>{t.image.some(e=>e>-.7)?(n(),e.go(2)):e.toast(`先画几笔，或借一幅原画。`)},`ruler-next`);a.setAttribute(`aria-label`,`画好后试试潮水`),e.mount(t.tray.el,L(j(`h2`,{},`留下一幅原画`),R(`画几笔，或借一幅再改。`),r,z(`32 × 32 个格子，每格都是一个数。`),I(`保存原画`,n,`primary`)),[...st(t),i,I(`重画`,()=>{t.undo.push(Float32Array.from(t.image)),t.image.fill(-1),t.tray.show(t.image),t.dirty=!0},`tool-button model-input`)],a),un(e,()=>{t.dirty&&t.image.some(e=>e>-.7)&&(e.state.drawing=tt(t.image),e.save()),t.tray.stopTools()})}function vt(e,t){let n=at(e);if(!n)return;let r=e.ev(),i=e.memory(`tide-`+t,()=>({k:Number(r.k??e.workspace.tide),cell:Number(r.cell??-1)})),a=new Ze;a.setMode(`pixels`),a.setGrid(!0),a.show(rt(e,n,i.k)),a.setLabel(`32 × 32 · 点一格，看看它的变化`);let o=j(`div.pixel-values`),s=j(`div.coefficients`),c=V(rt(e,n,i.k),`加入噪声后`,{size:126,mode:`pixels`}),l=t=>{i.cell=t,r.cell=t,a.canvas.dispatchEvent(new CustomEvent(`sand:inspect`,{detail:t})),u(),e.save()},u=()=>{let t=i.k?e.meta.schedule.alphasCumprod[i.k-1]:1;De(c.querySelector(`canvas`),rt(e,n,i.k),{mode:`pixels`}),s.replaceChildren(B(`原图系数 `+Math.sqrt(t).toFixed(3)),B(`扰动系数 `+Math.sqrt(1-t).toFixed(3))),o.replaceChildren(i.cell>=0?R(`第 `+(Math.floor(i.cell/32)+1)+` 行 / `+(i.cell%32+1)+` 列：原值 `+n[i.cell].toFixed(3)+` → `+rt(e,n,i.k)[i.cell].toFixed(3)):R(`点沙盘一格，追踪它的数值。`))};u(),a.canvas.onpointerdown=e=>{if(t===3&&!r.locked)return;let n=a.pointAt(e.clientX,e.clientY);n&&l(Math.min(31,Math.floor(n[1]*32))*32+Math.min(31,Math.floor(n[0]*32)))};let d=Me(`潮水尺`,i.k,0,1e3,10,t=>{i.k=t,r.k=t,r.max=Math.max(Number(r.max??0),t),e.workspace.tide=t,a.show(rt(e,n,t)),u(),e.save()},e=>e+` / 1000`);d.el.classList.add(`tide-ruler`),d.input.disabled=t===3&&!r.locked;let f=Pe([V(n,`原图`,{size:126,mode:`pixels`}),c],2);f.classList.add(`tide-comparison`);let p=I(`看看像素与系数`,()=>e.modal(`一格沙里发生了什么`,L(R(`同一幅原画、同一组噪声；拖动尺子只改变原图与噪声各自的系数。`),s,o,z(`两项系数不是相加为100%的占比。显示色调有边界，实际数值仍可能超过 −1～1。`),I(`观察中间一格`,()=>{l(528)},`primary`)),!1,!0),`secondary`),m=j(`p.cell-caption`,{},i.cell>=0?`已选中一个格子 · 可查看实际数值`:`点沙盘一格，追踪它的变化`);a.canvas.addEventListener(`sand:inspect`,()=>{m.textContent=`第 `+(Math.floor(i.cell/32)+1)+` 行 / `+(i.cell%32+1)+` 列 · 已选中`});let h=L(j(`h2`,{},t===2?`效果预览`:`我在哪一刻认不出了？`),t===2?f:null,t===2?R(`推动潮水尺，
看看画面怎样变化。`,`comparison-caption`):null,m,p);t===3&&!r.locked?h.append(R(`先留下自己的猜测`),je([`前段 · 300`,`中段 · 600`,`后段 · 900`],[300,600,900].indexOf(Number(r.guess??600)),t=>{r.guess=[300,600,900][t],e.save()}),I(`锁定预测，开始观察`,()=>{r.guess??=600,r.locked=!0,e.save(),e.refresh()},`primary`)):(t===3&&h.append(I(`观察中间一格`,()=>l(528),`secondary`)),t===3&&h.append(I(`记下认不出的这一刻`,()=>{r.seen=i.k,e.save(),e.toast(`记录了 `+i.k+`；个人辨认位置没有唯一答案。`)},`primary`)),h.append(ct(e,`画为什么渐渐认不清？`,[`原图信号变弱，随机扰动变强`,`只把颜色整体调暗了`,`模型换了一个预存答案`],0))),e.mount(a.el,h,[I(`查看原稿`,()=>e.modal(`原稿一直保留`,L(V(n,`我的原稿`,{size:280,mode:`pixels`}))),`tool-button`)],d.el),i.cell>=0&&a.canvas.dispatchEvent(new CustomEvent(`sand:inspect`,{detail:i.cell}))}function yt(e){let t=at(e);if(!t)return;let n=e.ev(),r=[t,...[[2,2],[6,5],[5,1]].map(([t,n])=>e.practice.byClass(t)[n].image)],i=r.map((t,n)=>E(t,999,e.meta.schedule.alphasCumprod,C(e.state.tideSeed+101*(n+1),1024))),a=Pe(i.map((t,r)=>V(t,[`乱沙 A`,`乱沙 B`,`乱沙 C`,`乱沙 D`][r],{mode:`pixels`,size:220,selected:n.pick===r,action:()=>{n.pick=r,e.save(),e.refresh()}})),2),o=e=>{let t=Array(12).fill(0);for(let n of e)t[Math.max(0,Math.min(11,Math.floor((n+3)/6*12)))]++;let n=j(`div.histogram`,{"aria-label":`所选乱沙的实际数值分布`});return n.innerHTML=`<svg viewBox="0 0 240 85" role="img">`+t.map((e,t)=>`<rect x="`+(t*20+2)+`" y="`+(80-e/3)+`" width="15" height="`+e/3+`" rx="3" fill="#398886"/>`).join(``)+`</svg>`,n},s=Number(n.pick??0);e.mount(a,L(j(`h2`,{},`哪一片来自我的画？`),R(`选一片再揭开；最后一道潮水几乎不保留原稿信息。`),n.pick===void 0?null:V(r[s],s===0?`这是你的原稿`:`这是另一幅原稿`,{size:120,mode:`pixels`}),o(i[s]),z(`数值分布可以相似，每个格子仍不相同。`),ct(e,`四片乱沙的相同之处是什么？`,[`每个像素都完全一样`,`接近同一种噪声分布，但格子不同`,`藏着同一张原稿`],1)),[])}function bt(e,t){let n=at(e);if(!n)return;let r=e.ev(),i=nt(r.draftSource)??n;r.draftSource??=tt(i);let a=t===5?1e3:it(e,Math.SQRT1_2)+1,o=rt(e,i,a),s=ot(e,`repair-`+t,nt(r.manualDraft)??nt(r.manualImage)??o,()=>{r.brushed=!0});s.tray.setLabel(`先用刷子修，再请模型从同一片乱沙出发`);let c=V(nt(r.modelImage),`模型修复`,{size:160,palette:`morning`,empty:`等师傅出手`}),l=Pe([V(i,`原稿`,{size:110}),V(nt(r.manualImage),`我的手工`,{size:160,empty:`请师傅时存下`}),c],3);l.classList.add(`repair-trio`);let u=()=>e.modal(`同一片乱沙，两次修复`,L(Pe([V(nt(r.sourceImage),`原稿`,{size:240,empty:`旧记录未存`}),V(nt(r.manualImage),`我的手工修复`,{size:240}),V(nt(r.modelImage),`模型修复`,{size:240})],3),r.mine===void 0?null:R(`和原稿的像素比较：我 `+r.mine+`% / 模型 `+r.master+`%`,`reading`),z(r.sourceImage?`三幅都从同一片乱沙出发，随这次计算保存。数字只比较像素有多接近原稿，不代表画得好不好。`:`旧记录没有原稿快照；保留原分数，不补造来源。`)),!0),d=L(j(`h2`,{},t===5?`纯噪声还能找回原画吗？`:`我和模型各试一次`),l,I(`请师傅从同一乱沙尝试`,async()=>{if(!s.dirty&&!r.brushed){e.toast(`先留下你的手工尝试。`);return}let t=Float32Array.from(s.image),n=await e.run(`从相同噪声水平修复……`,()=>e.restore(o,a-1,20,e=>{let t=c.querySelector(`canvas`);t&&De(t,e.x,{palette:`morning`})}));n&&(Object.assign(r,Ue(i,t,n.image,e.meta.version)),e.save(),e.refresh())},`primary model-input`),r.mine===void 0?null:R(`像素接近原稿：我 `+r.mine+`% · 模型 `+r.master+`%
只比像素，不评好坏`,`reading repair-reading`),ct(e,`这次比较支持什么？`,[`模型保证找回原画`,`去噪依靠学到的规律，并不保证恢复同一原画`,`相关度就是作品的审美分数`],1)),f=[...st(s),I(`从当前原稿重试`,()=>{dn(e),r.draftSource=tt(n),r.manualDraft=tt(rt(e,n,a)),r.brushed=!1,e.session.delete(`repair-`+t),e.save(),e.refresh()},`tool-button model-input`)];r.manualImage&&r.modelImage&&f.push(I(`上次对照`,u,`tool-button`)),e.mount(s.tray.el,d,f),un(e,()=>{r.manualDraft=tt(s.image),e.save(),s.tray.stopTools()})}function xt(e,t){t===7?St(e):t===8?Ct(e):t===9?wt(e):Tt(e)}function St(e){let t=e.ev(),n=e.memory(`training`,()=>({page:Number(t.page??0),ready:!1,loading:!1,source:null,input:null,noise:null,guess:null,t:0,error:0})),r=async()=>{if(n.loading)return;n.loading=!0;let r=S(9e3+n.page),i=e.practice.items[Math.floor(r()*e.practice.size)];n.t=Math.floor(r()*1e3),n.source=i.image,n.noise=C(5e3+n.page,1024),n.input=rt(e,i.image,n.t+1,5e3+n.page);let a=await e.run(`比较模型预测与已知噪声……`,async()=>{let t=await e.model();return e.check(),t.look(n.input,n.t)});n.loading=!1,a&&(n.guess=a.eps,n.error=Be(n.noise,a.eps),n.ready=!0,t.error=n.error,t.page=n.page,t.pages=[...new Set([...t.pages??[],n.page])],e.save(),e.refresh())},i=Pe([V(n.input,`模型看到的噪声图`,{size:280,mode:`pixels`}),V(n.noise,`真正加进去的扰动`,{size:280,mode:`pixels`}),V(n.guess,`模型实际预测`,{size:280,mode:`pixels`})],3);e.mount(i,L(j(`p.character`,{},`师傅的练习本`),j(`h2`,{},`答案只在练习时已知`),V(n.source,`这道题的清晰原图`,{size:120,mode:`pixels`}),n.ready?B(`均方误差 `+n.error.toFixed(4)):z(`点击准备一页，检查模型的噪声预测。`),R(`这位师傅已经训练好。误差来自本页真实计算，翻页不会重新训练。`),I(n.ready?`换一道练习`:`准备这一页`,()=>(n.ready&&=(n.page++,!1),r()),`primary model-input`),ct(e,`训练时为什么能检查噪声猜得准不准？`,[`加噪时保留了真实扰动，可与预测比较`,`模型提前见到了每张生成作品`,`翻页就在重新训练参数`],0)),[],ke(B(`练习页 `+(n.page+1)),B(`噪声水平 `+(n.t+1)),I(`看原训练记录`,()=>e.modal(`已训练模型的真实记录`,L(R(e.meta.training.images.toLocaleString()+` 幅涂鸦 · `+e.meta.training.steps.toLocaleString()+` 轮训练`),R(e.meta.training.params.toLocaleString()+` 个参数`),z(`训练以预测与真实扰动的误差调整参数。本页面不执行训练。`))),`secondary`)))}function Ct(e){let t=at(e);if(!t)return;let n=e.ev(),r=it(e,.35),i=[r,...T(10).filter(e=>e<r)],a=e.memory(`denoise-step`,()=>({i:0,x:rt(e,t,r+1),before:null,eps:null,x0:null}));e.mount(Pe([V(a.before??a.x,`更新前的沙面`,{mode:`pixels`,size:280}),V(a.eps,`这一轮预测的扰动`,{mode:`pixels`,size:280}),V(a.i?a.x:null,`依据预测更新后`,{mode:`pixels`,size:280})],3),L(j(`h2`,{},`每一步都重新判断`),R(`改变的是真实输入、噪声预测与下一个沙面。不是把一张答案逐渐调亮。`),B(`已执行 `+a.i+` / `+i.length+` 步`),I(`收一个真实步骤`,async()=>{if(a.i>=i.length)return;let t=await e.run(`执行一个真实预测与更新……`,async()=>{let t=await e.model();e.check();let n=i[a.i],r=Float32Array.from(a.x),o=await t.look(r,n);return e.check(),{before:r,eps:o.eps,...O(r,o.eps,e.meta.schedule.alphasCumprod[n],a.i+1<i.length?e.meta.schedule.alphasCumprod[i[a.i+1]]:1)}});t&&(a.before=t.before,a.eps=t.eps,a.x=t.next,a.x0=t.x0,a.i++,n.i=a.i,e.save(),e.refresh())},`primary model-input`,a.i>=i.length),I(`从同一沙面重试`,()=>{a.i=0,a.x=rt(e,t,r+1),a.before=a.eps=a.x0=null,n.i=0,e.save(),e.refresh()},`secondary model-input`),ct(e,`下一个沙面怎样得到？`,[`每步重新预测扰动，再据此计算更新`,`从预存答案截取一帧`,`把相同扰动无限重复减掉`],0)))}function wt(e){let t=e.ev(),n=e.memory(`one-many`,()=>({one:void 0,many:void 0,seed:e.seed})),r=async r=>{let i=et(n.seed,r),a=await e.run(`从同一起点运行 `+r+` 步……`,()=>e.generate(i,!0));a&&(r===1?n.one=a:n.many=a,t[r===1?`singleWork`:`multiWork`]=e.addWork(i,9).id,e.save(),e.refresh())};e.mount(Pe([V(n.one?.image??null,`同一纯噪声 · 一步`,{size:350}),V(n.many?.image??null,`同一纯噪声 · 20步`,{size:350})],2),L(j(`h2`,{},`把一步与多步放在一起`),B(`固定起点 `+n.seed),R(`比较轮廓，也允许记录多步没有更合适的反例。`),ke(I(`计算一步`,()=>r(1),`primary model-input`),I(`计算20步`,()=>r(20),`primary model-input`)),dt(e),I(`查看早期原图估计`,()=>{let t=n.many;t?.frames.length?e.modal(`计算中的原图估计`,L(V(t.frames[0].x0,`第一步的估计`,{size:220}),z(`它来自本次模型计算，不是藏好的原稿。`))):e.toast(`先完整计算多步结果。`)},`secondary`)))}function Tt(e){let t=at(e);if(!t)return;let n=e.ev(),r=[{key:`light`,label:`轻潮水`,signal:.9},{key:`medium`,label:`中潮水`,signal:Math.SQRT1_2},{key:`heavy`,label:`重潮水`,signal:.3}],i=e.memory(`repair-levels`,()=>({selected:0,results:new Map})),a=r[i.selected],o=it(e,a.signal),s=rt(e,t,o+1),c=ot(e,`repair-level-`+a.key,s);c.tray.setLabel(a.label+` · 先留下自己的修复`);let l=V(i.results.get(a.key)??null,`模型从同一沙面修复`,{size:140}),u=n.scores??={};e.mount(c.tray.el,L(j(`h2`,{},`噪声强弱会改变修复吗？`),ke(...r.map((t,n)=>I(t.label,()=>{i.selected=n,e.refresh()},`secondary model-input `+(n===i.selected?`selected`:``)))),l,I(`比较这次手工与模型`,async()=>{if(!c.dirty){e.toast(`先亲手修几笔，再比较。`);return}let n=Float32Array.from(c.image),r=await e.run(`在 `+a.label+` 下修复……`,()=>e.restore(s,o,20,e=>{let t=l.querySelector(`canvas`);t&&De(t,e.x)}));r&&(i.results.set(a.key,r.image),u[a.key]={mine:Re(n,t),master:Re(r.image,t)},e.save(),e.refresh())},`primary model-input`),...Object.entries(u).map(([e,t])=>R((r.find(t=>t.key===e)?.label??e)+`：我 `+t.mine+`% / 模型 `+t.master+`%`,`reading`)),ct(e,`这些读数能说明什么？`,[`和原画的像素关系；不能代表美或保证找回原稿`,`噪声越强一定越容易还原`,`分数直接决定作品有没有创意`],0)),st(c)),un(e,()=>c.tray.stopTools())}function Et(e,t){t===11?Ot(e):t===12?kt(e):t===13?At(e):t===14?jt(e):Mt(e)}function Dt(e,t,n=!1){let r=I(``,t,`seed-shell model-input `+(n?`selected`:``));return r.append(Fe(`shell`),j(`strong`,{},String(e))),r.setAttribute(`aria-label`,`贝壳 `+e),r.setAttribute(`aria-pressed`,String(n)),r}function Ot(e){let t=e.ev(),n=e.memory(`sampling`,()=>({result:void 0,recipe:void 0,index:0,view:`x`})),r=new Ze;r.setPalette(`afternoon`);let i=n.result?.frames??[],a=i[n.index];r.show(a?.[n.view]??e.cached(e.recipe)?.image??C(e.seed,1024)),r.setLabel(a?(n.view===`x`?`实际沙面`:`模型的原图估计`)+` · 第 `+(n.index+1)+` / `+i.length+` 步`:`贝壳 `+e.seed+` 确定的随机起点`);let o=Me(`回看真实步骤`,n.index,0,Math.max(1,i.length-1),1,a=>{let o=n.result?.frames[a];o&&(n.index=a,t.frameIndex=a,t.scrubbed=!0,r.show(o[n.view]),r.setLabel((n.view===`x`?`实际沙面`:`原图估计`)+` · 第 `+(a+1)+` / `+i.length+` 步`),e.save())},e=>`第 `+(e+1)+` 步`);o.input.disabled=!i.length;let s=async i=>{let a=structuredClone(e.recipe);o.input.disabled=!0;let s=await e.run(`准备本次真实采样……`,()=>e.controlled(a,(e,t,i)=>{r.show(e[n.view]),r.setLabel(`正在现场计算 · `+(t+1)+` / `+i+` 步`)},i));s&&(n.result=s,n.recipe=a,n.index=s.frames.length-1,t.seed=a.seed,t.generatedWork=e.addWork(a,11).id,e.save(),e.refresh())},c=I(n.view===`x`?`看原图估计`:`看实际沙面`,()=>{n.view=n.view===`x`?`x0`:`x`,e.refresh()},`secondary`);e.mount(r.el,L(j(`p.character`,{},`小贝的编号贝壳`),j(`h2`,{},`起点不同，沙画会怎样？`),mt(e),ke(I(`开始采样`,()=>s(!1),`primary model-input`),I(`逐步采样`,()=>s(!0),`secondary model-input`)),n.recipe?z(`当前结果：`+u(n.recipe,e.meta.classes)):R(`选起点和条件，再让同一沙盘一步步显出图像。`),ct(e,`原图估计与当前沙面有什么不同？`,[`估计是本步计算对最终图像的推测`,`估计是模型拿到的原稿答案`,`估计是美术图替换的模型输出`],0)),[...Qe.slice(0,4).map(t=>Dt(t,()=>{e.recipe.seed=t,e.save(),n.result=void 0,e.refresh()},t===e.seed)),c],o.el)}function kt(e){let t=structuredClone(e.recipe),n=e.ev(),r=u(t,e.meta.classes),i=e.memory(`reproduce-`+r,()=>({first:void 0,second:void 0,same:void 0}));e.mount(Pe([V(i.first?.image??e.cached(t)?.image??null,`第一次真实计算`,{size:340}),V(i.second?.image??null,`相同配方重算`,{size:340})],2),L(j(`h2`,{},`配方相同，结果能复现吗？`),ht(e,t),R(`保持同一模型、完整配方、采样方式和计算环境。两次都重新运行，不拿预览互相比较。`),I(`重新完整计算两次`,async()=>{let a=await e.run(`两次重算并逐格核对……`,async()=>{let n=await e.generate(t,!0),r=await e.generate(t,!0);return{first:n,second:r,same:He(n.image,r.image)}});a&&(Object.assign(i,a),n.same=a.same,n.code=r,e.save(),e.refresh())},`primary model-input`),i.same===void 0?z(`这里核对的是浮点结果；跨设备可能有细微差异。`):z(i.same?`本次核对：1,024 个像素全部一致`:`本次存在差异，检查完整配方与环境。`,i.same?`success`:`warning`)))}function At(e){let t=e.ev(),n=e.memory(`neighbors`,()=>({seed:e.seed,results:new Map,neighbor:-1,similarity:0})),r=async r=>{let i=await e.run(`比较这个随机起点……`,()=>e.generate(et(r),!0));i&&(n.seed=r,n.results.set(r,i),n.neighbor=-1,t.seeds=[...new Set([...t.seeds??[],r])],e.addWork(et(r),13),e.save(),e.refresh())},i=n.results.get(n.seed);e.mount(Pe([V(i?.image??null,`种子 `+n.seed+` · 本次生成`,{size:330}),V(n.neighbor>=0?e.practice.items[n.neighbor].image:null,n.neighbor>=0?`1920幅抽样里最相似的一幅`:`抽样近邻`,{size:330,mode:`pixels`})],2),L(j(`h2`,{},`相似，能查明它的来源吗？`),R(`换贝壳只改起点；题目保持自由生成，步数20。`),I(`找这幅的抽样近邻`,()=>{if(!i){e.toast(`先生成一幅真实图像。`);return}let r=Ve(i.image,e.practice.blurred)[0];n.neighbor=r.index,n.similarity=r.similarity,t.compared=!0,e.save(),e.refresh()},`primary`),n.neighbor>=0?B(`像素相关度 `+n.similarity+`%`):null,z(`抽样检索不是整个训练集，也不能证明模型没有记住任何训练图。`),ct(e,`这次抽样近邻可以支持什么判断？`,[`找到抽样里较相似的图，不能排除记忆`,`相似度低就证明绝不记忆`,`模型只是在复制找到的这一张`],0)),Qe.map(e=>Dt(e,()=>r(e),e===n.seed)))}function jt(e){let t=e.ev(),n=e.memory(`timing`,()=>({seed:e.seed,results:new Map,selected:20})),r=async r=>{let i=et(n.seed,r),a=await e.run(`实测 `+r+` 步的采样……`,()=>e.generate(i,!0));a&&(n.results.set(r,a),n.selected=r,e.addWork(i,14),t.timings=[...n.results].map(([e,t])=>({steps:e,seed:n.seed,ms:t.ms})),e.save(),e.refresh())},i=[...n.results],a=Pe([2,5,20,50].map(t=>V(n.results.get(t)?.image??null,t+` 步`+(n.results.has(t)?` · `+(n.results.get(t).ms/1e3).toFixed(2)+`秒`:``),{size:200,selected:n.selected===t,action:()=>{n.selected=t,e.refresh()}})),2);e.mount(a,L(j(`h2`,{},`多算几步，值得吗？`),B(`固定起点 `+n.seed+` · 自由生成`),R(`选择想试的步数，每次只运行一组。用时不含首次模型载入。`),...i.slice(-2).map(([e,t])=>R(e+` 步： `+(t.ms/1e3).toFixed(2)+` 秒`,`reading`)),dt(e,[`轮廓更合适`,`看不出改善 / 证据不足`,`更多步反而不合适`])),[2,5,20,50].map(e=>I(`试 `+e+` 步`,()=>r(e),`tool-button model-input`)))}function Mt(e){let t=e.ev(),n=e.memory(`recipe-card`,()=>({work:e.state.album[0]?.id??``,input:String(t.code??``),result:void 0,original:void 0,same:void 0})),r=e.state.album.find(e=>e.id===n.work);if(!r){e.mount(L(j(`div.empty-object`,{},`还没有完整作品`),I(`去市集采样`,()=>e.go(11),`primary`)),L(j(`h2`,{},`把喜欢的结果留成配方`),R(`生成完成后会收进卡册，配方可以再交给模型完整计算。`)));return}let i=u(r.recipe,e.meta.classes);e.mount(Pe([V(n.original?.image??e.cached(r.recipe)?.image??null,`所选作品 · `+i,{size:330}),V(n.result?.image??null,`输入配方后的实际结果`,{size:330})],2),L(j(`h2`,{},`把配方交回沙画师傅`),Ae(`完整配方码`,n.input,e=>{n.input=e},{max:120,placeholder:i}),I(`填入这张卡的配方`,()=>{n.input=i,e.refresh()},`secondary`),I(`按输入配方重新计算`,async()=>{let i;try{i=f(n.input,e.meta.classes)}catch(t){e.toast(t.message);return}let a=await e.run(`核对所选作品与输入配方……`,async()=>{let t=await e.generate(r.recipe,!0),n=await e.generate(i,!0);return{original:t,result:n,same:He(t.image,n.image)}});a&&(Object.assign(n,a),t.code=u(i,e.meta.classes),t.reproduced=a.same,e.save(),e.refresh())},`primary model-input`),n.same===void 0?z(`完整配方与模型、采样方式一起决定结果。`):z(n.same?`配方核对成功；重新计算的像素全部一致。`:`仍有差异；比较种子、题目、力度和步数。`),I(`换一张卡`,()=>e.album(t=>{n.work=t.id,n.result=n.original=void 0,n.same=void 0,e.refresh()}),`secondary`)))}var Nt=e=>e===17?[`guidance`]:e===19?[`ratio`]:[`seed`,`topic`,`steps`],Pt=e=>e===`guidance`?[0,1,2,4,7,12]:e===`ratio`?[0,.3,.5,.7,1]:e===`seed`?[23,101,427,777,1337,2026]:e===`steps`?[2,5,10,20,30,50]:Array.from({length:12},(e,t)=>t);function Ft(e,t){let n=structuredClone(e.recipe);return n.cls<0&&(n.cls=0,n.w=3),t===19?(n.mix={cls:n.cls===1?0:1,ratio:.5},n.w<=0&&(n.w=3)):delete n.mix,{id:_e(),created:Date.now(),variable:t===17?`guidance`:t===19?`ratio`:null,fixed:n,confirmed:!1,prediction:``,runs:[],conclusion:``}}function It(e,t){let n=e.ev();n.experiments??=[];let r=v(n);r.length||r.push(Ft(e,t));let i=e.memory(`experiment-ui-`+t,()=>({index:r.length-1,phase:+!!r.at(-1)?.confirmed,value:Pt(r.at(-1)?.variable??null)[0],selected:``,page:0}));i.index=Math.min(i.index,r.length-1);let a=r[i.index],o=a.runs.map(t=>e.state.album.find(e=>e.id===t)).filter(Boolean),s=()=>{delete a.submittedAt,e.save()},c=[`定计划`,`真实生成`,`选 A/B`,`记录解释`].map((t,n)=>I(t,()=>{n>0&&!a.confirmed?e.toast(`先明确只改哪个量，保留运行前的预测。`):(i.phase=n,e.refresh())},`tool-button model-input `+(i.phase===n?`selected`:``)));c.push(I(`实验卡册`,()=>e.modal(`同一活动的实验卡`,L(...r.slice(Math.max(0,i.index-2),i.index+3).map(t=>I((t===a?`当前 · `:``)+(t.variable?m[t.variable]:`待计划`)+` · `+(t.submittedAt?`已记录`:`进行中`),()=>{i.index=r.indexOf(t),i.phase=t.confirmed?3:0,e.closeModal(),e.refresh()},`secondary`)),I(`新开实验，保留旧卡`,()=>{r.length>=50?e.toast(`卡册已满，可以先导出。`):(r.push(Ft(e,t)),i.index=r.length-1,i.phase=0,i.page=0,e.save(),e.closeModal(),e.refresh())},`primary`))),`tool-button`));let l,d,f,p=e.state.album.find(e=>e.id===a.a),h=e.state.album.find(e=>e.id===a.b),g=()=>Pe([p,h].map((t,n)=>V(t?nt(t.preview):null,(n?`B`:`A`)+` · `+(t?u(t.recipe,e.meta.classes):`待选择`),{size:320,palette:`dusk`})),2);if(i.phase===0){let n=new Ze;n.show(C(a.fixed.seed,1024)),n.setLabel(`计划使用的起点 · 还没有运行结果`),l=n.el,d=L(j(`h2`,{},t===17?`更强一定更好吗？`:t===19?`混合后会变成什么？`:`你想改变哪一个量？`),t===18?pt(`研究变量`,[{value:``,label:`请选择`},...Nt(t).map(e=>({value:e,label:m[e]}))],a.variable??``,t=>{t===`topic`&&a.fixed.w<=0?(e.toast(`比较题目需要正的引导力度，先核对固定力度。`),e.refresh()):(a.variable=t||null,i.value=Pt(a.variable)[0],s(),e.refresh())},a.confirmed):ke(B(`只改`+m[a.variable]),t===19?B(`固定力度 `+a.fixed.w):null));let r=L(ft(`固定起点`,a.fixed.seed,1,9999,e=>{a.fixed.seed=e,s()}),pt(`固定步数`,[2,5,10,20,30,50].map(e=>({value:String(e),label:e+`步`})),String(a.fixed.steps),e=>{a.fixed.steps=Number(e),s()}),pt(`第一支签`,e.meta.classes.map((e,t)=>({value:String(t),label:e.zh})),String(a.fixed.cls),t=>{a.fixed.mix?.cls===Number(t)?(e.toast(`混合需要两支不同的签。`),e.refresh()):(a.fixed.cls=Number(t),s())}));t===18&&r.append(ft(`固定力度`,a.fixed.w,0,15,t=>{a.variable===`topic`&&t<=0?(e.toast(`题目对照需要正引导，当前计划保留。`),e.refresh()):(a.fixed.w=t,s())},.1)),t===19&&r.append(pt(`第二支签`,e.meta.classes.map((e,t)=>({value:String(t),label:e.zh})),String(a.fixed.mix.cls),t=>{Number(t)===a.fixed.cls?(e.toast(`混合需要两支不同的签。`),e.refresh()):(a.fixed.mix.cls=Number(t),s())})),r.classList.add(`recipe-controls`),a.confirmed?d.append(z(`计划已锁定；新开实验才改变固定条件。`),ut(e,`查看运行前预测`,a.prediction),I(`回到真实生成`,()=>{i.phase=1,e.refresh()},`primary`)):d.append(r,lt(e,`运行前预测`,a.prediction,e=>{a.prediction=e,s()}),I(`锁定计划`,()=>{!a.variable||!a.prediction.trim()?e.toast(`请选择变量并留下预测；不限制解释字数。`):a.fixed.mix&&a.fixed.mix.cls===a.fixed.cls?e.toast(`混合需要两支不同的签。`):(a.confirmed=!0,e.save(),i.phase=1,e.refresh())},`primary`))}else if(i.phase===1){let n=o.at(-1),r=new Ze;r.setPalette(`dusk`),r.show(n?nt(n.preview):C(a.fixed.seed,1024)),r.setLabel(n?u(n.recipe,e.meta.classes):`从这片随机起点出发`),l=r.el;let c=Pt(a.variable),p=a.variable===`guidance`||a.variable===`ratio`,h=a.variable===`ratio`?1:15;(p?!(i.value>=0&&i.value<=h):!c.includes(i.value))&&(i.value=c[0]);let g=t=>a.variable===`topic`?e.meta.classes[t].zh:a.variable===`ratio`?Math.round((1-t)*100)+`∶`+Math.round(t*100):String(t);d=L(j(`h2`,{},`只改变`+m[a.variable]),z(`保持模型、起点与其他配方条件一致。`),R(`基准：`+u(a.fixed,e.meta.classes))),a.variable===`guidance`||a.variable===`ratio`?f=Me(a.variable===`ratio`?`两支签的混合比例`:`条件力度`,i.value,(a.variable,0),a.variable===`ratio`?1:15,.1,e=>{i.value=e},g).el:d.append(pt(`本次变量取值`,c.map(e=>({value:String(e),label:g(e)})),String(i.value),e=>{i.value=Number(e)})),d.append(I(`生成这个取值`,async()=>{let n=structuredClone(a.fixed);if(a.variable===`ratio`?n.mix.ratio=i.value:n[{guidance:`w`,topic:`cls`,seed:`seed`,steps:`steps`}[a.variable]]=i.value,!await e.run(`只改变`+m[a.variable]+`……`,()=>e.controlled(n,(e,t,n)=>{r.show(e.x),r.setLabel(`真实步骤 `+(t+1)+` / `+n)})))return;let o=e.addWork(n,t);a.runs.includes(o.id)||a.runs.push(o.id),s(),e.refresh()},`primary model-input`),B(`本卡已生成 `+o.length+` 个不同配方`),I(`挑选真实 A/B`,()=>{i.phase=2,e.refresh()},`secondary`))}else if(i.phase===2){let t=o.slice(i.page*4,i.page*4+4);l=t.length?Pe(t.map(t=>V(nt(t.preview),u(t.recipe,e.meta.classes),{size:210,palette:`dusk`,selected:i.selected===t.id,action:()=>{i.selected=t.id,e.refresh()}})),2):L(j(`div.empty-object`,{},`先实际生成，再选择对照`),I(`去生成`,()=>{i.phase=1,e.refresh()},`primary`)),d=L(j(`h2`,{},`选入 A / B 的是实际结果`),R(`点击沙画，再决定把它放在哪边。两幅应只改变研究变量。`),ke(I(`选入 A`,()=>{i.selected&&(a.a=i.selected,s(),e.refresh())},`primary`),I(`选入 B`,()=>{i.selected&&(a.b=i.selected,s(),e.refresh())},`primary`)),R(`A：`+(p?u(p.recipe,e.meta.classes):`未选择`)),R(`B：`+(h?u(h.recipe,e.meta.classes):`未选择`)),I(`依据对照解释`,()=>{i.phase=3,e.refresh()},`secondary`)),f=ke(I(`上一页`,()=>{i.page--,e.refresh()},`secondary`,i.page===0),R(i.page+1+` / `+Math.max(1,Math.ceil(o.length/4))),I(`下一页`,()=>{i.page++,e.refresh()},`secondary`,(i.page+1)*4>=o.length))}else{l=g();let n=t===19?[`更像第一支签`,`更像第二支签`,`暂时认不出 / 两不像`]:[`观察到明显差异`,`变化不明显 / 证据不足`,`结果不符合预测`];d=L(j(`h2`,{},`让结论留在证据旁`),je(n,a.observation,e=>{a.observation=e,s()}),lt(e,`依据 A/B 的解释`,a.conclusion,e=>{a.conclusion=e,s()}),I(`保存这张实验卡`,()=>{let n=_(a,e.state.album);n.length?e.toast(n[0]):(a.submittedAt=Date.now(),e.save(),e.done(t),e.refresh())},`primary`),z(a.submittedAt?`已保存实际证据；允许无差异与反例。`:`文字是否科学仍需讨论；不按字数或预设审美判定。`))}e.mount(l,d,c,f)}function Lt(e,t){t===16?Rt(e):t<=19?It(e,t):zt(e)}function Rt(e){let t=e.ev(),n=e.memory(`conditioning`,()=>({seed:e.seed,cls:0,page:0,result:void 0})),r=new Ze;r.setPalette(`dusk`),r.show(n.result?.image??C(n.seed,1024)),r.setLabel(n.result?`固定起点 `+n.seed+` · 条件 `+e.meta.classes[n.cls].zh:`把一支条件签交给师傅`);let i=async i=>{let a={seed:n.seed,steps:20,w:3,cls:i},o=await e.run(`按条件签 `+e.meta.classes[i].zh+` 现场作画……`,()=>e.controlled(a,(e,t,n)=>{r.show(e.x),r.setLabel(`真实步骤 `+(t+1)+` / `+n)}));o&&(n.cls=i,n.result=o,t.tried=[...new Set([...t.tried??[],i])],e.addWork(a,16),e.save(),e.refresh())},a=ke(...e.meta.classes.slice(n.page*6,n.page*6+6).map((e,t)=>I(e.zh,()=>i(n.page*6+t),`condition-sign model-input `+(n.cls===n.page*6+t?`selected`:``))),I(n.page?`前六支 ›`:`后六支 ›`,()=>{n.page=1-n.page,e.refresh()},`secondary model-input`));e.mount(r.el,L(j(`h2`,{},`同一贝壳，换一个题目`),B(`起点 `+n.seed+` · 力度3 · 20步`),R(`在下方点选真实条件签。模型接收对应类别的条件向量，不接收任意文字。`),z(`条件把图像引向类别，仍要检查这次结果；没有保证每次都清楚。`),ct(e,`条件签能保证什么？`,[`影响生成方向，但仍需检查实际结果`,`力度3就是30%的正确率`,`只要题目相同，换起点也完全一样`],0)),[],a)}function zt(e){let t=e.ev(),n=e.memory(`challenge`,()=>({target:0,targets:new Map,current:void 0})),r=n.targets.get(n.target);e.mount(Pe([V(r?.image??null,`目标 `+(n.target+1)+` · 实际模型结果`,{size:320}),V(n.current?.image??null,`我的配方尝试`,{size:320})],2),L(j(`h2`,{},`找到能重画它的配方`),mt(e),I(r?`重新计算目标`:`准备这个目标`,async()=>{let t=await e.run(`现场计算摊主的目标 `+(n.target+1)+`……`,()=>e.generate($e[n.target],!0));t&&(n.targets.set(n.target,t),e.refresh())},`secondary model-input`),I(`试这张配方`,async()=>{if(!r){e.toast(`先请摊主实际准备这个目标。`);return}let i=structuredClone(e.recipe),a=await e.run(`试你的完整配方……`,()=>e.generate(i,!0));if(!a)return;n.current=a;let o=He(a.image,r.image),s={target:n.target,recipe:i,same:o,similarity:Re(a.image,r.image),preview:tt(a.image)};t.attempts=[...t.attempts??[],s].slice(-60),o?(t.solved=[...new Set([...t.solved??[],n.target])],e.addWork(i,20),e.toast(`本次复现成功，全部像素一致。`)):e.toast(`还有实际差异；可以固定其他条件，只改一个量再试。`),e.save(),e.refresh()},`primary model-input`,!r),I(`需要一条线索`,()=>e.modal(`只透露一项条件`,L(z(`目标 `+(n.target+1)+` 的贝壳编号：`+$e[n.target].seed),R(`题目、力度和步数仍由你比较调整。`))),`secondary`),z((t.solved??[]).includes(n.target)?`这个目标已复现；其他目标可继续挑战。`:`找回一个实际配方即可留下这项发现。`)),$e.map((t,r)=>I(`目标 `+(r+1),()=>{n.target=r,n.current=void 0,e.refresh()},`tool-button model-input `+(r===n.target?`selected`:``))))}var Bt=[137,80,78,71,13,10,26,10],Vt=null;function Ht(e){if(!Vt){Vt=new Uint32Array(256);for(let e=0;e<256;e++){let t=e;for(let e=0;e<8;e++)t=t&1?3988292384^t>>>1:t>>>1;Vt[e]=t>>>0}}let t=4294967295;for(let n of e)t=Vt[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function Ut(e){if(e.length<8||Bt.some((t,n)=>e[n]!==t))throw Error(`不是 PNG 文件`)}function Wt(e,t){let n=new Uint8Array(12+t.length),r=new DataView(n.buffer);r.setUint32(0,t.length);let i=new TextEncoder().encode(e);return n.set(i,4),n.set(t,8),r.setUint32(8+t.length,Ht(n.subarray(4,8+t.length))),n}function Gt(e,t){let n=new TextEncoder,r=n.encode(e),i=n.encode(t),a=new Uint8Array(r.length+5+i.length);return a.set(r,0),a.set([0,0,0,0,0],r.length),a.set(i,r.length+5),a}function Kt(e,t){Ut(e);let n=qt(e,`IEND`);if(n<0)throw Error(`PNG 文件不完整`);let r=Object.entries(t).map(([e,t])=>Wt(`iTXt`,Gt(e,t))),i=r.reduce((e,t)=>e+t.length,0),a=new Uint8Array(e.length+i);a.set(e.subarray(0,n),0);let o=n;for(let e of r)a.set(e,o),o+=e.length;return a.set(e.subarray(n),o),a}function qt(e,t){let n=new DataView(e.buffer,e.byteOffset,e.byteLength),r=8;for(;r+8<=e.length;){let i=n.getUint32(r);if(String.fromCharCode(...e.subarray(r+4,r+8))===t)return r;r+=12+i}return-1}function Jt(e){Ut(e);let t=new DataView(e.buffer,e.byteOffset,e.byteLength),n=new TextDecoder,r={},i=8;for(;i+8<=e.length;){let a=t.getUint32(i),o=String.fromCharCode(...e.subarray(i+4,i+8)),s=e.subarray(i+8,i+8+a);if(t.getUint32(i+8+a)!==Ht(e.subarray(i+4,i+8+a)))throw Error(`${o} 块校验失败`);if(o===`iTXt`){let e=s.indexOf(0),t=n.decode(s.subarray(0,e)),i=e+3;i=s.indexOf(0,i)+1,i=s.indexOf(0,i)+1,r[t]=n.decode(s.subarray(i))}else if(o===`tEXt`){let e=s.indexOf(0);r[n.decode(s.subarray(0,e))]=n.decode(s.subarray(e+1))}if(o===`IEND`)break;i+=12+a}return r}var Yt=`Google Quick, Draw! Dataset 的贡献者 · CC BY 4.0`,Xt=e=>e.state.program.map(t=>e.state.album.find(e=>e.id===t)).filter(e=>!!e);function Zt(e,t){t===21?$t(e):t===22?en(e):t===23?rn(e):t===24?an(e):on(e)}function Qt(e){let t=Xt(e);return t.length===6?t:(e.mount(L(j(`div.empty-object`,{},`今晚的六个展位，等你来安排`),I(`去策展台`,()=>e.go(21),`primary`)),L(j(`h2`,{},`先选好六幅不同作品`),R(`从你的真实作品卡册中选图并编排，夜场会按每张配方重新计算。`))),null)}function $t(e){let t=e.ev(),n=e.memory(`curate`,()=>({selected:0})),r=Xt(e),i=Pe(Array.from({length:6},(t,i)=>{let a=r[i];return V(a?nt(a.preview):null,i+1+` · `+(a?u(a.recipe,e.meta.classes):`空展位`),{size:200,palette:`night`,selected:i===n.selected,empty:`点作品卡册补选`,action:()=>{n.selected=i,e.refresh()}})}),3),a=e.state.album.filter(t=>!e.state.program.includes(t.id)),o=j(`select`,{"aria-label":`未采用作品`},j(`option`,{value:``},`选一张实际未采用图`),...a.map(t=>j(`option`,{value:t.id},u(t.recipe,e.meta.classes))));o.value=String(t.rejectedWork??``),o.onchange=()=>{t.rejectedWork=o.value,t.rejectionReason=``,e.save(),e.refresh()};let s=t=>{let r=[...e.state.program],i=n.selected,a=i+t;a<0||a>=r.length||([r[i],r[a]]=[r[a],r[i]],e.setProgram(r),n.selected=a,e.refresh())},c=a.find(e=>e.id===t.rejectedWork);e.mount(i,L(j(`h2`,{},`你决定今晚展示什么`),Ae(`我的夜场名称`,e.state.programTitle??`海边的一天`,t=>{e.state.programTitle=t,e.save()},{max:60}),ke(I(`补选作品`,()=>e.album(t=>{e.state.program.includes(t.id)||(e.setProgram([...e.state.program,t.id]),e.refresh())}),`primary`),B(r.length+` / 6 展位`)),j(`label.select-tool`,{},j(`span`,{},`为用途作取舍`),o),c?V(nt(c.preview),`没有采用的实际作品`,{size:100,palette:`night`}):null,lt(e,`未采用的理由`,String(t.rejectionReason??``),n=>{t.rejectionReason=n,e.save()})),[I(`上移作品`,()=>s(-1),`tool-button`),I(`下移作品`,()=>s(1),`tool-button`),I(`移出节目`,()=>{e.setProgram(e.state.program.filter((e,t)=>t!==n.selected)),n.selected=Math.max(0,n.selected-1),e.refresh()},`tool-button`),I(`回配方摊`,()=>e.go(18),`tool-button`)])}function en(e){let t=e.ev(),n=e.memory(`limits`,()=>({selected:0})),r=t.answered??={},i=[`长颈鹿`,`我家的小狗`],a=[`giraffe`,`pet`],o=L(j(`div.request-ticket`,{},j(`p`,{},`观众递来的点题卡`),j(`h2`,{},i[n.selected]),R(`先核对它能接收什么，再决定如何回应。`)),j(`h3`,{},`这位师傅实际支持的条件签`),j(`div.condition-grid`,{},...e.meta.classes.map(e=>j(`span.condition-sign`,{},e.zh)))),s=n.selected===0?0:1;e.mount(o,L(j(`h2`,{},`题目签有明确的边界`),je([`没有这个类别条件，不能把文字直接交给模型`,`即使有相近类别，也没有提供指定宠物身份的输入`,`所有生成模型都不能画任何新东西`],r[a[n.selected]]?s:void 0,t=>{t===s?(r[a[n.selected]]=`scope`,e.save(),e.done(),e.refresh()):e.toast(`把判断限定在本章模型支持的输入范围内。`)}),z(`这里检查的是本章12类条件、种子、力度与步数接口；不替所有生成模型下结论。`)),[...i.map((t,r)=>I(t,()=>{n.selected=r,e.refresh()},`tool-button `+(n.selected===r?`selected`:``))),I(`回去试条件`,()=>e.go(16),`tool-button`)])}async function tn(e){let t=await new Promise((t,n)=>e.toBlob(e=>e?t(e):n(Error(`图片编码未完成，请重试。`)),`image/png`));return new Uint8Array(await t.arrayBuffer())}async function nn(e,t){let n=await e.generate(t.recipe,!0),r=j(`canvas`,{width:512,height:512});De(r,n.image,{palette:`night`,mode:`glow`});let i=j(`canvas`,{width:660,height:740}),a=i.getContext(`2d`);a.fillStyle=`#142c3e`,a.fillRect(0,0,i.width,i.height),a.drawImage(r,74,93),a.fillStyle=`#f5e9c8`,a.font=`26px 'Microsoft YaHei'`,a.fillText((e.state.programTitle??`我的潮汐夜场`).slice(0,20),54,55),a.font=`bold 25px 'Microsoft YaHei'`,a.fillText(`AI 生成`,470,650),a.font=`18px 'Microsoft YaHei'`,a.fillText(u(t.recipe,e.meta.classes),54,650),a.font=`16px 'Microsoft YaHei'`,a.fillText(`Google Quick, Draw! Dataset · CC BY 4.0`,54,699);let o={Method:`AI 生成`,Model:e.meta.version,Recipe:u(t.recipe,e.meta.classes),Source:Yt,CuratedTitle:e.state.programTitle??`我的潮汐夜场`},s=Kt(await tn(i),o),c=Jt(s);if(Object.entries(o).some(([e,t])=>c[e]!==t))throw Error(`PNG说明没有正确写入，不能记为核对完成。`);return{png:s,read:c}}function rn(e){let t=Qt(e);if(!t)return;let n=e.ev(),r=e.memory(`labeling`,()=>({index:0})),i=t[r.index],a=n.labeled??[],o=V(nt(i.preview),u(i.recipe,e.meta.classes),{size:420,palette:`night`,mode:`glow`});a.includes(i.id)&&o.append(j(`strong.ai-badge`,{},`AI 生成`));let s={Method:`生成方式`,Model:`本次模型`,Recipe:`完整配方`,Source:`实际数据来源`,CuratedTitle:`展演名称`},c=n.fileInfo,l=L(j(`h2`,{},`画面标识与文件说明都要查`),I(`为六幅作品添加 AI 标识`,()=>{n.labeled=t.map(e=>e.id),e.save(),e.refresh()},`secondary`),I(`导出并核对 PNG`,async()=>{if(!(n.labeled??[]).includes(i.id)){e.toast(`先添加画面上的标识。`);return}let t=await e.run(`重算作品，写入并读回PNG说明……`,()=>nn(e,i));if(t){n.fileInfo=t.read,n.checked=!0,n.checkedWork=i.id,e.save(),Ie(new Blob([t.png],{type:`image/png`}),`沙画-`+u(i.recipe,e.meta.classes)+`.png`);try{e.repository.artifact({id:`sand-`+i.id,title:`沙画 `+u(i.recipe,e.meta.classes),mimeType:`image/png`,data:`data:image/png;base64,`+he(t.png)})}catch{e.toast(`图片已生成，作品暂未保存到本机；可保存本机文件。`)}e.done(),e.refresh()}},`primary model-input`),...c?Object.entries(c).filter(([e])=>e!==`CuratedTitle`).map(([e,t])=>R((s[e]??e)+`：`+t,`file-reading`)):[z(`这次文件说明尚未读回。`)],z(`截图或转存可能丢失标识；分享前需要再次检查。`));e.mount(o,l,t.map((t,n)=>I(`第 `+(n+1)+` 幅`,()=>{r.index=n,e.refresh()},`tool-button `+(n===r.index?`selected`:``))))}function an(e){let t=e.ev(),n=e.memory(`credits`,()=>({page:0})),r=Array.from({length:6},(t,r)=>{let i=n.page*6+r;return V(e.practice.byClass(i)[3].image,e.meta.classes[i].zh+` · 人的涂鸦`,{size:160,mode:`pixels`})}),i=j(`input`,{type:`checkbox`,"aria-label":`我已核对实际数据来源`});i.checked=!!t.sourceReviewed,i.onchange=()=>{t.sourceReviewed=i.checked,e.save()},e.mount(Pe(r,3),L(j(`h2`,{},`每一笔，都有人贡献`),R(`Google Quick, Draw! Dataset · CC BY 4.0`),B(`模型训练用 `+e.meta.training.images.toLocaleString()+` 幅涂鸦`),R(`本页仅从1920幅教学抽样中展示实例，不是完整训练集。`),j(`label.credit-source`,{},i,j(`span`,{},`我已核对本章实际数据来源`)),lt(e,`来源与贡献说明`,e.state.creditText??``,t=>{e.state.creditText=t,e.save()},500),I(`把说明加入节目单`,()=>{!t.sourceReviewed||!e.state.creditText?.trim()?e.toast(`核对来源，再留下你的实际贡献说明。`):(t.credited=!0,e.save(),e.done())},`primary`)),[],ke(I(n.page?`看前六类`:`看后六类`,()=>{n.page=1-n.page,e.refresh()},`secondary`),R(`教学抽样 · 第 `+(n.page+1)+` 页`)))}function on(e){let t=Qt(e);if(!t)return;let n=e.ev(25);if(!t.every(t=>(e.ev(23).labeled??[]).includes(t.id))||!e.ev(23).checked||!e.ev(24).credited){e.mount(L(j(`div.empty-object`,{},`开演前，交代作品与来源`),I(`去检查标识`,()=>e.go(23),`primary`),I(`去说明来源`,()=>e.go(24),`secondary`)),L(j(`h2`,{},`你的作品，也带上生成标识`),R(`为当前节目单添加可见标识、核对一次真实文件，并说明数据与人的贡献。`)));return}let r=e.programSignature;n.showProgram!==r&&(Object.assign(n,{showProgram:r,viewed:[],watched:!1,index:0,frame:0}),e.save());let i=e.memory(`show-`+r,()=>({index:Math.min(5,Number(n.index??0)),frame:Number(n.frame??0),items:[],ready:!1,playing:!1,viewed:new Set(n.viewed??[]),timer:0,reflect:!1}));if(i.reflect){sn(e,t,i);return}let a=j(`canvas.projection-canvas`,{width:512,height:512,role:`img`,"aria-label":`实际作品的灯塔投影`}),o=j(`div.projection-object`,{},j(`div.lighthouse-top`,{"aria-hidden":`true`}),a,j(`strong.ai-badge`,{},`AI 生成`)),s=R(`第 `+(i.index+1)+` / 6 幅`,`reading`),c=R(`选择的配方将实际重算，随后回放这些计算帧。`),l=()=>{n.index=i.index,n.frame=i.frame,n.viewed=[...i.viewed],t.every(e=>i.viewed.has(e.id))&&(n.watched=!0,n.watchedProgram=r),e.save()},d=()=>{let n=i.items[i.index],r=n?.frames[i.frame]?.x??n?.image??nt(t[i.index].preview);r&&De(a,r,{palette:`night`,mode:`glow`}),s.textContent=`第 `+(i.index+1)+` / 6 幅`+(n?` · 回放 `+(i.frame+1)+` / `+n.frames.length+` 步`:``),c.textContent=u(t[i.index].recipe,e.meta.classes);for(let[t,n]of e.content.querySelectorAll(`.tool-rack .tool-button`).entries())n.classList.toggle(`selected`,t===i.index)};d();let f=Me(`回看真实计算帧`,i.frame,0,Math.max(1,(i.items[i.index]?.frames.length??20)-1),1,e=>{i.ready&&(i.playing=!1,clearTimeout(i.timer),i.frame=e,e===i.items[i.index].frames.length-1&&i.viewed.add(t[i.index].id),l(),d())},e=>`第 `+(e+1)+` 步`);f.input.disabled=!i.ready;let p=()=>{if(!i.playing||!i.ready)return;let n=i.items[i.index];i.frame<n.frames.length-1?(i.frame++,d(),f.input.value=String(i.frame),f.out.textContent=`第 `+(i.frame+1)+` 步`,i.timer=window.setTimeout(p,e.preferences.reducedMotion?160:95)):(i.viewed.add(t[i.index].id),l(),i.index===5?(i.playing=!1,m.textContent=`再次回放`,e.toast(`六幅都已显示，可以回看或说明你的贡献。`)):(i.index++,i.frame=0,d(),f.input.max=String(i.items[i.index].frames.length-1),i.timer=window.setTimeout(p,450)))},m=I(i.ready?`回放真实过程`:`重算六幅，再开演`,async()=>{if(i.playing)i.playing=!1,clearTimeout(i.timer),m.textContent=`继续回放`;else{if(!i.ready){let n=await e.run(`按节目顺序重新计算……`,async()=>{let n=[];for(let[r,i]of t.entries())n.push(await e.generate(i.recipe,!0,(e,t,n)=>{De(a,e.x,{palette:`night`,mode:`glow`}),s.textContent=`现场计算 · 作品 `+(r+1)+` / 6 · `+(t+1)+` / `+n+` 步`}));return n});if(!n)return;i.items=n,i.ready=!0,i.frame=0,f.input.disabled=!1,f.input.max=String(i.items[i.index].frames.length-1)}i.index===5&&i.frame===i.items[5].frames.length-1&&(i.index=0,i.frame=0),i.playing=!0,m.textContent=`暂停回放`,p()}},`primary model-input`),h=t=>{i.playing=!1,clearTimeout(i.timer),i.index=t,i.frame=0,l(),e.refresh()};e.mount(o,L(j(`p.character`,{},e.state.programTitle??`我的潮汐夜场`),j(`h2`,{},`让选择成为一场展演`),s,c,m,I(`说明三方贡献`,()=>{!n.watched||n.watchedProgram!==r?e.toast(`可以回看尺到末帧查看每幅作品，或者播放完整节目。`):(i.playing=!1,clearTimeout(i.timer),i.reflect=!0,e.refresh())},`secondary`),I(`导出六幅海报`,()=>e.run(`按真实作品生成海报……`,()=>cn(e)),`secondary model-input`)),t.map((e,t)=>I(`第 `+(t+1)+` 幅`,()=>h(t),`tool-button model-input `+(t===i.index?`selected`:``))),f.el),un(e,()=>{i.playing=!1,clearTimeout(i.timer),l()})}function sn(e,t,n){let r=e.ev(25),i=new Set(r.picks??[]);e.mount(Pe(t.map(t=>V(nt(t.preview),u(t.recipe,e.meta.classes),{size:180,palette:`night`,mode:`glow`})),3),L(j(`h2`,{},`这场夜场里，各自做了什么？`),...[[`human`,`我：选择、修改、策展`],[`model`,`模型：按规律计算`],[`data`,`绘画者：贡献训练涂鸦`]].map(([t,n])=>I((i.has(t)?`✓ `:``)+n,()=>{i.has(t)?i.delete(t):i.add(t),r.picks=[...i],e.save(),e.refresh()},`role-card `+(i.has(t)?`selected`:``))),lt(e,`联系我的作品说明`,String(r.reason??``),t=>{r.reason=t,e.save()}),I(`保存发现并导出手册`,()=>{e.done(25)&&e.exportJournal()},`primary`),I(`回到灯塔投影`,()=>{n.reflect=!1,e.refresh()},`secondary`)))}async function cn(e){let t=Xt(e);if(t.length!==6)throw Error(`先选六幅实际作品。`);let n=j(`canvas`,{width:1200,height:990}),r=n.getContext(`2d`);r.fillStyle=`#142c3e`,r.fillRect(0,0,n.width,n.height),r.fillStyle=`#f4e6c2`,r.font=`bold 40px 'Microsoft YaHei'`,r.fillText((e.state.programTitle??`我的潮汐夜场`).slice(0,22),70,78),r.font=`22px 'Microsoft YaHei'`,r.fillText(`潮汐沙画节 · 六幅 AI 生成作品 · 我的选择与编排`,70,124);for(let[n,i]of t.entries()){let t=await e.generate(i.recipe,!0),a=j(`canvas`,{width:290,height:290});De(a,t.image,{palette:`night`,mode:`glow`});let o=70+n%3*360,s=174+Math.floor(n/3)*360;r.drawImage(a,o,s),r.fillStyle=`#fbf2d4`,r.font=`20px 'Microsoft YaHei'`,r.fillText(`AI 生成`,o+185,s+277),r.font=`18px 'Microsoft YaHei'`,r.fillText(u(i.recipe,e.meta.classes),o,s+324)}r.font=`18px 'Microsoft YaHei'`,r.fillText(`训练数据：Google Quick, Draw! Dataset · CC BY 4.0`,70,946);let i=Kt(await tn(n),{Method:`AI 生成`,Model:e.meta.version,Source:Yt,Recipes:JSON.stringify(t.map(e=>e.recipe)),Description:e.state.creditText??Yt});Ie(new Blob([i],{type:`image/png`}),`潮汐沙画节-我的夜场海报.png`)}var ln=new WeakMap;function un(e,t){ln.set(e,t)}function dn(e){ln.get(e)?.(),ln.delete(e)}function fn(e,t){dn(e),t<=6?gt(e,t):t<=10?xt(e,t):t<=15?Et(e,t):t<=20?Lt(e,t):Zt(e,t)}var pn=[`beach`,`workshop`,`market`,`stall`,`night`];function mn(e){return j(`span.location-vignette`,{"aria-hidden":`true`,"data-place":e,style:`background-image:url(`+new URL(new URL(`station-atlas-a0jbocR9.webp`,import.meta.url).href,``+import.meta.url).href+`);background-position:`+pn.indexOf(e)*25+`% center`},j(`span.vignette-light`))}var hn=`attached`,gn=1e3,_n=1001,vn=1002,yn=1003,bn=1004,xn=1005,Sn=1006,Cn=1007,wn=1008,Tn=1009,En=1010,Dn=1011,On=1012,kn=1013,An=1014,jn=1015,Mn=1016,Nn=1017,Pn=1018,Fn=1020,In=35902,Ln=35899,Rn=1021,zn=1022,Bn=1023,Vn=1026,Hn=1027,Un=1028,Wn=1029,Gn=1030,Kn=1031,qn=1033,Jn=33776,Yn=33777,Xn=33778,Zn=33779,Qn=35840,$n=35841,er=35842,tr=35843,nr=36196,rr=37492,ir=37496,ar=37488,or=37489,sr=37490,cr=37491,lr=37808,ur=37809,dr=37810,fr=37811,pr=37812,mr=37813,hr=37814,gr=37815,_r=37816,vr=37817,yr=37818,br=37819,xr=37820,Sr=37821,Cr=36492,wr=36494,Tr=36495,Er=36283,Dr=36284,Or=36285,kr=36286,Ar=2300,jr=2301,Mr=2302,Nr=2303,Pr=2400,Fr=2401,Ir=2402,Lr=2500,Rr=3200,zr=`srgb`,Br=`srgb-linear`,Vr=`linear`,Hr=`srgb`,Ur=7680,Wr=35044,Gr=2e3;function Kr(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function qr(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function Jr(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function Yr(){let e=Jr(`canvas`);return e.style.display=`block`,e}var Xr={};function Zr(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function Qr(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function H(...e){e=Qr(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function U(...e){e=Qr(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function $r(...e){let t=e.join(` `);t in Xr||(Xr[t]=!0,H(...e))}function ei(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var ti={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},ni=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},ri=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),ii=1234567,ai=Math.PI/180,oi=180/Math.PI;function si(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(ri[e&255]+ri[e>>8&255]+ri[e>>16&255]+ri[e>>24&255]+`-`+ri[t&255]+ri[t>>8&255]+`-`+ri[t>>16&15|64]+ri[t>>24&255]+`-`+ri[n&63|128]+ri[n>>8&255]+`-`+ri[n>>16&255]+ri[n>>24&255]+ri[r&255]+ri[r>>8&255]+ri[r>>16&255]+ri[r>>24&255]).toLowerCase()}function W(e,t,n){return Math.max(t,Math.min(n,e))}function ci(e,t){return(e%t+t)%t}function li(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function ui(e,t,n){return e===t?0:(n-e)/(t-e)}function di(e,t,n){return(1-n)*e+n*t}function fi(e,t,n,r){return di(e,t,1-Math.exp(-n*r))}function pi(e,t=1){return t-Math.abs(ci(e,t*2)-t)}function mi(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function hi(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function gi(e,t){return e+Math.floor(Math.random()*(t-e+1))}function _i(e,t){return e+Math.random()*(t-e)}function vi(e){return e*(.5-Math.random())}function yi(e){e!==void 0&&(ii=e);let t=ii+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function bi(e){return e*ai}function xi(e){return e*oi}function Si(e){return!(e&e-1)&&e!==0}function Ci(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function wi(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Ti(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:H(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Ei(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`Invalid component type.`)}}function Di(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`Invalid component type.`)}}var Oi={DEG2RAD:ai,RAD2DEG:oi,generateUUID:si,clamp:W,euclideanModulo:ci,mapLinear:li,inverseLerp:ui,lerp:di,damp:fi,pingpong:pi,smoothstep:mi,smootherstep:hi,randInt:gi,randFloat:_i,randFloatSpread:vi,seededRandom:yi,degToRad:bi,radToDeg:xi,isPowerOfTwo:Si,ceilPowerOfTwo:Ci,floorPowerOfTwo:wi,setQuaternionFromProperEuler:Ti,normalize:Di,denormalize:Ei},G=class e{constructor(t=0,n=0){e.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=W(this.x,e.x,t.x),this.y=W(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=W(this.x,e,t),this.y=W(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(W(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(W(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},ki=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:H(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(W(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},K=class e{constructor(t=0,n=0,r=0){e.prototype.isVector3=!0,this.x=t,this.y=n,this.z=r}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ji.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ji.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=W(this.x,e.x,t.x),this.y=W(this.y,e.y,t.y),this.z=W(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=W(this.x,e,t),this.y=W(this.y,e,t),this.z=W(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(W(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ai.copy(this).projectOnVector(e),this.sub(Ai)}reflect(e){return this.sub(Ai.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(W(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Ai=new K,ji=new ki,q=class e{constructor(t,n,r,i,a,o,s,c,l){e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,r,i,a,o,s,c,l)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Mi.makeScale(e,t)),this}rotate(e){return this.premultiply(Mi.makeRotation(-e)),this}translate(e,t){return this.premultiply(Mi.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Mi=new q,Ni=new q().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Pi=new q().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Fi(){let e={enabled:!0,workingColorSpace:Br,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n||(this.spaces[t].transfer===`srgb`&&(e.r=Ii(e.r),e.g=Ii(e.g),e.b=Ii(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Li(e.r),e.g=Li(e.g),e.b=Li(e.b))),e},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?Vr:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return $r(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return $r(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Br]:{primaries:t,whitePoint:r,transfer:Vr,toXYZ:Ni,fromXYZ:Pi,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:zr},outputColorSpaceConfig:{drawingBufferColorSpace:zr}},[zr]:{primaries:t,whitePoint:r,transfer:Hr,toXYZ:Ni,fromXYZ:Pi,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:zr}}}),e}var J=Fi();function Ii(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Li(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Ri,zi=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ri===void 0&&(Ri=Jr(`canvas`)),Ri.width=e.width,Ri.height=e.height;let t=Ri.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Ri}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=Jr(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=Ii(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(Ii(t[e]/255)*255):t[e]=Ii(t[e]);return{data:t,width:e.width,height:e.height}}return H(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Bi=0,Vi=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Bi++}),this.uuid=si(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Hi(r[t].image)):e.push(Hi(r[t]))}else e=Hi(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Hi(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?zi.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(H(`Texture: Unable to serialize Texture.`),{})}var Ui=0,Wi=new K,Gi=class e extends ni{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=_n,i=_n,a=Sn,o=wn,s=Bn,c=Tn,l=e.DEFAULT_ANISOTROPY,u=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ui++}),this.uuid=si(),this.name=``,this.source=new Vi(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new G(0,0),this.repeat=new G(1,1),this.center=new G(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new q,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Wi).x}get height(){return this.source.getSize(Wi).y}get depth(){return this.source.getSize(Wi).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){H(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];r===void 0?H(`Texture.setValues(): property '${t}' does not exist.`):r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case gn:e.x-=Math.floor(e.x);break;case _n:e.x=e.x<0?0:1;break;case vn:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case gn:e.y-=Math.floor(e.y);break;case _n:e.y=e.y<0?0:1;break;case vn:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Gi.DEFAULT_IMAGE=null,Gi.DEFAULT_MAPPING=300,Gi.DEFAULT_ANISOTROPY=1;var Ki=class e{constructor(t=0,n=0,r=0,i=1){e.prototype.isVector4=!0,this.x=t,this.y=n,this.z=r,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=W(this.x,e.x,t.x),this.y=W(this.y,e.y,t.y),this.z=W(this.z,e.z,t.z),this.w=W(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=W(this.x,e,t),this.y=W(this.y,e,t),this.z=W(this.z,e,t),this.w=W(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(W(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},qi=class extends ni{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Ki(0,0,e,t),this.scissorTest=!1,this.viewport=new Ki(0,0,e,t),this.textures=[];let r=new Gi({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){let t={minFilter:Sn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Vi(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:`dispose`})}},Ji=class extends qi{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Yi=class extends Gi{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=yn,this.minFilter=yn,this.wrapR=_n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},Xi=class extends Gi{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=yn,this.minFilter=yn,this.wrapR=_n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Y=class e{constructor(t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g){e.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Zi.setFromMatrixColumn(e,0).length(),i=1/Zi.setFromMatrixColumn(e,1).length(),a=1/Zi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose($i,e,ea)}lookAt(e,t,n){let r=this.elements;return ra.subVectors(e,t),ra.lengthSq()===0&&(ra.z=1),ra.normalize(),ta.crossVectors(n,ra),ta.lengthSq()===0&&(Math.abs(n.z)===1?ra.x+=1e-4:ra.z+=1e-4,ra.normalize(),ta.crossVectors(n,ra)),ta.normalize(),na.crossVectors(ra,ta),r[0]=ta.x,r[4]=na.x,r[8]=ra.x,r[1]=ta.y,r[5]=na.y,r[9]=ra.y,r[2]=ta.z,r[6]=na.z,r[10]=ra.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],ee=r[2],k=r[6],te=r[10],ne=r[14],re=r[3],ie=r[7],ae=r[11],oe=r[15];return i[0]=a*x+o*T+s*ee+c*re,i[4]=a*S+o*E+s*k+c*ie,i[8]=a*C+o*D+s*te+c*ae,i[12]=a*w+o*O+s*ne+c*oe,i[1]=l*x+u*T+d*ee+f*re,i[5]=l*S+u*E+d*k+f*ie,i[9]=l*C+u*D+d*te+f*ae,i[13]=l*w+u*O+d*ne+f*oe,i[2]=p*x+m*T+h*ee+g*re,i[6]=p*S+m*E+h*k+g*ie,i[10]=p*C+m*D+h*te+g*ae,i[14]=p*w+m*O+h*ne+g*oe,i[3]=_*x+v*T+y*ee+b*re,i[7]=_*S+v*E+y*k+b*ie,i[11]=_*C+v*D+y*te+b*ae,i[15]=_*w+v*O+y*ne+b*oe,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,ee=_*O-v*D+y*E+b*T-x*w+S*C;if(ee===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let k=1/ee;return e[0]=(o*O-s*D+c*E)*k,e[1]=(r*D-n*O-i*E)*k,e[2]=(m*S-h*x+g*b)*k,e[3]=(d*x-u*S-f*b)*k,e[4]=(s*T-a*O-c*w)*k,e[5]=(t*O-r*T+i*w)*k,e[6]=(h*y-p*S-g*v)*k,e[7]=(l*S-d*y+f*v)*k,e[8]=(a*D-o*T+c*C)*k,e[9]=(n*T-t*D-i*C)*k,e[10]=(p*x-m*y+g*_)*k,e[11]=(u*y-l*x-f*_)*k,e[12]=(o*w-a*E-s*C)*k,e[13]=(t*E-n*w+r*C)*k,e[14]=(m*v-p*b-h*_)*k,e[15]=(l*b-u*v+d*_)*k,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinant();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Zi.set(r[0],r[1],r[2]).length(),o=Zi.set(r[4],r[5],r[6]).length(),s=Zi.set(r[8],r[9],r[10]).length();i<0&&(a=-a),Qi.copy(this);let c=1/a,l=1/o,u=1/s;return Qi.elements[0]*=c,Qi.elements[1]*=c,Qi.elements[2]*=c,Qi.elements[4]*=l,Qi.elements[5]*=l,Qi.elements[6]*=l,Qi.elements[8]*=u,Qi.elements[9]*=u,Qi.elements[10]*=u,t.setFromRotationMatrix(Qi),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Gr,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Gr,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Zi=new K,Qi=new Y,$i=new K(0,0,0),ea=new K(1,1,1),ta=new K,na=new K,ra=new K,ia=new Y,aa=new ki,oa=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(W(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-W(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(W(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-W(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(W(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-W(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:H(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return ia.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ia,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return aa.setFromEuler(this),this.setFromQuaternion(aa,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};oa.DEFAULT_ORDER=`XYZ`;var sa=class{constructor(){this.mask=1}set(e){this.mask=1<<e>>>0}enable(e){this.mask|=1<<e}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e}disable(e){this.mask&=~(1<<e)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&1<<e)}},ca=0,la=new K,ua=new ki,da=new Y,fa=new K,pa=new K,ma=new K,ha=new ki,ga=new K(1,0,0),_a=new K(0,1,0),va=new K(0,0,1),ya={type:`added`},ba={type:`removed`},xa={type:`childadded`,child:null},Sa={type:`childremoved`,child:null},Ca=class e extends ni{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ca++}),this.uuid=si(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new K,n=new oa,r=new ki,i=new K(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Y},normalMatrix:{value:new q}}),this.matrix=new Y,this.matrixWorld=new Y,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new sa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ua.setFromAxisAngle(e,t),this.quaternion.multiply(ua),this}rotateOnWorldAxis(e,t){return ua.setFromAxisAngle(e,t),this.quaternion.premultiply(ua),this}rotateX(e){return this.rotateOnAxis(ga,e)}rotateY(e){return this.rotateOnAxis(_a,e)}rotateZ(e){return this.rotateOnAxis(va,e)}translateOnAxis(e,t){return la.copy(e).applyQuaternion(this.quaternion),this.position.add(la.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ga,e)}translateY(e){return this.translateOnAxis(_a,e)}translateZ(e){return this.translateOnAxis(va,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(da.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?fa.copy(e):fa.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),pa.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?da.lookAt(pa,fa,this.up):da.lookAt(fa,pa,this.up),this.quaternion.setFromRotationMatrix(da),r&&(da.extractRotation(r.matrixWorld),ua.setFromRotationMatrix(da),this.quaternion.premultiply(ua.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(U(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ya),xa.child=e,this.dispatchEvent(xa),xa.child=null):U(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(ba),Sa.child=e,this.dispatchEvent(Sa),Sa.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),da.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),da.multiply(e.parent.matrixWorld)),e.applyMatrix4(da),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ya),xa.child=e,this.dispatchEvent(xa),xa.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pa,e,ma),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pa,ha,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let e=this.children;for(let t=0,n=e.length;t<n;t++)e[t].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),e.pivot!==null&&(this.pivot=e.pivot.clone()),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};Ca.DEFAULT_UP=new K(0,1,0),Ca.DEFAULT_MATRIX_AUTO_UPDATE=!0,Ca.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var wa=class extends Ca{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Ta={type:`move`},Ea=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new wa,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new wa,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new K,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new K),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new wa,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new K,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new K),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Ta)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new wa;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Da={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Oa={h:0,s:0,l:0},ka={h:0,s:0,l:0};function Aa(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var X=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=zr){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,J.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=J.workingColorSpace){return this.r=e,this.g=t,this.b=n,J.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=J.workingColorSpace){if(e=ci(e,1),t=W(t,0,1),n=W(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Aa(i,r,e+1/3),this.g=Aa(i,r,e),this.b=Aa(i,r,e-1/3)}return J.colorSpaceToWorking(this,r),this}setStyle(e,t=zr){function n(t){t!==void 0&&parseFloat(t)<1&&H(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:H(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);H(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=zr){let n=Da[e.toLowerCase()];return n===void 0?H(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ii(e.r),this.g=Ii(e.g),this.b=Ii(e.b),this}copyLinearToSRGB(e){return this.r=Li(e.r),this.g=Li(e.g),this.b=Li(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=zr){return J.workingToColorSpace(ja.copy(this),e),Math.round(W(ja.r*255,0,255))*65536+Math.round(W(ja.g*255,0,255))*256+Math.round(W(ja.b*255,0,255))}getHexString(e=zr){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=J.workingColorSpace){J.workingToColorSpace(ja.copy(this),t);let n=ja.r,r=ja.g,i=ja.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=J.workingColorSpace){return J.workingToColorSpace(ja.copy(this),t),e.r=ja.r,e.g=ja.g,e.b=ja.b,e}getStyle(e=zr){J.workingToColorSpace(ja.copy(this),e);let t=ja.r,n=ja.g,r=ja.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Oa),this.setHSL(Oa.h+e,Oa.s+t,Oa.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Oa),e.getHSL(ka);let n=di(Oa.h,ka.h,t),r=di(Oa.s,ka.s,t),i=di(Oa.l,ka.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},ja=new X;X.NAMES=Da;var Ma=class extends Ca{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new oa,this.environmentIntensity=1,this.environmentRotation=new oa,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Na=new K,Pa=new K,Fa=new K,Ia=new K,La=new K,Ra=new K,za=new K,Ba=new K,Va=new K,Ha=new K,Ua=new Ki,Wa=new Ki,Ga=new Ki,Ka=class e{constructor(e=new K,t=new K,n=new K){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Na.subVectors(e,t),r.cross(Na);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Na.subVectors(r,t),Pa.subVectors(n,t),Fa.subVectors(e,t);let a=Na.dot(Na),o=Na.dot(Pa),s=Na.dot(Fa),c=Pa.dot(Pa),l=Pa.dot(Fa),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Ia)!==null&&Ia.x>=0&&Ia.y>=0&&Ia.x+Ia.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Ia)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Ia.x),s.addScaledVector(a,Ia.y),s.addScaledVector(o,Ia.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Ua.setScalar(0),Wa.setScalar(0),Ga.setScalar(0),Ua.fromBufferAttribute(e,t),Wa.fromBufferAttribute(e,n),Ga.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Ua,i.x),a.addScaledVector(Wa,i.y),a.addScaledVector(Ga,i.z),a}static isFrontFacing(e,t,n,r){return Na.subVectors(n,t),Pa.subVectors(e,t),Na.cross(Pa).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Na.subVectors(this.c,this.b),Pa.subVectors(this.a,this.b),Na.cross(Pa).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;La.subVectors(r,n),Ra.subVectors(i,n),Ba.subVectors(e,n);let s=La.dot(Ba),c=Ra.dot(Ba);if(s<=0&&c<=0)return t.copy(n);Va.subVectors(e,r);let l=La.dot(Va),u=Ra.dot(Va);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(La,a);Ha.subVectors(e,i);let f=La.dot(Ha),p=Ra.dot(Ha);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Ra,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return za.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(za,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(La,a).addScaledVector(Ra,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},qa=class{constructor(e=new K(1/0,1/0,1/0),t=new K(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Ya.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Ya.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Ya.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,Ya):Ya.fromBufferAttribute(r,t),Ya.applyMatrix4(e.matrixWorld),this.expandByPoint(Ya);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),Xa.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),Xa.copy(e.boundingBox)),Xa.applyMatrix4(e.matrixWorld),this.union(Xa)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Ya),Ya.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ro),io.subVectors(this.max,ro),Za.subVectors(e.a,ro),Qa.subVectors(e.b,ro),$a.subVectors(e.c,ro),eo.subVectors(Qa,Za),to.subVectors($a,Qa),no.subVectors(Za,$a);let t=[0,-eo.z,eo.y,0,-to.z,to.y,0,-no.z,no.y,eo.z,0,-eo.x,to.z,0,-to.x,no.z,0,-no.x,-eo.y,eo.x,0,-to.y,to.x,0,-no.y,no.x,0];return!so(t,Za,Qa,$a,io)||(t=[1,0,0,0,1,0,0,0,1],!so(t,Za,Qa,$a,io))?!1:(ao.crossVectors(eo,to),t=[ao.x,ao.y,ao.z],so(t,Za,Qa,$a,io))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Ya).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Ya).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()||(Ja[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ja[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ja[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ja[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ja[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ja[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ja[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ja[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ja)),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Ja=[new K,new K,new K,new K,new K,new K,new K,new K],Ya=new K,Xa=new qa,Za=new K,Qa=new K,$a=new K,eo=new K,to=new K,no=new K,ro=new K,io=new K,ao=new K,oo=new K;function so(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){oo.fromArray(e,a);let o=i.x*Math.abs(oo.x)+i.y*Math.abs(oo.y)+i.z*Math.abs(oo.z),s=t.dot(oo),c=n.dot(oo),l=r.dot(oo);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var co=new K,lo=new G,uo=0,fo=class{constructor(e,t,n=!1){if(Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:uo++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Wr,this.updateRanges=[],this.gpuType=jn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)lo.fromBufferAttribute(this,t),lo.applyMatrix3(e),this.setXY(t,lo.x,lo.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)co.fromBufferAttribute(this,t),co.applyMatrix3(e),this.setXYZ(t,co.x,co.y,co.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)co.fromBufferAttribute(this,t),co.applyMatrix4(e),this.setXYZ(t,co.x,co.y,co.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)co.fromBufferAttribute(this,t),co.applyNormalMatrix(e),this.setXYZ(t,co.x,co.y,co.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)co.fromBufferAttribute(this,t),co.transformDirection(e),this.setXYZ(t,co.x,co.y,co.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ei(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Di(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ei(t,this.array)),t}setX(e,t){return this.normalized&&(t=Di(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ei(t,this.array)),t}setY(e,t){return this.normalized&&(t=Di(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ei(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Di(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ei(t,this.array)),t}setW(e,t){return this.normalized&&(t=Di(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Di(t,this.array),n=Di(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Di(t,this.array),n=Di(n,this.array),r=Di(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Di(t,this.array),n=Di(n,this.array),r=Di(r,this.array),i=Di(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}},po=class extends fo{constructor(e,t,n){super(new Uint16Array(e),t,n)}},mo=class extends fo{constructor(e,t,n){super(new Uint32Array(e),t,n)}},ho=class extends fo{constructor(e,t,n){super(new Float32Array(e),t,n)}},go=new qa,_o=new K,vo=new K,yo=class{constructor(e=new K,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?go.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;_o.subVectors(e,this.center);let t=_o.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(_o,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(vo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(_o.copy(e.center).add(vo)),this.expandByPoint(_o.copy(e.center).sub(vo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},bo=0,xo=new Y,So=new Ca,Co=new K,wo=new qa,To=new qa,Eo=new K,Do=class e extends ni{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:bo++}),this.uuid=si(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(Kr(e)?mo:po)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new q().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return xo.makeRotationFromQuaternion(e),this.applyMatrix4(xo),this}rotateX(e){return xo.makeRotationX(e),this.applyMatrix4(xo),this}rotateY(e){return xo.makeRotationY(e),this.applyMatrix4(xo),this}rotateZ(e){return xo.makeRotationZ(e),this.applyMatrix4(xo),this}translate(e,t,n){return xo.makeTranslation(e,t,n),this.applyMatrix4(xo),this}scale(e,t,n){return xo.makeScale(e,t,n),this.applyMatrix4(xo),this}lookAt(e){return So.lookAt(e),So.updateMatrix(),this.applyMatrix4(So.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Co).negate(),this.translate(Co.x,Co.y,Co.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new ho(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&H(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new qa);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)U(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new K(-1/0,-1/0,-1/0),new K(1/0,1/0,1/0));else{if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];wo.setFromBufferAttribute(n),this.morphTargetsRelative?(Eo.addVectors(this.boundingBox.min,wo.min),this.boundingBox.expandByPoint(Eo),Eo.addVectors(this.boundingBox.max,wo.max),this.boundingBox.expandByPoint(Eo)):(this.boundingBox.expandByPoint(wo.min),this.boundingBox.expandByPoint(wo.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&U(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new yo);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)U(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new K,1/0);else if(e){let n=this.boundingSphere.center;if(wo.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];To.setFromBufferAttribute(n),this.morphTargetsRelative?(Eo.addVectors(wo.min,To.min),wo.expandByPoint(Eo),Eo.addVectors(wo.max,To.max),wo.expandByPoint(Eo)):(wo.expandByPoint(To.min),wo.expandByPoint(To.max))}wo.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Eo.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Eo));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Eo.fromBufferAttribute(a,t),o&&(Co.fromBufferAttribute(e,t),Eo.add(Co)),r=Math.max(r,n.distanceToSquared(Eo))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&U(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){U(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv;this.hasAttribute(`tangent`)===!1&&this.setAttribute(`tangent`,new fo(new Float32Array(4*n.count),4));let a=this.getAttribute(`tangent`),o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new K,s[e]=new K;let c=new K,l=new K,u=new K,d=new G,f=new G,p=new G,m=new K,h=new K;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new K,y=new K,b=new K,x=new K;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0)n=new fo(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new K,i=new K,a=new K,o=new K,s=new K,c=new K,l=new K,u=new K;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Eo.fromBufferAttribute(e,t),Eo.normalize(),e.setXYZ(t,Eo.x,Eo.y,Eo.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new fo(a,r,i)}if(this.index===null)return H(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:`dispose`})}},Oo=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=Wr,this.updateRanges=[],this.version=0,this.uuid=si()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=si()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=si()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},ko=new K,Ao=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)ko.fromBufferAttribute(this,t),ko.applyMatrix4(e),this.setXYZ(t,ko.x,ko.y,ko.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ko.fromBufferAttribute(this,t),ko.applyNormalMatrix(e),this.setXYZ(t,ko.x,ko.y,ko.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ko.fromBufferAttribute(this,t),ko.transformDirection(e),this.setXYZ(t,ko.x,ko.y,ko.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Ei(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Di(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Di(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Di(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Di(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Di(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Ei(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Ei(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Ei(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Ei(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Di(t,this.array),n=Di(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Di(t,this.array),n=Di(n,this.array),r=Di(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Di(t,this.array),n=Di(n,this.array),r=Di(r,this.array),i=Di(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){Zr(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new fo(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){Zr(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},jo=0,Mo=class extends ni{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:jo++}),this.uuid=si(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new X(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ur,this.stencilZFail=Ur,this.stencilZPass=Ur,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){H(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];r===void 0?H(`Material: '${t}' is not a property of THREE.${this.type}.`):r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},No=new K,Po=new K,Fo=new K,Io=new K,Lo=new K,Ro=new K,zo=new K,Bo=class{constructor(e=new K,t=new K(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,No)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=No.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(No.copy(this.origin).addScaledVector(this.direction,t),No.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Po.copy(e).add(t).multiplyScalar(.5),Fo.copy(t).sub(e).normalize(),Io.copy(this.origin).sub(Po);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Fo),o=Io.dot(this.direction),s=-Io.dot(Fo),c=Io.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Po).addScaledVector(Fo,d),f}intersectSphere(e,t){No.subVectors(e.center,this.origin);let n=No.dot(this.direction),r=No.dot(No)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,No)!==null}intersectTriangle(e,t,n,r,i){Lo.subVectors(t,e),Ro.subVectors(n,e),zo.crossVectors(Lo,Ro);let a=this.direction.dot(zo),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Io.subVectors(this.origin,e);let s=o*this.direction.dot(Ro.crossVectors(Io,Ro));if(s<0)return null;let c=o*this.direction.dot(Lo.cross(Io));if(c<0||s+c>a)return null;let l=-o*Io.dot(zo);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Vo=class extends Mo{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new X(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new oa,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Ho=new Y,Uo=new Bo,Wo=new yo,Go=new K,Ko=new K,qo=new K,Jo=new K,Yo=new K,Xo=new K,Zo=new K,Qo=new K,$o=class extends Ca{constructor(e=new Do,t=new Vo){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){Xo.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(Yo.fromBufferAttribute(s,e),a?Xo.addScaledVector(Yo,r):Xo.addScaledVector(Yo.sub(t),r))}t.add(Xo)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Wo.copy(n.boundingSphere),Wo.applyMatrix4(i),Uo.copy(e.ray).recast(e.near),!(Wo.containsPoint(Uo.origin)===!1&&(Uo.intersectSphere(Wo,Go)===null||Uo.origin.distanceToSquared(Go)>(e.far-e.near)**2))&&(Ho.copy(i).invert(),Uo.copy(e.ray).applyMatrix4(Ho),(n.boundingBox===null||Uo.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,Uo)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=ts(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=ts(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=ts(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=ts(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function es(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;Qo.copy(s),Qo.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(Qo);return l<n.near||l>n.far?null:{distance:l,point:Qo.clone(),object:e}}function ts(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,Ko),e.getVertexPosition(c,qo),e.getVertexPosition(l,Jo);let u=es(e,t,n,r,Ko,qo,Jo,Zo);if(u){let e=new K;Ka.getBarycoord(Zo,Ko,qo,Jo,e),i&&(u.uv=Ka.getInterpolatedAttribute(i,s,c,l,e,new G)),a&&(u.uv1=Ka.getInterpolatedAttribute(a,s,c,l,e,new G)),o&&(u.normal=Ka.getInterpolatedAttribute(o,s,c,l,e,new K),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new K,materialIndex:0};Ka.getNormal(Ko,qo,Jo,t.normal),u.face=t,u.barycoord=e}return u}var ns=new K,rs=new Ki,is=new Ki,as=new K,os=new Y,ss=new K,cs=new yo,ls=new Y,us=new Bo,ds=class extends $o{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type=`SkinnedMesh`,this.bindMode=hn,this.bindMatrix=new Y,this.bindMatrixInverse=new Y,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new qa),this.boundingBox.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,ss),this.boundingBox.expandByPoint(ss)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new yo),this.boundingSphere.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,ss),this.boundingSphere.expandByPoint(ss)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),cs.copy(this.boundingSphere),cs.applyMatrix4(r),e.ray.intersectsSphere(cs)!==!1&&(ls.copy(r).invert(),us.copy(e.ray).applyMatrix4(ls),(this.boundingBox===null||us.intersectsBox(this.boundingBox)!==!1)&&this._computeIntersections(e,t,us)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new Ki,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r===1/0?e.set(1,0,0,0):e.multiplyScalar(r),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===`attached`?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===`detached`?this.bindMatrixInverse.copy(this.bindMatrix).invert():H(`SkinnedMesh: Unrecognized bindMode: `+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,r=this.geometry;rs.fromBufferAttribute(r.attributes.skinIndex,e),is.fromBufferAttribute(r.attributes.skinWeight,e),ns.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let e=0;e<4;e++){let r=is.getComponent(e);if(r!==0){let i=rs.getComponent(e);os.multiplyMatrices(n.bones[i].matrixWorld,n.boneInverses[i]),t.addScaledVector(as.copy(ns).applyMatrix4(os),r)}}return t.applyMatrix4(this.bindMatrixInverse)}},fs=class extends Ca{constructor(){super(),this.isBone=!0,this.type=`Bone`}},ps=class extends Gi{constructor(e=null,t=1,n=1,r,i,a,o,s,c=yn,l=yn,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ms=new Y,hs=new Y,gs=class e{constructor(e=[],t=[]){this.uuid=si(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){H(`Skeleton: Number of inverse bone matrices does not match amount of bones.`),this.boneInverses=[];for(let e=0,t=this.bones.length;e<t;e++)this.boneInverses.push(new Y)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let t=new Y;this.bones[e]&&t.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(t)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&t.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&(t.parent&&t.parent.isBone?(t.matrix.copy(t.parent.matrixWorld).invert(),t.matrix.multiply(t.matrixWorld)):t.matrix.copy(t.matrixWorld),t.matrix.decompose(t.position,t.quaternion,t.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let r=0,i=e.length;r<i;r++){let i=e[r]?e[r].matrixWorld:hs;ms.multiplyMatrices(i,t[r]),ms.toArray(n,r*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new e(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new ps(t,e,e,Bn,jn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let n=this.bones[t];if(n.name===e)return n}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){let r=e.bones[n],i=t[r];i===void 0&&(H(`Skeleton: No bone found with UUID:`,r),i=new fs),this.bones.push(i),this.boneInverses.push(new Y().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:`Skeleton`,generator:`Skeleton.toJSON`},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let r=0,i=t.length;r<i;r++){let i=t[r];e.bones.push(i.uuid);let a=n[r];e.boneInverses.push(a.toArray())}return e}},_s=class extends fo{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},vs=new Y,ys=new Y,bs=[],xs=new qa,Ss=new Y,Cs=new $o,ws=new yo,Ts=class extends $o{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new _s(new Float32Array(n*16),16),this.previousInstanceMatrix=null,this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Ss)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new qa),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,vs),xs.copy(e.boundingBox).applyMatrix4(vs),this.boundingBox.union(xs)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new yo),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,vs),ws.copy(e.boundingSphere).applyMatrix4(vs),this.boundingSphere.union(ws)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.previousInstanceMatrix!==null&&(this.previousInstanceMatrix=e.previousInstanceMatrix.clone()),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(Cs.geometry=this.geometry,Cs.material=this.material,Cs.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ws.copy(this.boundingSphere),ws.applyMatrix4(n),e.ray.intersectsSphere(ws)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,vs),ys.multiplyMatrices(n,vs),Cs.matrixWorld=ys,Cs.raycast(e,bs);for(let e=0,n=bs.length;e<n;e++){let n=bs[e];n.instanceId=i,n.object=this,t.push(n)}bs.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new _s(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new ps(new Float32Array(r*this.count),r,this.count,Un,jn));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;i[s]=o,i.set(n,s+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Es=new K,Ds=new K,Os=new q,ks=class{constructor(e=new K(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Es.subVectors(n,t).cross(Ds.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(Es),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let i=-(e.start.dot(this.normal)+this.constant)/r;return i<0||i>1?null:t.copy(e.start).addScaledVector(n,i)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Os.getNormalMatrix(e),r=this.coplanarPoint(Es).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},As=new yo,js=new G(.5,.5),Ms=new K,Ns=class{constructor(e=new ks,t=new ks,n=new ks,r=new ks,i=new ks,a=new ks){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Gr,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),As.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),As.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(As)}intersectsSprite(e){return As.center.set(0,0,0),As.radius=.7071067811865476+js.distanceTo(e.center),As.applyMatrix4(e.matrixWorld),this.intersectsSphere(As)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Ms.x=r.normal.x>0?e.max.x:e.min.x,Ms.y=r.normal.y>0?e.max.y:e.min.y,Ms.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Ms)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Ps=class extends Mo{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new X(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Fs=new K,Is=new K,Ls=new Y,Rs=new Bo,zs=new yo,Bs=new K,Vs=new K,Hs=class extends Ca{constructor(e=new Do,t=new Ps){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Fs.fromBufferAttribute(t,e-1),Is.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Fs.distanceTo(Is);e.setAttribute(`lineDistance`,new ho(n,1))}else H(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),zs.copy(n.boundingSphere),zs.applyMatrix4(r),zs.radius+=i,e.ray.intersectsSphere(zs)===!1)return;Ls.copy(r).invert(),Rs.copy(e.ray).applyMatrix4(Ls);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=Us(this,e,Rs,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=Us(this,e,Rs,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=Us(this,e,Rs,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=Us(this,e,Rs,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Us(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(Fs.fromBufferAttribute(s,i),Is.fromBufferAttribute(s,a),n.distanceSqToSegment(Fs,Is,Bs,Vs)>r)return;Bs.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Bs);if(!(c<t.near||c>t.far))return{distance:c,point:Vs.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var Ws=new K,Gs=new K,Ks=class extends Hs{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)Ws.fromBufferAttribute(t,e),Gs.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+Ws.distanceTo(Gs);e.setAttribute(`lineDistance`,new ho(n,1))}else H(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},qs=class extends Hs{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type=`LineLoop`}},Js=class extends Mo{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new X(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ys=new Y,Xs=new Bo,Zs=new yo,Qs=new K,$s=class extends Ca{constructor(e=new Do,t=new Js){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Zs.copy(n.boundingSphere),Zs.applyMatrix4(r),Zs.radius+=i,e.ray.intersectsSphere(Zs)===!1)return;Ys.copy(r).invert(),Xs.copy(e.ray).applyMatrix4(Ys);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);Qs.fromBufferAttribute(l,n),ec(Qs,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)Qs.fromBufferAttribute(l,a),ec(Qs,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function ec(e,t,n,r,i,a,o){let s=Xs.distanceSqToPoint(e);if(s<n){let n=new K;Xs.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var tc=class extends Gi{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},nc=class extends Gi{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},rc=class extends Gi{constructor(e,t,n=An,r,i,a,o=yn,s=yn,c,l=Vn,u=1){if(l!==1026&&l!==1027)throw Error(`DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:u},r,i,a,o,s,l,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Vi(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},ic=class extends rc{constructor(e,t=An,n=301,r,i,a=yn,o=yn,s,c=Vn){let l={width:e,height:e,depth:1},u=[l,l,l,l,l,l];super(e,e,t,n,r,i,a,o,s,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},ac=class extends Gi{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},oc=class e extends Do{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new ho(c,3)),this.setAttribute(`normal`,new ho(l,3)),this.setAttribute(`uv`,new ho(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new K;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},sc=class e extends Do{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new ho(i,3)),this.setAttribute(`normal`,new ho(i.slice(),3)),this.setAttribute(`uv`,new ho(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new K,r=new K,i=new K;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new K;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new K;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new K,t=new K,n=new K,r=new K,o=new G,s=new G,c=new G;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},cc=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){H(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new G:new K);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new K,r=[],i=[],a=[],o=new K,s=new Y;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new K)}i[0]=new K,a[0]=new K;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(W(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(W(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},lc=class extends cc{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new G){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},uc=class extends lc{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function dc(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var fc=new K,pc=new dc,mc=new dc,hc=new dc,gc=class extends cc{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new K){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(fc.subVectors(r[0],r[1]).add(r[0]),c=fc);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(fc.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=fc),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),pc.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),mc.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),hc.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(pc.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),mc.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),hc.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(pc.calc(s),mc.calc(s),hc.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new K().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function _c(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function vc(e,t){let n=1-e;return n*n*t}function yc(e,t){return 2*(1-e)*e*t}function bc(e,t){return e*e*t}function xc(e,t,n,r){return vc(e,t)+yc(e,n)+bc(e,r)}function Sc(e,t){let n=1-e;return n*n*n*t}function Cc(e,t){let n=1-e;return 3*n*n*e*t}function wc(e,t){return 3*(1-e)*e*e*t}function Tc(e,t){return e*e*e*t}function Ec(e,t,n,r,i){return Sc(e,t)+Cc(e,n)+wc(e,r)+Tc(e,i)}var Dc=class extends cc{constructor(e=new G,t=new G,n=new G,r=new G){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new G){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Ec(e,r.x,i.x,a.x,o.x),Ec(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Oc=class extends cc{constructor(e=new K,t=new K,n=new K,r=new K){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new K){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Ec(e,r.x,i.x,a.x,o.x),Ec(e,r.y,i.y,a.y,o.y),Ec(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},kc=class extends cc{constructor(e=new G,t=new G){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new G){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new G){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ac=class extends cc{constructor(e=new K,t=new K){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new K){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new K){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},jc=class extends cc{constructor(e=new G,t=new G,n=new G){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new G){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(xc(e,r.x,i.x,a.x),xc(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Mc=class extends cc{constructor(e=new K,t=new K,n=new K){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new K){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(xc(e,r.x,i.x,a.x),xc(e,r.y,i.y,a.y),xc(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Nc=Object.freeze({__proto__:null,ArcCurve:uc,CatmullRomCurve3:gc,CubicBezierCurve:Dc,CubicBezierCurve3:Oc,EllipseCurve:lc,LineCurve:kc,LineCurve3:Ac,QuadraticBezierCurve:jc,QuadraticBezierCurve3:Mc,SplineCurve:class extends cc{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new G){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(_c(o,s.x,c.x,l.x,u.x),_c(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new G().fromArray(n))}return this}}}),Pc=class e extends sc{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Fc=class e extends Do{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new ho(p,3)),this.setAttribute(`normal`,new ho(m,3)),this.setAttribute(`uv`,new ho(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},Ic=class e extends Do{constructor(e=new Mc(new K(-1,-1,0),new K(-1,1,0),new K(1,1,0)),t=64,n=1,r=8,i=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:i};let a=e.computeFrenetFrames(t,i);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new K,s=new K,c=new G,l=new K,u=[],d=[],f=[],p=[];m(),this.setIndex(p),this.setAttribute(`position`,new ho(u,3)),this.setAttribute(`normal`,new ho(d,3)),this.setAttribute(`uv`,new ho(f,2));function m(){for(let e=0;e<t;e++)h(e);h(i===!1?t:0),_(),g()}function h(i){l=e.getPointAt(i/t,l);let c=a.normals[i],f=a.binormals[i];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,i=Math.sin(t),a=-Math.cos(t);s.x=a*c.x+i*f.x,s.y=a*c.y+i*f.y,s.z=a*c.z+i*f.z,s.normalize(),d.push(s.x,s.y,s.z),o.x=l.x+n*s.x,o.y=l.y+n*s.y,o.z=l.z+n*s.z,u.push(o.x,o.y,o.z)}}function g(){for(let e=1;e<=t;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,o=(r+1)*(e-1)+t;p.push(n,i,o),p.push(i,a,o)}}function _(){for(let e=0;e<=t;e++)for(let n=0;n<=r;n++)c.x=e/t,c.y=n/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(t){return new e(new Nc[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function Lc(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(H(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone():Array.isArray(i)?t[n][r]=i.slice():t[n][r]=i}}return t}function Rc(e){let t={};for(let n=0;n<e.length;n++){let r=Lc(e[n]);for(let e in r)t[e]=r[e]}return t}function zc(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Bc(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:J.workingColorSpace}var Vc={clone:Lc,merge:Rc},Hc=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Uc=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Wc=class extends Mo{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Hc,this.fragmentShader=Uc,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Lc(e.uniforms),this.uniformsGroups=zc(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},Gc=class extends Wc{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},Kc=class extends Mo{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new X(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new X(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new G(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new oa,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},qc=class extends Kc{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new G(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return W(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new X(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new X(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new X(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},Jc=class extends Mo{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type=`MeshLambertMaterial`,this.color=new X(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new X(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new G(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new oa,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Yc=class extends Mo{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Rr,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Xc=class extends Mo{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Zc(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function Qc(e){function t(t,n){return e[t]-e[n]}let n=e.length,r=Array(n);for(let e=0;e!==n;++e)r[e]=e;return r.sort(t),r}function $c(e,t,n){let r=e.length,i=new e.constructor(r);for(let a=0,o=0;o!==r;++a){let r=n[a]*t;for(let n=0;n!==t;++n)i[o++]=e[r+n]}return i}function el(e,t,n,r){let i=1,a=e[0];for(;a!==void 0&&a[r]===void 0;)a=e[i++];if(a===void 0)return;let o=a[r];if(o!==void 0){if(Array.isArray(o))do o=a[r],o!==void 0&&(t.push(a.time),n.push(...o)),a=e[i++];while(a!==void 0);else if(o.toArray!==void 0)do o=a[r],o!==void 0&&(t.push(a.time),o.toArray(n,n.length)),a=e[i++];while(a!==void 0);else do o=a[r],o!==void 0&&(t.push(a.time),n.push(o)),a=e[i++];while(a!==void 0)}}var tl=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`call to abstract method`)}intervalChanged_(){}},nl=class extends tl{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Pr,endingEnd:Pr}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Fr:i=e,o=2*t-n;break;case Ir:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Fr:a=e,s=2*n-t;break;case Ir:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},rl=class extends tl{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},il=class extends tl{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},al=class extends tl{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.settings||this.DefaultSettings_,u=l.inTangents,d=l.outTangents;if(!u||!d){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let f=o*2,p=e-1;for(let l=0;l!==o;++l){let o=a[c+l],m=a[s+l],h=p*f+l*2,g=d[h],_=d[h+1],v=e*f+l*2,y=u[v],b=u[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[l]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},ol=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=Zc(t,this.TimeBufferType),this.values=Zc(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Zc(e.times,Array),values:Zc(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new il(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new rl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new nl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new al(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case Ar:t=this.InterpolantFactoryMethodDiscrete;break;case jr:t=this.InterpolantFactoryMethodLinear;break;case Mr:t=this.InterpolantFactoryMethodSmooth;break;case Nr:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return H(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ar;case this.InterpolantFactoryMethodLinear:return jr;case this.InterpolantFactoryMethodSmooth:return Mr;case this.InterpolantFactoryMethodBezier:return Nr}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(U(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(U(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){U(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){U(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&qr(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){U(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Mr,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};ol.prototype.ValueTypeName=``,ol.prototype.TimeBufferType=Float32Array,ol.prototype.ValueBufferType=Float32Array,ol.prototype.DefaultInterpolation=jr;var sl=class extends ol{constructor(e,t,n){super(e,t,n)}};sl.prototype.ValueTypeName=`bool`,sl.prototype.ValueBufferType=Array,sl.prototype.DefaultInterpolation=Ar,sl.prototype.InterpolantFactoryMethodLinear=void 0,sl.prototype.InterpolantFactoryMethodSmooth=void 0;var cl=class extends ol{constructor(e,t,n,r){super(e,t,n,r)}};cl.prototype.ValueTypeName=`color`;var ll=class extends ol{constructor(e,t,n,r){super(e,t,n,r)}};ll.prototype.ValueTypeName=`number`;var ul=class extends tl{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)ki.slerpFlat(i,0,a,c-o,a,c,s);return i}},dl=class extends ol{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new ul(this.times,this.values,this.getValueSize(),e)}};dl.prototype.ValueTypeName=`quaternion`,dl.prototype.InterpolantFactoryMethodSmooth=void 0;var fl=class extends ol{constructor(e,t,n){super(e,t,n)}};fl.prototype.ValueTypeName=`string`,fl.prototype.ValueBufferType=Array,fl.prototype.DefaultInterpolation=Ar,fl.prototype.InterpolantFactoryMethodLinear=void 0,fl.prototype.InterpolantFactoryMethodSmooth=void 0;var pl=class extends ol{constructor(e,t,n,r){super(e,t,n,r)}};pl.prototype.ValueTypeName=`vector`;var ml=class{constructor(e=``,t=-1,n=[],r=Lr){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=si(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,r=1/(e.fps||1);for(let e=0,i=n.length;e!==i;++e)t.push(gl(n[e]).scale(r));let i=new this(e.name,e.duration,t,e.blendMode);return i.uuid=e.uuid,i.userData=JSON.parse(e.userData||`{}`),i}static toJSON(e){let t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let e=0,r=n.length;e!==r;++e)t.push(ol.toJSON(n[e]));return r}static CreateFromMorphTargetSequence(e,t,n,r){let i=t.length,a=[];for(let e=0;e<i;e++){let o=[],s=[];o.push((e+i-1)%i,e,(e+1)%i),s.push(0,1,0);let c=Qc(o);o=$c(o,1,c),s=$c(s,1,c),!r&&o[0]===0&&(o.push(i),s.push(s[0])),a.push(new ll(`.morphTargetInfluences[`+t[e].name+`]`,o,s).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let t=e;n=t.geometry&&t.geometry.animations||t.animations}for(let e=0;e<n.length;e++)if(n[e].name===t)return n[e];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let r={},i=/^([\w-]*?)([\d]+)$/;for(let t=0,n=e.length;t<n;t++){let n=e[t],a=n.name.match(i);if(a&&a.length>1){let e=a[1],t=r[e];t||(r[e]=t=[]),t.push(n)}}let a=[];for(let e in r)a.push(this.CreateFromMorphTargetSequence(e,r[e],t,n));return a}static parseAnimation(e,t){if(H(`AnimationClip: parseAnimation() is deprecated and will be removed with r185`),!e)return U(`AnimationClip: No animation in JSONLoader data.`),null;let n=function(e,t,n,r,i){if(n.length!==0){let a=[],o=[];el(n,a,o,r),a.length!==0&&i.push(new e(t,a,o))}},r=[],i=e.name||`default`,a=e.fps||30,o=e.blendMode,s=e.length||-1,c=e.hierarchy||[];for(let e=0;e<c.length;e++){let i=c[e].keys;if(i&&i.length!==0){if(i[0].morphTargets){let e={},t=0;for(;t<i.length;t++)if(i[t].morphTargets)for(let n=0;n<i[t].morphTargets.length;n++)e[i[t].morphTargets[n]]=-1;for(let n in e){let e=[],a=[];for(let r=0;r!==i[t].morphTargets.length;++r){let r=i[t];e.push(r.time),a.push(+(r.morphTarget===n))}r.push(new ll(`.morphTargetInfluence[`+n+`]`,e,a))}s=e.length*a}else{let a=`.bones[`+t[e].name+`]`;n(pl,a+`.position`,i,`pos`,r),n(dl,a+`.quaternion`,i,`rot`,r),n(pl,a+`.scale`,i,`scl`,r)}}}return r.length===0?null:new this(i,s,r,o)}resetDuration(){let e=this.tracks,t=0;for(let n=0,r=e.length;n!==r;++n){let e=this.tracks[n];t=Math.max(t,e.times[e.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e&&=this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function hl(e){switch(e.toLowerCase()){case`scalar`:case`double`:case`float`:case`number`:case`integer`:return ll;case`vector`:case`vector2`:case`vector3`:case`vector4`:return pl;case`color`:return cl;case`quaternion`:return dl;case`bool`:case`boolean`:return sl;case`string`:return fl}throw Error(`THREE.KeyframeTrack: Unsupported typeName: `+e)}function gl(e){if(e.type===void 0)throw Error(`THREE.KeyframeTrack: track type undefined, can not parse`);let t=hl(e.type);if(e.times===void 0){let t=[],n=[];el(e.keys,t,n,`value`),e.times=t,e.values=n}return t.parse===void 0?new t(e.name,e.times,e.values,e.interpolation):t.parse(e)}var _l={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(vl(e)||(this.files[e]=t))},get:function(e){if(this.enabled!==!1&&!vl(e))return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}};function vl(e){try{let t=e.slice(e.indexOf(`:`)+1);return new URL(t).protocol===`blob:`}catch{return!1}}var yl=new class{constructor(e,t,n){let r=this,i=!1,a=0,o=0,s,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(e){o++,i===!1&&r.onStart!==void 0&&r.onStart(e,a,o),i=!0},this.itemEnd=function(e){a++,r.onProgress!==void 0&&r.onProgress(e,a,o),a===o&&(i=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(e){r.onError!==void 0&&r.onError(e)},this.resolveURL=function(e){return s?s(e):e},this.setURLModifier=function(e){return s=e,this},this.addHandler=function(e,t){return c.push(e,t),this},this.removeHandler=function(e){let t=c.indexOf(e);return t!==-1&&c.splice(t,2),this},this.getHandler=function(e){for(let t=0,n=c.length;t<n;t+=2){let n=c[t],r=c[t+1];if(n.global&&(n.lastIndex=0),n.test(e))return r}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||=new AbortController,this._abortController}},bl=class{constructor(e){this.manager=e===void 0?yl:e,this.crossOrigin=`anonymous`,this.withCredentials=!1,this.path=``,this.resourcePath=``,this.requestHeader={},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,i){n.load(e,r,t,i)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};bl.DEFAULT_MATERIAL_NAME=`__DEFAULT`;var xl={},Sl=class extends Error{constructor(e,t){super(e),this.response=t}},Cl=class extends bl{constructor(e){super(e),this.mimeType=``,this.responseType=``,this._abortController=new AbortController}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=_l.get(`file:${e}`);if(i!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(i),this.manager.itemEnd(e)},0),i;if(xl[e]!==void 0){xl[e].push({onLoad:t,onProgress:n,onError:r});return}xl[e]=[],xl[e].push({onLoad:t,onProgress:n,onError:r});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?`include`:`same-origin`,signal:typeof AbortSignal.any==`function`?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,s=this.responseType;fetch(a).then(t=>{if(t.status===200||t.status===0){if(t.status===0&&H(`FileLoader: HTTP Status 0 received.`),typeof ReadableStream>`u`||t.body===void 0||t.body.getReader===void 0)return t;let n=xl[e],r=t.body.getReader(),i=t.headers.get(`X-File-Size`)||t.headers.get(`Content-Length`),a=i?parseInt(i):0,o=a!==0,s=0,c=new ReadableStream({start(e){t();function t(){r.read().then(({done:r,value:i})=>{if(r)e.close();else{s+=i.byteLength;let r=new ProgressEvent(`progress`,{lengthComputable:o,loaded:s,total:a});for(let e=0,t=n.length;e<t;e++){let t=n[e];t.onProgress&&t.onProgress(r)}e.enqueue(i),t()}},t=>{e.error(t)})}}});return new Response(c)}throw new Sl(`fetch for "${t.url}" responded with ${t.status}: ${t.statusText}`,t)}).then(e=>{switch(s){case`arraybuffer`:return e.arrayBuffer();case`blob`:return e.blob();case`document`:return e.text().then(e=>new DOMParser().parseFromString(e,o));case`json`:return e.json();default:if(o===``)return e.text();{let t=/charset="?([^;"\s]*)"?/i.exec(o),n=t&&t[1]?t[1].toLowerCase():void 0,r=new TextDecoder(n);return e.arrayBuffer().then(e=>r.decode(e))}}}).then(t=>{_l.add(`file:${e}`,t);let n=xl[e];delete xl[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onLoad&&r.onLoad(t)}}).catch(t=>{let n=xl[e];if(n===void 0)throw this.manager.itemError(e),t;delete xl[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onError&&r.onError(t)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},wl=new WeakMap,Tl=class extends bl{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=_l.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)i.manager.itemStart(e),setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0);else{let e=wl.get(a);e===void 0&&(e=[],wl.set(a,e)),e.push({onLoad:t,onError:r})}return a}let o=Jr(`img`);function s(){l(),t&&t(this);let n=wl.get(this)||[];for(let e=0;e<n.length;e++){let t=n[e];t.onLoad&&t.onLoad(this)}wl.delete(this),i.manager.itemEnd(e)}function c(t){l(),r&&r(t),_l.remove(`image:${e}`);let n=wl.get(this)||[];for(let e=0;e<n.length;e++){let r=n[e];r.onError&&r.onError(t)}wl.delete(this),i.manager.itemError(e),i.manager.itemEnd(e)}function l(){o.removeEventListener(`load`,s,!1),o.removeEventListener(`error`,c,!1)}return o.addEventListener(`load`,s,!1),o.addEventListener(`error`,c,!1),e.slice(0,5)!==`data:`&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),_l.add(`image:${e}`,o),i.manager.itemStart(e),o.src=e,o}},El=class extends bl{constructor(e){super(e)}load(e,t,n,r){let i=new Gi,a=new Tl(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(e){i.image=e,i.needsUpdate=!0,t!==void 0&&t(i)},n,r),i}},Dl=class extends Ca{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new X(e),this.intensity=t}dispose(){this.dispatchEvent({type:`dispose`})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Ol=class extends Dl{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(Ca.DEFAULT_UP),this.updateMatrix(),this.groundColor=new X(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},kl=new Y,Al=new K,jl=new K,Ml=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new G(512,512),this.mapType=Tn,this.map=null,this.mapPass=null,this.matrix=new Y,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ns,this._frameExtents=new G(1,1),this._viewportCount=1,this._viewports=[new Ki(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Al.setFromMatrixPosition(e.matrixWorld),t.position.copy(Al),jl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(jl),t.updateMatrixWorld(),kl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(kl,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===2001||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(kl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Nl=new K,Pl=new ki,Fl=new K,Il=class extends Ca{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new Y,this.projectionMatrix=new Y,this.projectionMatrixInverse=new Y,this.coordinateSystem=Gr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Nl,Pl,Fl),Fl.x===1&&Fl.y===1&&Fl.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Nl,Pl,Fl.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Nl,Pl,Fl),Fl.x===1&&Fl.y===1&&Fl.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Nl,Pl,Fl.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ll=new K,Rl=new G,zl=new G,Bl=class extends Il{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=oi*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(ai*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return oi*2*Math.atan(Math.tan(ai*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ll.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ll.x,Ll.y).multiplyScalar(-e/Ll.z),Ll.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ll.x,Ll.y).multiplyScalar(-e/Ll.z)}getViewSize(e,t){return this.getViewBounds(e,Rl,zl),t.subVectors(zl,Rl)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(ai*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Vl=class extends Ml{constructor(){super(new Bl(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=oi*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Hl=class extends Dl{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(Ca.DEFAULT_UP),this.updateMatrix(),this.target=new Ca,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new Vl}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},Ul=class extends Ml{constructor(){super(new Bl(90,1,.5,500)),this.isPointLightShadow=!0}},Wl=class extends Dl{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Ul}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},Gl=class extends Il{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Kl=class extends Ml{constructor(){super(new Gl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ql=class extends Dl{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(Ca.DEFAULT_UP),this.updateMatrix(),this.target=new Ca,this.shadow=new Kl}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Jl=class{static extractUrlBase(e){let t=e.lastIndexOf(`/`);return t===-1?`./`:e.slice(0,t+1)}static resolveURL(e,t){return typeof e!=`string`||e===``?``:(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,`$1`)),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}},Yl=new WeakMap,Xl=class extends bl{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>`u`&&H(`ImageBitmapLoader: createImageBitmap() not supported.`),typeof fetch>`u`&&H(`ImageBitmapLoader: fetch() not supported.`),this.options={premultiplyAlpha:`none`},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=_l.get(`image-bitmap:${e}`);if(a!==void 0){if(i.manager.itemStart(e),a.then){a.then(n=>{if(Yl.has(a)===!0)r&&r(Yl.get(a)),i.manager.itemError(e),i.manager.itemEnd(e);else return t&&t(n),i.manager.itemEnd(e),n});return}return setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0),a}let o={};o.credentials=this.crossOrigin===`anonymous`?`same-origin`:`include`,o.headers=this.requestHeader,o.signal=typeof AbortSignal.any==`function`?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let s=fetch(e,o).then(function(e){return e.blob()}).then(function(e){return createImageBitmap(e,Object.assign(i.options,{colorSpaceConversion:`none`}))}).then(function(n){return _l.add(`image-bitmap:${e}`,n),t&&t(n),i.manager.itemEnd(e),n}).catch(function(t){r&&r(t),Yl.set(s,t),_l.remove(`image-bitmap:${e}`),i.manager.itemError(e),i.manager.itemEnd(e)});_l.add(`image-bitmap:${e}`,s),i.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},Zl=-90,Ql=1,$l=class extends Ca{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Bl(Zl,Ql,e,t);r.layers=this.layers,this.add(r);let i=new Bl(Zl,Ql,e,t);i.layers=this.layers,this.add(i);let a=new Bl(Zl,Ql,e,t);a.layers=this.layers,this.add(a);let o=new Bl(Zl,Ql,e,t);o.layers=this.layers,this.add(o);let s=new Bl(Zl,Ql,e,t);s.layers=this.layers,this.add(s);let c=new Bl(Zl,Ql,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},eu=class extends Bl{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},tu=`\\[\\]\\.:\\/`,nu=RegExp(`[\\[\\]\\.:\\/]`,`g`),ru=`[^\\[\\]\\.:\\/]`,iu=`[^`+tu.replace(`\\.`,``)+`]`,au=`((?:WC+[\\/:])*)`.replace(`WC`,ru),ou=`(WCOD+)?`.replace(`WCOD`,iu),su=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,ru),cu=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,ru),lu=RegExp(`^`+au+ou+su+cu+`$`),uu=[`material`,`materials`,`bones`,`map`],du=class{constructor(e,t,n){let r=n||fu.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},fu=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(nu,``)}static parseTrackName(e){let t=lu.exec(e);if(t===null)throw Error(`PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);uu.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){H(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){U(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){U(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){U(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){U(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){U(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){U(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){U(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;U(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){U(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){U(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};fu.Composite=du,fu.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},fu.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},fu.prototype.GetterByBindingType=[fu.prototype._getValue_direct,fu.prototype._getValue_array,fu.prototype._getValue_arrayElement,fu.prototype._getValue_toArray],fu.prototype.SetterByBindingTypeAndVersioning=[[fu.prototype._setValue_direct,fu.prototype._setValue_direct_setNeedsUpdate,fu.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[fu.prototype._setValue_array,fu.prototype._setValue_array_setNeedsUpdate,fu.prototype._setValue_array_setMatrixWorldNeedsUpdate],[fu.prototype._setValue_arrayElement,fu.prototype._setValue_arrayElement_setNeedsUpdate,fu.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[fu.prototype._setValue_fromArray,fu.prototype._setValue_fromArray_setNeedsUpdate,fu.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];function pu(e,t,n,r){let i=mu(r);switch(n){case Rn:return e*t;case Un:return e*t/i.components*i.byteLength;case Wn:return e*t/i.components*i.byteLength;case Gn:return e*t*2/i.components*i.byteLength;case Kn:return e*t*2/i.components*i.byteLength;case zn:return e*t*3/i.components*i.byteLength;case Bn:return e*t*4/i.components*i.byteLength;case qn:return e*t*4/i.components*i.byteLength;case Jn:case Yn:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case Xn:case Zn:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case $n:case tr:return Math.max(e,16)*Math.max(t,8)/4;case Qn:case er:return Math.max(e,8)*Math.max(t,8)/2;case nr:case rr:case ar:case or:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ir:case sr:case cr:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case lr:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ur:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case dr:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case fr:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case pr:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case mr:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case hr:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case gr:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case _r:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case vr:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case yr:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case br:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case xr:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Sr:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Cr:case wr:case Tr:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Er:case Dr:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Or:case kr:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function mu(e){switch(e){case Tn:case En:return{byteLength:1,components:1};case On:case Dn:case Mn:return{byteLength:2,components:1};case Nn:case Pn:return{byteLength:2,components:4};case An:case kn:case jn:return{byteLength:4,components:1};case In:case Ln:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`183`}})),typeof window<`u`&&(window.__THREE__?H(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`183`);function hu(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function gu(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Z={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Q={common:{diffuse:{value:new X(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new q}},envmap:{envMap:{value:null},envMapRotation:{value:new q},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new q}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new q}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new q},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new q},normalScale:{value:new G(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new q},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new q}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new q}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new q}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new X(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new X(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0},uvTransform:{value:new q}},sprite:{diffuse:{value:new X(16777215)},opacity:{value:1},center:{value:new G(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}}},_u={basic:{uniforms:Rc([Q.common,Q.specularmap,Q.envmap,Q.aomap,Q.lightmap,Q.fog]),vertexShader:Z.meshbasic_vert,fragmentShader:Z.meshbasic_frag},lambert:{uniforms:Rc([Q.common,Q.specularmap,Q.envmap,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.fog,Q.lights,{emissive:{value:new X(0)},envMapIntensity:{value:1}}]),vertexShader:Z.meshlambert_vert,fragmentShader:Z.meshlambert_frag},phong:{uniforms:Rc([Q.common,Q.specularmap,Q.envmap,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.fog,Q.lights,{emissive:{value:new X(0)},specular:{value:new X(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Z.meshphong_vert,fragmentShader:Z.meshphong_frag},standard:{uniforms:Rc([Q.common,Q.envmap,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.roughnessmap,Q.metalnessmap,Q.fog,Q.lights,{emissive:{value:new X(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Z.meshphysical_vert,fragmentShader:Z.meshphysical_frag},toon:{uniforms:Rc([Q.common,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.gradientmap,Q.fog,Q.lights,{emissive:{value:new X(0)}}]),vertexShader:Z.meshtoon_vert,fragmentShader:Z.meshtoon_frag},matcap:{uniforms:Rc([Q.common,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.fog,{matcap:{value:null}}]),vertexShader:Z.meshmatcap_vert,fragmentShader:Z.meshmatcap_frag},points:{uniforms:Rc([Q.points,Q.fog]),vertexShader:Z.points_vert,fragmentShader:Z.points_frag},dashed:{uniforms:Rc([Q.common,Q.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Z.linedashed_vert,fragmentShader:Z.linedashed_frag},depth:{uniforms:Rc([Q.common,Q.displacementmap]),vertexShader:Z.depth_vert,fragmentShader:Z.depth_frag},normal:{uniforms:Rc([Q.common,Q.bumpmap,Q.normalmap,Q.displacementmap,{opacity:{value:1}}]),vertexShader:Z.meshnormal_vert,fragmentShader:Z.meshnormal_frag},sprite:{uniforms:Rc([Q.sprite,Q.fog]),vertexShader:Z.sprite_vert,fragmentShader:Z.sprite_frag},background:{uniforms:{uvTransform:{value:new q},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Z.background_vert,fragmentShader:Z.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new q}},vertexShader:Z.backgroundCube_vert,fragmentShader:Z.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Z.cube_vert,fragmentShader:Z.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Z.equirect_vert,fragmentShader:Z.equirect_frag},distance:{uniforms:Rc([Q.common,Q.displacementmap,{referencePosition:{value:new K},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Z.distance_vert,fragmentShader:Z.distance_frag},shadow:{uniforms:Rc([Q.lights,Q.fog,{color:{value:new X(0)},opacity:{value:1}}]),vertexShader:Z.shadow_vert,fragmentShader:Z.shadow_frag}};_u.physical={uniforms:Rc([_u.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new q},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new q},clearcoatNormalScale:{value:new G(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new q},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new q},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new q},sheen:{value:0},sheenColor:{value:new X(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new q},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new q},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new q},transmissionSamplerSize:{value:new G},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new q},attenuationDistance:{value:0},attenuationColor:{value:new X(0)},specularColor:{value:new X(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new q},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new q},anisotropyVector:{value:new G},anisotropyMap:{value:null},anisotropyMapTransform:{value:new q}}]),vertexShader:Z.meshphysical_vert,fragmentShader:Z.meshphysical_frag};var vu={r:0,b:0,g:0},yu=new oa,bu=new Y;function xu(e,t,n,r,i,a){let o=new X(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new $o(new oc(1,1,1),new Wc({name:`BackgroundCubeMaterial`,uniforms:Lc(_u.backgroundCube.uniforms),vertexShader:_u.backgroundCube.vertexShader,fragmentShader:_u.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),yu.copy(n.backgroundRotation),yu.x*=-1,yu.y*=-1,yu.z*=-1,i.isCubeTexture&&i.isRenderTargetTexture===!1&&(yu.y*=-1,yu.z*=-1),l.material.uniforms.envMap.value=i,l.material.uniforms.flipEnvMap.value=i.isCubeTexture&&i.isRenderTargetTexture===!1?-1:1,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(bu.makeRotationFromEuler(yu)),l.material.toneMapped=J.getTransfer(i.colorSpace)!==Hr,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new $o(new Fc(2,2),new Wc({name:`BackgroundMaterial`,uniforms:Lc(_u.background.uniforms),vertexShader:_u.background.vertexShader,fragmentShader:_u.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=J.getTransfer(i.colorSpace)!==Hr,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(vu,Bc(e)),n.buffers.color.setClear(vu.r,vu.g,vu.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function Su(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function Cu(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}function c(e,i,a,s){if(a===0)return;let c=t.get(`WEBGL_multi_draw`);if(c===null)for(let t=0;t<e.length;t++)o(e[t],i[t],s[t]);else{c.multiDrawArraysInstancedWEBGL(r,e,0,i,0,s,0,a);let t=0;for(let e=0;e<a;e++)t+=i[e]*s[e];n.update(t,r,1)}}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s,this.renderMultiDrawInstances=c}function wu(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(H(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function Tu(e){let t=this,n=null,r=0,i=!1,a=!1,o=new ks,s=new q,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Eu=4,Du=[.125,.215,.35,.446,.526,.582],Ou=20,ku=256,Au=new Gl,ju=new X,Mu=null,Nu=0,Pu=0,Fu=!1,Iu=new K,Lu=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Iu}=i;Mu=this._renderer.getRenderTarget(),Nu=this._renderer.getActiveCubeFace(),Pu=this._renderer.getActiveMipmapLevel(),Fu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Wu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Uu(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Mu,Nu,Pu),this._renderer.xr.enabled=Fu,e.scissorTest=!1,Bu(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Mu=this._renderer.getRenderTarget(),Nu=this._renderer.getActiveCubeFace(),Pu=this._renderer.getActiveMipmapLevel(),Fu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Sn,minFilter:Sn,generateMipmaps:!1,type:Mn,format:Bn,colorSpace:Br,depthBuffer:!1},r=zu(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=zu(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Ru(r)),this._blurMaterial=Hu(r,e,t),this._ggxMaterial=Vu(r,e,t)}return r}_compileMaterial(e){let t=new $o(new Do,e);this._renderer.compile(t,Au)}_sceneToCubeUV(e,t,n,r,i){let a=new Bl(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(ju),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new $o(new oc,new Vo({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(ju),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Bu(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Wu()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Uu());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Bu(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,Au)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-Eu?n-d+Eu:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Bu(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,Au),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Bu(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,Au)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&U(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):Ou;m>Ou&&H(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ou}`);let h=[],g=0;for(let e=0;e<Ou;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];Bu(t,3*v*(r>_-Eu?r-_+Eu:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,Au)}};function Ru(e){let t=[],n=[],r=[],i=e,a=e-Eu+1+Du.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-Eu?s=Du[o-e+Eu-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new Do;h.setAttribute(`position`,new fo(f,3)),h.setAttribute(`uv`,new fo(p,2)),h.setAttribute(`faceIndex`,new fo(m,1)),r.push(new $o(h,null)),i>Eu&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function zu(e,t,n){let r=new Ji(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Bu(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Vu(e,t,n){return new Wc({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:ku,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Gu(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Hu(e,t,n){let r=new Float32Array(Ou),i=new K(0,1,0);return new Wc({name:`SphericalGaussianBlur`,defines:{n:Ou,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Gu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Uu(){return new Wc({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Gu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Wu(){return new Wc({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Gu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Gu(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var Ku=class extends Ji{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new tc(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new oc(5,5,5),i=new Wc({name:`CubemapFromEquirect`,uniforms:Lc(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new $o(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=Sn),new $l(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function qu(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Ku(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Lu(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Lu(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Ju(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&$r(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Yu(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0||(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++),t}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?mo:po)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Xu(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}function d(e,i,s,c){if(s===0)return;let u=t.get(`WEBGL_multi_draw`);if(u===null)for(let t=0;t<e.length;t++)l(e[t]/o,i[t],c[t]);else{u.multiDrawElementsInstancedWEBGL(r,i,0,a,e,0,c,0,s);let t=0;for(let e=0;e<s;e++)t+=i[e]*c[e];n.update(t,r,1)}}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=d}function Zu(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:U(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Qu(e,t,n){let r=new WeakMap,i=new Ki;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new Yi(h,p,m,u);g.type=jn,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new G(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function $u(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var ed={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function td(e,t,n,r,i){let a=new Ji(t,n,{type:e,depthBuffer:r,stencilBuffer:i}),o=new Ji(t,n,{type:Mn,depthBuffer:!1,stencilBuffer:!1}),s=new Do;s.setAttribute(`position`,new ho([-1,3,0,-1,-1,0,3,-1,0],3)),s.setAttribute(`uv`,new ho([0,2,0,0,2,0],2));let c=new Gc({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),l=new $o(s,c),u=new Gl(-1,1,1,-1,0,1),d=null,f=null,p=!1,m,h=null,g=[],_=!1;this.setSize=function(e,t){a.setSize(e,t),o.setSize(e,t);for(let n=0;n<g.length;n++){let r=g[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){g=e,_=g.length>0&&g[0].isRenderPass===!0;let t=a.width,n=a.height;for(let e=0;e<g.length;e++){let r=g[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(p||e.toneMapping===0&&g.length===0)return!1;if(h=t,t!==null){let e=t.width,n=t.height;(a.width!==e||a.height!==n)&&this.setSize(e,n)}return _===!1&&e.setRenderTarget(a),m=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return _},this.end=function(e,t){e.toneMapping=m,p=!0;let n=a,r=o;for(let i=0;i<g.length;i++){let a=g[i];if(a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1)){let e=n;n=r,r=e}}if(d!==e.outputColorSpace||f!==e.toneMapping){d=e.outputColorSpace,f=e.toneMapping,c.defines={},J.getTransfer(d)===`srgb`&&(c.defines.SRGB_TRANSFER=``);let t=ed[f];t&&(c.defines[t]=``),c.needsUpdate=!0}c.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(h),e.render(l,u),h=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){a.dispose(),o.dispose(),s.dispose(),c.dispose()}}var nd=new Gi,rd=new rc(1,1),id=new Yi,ad=new Xi,od=new tc,sd=[],cd=[],ld=new Float32Array(16),ud=new Float32Array(9),dd=new Float32Array(4);function fd(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=sd[i];if(a===void 0&&(a=new Float32Array(i),sd[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function pd(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function md(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function hd(e,t){let n=cd[t];n===void 0&&(n=new Int32Array(t),cd[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function gd(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function _d(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(pd(n,t))return;e.uniform2fv(this.addr,t),md(n,t)}}function vd(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(pd(n,t))return;e.uniform3fv(this.addr,t),md(n,t)}}function yd(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(pd(n,t))return;e.uniform4fv(this.addr,t),md(n,t)}}function bd(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(pd(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),md(n,t)}else{if(pd(n,r))return;dd.set(r),e.uniformMatrix2fv(this.addr,!1,dd),md(n,r)}}function xd(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(pd(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),md(n,t)}else{if(pd(n,r))return;ud.set(r),e.uniformMatrix3fv(this.addr,!1,ud),md(n,r)}}function Sd(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(pd(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),md(n,t)}else{if(pd(n,r))return;ld.set(r),e.uniformMatrix4fv(this.addr,!1,ld),md(n,r)}}function Cd(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function wd(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(pd(n,t))return;e.uniform2iv(this.addr,t),md(n,t)}}function Td(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(pd(n,t))return;e.uniform3iv(this.addr,t),md(n,t)}}function Ed(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(pd(n,t))return;e.uniform4iv(this.addr,t),md(n,t)}}function Dd(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Od(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(pd(n,t))return;e.uniform2uiv(this.addr,t),md(n,t)}}function kd(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(pd(n,t))return;e.uniform3uiv(this.addr,t),md(n,t)}}function Ad(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(pd(n,t))return;e.uniform4uiv(this.addr,t),md(n,t)}}function jd(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(rd.compareFunction=n.isReversedDepthBuffer()?518:515,a=rd):a=nd,n.setTexture2D(t||a,i)}function Md(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||ad,i)}function Nd(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||od,i)}function Pd(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||id,i)}function Fd(e){switch(e){case 5126:return gd;case 35664:return _d;case 35665:return vd;case 35666:return yd;case 35674:return bd;case 35675:return xd;case 35676:return Sd;case 5124:case 35670:return Cd;case 35667:case 35671:return wd;case 35668:case 35672:return Td;case 35669:case 35673:return Ed;case 5125:return Dd;case 36294:return Od;case 36295:return kd;case 36296:return Ad;case 35678:case 36198:case 36298:case 36306:case 35682:return jd;case 35679:case 36299:case 36307:return Md;case 35680:case 36300:case 36308:case 36293:return Nd;case 36289:case 36303:case 36311:case 36292:return Pd}}function Id(e,t){e.uniform1fv(this.addr,t)}function Ld(e,t){let n=fd(t,this.size,2);e.uniform2fv(this.addr,n)}function Rd(e,t){let n=fd(t,this.size,3);e.uniform3fv(this.addr,n)}function zd(e,t){let n=fd(t,this.size,4);e.uniform4fv(this.addr,n)}function Bd(e,t){let n=fd(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Vd(e,t){let n=fd(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Hd(e,t){let n=fd(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Ud(e,t){e.uniform1iv(this.addr,t)}function Wd(e,t){e.uniform2iv(this.addr,t)}function Gd(e,t){e.uniform3iv(this.addr,t)}function Kd(e,t){e.uniform4iv(this.addr,t)}function qd(e,t){e.uniform1uiv(this.addr,t)}function Jd(e,t){e.uniform2uiv(this.addr,t)}function Yd(e,t){e.uniform3uiv(this.addr,t)}function Xd(e,t){e.uniform4uiv(this.addr,t)}function Zd(e,t,n){let r=this.cache,i=t.length,a=hd(n,i);pd(r,a)||(e.uniform1iv(this.addr,a),md(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?rd:nd;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Qd(e,t,n){let r=this.cache,i=t.length,a=hd(n,i);pd(r,a)||(e.uniform1iv(this.addr,a),md(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||ad,a[e])}function $d(e,t,n){let r=this.cache,i=t.length,a=hd(n,i);pd(r,a)||(e.uniform1iv(this.addr,a),md(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||od,a[e])}function ef(e,t,n){let r=this.cache,i=t.length,a=hd(n,i);pd(r,a)||(e.uniform1iv(this.addr,a),md(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||id,a[e])}function tf(e){switch(e){case 5126:return Id;case 35664:return Ld;case 35665:return Rd;case 35666:return zd;case 35674:return Bd;case 35675:return Vd;case 35676:return Hd;case 5124:case 35670:return Ud;case 35667:case 35671:return Wd;case 35668:case 35672:return Gd;case 35669:case 35673:return Kd;case 5125:return qd;case 36294:return Jd;case 36295:return Yd;case 36296:return Xd;case 35678:case 36198:case 36298:case 36306:case 35682:return Zd;case 35679:case 36299:case 36307:return Qd;case 35680:case 36300:case 36308:case 36293:return $d;case 36289:case 36303:case 36311:case 36292:return ef}}var nf=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Fd(t.type)}},rf=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=tf(t.type)}},af=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},of=/(\w+)(\])?(\[|\.)?/g;function sf(e,t){e.seq.push(t),e.map[t.id]=t}function cf(e,t,n){let r=e.name,i=r.length;for(of.lastIndex=0;;){let a=of.exec(r),o=of.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){sf(n,l===void 0?new nf(s,e,t):new rf(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new af(s),sf(n,e)),n=e}}}var lf=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);cf(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function uf(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var df=37297,ff=0;function pf(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var mf=new q;function hf(e){J._getMatrix(mf,J.workingColorSpace,e);let t=`mat3( ${mf.elements.map(e=>e.toFixed(4))} )`;switch(J.getTransfer(e)){case Vr:return[t,`LinearTransferOETF`];case Hr:return[t,`sRGBTransferOETF`];default:return H(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function gf(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+pf(e.getShaderSource(t),r)}return i}function _f(e,t){let n=hf(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var vf={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function yf(e,t){let n=vf[t];return n===void 0?(H(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var bf=new K;function xf(){return J.getLuminanceCoefficients(bf),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${bf.x.toFixed(4)}, ${bf.y.toFixed(4)}, ${bf.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Sf(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(Tf).join(`
`)}function Cf(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function wf(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function Tf(e){return e!==``}function Ef(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Df(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Of=/^[ \t]*#include +<([\w\d./]+)>/gm;function kf(e){return e.replace(Of,jf)}var Af=new Map;function jf(e,t){let n=Z[t];if(n===void 0){let e=Af.get(t);if(e!==void 0)n=Z[e],H(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`Can not resolve #include <`+t+`>`)}return kf(n)}var Mf=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Nf(e){return e.replace(Mf,Pf)}function Pf(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Ff(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var If={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Lf(e){return If[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Rf={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function zf(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Rf[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Bf={302:`ENVMAP_MODE_REFRACTION`};function Vf(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Bf[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Hf={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Uf(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Hf[e.combine]||`ENVMAP_BLENDING_NONE`}function Wf(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Gf(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Lf(n),l=zf(n),u=Vf(n),d=Uf(n),f=Wf(n),p=Sf(n),m=Cf(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(Tf).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(Tf).join(`
`),_.length>0&&(_+=`
`)):(g=[Ff(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(Tf).join(`
`),_=[Ff(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Z.tonemapping_pars_fragment,n.toneMapping===0?``:yf(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Z.colorspace_pars_fragment,_f(`linearToOutputTexel`,n.outputColorSpace),xf(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(Tf).join(`
`)),o=kf(o),o=Ef(o,n),o=Df(o,n),s=kf(s),s=Ef(s,n),s=Df(s,n),o=Nf(o),s=Nf(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=uf(i,i.VERTEX_SHADER,y),S=uf(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.morphTargets===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=gf(i,x,`vertex`),n=gf(i,S,`fragment`);U(`THREE.WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):H(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new lf(i,h),T=wf(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,df)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=ff++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Kf=0,qf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),i=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(i)===!1&&(a.add(i),i.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Jf(e),t.set(e,n)),n}},Jf=class{constructor(e){this.id=Kf++,this.code=e,this.usedTimes=0}};function Yf(e,t,n,r,i,a){let o=new sa,s=new qf,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h){let g=u.fog,_=h.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=b&&b.mapping===306?b.image.height:null,S=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&H(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,ee;if(S){let e=_u[S];E=e.vertexShader,D=e.fragmentShader}else E=i.vertexShader,D=i.fragmentShader,s.update(i),O=s.getVertexShaderID(i),ee=s.getFragmentShaderID(i);let k=e.getRenderTarget(),te=e.state.buffers.depth.getReversed(),ne=h.isInstancedMesh===!0,re=h.isBatchedMesh===!0,ie=!!i.map,ae=!!i.matcap,oe=!!b,se=!!i.aoMap,ce=!!i.lightMap,le=!!i.bumpMap,ue=!!i.normalMap,de=!!i.displacementMap,fe=!!i.emissiveMap,pe=!!i.metalnessMap,me=!!i.roughnessMap,he=i.anisotropy>0,ge=i.clearcoat>0,_e=i.dispersion>0,ve=i.iridescence>0,ye=i.sheen>0,be=i.transmission>0,xe=he&&!!i.anisotropyMap,Se=ge&&!!i.clearcoatMap,A=ge&&!!i.clearcoatNormalMap,j=ge&&!!i.clearcoatRoughnessMap,M=ve&&!!i.iridescenceMap,Ce=ve&&!!i.iridescenceThicknessMap,N=ye&&!!i.sheenColorMap,we=ye&&!!i.sheenRoughnessMap,P=!!i.specularMap,F=!!i.specularColorMap,Te=!!i.specularIntensityMap,Ee=be&&!!i.transmissionMap,De=be&&!!i.thicknessMap,Oe=!!i.gradientMap,I=!!i.alphaMap,ke=i.alphaTest>0,L=!!i.alphaHash,R=!!i.extensions,z=0;i.toneMapped&&(k===null||k.isXRRenderTarget===!0)&&(z=e.toneMapping);let B={shaderID:S,shaderType:i.type,shaderName:i.name,vertexShader:E,fragmentShader:D,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:ee,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:re,batchingColor:re&&h._colorsTexture!==null,instancing:ne,instancingColor:ne&&h.instanceColor!==null,instancingMorph:ne&&h.morphTexture!==null,outputColorSpace:k===null?e.outputColorSpace:k.isXRRenderTarget===!0?k.texture.colorSpace:Br,alphaToCoverage:!!i.alphaToCoverage,map:ie,matcap:ae,envMap:oe,envMapMode:oe&&b.mapping,envMapCubeUVHeight:x,aoMap:se,lightMap:ce,bumpMap:le,normalMap:ue,displacementMap:de,emissiveMap:fe,normalMapObjectSpace:ue&&i.normalMapType===1,normalMapTangentSpace:ue&&i.normalMapType===0,metalnessMap:pe,roughnessMap:me,anisotropy:he,anisotropyMap:xe,clearcoat:ge,clearcoatMap:Se,clearcoatNormalMap:A,clearcoatRoughnessMap:j,dispersion:_e,iridescence:ve,iridescenceMap:M,iridescenceThicknessMap:Ce,sheen:ye,sheenColorMap:N,sheenRoughnessMap:we,specularMap:P,specularColorMap:F,specularIntensityMap:Te,transmission:be,transmissionMap:Ee,thicknessMap:De,gradientMap:Oe,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:I,alphaTest:ke,alphaHash:L,combine:i.combine,mapUv:ie&&m(i.map.channel),aoMapUv:se&&m(i.aoMap.channel),lightMapUv:ce&&m(i.lightMap.channel),bumpMapUv:le&&m(i.bumpMap.channel),normalMapUv:ue&&m(i.normalMap.channel),displacementMapUv:de&&m(i.displacementMap.channel),emissiveMapUv:fe&&m(i.emissiveMap.channel),metalnessMapUv:pe&&m(i.metalnessMap.channel),roughnessMapUv:me&&m(i.roughnessMap.channel),anisotropyMapUv:xe&&m(i.anisotropyMap.channel),clearcoatMapUv:Se&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:A&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:j&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:M&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:N&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:we&&m(i.sheenRoughnessMap.channel),specularMapUv:P&&m(i.specularMap.channel),specularColorMapUv:F&&m(i.specularColorMap.channel),specularIntensityMapUv:Te&&m(i.specularIntensityMap.channel),transmissionMapUv:Ee&&m(i.transmissionMap.channel),thicknessMapUv:De&&m(i.thicknessMap.channel),alphaMapUv:I&&m(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(ue||he),vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!_.attributes.uv&&(ie||I),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&ue===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:te,skinning:h.isSkinnedMesh===!0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:z,decodeVideoTexture:ie&&i.map.isVideoTexture===!0&&J.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:fe&&i.emissiveMap.isVideoTexture===!0&&J.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:R&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(R&&i.extensions.multiDraw===!0||re)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return B.vertexUv1s=c.has(1),B.vertexUv2s=c.has(2),B.vertexUv3s=c.has(3),c.clear(),B}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=_u[t];n=Vc.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Gf(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Xf(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Zf(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Qf(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function $f(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Zf),r.length>1&&r.sort(t||Qf),i.length>1&&i.sort(t||Qf)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function ep(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new $f,e.set(t,[i])):n>=r.length?(i=new $f,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function tp(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new K,color:new X};break;case`SpotLight`:n={position:new K,direction:new K,color:new X,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new K,color:new X,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new K,skyColor:new X,groundColor:new X};break;case`RectAreaLight`:n={color:new X,position:new K,halfWidth:new K,halfHeight:new K}}return e[t.id]=n,n}}}function np(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new G};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new G};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new G,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var rp=0;function ip(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function ap(e){let t=new tp,n=np(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new K);let i=new K,a=new Y,o=new Y;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort(ip);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Q.LTC_FLOAT_1,r.rectAreaLTC2=Q.LTC_FLOAT_2):(r.rectAreaLTC1=Q.LTC_HALF_1,r.rectAreaLTC2=Q.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=rp++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function op(e){let t=new ap(e),n=[],r=[];function i(e){l.camera=e,n.length=0,r.length=0}function a(e){n.push(e)}function o(e){r.push(e)}function s(){t.setup(n)}function c(e){t.setupView(n,e)}let l={lightsArray:n,shadowsArray:r,camera:null,lights:t,transmissionRenderTarget:{}};return{init:i,state:l,setupLights:s,setupLightsView:c,pushLight:a,pushShadow:o}}function sp(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new op(e),t.set(n,[a])):r>=i.length?(a=new op(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var cp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,lp=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,up=[new K(1,0,0),new K(-1,0,0),new K(0,1,0),new K(0,-1,0),new K(0,0,1),new K(0,0,-1)],dp=[new K(0,-1,0),new K(0,-1,0),new K(0,0,1),new K(0,0,-1),new K(0,-1,0),new K(0,-1,0)],fp=new Y,pp=new K,mp=new K;function hp(e,t,n){let r=new Ns,i=new G,a=new G,o=new Ki,s=new Yc,c=new Xc,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new Wc({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new G},radius:{value:4}},vertexShader:cp,fragmentShader:lp}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new Do;m.setAttribute(`position`,new fo(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new $o(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(H(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){H(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){H(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Ji(i.x,i.y,{format:Gn,type:Mn,minFilter:Sn,magFilter:Sn,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new rc(i.x,i.y,jn),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=Vn,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=yn,d.map.depthTexture.magFilter=yn}else l.isPointLight?(d.map=new Ku(i.x),d.map.depthTexture=new ic(i.x,An)):(d.map=new Ji(i.x,i.y),d.map.depthTexture=new rc(i.x,i.y,An)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=Vn,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=Sn,d.map.depthTexture.magFilter=Sn):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=yn,d.map.depthTexture.magFilter=yn);d.camera.updateProjectionMatrix()}let g=d.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<g;t++){if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),pp.setFromMatrixPosition(l.matrixWorld),e.position.copy(pp),mp.copy(e.position),mp.add(up[t]),e.up.copy(dp[t]),e.lookAt(mp),e.updateMatrixWorld(),n.makeTranslation(-pp.x,-pp.y,-pp.z),fp.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(fp,e.coordinateSystem,e.reversedDepth)}else d.updateMatrices(l);r=d.getFrustum(),b(n,s,d.camera,l,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new Ji(i.x,i.y,{format:Gn,type:Mn})),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value=n.mapSize,f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value=n.mapSize,p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||r.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=y(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)b(c[e],i,a,o,s)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function gp(e,t){function n(){let t=!1,n=new Ki,r=null,i=new Ki(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?pe(e.DEPTH_TEST):me(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=ti[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?pe(e.STENCIL_TEST):me(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f=new WeakMap,p=[],m=null,h=!1,g=null,_=null,v=null,y=null,b=null,x=null,S=null,C=new X(0,0,0),w=0,T=!1,E=null,D=null,O=null,ee=null,k=null,te=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),ne=!1,re=0,ie=e.getParameter(e.VERSION);ie.indexOf(`WebGL`)===-1?ie.indexOf(`OpenGL ES`)!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(ie)[1]),ne=re>=2):(re=parseFloat(/^WebGL (\d)/.exec(ie)[1]),ne=re>=1);let ae=null,oe={},se=e.getParameter(e.SCISSOR_BOX),ce=e.getParameter(e.VIEWPORT),le=new Ki().fromArray(se),ue=new Ki().fromArray(ce);function de(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let fe={};fe[e.TEXTURE_2D]=de(e.TEXTURE_2D,e.TEXTURE_2D,1),fe[e.TEXTURE_CUBE_MAP]=de(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),fe[e.TEXTURE_2D_ARRAY]=de(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),fe[e.TEXTURE_3D]=de(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),pe(e.DEPTH_TEST),o.setFunc(3),Se(!1),A(1),pe(e.CULL_FACE),be(0);function pe(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function me(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function he(t,n){return d[t]!==n&&(e.bindFramebuffer(t,n),d[t]=n,t===e.DRAW_FRAMEBUFFER&&(d[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(d[e.DRAW_FRAMEBUFFER]=n),!0)}function ge(t,n){let r=p,i=!1;if(t){r=f.get(n),r===void 0&&(r=[],f.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function _e(t){return m!==t&&(e.useProgram(t),m=t,!0)}let ve={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ve[103]=e.MIN,ve[104]=e.MAX;let ye={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function be(t,n,r,i,a,o,s,c,l,u){if(t===0)h===!0&&(me(e.BLEND),h=!1);else if(h===!1&&(pe(e.BLEND),h=!0),t!==5){if(t!==g||u!==T){if((_!==100||b!==100)&&(e.blendEquation(e.FUNC_ADD),_=100,b=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:U(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:U(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:U(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:U(`WebGLState: Invalid blending: `,t)}v=null,y=null,x=null,S=null,C.set(0,0,0),w=0,g=t,T=u}}else a||=n,o||=r,s||=i,(n!==_||a!==b)&&(e.blendEquationSeparate(ve[n],ve[a]),_=n,b=a),(r!==v||i!==y||o!==x||s!==S)&&(e.blendFuncSeparate(ye[r],ye[i],ye[o],ye[s]),v=r,y=i,x=o,S=s),(c.equals(C)===!1||l!==w)&&(e.blendColor(c.r,c.g,c.b,l),C.copy(c),w=l),g=t,T=!1}function xe(t,n){t.side===2?me(e.CULL_FACE):pe(e.CULL_FACE);let r=t.side===1;n&&(r=!r),Se(r),t.blending===1&&t.transparent===!1?be(0):be(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),M(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?pe(e.SAMPLE_ALPHA_TO_COVERAGE):me(e.SAMPLE_ALPHA_TO_COVERAGE)}function Se(t){E!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),E=t)}function A(t){t===0?me(e.CULL_FACE):(pe(e.CULL_FACE),t!==D&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),D=t}function j(t){t!==O&&(ne&&e.lineWidth(t),O=t)}function M(t,n,r){t?(pe(e.POLYGON_OFFSET_FILL),(ee!==n||k!==r)&&(ee=n,k=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):me(e.POLYGON_OFFSET_FILL)}function Ce(t){t?pe(e.SCISSOR_TEST):me(e.SCISSOR_TEST)}function N(t){t===void 0&&(t=e.TEXTURE0+te-1),ae!==t&&(e.activeTexture(t),ae=t)}function we(t,n,r){r===void 0&&(r=ae===null?e.TEXTURE0+te-1:ae);let i=oe[r];i===void 0&&(i={type:void 0,texture:void 0},oe[r]=i),(i.type!==t||i.texture!==n)&&(ae!==r&&(e.activeTexture(r),ae=r),e.bindTexture(t,n||fe[t]),i.type=t,i.texture=n)}function P(){let t=oe[ae];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function F(){try{e.compressedTexImage2D(...arguments)}catch(e){U(`WebGLState:`,e)}}function Te(){try{e.compressedTexImage3D(...arguments)}catch(e){U(`WebGLState:`,e)}}function Ee(){try{e.texSubImage2D(...arguments)}catch(e){U(`WebGLState:`,e)}}function De(){try{e.texSubImage3D(...arguments)}catch(e){U(`WebGLState:`,e)}}function Oe(){try{e.compressedTexSubImage2D(...arguments)}catch(e){U(`WebGLState:`,e)}}function I(){try{e.compressedTexSubImage3D(...arguments)}catch(e){U(`WebGLState:`,e)}}function ke(){try{e.texStorage2D(...arguments)}catch(e){U(`WebGLState:`,e)}}function L(){try{e.texStorage3D(...arguments)}catch(e){U(`WebGLState:`,e)}}function R(){try{e.texImage2D(...arguments)}catch(e){U(`WebGLState:`,e)}}function z(){try{e.texImage3D(...arguments)}catch(e){U(`WebGLState:`,e)}}function B(t){le.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),le.copy(t))}function Ae(t){ue.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ue.copy(t))}function je(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Me(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Ne(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),u={},ae=null,oe={},d={},f=new WeakMap,p=[],m=null,h=!1,g=null,_=null,v=null,y=null,b=null,x=null,S=null,C=new X(0,0,0),w=0,T=!1,E=null,D=null,O=null,ee=null,k=null,le.set(0,0,e.canvas.width,e.canvas.height),ue.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:pe,disable:me,bindFramebuffer:he,drawBuffers:ge,useProgram:_e,setBlending:be,setMaterial:xe,setFlipSided:Se,setCullFace:A,setLineWidth:j,setPolygonOffset:M,setScissorTest:Ce,activeTexture:N,bindTexture:we,unbindTexture:P,compressedTexImage2D:F,compressedTexImage3D:Te,texImage2D:R,texImage3D:z,updateUBOMapping:je,uniformBlockBinding:Me,texStorage2D:ke,texStorage3D:L,texSubImage2D:Ee,texSubImage3D:De,compressedTexSubImage2D:Oe,compressedTexSubImage3D:I,scissor:B,viewport:Ae,reset:Ne}}function _p(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new G,u=new WeakMap,d,f=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function m(e,t){return p?new OffscreenCanvas(e,t):Jr(`canvas`)}function h(e,t,n){let r=1,i=we(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);d===void 0&&(d=m(n,a));let o=t?m(n,a):d;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),H(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&H(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function g(e){return e.generateMipmaps}function _(t){e.generateMipmap(t)}function v(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function y(n,r,i,a,o=!1){if(n!==null){if(e[n]!==void 0)return e[n];H(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let s=r;if(r===e.RED&&(i===e.FLOAT&&(s=e.R32F),i===e.HALF_FLOAT&&(s=e.R16F),i===e.UNSIGNED_BYTE&&(s=e.R8)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(s=e.R8UI),i===e.UNSIGNED_SHORT&&(s=e.R16UI),i===e.UNSIGNED_INT&&(s=e.R32UI),i===e.BYTE&&(s=e.R8I),i===e.SHORT&&(s=e.R16I),i===e.INT&&(s=e.R32I)),r===e.RG&&(i===e.FLOAT&&(s=e.RG32F),i===e.HALF_FLOAT&&(s=e.RG16F),i===e.UNSIGNED_BYTE&&(s=e.RG8)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(s=e.RG8UI),i===e.UNSIGNED_SHORT&&(s=e.RG16UI),i===e.UNSIGNED_INT&&(s=e.RG32UI),i===e.BYTE&&(s=e.RG8I),i===e.SHORT&&(s=e.RG16I),i===e.INT&&(s=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(s=e.RGB8UI),i===e.UNSIGNED_SHORT&&(s=e.RGB16UI),i===e.UNSIGNED_INT&&(s=e.RGB32UI),i===e.BYTE&&(s=e.RGB8I),i===e.SHORT&&(s=e.RGB16I),i===e.INT&&(s=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(s=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(s=e.RGBA16UI),i===e.UNSIGNED_INT&&(s=e.RGBA32UI),i===e.BYTE&&(s=e.RGBA8I),i===e.SHORT&&(s=e.RGBA16I),i===e.INT&&(s=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_INT_5_9_9_9_REV&&(s=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(s=e.R11F_G11F_B10F)),r===e.RGBA){let t=o?Vr:J.getTransfer(a);i===e.FLOAT&&(s=e.RGBA32F),i===e.HALF_FLOAT&&(s=e.RGBA16F),i===e.UNSIGNED_BYTE&&(s=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT_4_4_4_4&&(s=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(s=e.RGB5_A1)}return(s===e.R16F||s===e.R32F||s===e.RG16F||s===e.RG32F||s===e.RGBA16F||s===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),s}function b(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,H(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function x(e,t){return g(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function S(e){let t=e.target;t.removeEventListener(`dispose`,S),w(t),t.isVideoTexture&&u.delete(t)}function C(e){let t=e.target;t.removeEventListener(`dispose`,C),E(t)}function w(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=f.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&T(e),Object.keys(i).length===0&&f.delete(n)}r.remove(e)}function T(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=f.get(i);delete a[n.__cacheKey],o.memory.textures--}function E(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(i[t])}r.remove(t)}let D=0;function O(){D=0}function ee(){let e=D;return e>=i.maxTextures&&H(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+i.maxTextures),D+=1,e}function k(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function te(t,i){let a=r.get(t);if(t.isVideoTexture&&Ce(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)H(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)H(`WebGLRenderer: Texture marked for update but image is incomplete`);else{fe(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function ne(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?fe(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function re(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?fe(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function ie(t,i){let a=r.get(t);t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version?pe(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let ae={[gn]:e.REPEAT,[_n]:e.CLAMP_TO_EDGE,[vn]:e.MIRRORED_REPEAT},oe={[yn]:e.NEAREST,[bn]:e.NEAREST_MIPMAP_NEAREST,[xn]:e.NEAREST_MIPMAP_LINEAR,[Sn]:e.LINEAR,[Cn]:e.LINEAR_MIPMAP_NEAREST,[wn]:e.LINEAR_MIPMAP_LINEAR},se={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function ce(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&H(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,ae[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,ae[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,ae[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,oe[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,oe[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,se[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function le(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,S));let i=n.source,a=f.get(i);a===void 0&&(a={},f.set(i,a));let s=k(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&T(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function ue(e,t,n){return Math.floor(Math.floor(e/n)/t)}function de(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=ue(n.start,r.width,4),c=ue(t.start,r.width,4);n.start<=i+1&&a===c&&ue(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=e.getParameter(e.UNPACK_ROW_LENGTH),l=e.getParameter(e.UNPACK_SKIP_PIXELS),u=e.getParameter(e.UNPACK_SKIP_ROWS);e.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;e.pixelStorei(e.UNPACK_SKIP_PIXELS,u),e.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),e.pixelStorei(e.UNPACK_ROW_LENGTH,c),e.pixelStorei(e.UNPACK_SKIP_PIXELS,l),e.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function fe(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=le(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let d=r.get(u);if(u.version!==d.__version||l===!0){n.activeTexture(e.TEXTURE0+s);let t=J.getPrimaries(J.workingColorSpace),r=o.colorSpace===``?null:J.getPrimaries(o.colorSpace),f=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,f);let p=h(o.image,!1,i.maxTextureSize);p=N(o,p);let m=a.convert(o.format,o.colorSpace),v=a.convert(o.type),S=y(o.internalFormat,m,v,o.colorSpace,o.isVideoTexture);ce(c,o);let C,w=o.mipmaps,T=o.isVideoTexture!==!0,E=d.__version===void 0||l===!0,D=u.dataReady,O=x(o,p);if(o.isDepthTexture)S=b(o.format===Hn,o.type),E&&(T?n.texStorage2D(e.TEXTURE_2D,1,S,p.width,p.height):n.texImage2D(e.TEXTURE_2D,0,S,p.width,p.height,0,m,v,null));else if(o.isDataTexture){if(w.length>0){T&&E&&n.texStorage2D(e.TEXTURE_2D,O,S,w[0].width,w[0].height);for(let t=0,r=w.length;t<r;t++)C=w[t],T?D&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,C.width,C.height,m,v,C.data):n.texImage2D(e.TEXTURE_2D,t,S,C.width,C.height,0,m,v,C.data);o.generateMipmaps=!1}else T?(E&&n.texStorage2D(e.TEXTURE_2D,O,S,p.width,p.height),D&&de(o,p,m,v)):n.texImage2D(e.TEXTURE_2D,0,S,p.width,p.height,0,m,v,p.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){T&&E&&n.texStorage3D(e.TEXTURE_2D_ARRAY,O,S,w[0].width,w[0].height,p.depth);for(let t=0,r=w.length;t<r;t++)if(C=w[t],o.format!==1023){if(m!==null){if(T){if(D){if(o.layerUpdates.size>0){let r=pu(C.width,C.height,o.format,o.type);for(let i of o.layerUpdates){let a=C.data.subarray(i*r/C.data.BYTES_PER_ELEMENT,(i+1)*r/C.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,t,0,0,i,C.width,C.height,1,m,a)}o.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,t,0,0,0,C.width,C.height,p.depth,m,C.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,t,S,C.width,C.height,p.depth,0,C.data,0,0)}else H(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else T?D&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,t,0,0,0,C.width,C.height,p.depth,m,v,C.data):n.texImage3D(e.TEXTURE_2D_ARRAY,t,S,C.width,C.height,p.depth,0,m,v,C.data)}else{T&&E&&n.texStorage2D(e.TEXTURE_2D,O,S,w[0].width,w[0].height);for(let t=0,r=w.length;t<r;t++)C=w[t],o.format===1023?T?D&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,C.width,C.height,m,v,C.data):n.texImage2D(e.TEXTURE_2D,t,S,C.width,C.height,0,m,v,C.data):m===null?H(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):T?D&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,C.width,C.height,m,C.data):n.compressedTexImage2D(e.TEXTURE_2D,t,S,C.width,C.height,0,C.data)}}else if(o.isDataArrayTexture){if(T){if(E&&n.texStorage3D(e.TEXTURE_2D_ARRAY,O,S,p.width,p.height,p.depth),D){if(o.layerUpdates.size>0){let t=pu(p.width,p.height,o.format,o.type);for(let r of o.layerUpdates){let i=p.data.subarray(r*t/p.data.BYTES_PER_ELEMENT,(r+1)*t/p.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,r,p.width,p.height,1,m,v,i)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,p.width,p.height,p.depth,m,v,p.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,S,p.width,p.height,p.depth,0,m,v,p.data)}else if(o.isData3DTexture)T?(E&&n.texStorage3D(e.TEXTURE_3D,O,S,p.width,p.height,p.depth),D&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,p.width,p.height,p.depth,m,v,p.data)):n.texImage3D(e.TEXTURE_3D,0,S,p.width,p.height,p.depth,0,m,v,p.data);else if(o.isFramebufferTexture){if(E){if(T)n.texStorage2D(e.TEXTURE_2D,O,S,p.width,p.height);else{let t=p.width,r=p.height;for(let i=0;i<O;i++)n.texImage2D(e.TEXTURE_2D,i,S,t,r,0,m,v,null),t>>=1,r>>=1}}}else if(w.length>0){if(T&&E){let t=we(w[0]);n.texStorage2D(e.TEXTURE_2D,O,S,t.width,t.height)}for(let t=0,r=w.length;t<r;t++)C=w[t],T?D&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,m,v,C):n.texImage2D(e.TEXTURE_2D,t,S,m,v,C);o.generateMipmaps=!1}else if(T){if(E){let t=we(p);n.texStorage2D(e.TEXTURE_2D,O,S,t.width,t.height)}D&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,m,v,p)}else n.texImage2D(e.TEXTURE_2D,0,S,m,v,p);g(o)&&_(c),d.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function pe(t,o,s){if(o.image.length!==6)return;let c=le(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=J.getPrimaries(J.workingColorSpace),r=o.colorSpace===``?null:J.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=h(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=N(o,m[e]);let v=m[0],b=a.convert(o.format,o.colorSpace),S=a.convert(o.type),C=y(o.internalFormat,b,S,o.colorSpace),w=o.isVideoTexture!==!0,T=u.__version===void 0||c===!0,E=l.dataReady,D=x(o,v);ce(e.TEXTURE_CUBE_MAP,o);let O;if(f){w&&T&&n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,v.width,v.height);for(let t=0;t<6;t++){O=m[t].mipmaps;for(let r=0;r<O.length;r++){let i=O[r];o.format===1023?w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,b,S,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,b,S,i.data):b===null?H(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):w?E&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,b,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,i.data)}}}else{if(O=o.mipmaps,w&&T){O.length>0&&D++;let t=we(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,t.width,t.height)}for(let t=0;t<6;t++)if(p){w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,b,S,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,m[t].width,m[t].height,0,b,S,m[t].data);for(let r=0;r<O.length;r++){let i=O[r].image[t].image;w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,b,S,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,i.width,i.height,0,b,S,i.data)}}else{w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,b,S,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,b,S,m[t]);for(let r=0;r<O.length;r++){let i=O[r];w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,b,S,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,b,S,i.image[t])}}}g(o)&&_(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function me(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=y(o.internalFormat,d,f,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),M(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,j(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function he(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=b(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;M(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,j(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,j(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=y(o.internalFormat,c,l,o.colorSpace);M(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,j(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,j(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function ge(t,i,o){let c=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`renderTarget.depthTexture must be an instance of THREE.DepthTexture`);let l=r.get(i.depthTexture);if(l.__renderTarget=i,(!l.__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),c){if(l.__webglInit===void 0&&(l.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,S)),l.__webglTexture===void 0){l.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,l.__webglTexture),ce(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=a.convert(i.depthTexture.format),r=a.convert(i.depthTexture.type),o;i.depthTexture.format===1026?o=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(o=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,o,i.width,i.height,0,t,r,null)}}else te(i.depthTexture,0);let u=l.__webglTexture,d=j(i),f=c?e.TEXTURE_CUBE_MAP_POSITIVE_X+o:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)M(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)M(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`Unknown depthTexture format`)}function _e(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)ge(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?ge(i.__webglFramebuffer[0],t,0):ge(i.__webglFramebuffer,t,0)}}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),he(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),he(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function ve(t,n,i){let a=r.get(t);n!==void 0&&me(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&_e(t)}function ye(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,C);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&M(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=y(r.internalFormat,i,o,r.colorSpace,t.isXRRenderTarget===!0),u=j(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),he(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),ce(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)me(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else me(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);g(i)&&_(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),ce(c,a),me(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),g(a)&&_(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),ce(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)me(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else me(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);g(i)&&_(r),n.unbindTexture()}t.depthBuffer&&_e(t)}function be(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(g(a)){let t=v(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),_(t),n.unbindTexture()}}}let xe=[],Se=[];function A(t){if(t.samples>0){if(M(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer);let f=t.texture.mipmaps;f&&f.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(xe.length=0,Se.length=0,xe.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.resolveDepthBuffer===!1&&(xe.push(l),Se.push(l),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,Se)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,xe))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.resolveDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function j(e){return Math.min(i.maxSamples,e.samples)}function M(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function Ce(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function N(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(J.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&H(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):U(`WebGLTextures: Unsupported texture color space:`,n)),t}function we(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=ee,this.resetTextureUnits=O,this.setTexture2D=te,this.setTexture2DArray=ne,this.setTexture3D=re,this.setTextureCube=ie,this.rebindTextures=ve,this.setupRenderTarget=ye,this.updateRenderTargetMipmap=be,this.updateMultisampleRenderTarget=A,this.setupDepthRenderbuffer=_e,this.setupFrameBufferTexture=me,this.useMultisampledRTT=M,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function vp(e,t){function n(n,r=``){let i,a=J.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var yp=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,bp=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,xp=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new ac(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Wc({vertexShader:yp,fragmentShader:bp,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new $o(new Fc(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Sp=class extends ni{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new xp,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new G,C=null,w=new Bl;w.viewport=new Ki;let T=new Bl;T.viewport=new Ki;let E=[w,T],D=new eu,O=null,ee=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new Ea,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new Ea,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new Ea,b[e]=t),t.getHandSpace()};function k(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function te(){r.removeEventListener(`select`,k),r.removeEventListener(`selectstart`,k),r.removeEventListener(`selectend`,k),r.removeEventListener(`squeeze`,k),r.removeEventListener(`squeezestart`,k),r.removeEventListener(`squeezeend`,k),r.removeEventListener(`end`,te),r.removeEventListener(`inputsourceschange`,ne);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}O=null,ee=null,h.reset();for(let e in g)delete g[e];e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,ue.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&H(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&H(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,k),r.addEventListener(`selectstart`,k),r.addEventListener(`selectend`,k),r.addEventListener(`squeeze`,k),r.addEventListener(`squeezestart`,k),r.addEventListener(`squeezeend`,k),r.addEventListener(`end`,te),r.addEventListener(`inputsourceschange`,ne),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?Hn:Vn,a=_.stencil?Fn:An);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new Ji(d.textureWidth,d.textureHeight,{format:Bn,type:Tn,depthTexture:new rc(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Ji(f.framebufferWidth,f.framebufferHeight,{format:Bn,type:Tn,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),ue.setContext(r),ue.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function ne(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}let re=new K,ie=new K;function ae(e,t,n){re.setFromMatrixPosition(t.matrixWorld),ie.setFromMatrixPosition(n.matrixWorld);let r=re.distanceTo(ie),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function oe(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),D.near=T.near=w.near=t,D.far=T.far=w.far=n,(O!==D.near||ee!==D.far)&&(r.updateRenderState({depthNear:D.near,depthFar:D.far}),O=D.near,ee=D.far),D.layers.mask=e.layers.mask|6,w.layers.mask=D.layers.mask&-5,T.layers.mask=D.layers.mask&-3;let i=e.parent,a=D.cameras;oe(D,i);for(let e=0;e<a.length;e++)oe(a[e],i);a.length===2?ae(D,w,T):D.projectionMatrix.copy(w.projectionMatrix),se(e,D,i)};function se(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=oi*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(D)},this.getCameraTexture=function(e){return g[e]};let ce=null;function le(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==D.cameras.length&&(D.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=E[n];o===void 0&&(o=new Bl,o.layers.enable(n),o.viewport=new Ki,E[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(D.matrix.copy(o.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),i===!0&&D.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new ac,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}ce&&ce(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let ue=new hu;ue.setAnimationLoop(le),this.setAnimationLoop=function(e){ce=e},this.dispose=function(){}}},Cp=new oa,wp=new Y;function Tp(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Bc(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,Cp.copy(o),Cp.x*=-1,Cp.y*=-1,Cp.z*=-1,a.isCubeTexture&&a.isRenderTargetTexture===!1&&(Cp.y*=-1,Cp.z*=-1),e.envMapRotation.value.setFromMatrix4(wp.makeRotationFromEuler(Cp)),e.flipEnvMap.value=a.isCubeTexture&&a.isRenderTargetTexture===!1?-1:1,e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Ep(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(m(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return U(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let t=0,n=r.length;t<n;t++){let n=Array.isArray(r[t])?r[t]:[r[t]];for(let r=0,i=n.length;r<i;r++){let i=n[r];if(p(i,t,r,a)===!0){let t=i.__offset,n=Array.isArray(i.value)?i.value:[i.value],r=0;for(let a=0;a<n.length;a++){let o=n[a],s=h(o);typeof o==`number`||typeof o==`boolean`?(i.__data[0]=o,e.bufferSubData(e.UNIFORM_BUFFER,t+r,i.__data)):o.isMatrix3?(i.__data[0]=o.elements[0],i.__data[1]=o.elements[1],i.__data[2]=o.elements[2],i.__data[3]=0,i.__data[4]=o.elements[3],i.__data[5]=o.elements[4],i.__data[6]=o.elements[5],i.__data[7]=0,i.__data[8]=o.elements[6],i.__data[9]=o.elements[7],i.__data[10]=o.elements[8],i.__data[11]=0):(o.toArray(i.__data,r),r+=s.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,t,i.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=h(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?H(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):H(`WebGLRenderer: Unsupported uniform value type.`,e),t}function g(t){let n=t.target;n.removeEventListener(`dispose`,g);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:_}}var Dp=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Op=null;function kp(){return Op===null&&(Op=new ps(Dp,16,16,Gn,Mn),Op.name=`DFG_LUT`,Op.minFilter=Sn,Op.magFilter=Sn,Op.wrapS=_n,Op.wrapT=_n,Op.generateMipmaps=!1,Op.needsUpdate=!0),Op}var Ap=class{constructor(e={}){let{canvas:t=Yr(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Tn}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([qn,Kn,Wn]),g=new Set([Tn,An,On,Fn,Nn,Pn]),_=new Uint32Array(4),v=new Int32Array(4),y=null,b=null,x=[],S=[],C=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let w=this,T=!1;this._outputColorSpace=zr;let E=0,D=0,O=null,ee=-1,k=null,te=new Ki,ne=new Ki,re=null,ie=new X(0),ae=0,oe=t.width,se=t.height,ce=1,le=null,ue=null,de=new Ki(0,0,oe,se),fe=new Ki(0,0,oe,se),pe=!1,me=new Ns,he=!1,ge=!1,_e=new Y,ve=new K,ye=new Ki,be={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},xe=!1;function Se(){return O===null?ce:1}let A=n;function j(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r183`),t.addEventListener(`webglcontextlost`,Re,!1),t.addEventListener(`webglcontextrestored`,ze,!1),t.addEventListener(`webglcontextcreationerror`,Be,!1),A===null){let t=`webgl2`;if(A=j(t,e),A===null)throw j(t)?Error(`Error creating WebGL context with your selected attributes.`):Error(`Error creating WebGL context.`)}}catch(e){throw U(`WebGLRenderer: `+e.message),e}let M,Ce,N,we,P,F,Te,Ee,De,Oe,I,ke,L,R,z,B,Ae,je,Me,Ne,V,Pe,Fe;function Ie(){M=new Ju(A),M.init(),V=new vp(A,M),Ce=new wu(A,M,e,V),N=new gp(A,M),Ce.reversedDepthBuffer&&d&&N.buffers.depth.setReversed(!0),we=new Zu(A),P=new Xf,F=new _p(A,M,N,P,Ce,V,we),Te=new qu(w),Ee=new gu(A),Pe=new Su(A,Ee),De=new Yu(A,Ee,we,Pe),Oe=new $u(A,De,Ee,Pe,we),je=new Qu(A,Ce,F),z=new Tu(P),I=new Yf(w,Te,M,Ce,Pe,z),ke=new Tp(w,P),L=new ep,R=new sp(M),Ae=new xu(w,Te,N,Oe,p,s),B=new hp(w,Oe,Ce),Fe=new Ep(A,we,Ce,N),Me=new Cu(A,M,we),Ne=new Xu(A,M,we),we.programs=I.programs,w.capabilities=Ce,w.extensions=M,w.properties=P,w.renderLists=L,w.shadowMap=B,w.state=N,w.info=we}Ie(),m!==1009&&(C=new td(m,t.width,t.height,r,i));let Le=new Sp(w,A);this.xr=Le,this.getContext=function(){return A},this.getContextAttributes=function(){return A.getContextAttributes()},this.forceContextLoss=function(){let e=M.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=M.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return ce},this.setPixelRatio=function(e){e!==void 0&&(ce=e,this.setSize(oe,se,!1))},this.getSize=function(e){return e.set(oe,se)},this.setSize=function(e,n,r=!0){Le.isPresenting?H(`WebGLRenderer: Can't change size while VR device is presenting.`):(oe=e,se=n,t.width=Math.floor(e*ce),t.height=Math.floor(n*ce),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),C!==null&&C.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(oe*ce,se*ce).floor()},this.setDrawingBufferSize=function(e,n,r){oe=e,se=n,ce=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009)console.error(`THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){console.warn(`THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}C.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(te)},this.getViewport=function(e){return e.copy(de)},this.setViewport=function(e,t,n,r){e.isVector4?de.set(e.x,e.y,e.z,e.w):de.set(e,t,n,r),N.viewport(te.copy(de).multiplyScalar(ce).round())},this.getScissor=function(e){return e.copy(fe)},this.setScissor=function(e,t,n,r){e.isVector4?fe.set(e.x,e.y,e.z,e.w):fe.set(e,t,n,r),N.scissor(ne.copy(fe).multiplyScalar(ce).round())},this.getScissorTest=function(){return pe},this.setScissorTest=function(e){N.setScissorTest(pe=e)},this.setOpaqueSort=function(e){le=e},this.setTransparentSort=function(e){ue=e},this.getClearColor=function(e){return e.copy(Ae.getClearColor())},this.setClearColor=function(){Ae.setClearColor(...arguments)},this.getClearAlpha=function(){return Ae.getClearAlpha()},this.setClearAlpha=function(){Ae.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(O!==null){let t=O.texture.format;e=h.has(t)}if(e){let e=O.texture.type,t=g.has(e),n=Ae.getClearColor(),r=Ae.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,A.clearBufferuiv(A.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,A.clearBufferiv(A.COLOR,0,v))}else r|=A.COLOR_BUFFER_BIT}t&&(r|=A.DEPTH_BUFFER_BIT),n&&(r|=A.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&A.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener(`webglcontextlost`,Re,!1),t.removeEventListener(`webglcontextrestored`,ze,!1),t.removeEventListener(`webglcontextcreationerror`,Be,!1),Ae.dispose(),L.dispose(),R.dispose(),P.dispose(),Te.dispose(),Oe.dispose(),Pe.dispose(),Fe.dispose(),I.dispose(),Le.dispose(),Le.removeEventListener(`sessionstart`,qe),Le.removeEventListener(`sessionend`,Je),Ye.stop()};function Re(e){e.preventDefault(),Zr(`WebGLRenderer: Context Lost.`),T=!0}function ze(){Zr(`WebGLRenderer: Context Restored.`),T=!1;let e=we.autoReset,t=B.enabled,n=B.autoUpdate,r=B.needsUpdate,i=B.type;Ie(),we.autoReset=e,B.enabled=t,B.autoUpdate=n,B.needsUpdate=r,B.type=i}function Be(e){U(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function Ve(e){let t=e.target;t.removeEventListener(`dispose`,Ve),He(t)}function He(e){Ue(e),P.remove(e)}function Ue(e){let t=P.get(e).programs;t!==void 0&&(t.forEach(function(e){I.releaseProgram(e)}),e.isShaderMaterial&&I.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=be);let o=i.isMesh&&i.matrixWorld.determinant()<0,s=it(e,t,n,r,i);N.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=De.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Pe.setup(i,r,s,n,c);let h,g=Me;if(c!==null&&(h=Ee.get(c),g=Ne,g.setIndex(h)),i.isMesh)r.wireframe===!0?(N.setLineWidth(r.wireframeLinewidth*Se()),g.setMode(A.LINES)):g.setMode(A.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),N.setLineWidth(e*Se()),i.isLineSegments?g.setMode(A.LINES):i.isLineLoop?g.setMode(A.LINE_LOOP):g.setMode(A.LINE_STRIP)}else i.isPoints?g.setMode(A.POINTS):i.isSprite&&g.setMode(A.TRIANGLES);if(i.isBatchedMesh){if(i._multiDrawInstances!==null)$r(`WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection.`),g.renderMultiDrawInstances(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount,i._multiDrawInstances);else if(M.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Ee.get(c).bytesPerElement:1,o=P.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(A,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function We(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,tt(e,t,n),e.side=0,e.needsUpdate=!0,tt(e,t,n),e.side=2):tt(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),b=R.get(n),b.init(t),S.push(b),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(b.pushLight(e),e.castShadow&&b.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(b.pushLight(e),e.castShadow&&b.pushShadow(e))}),b.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t){if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];We(a,n,e),r.add(a)}else We(t,n,e),r.add(t)}}),b=S.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){P.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}M.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let Ge=null;function Ke(e){Ge&&Ge(e)}function qe(){Ye.stop()}function Je(){Ye.start()}let Ye=new hu;Ye.setAnimationLoop(Ke),typeof self<`u`&&Ye.setContext(self),this.setAnimationLoop=function(e){Ge=e,Le.setAnimationLoop(e),e===null?Ye.stop():Ye.start()},Le.addEventListener(`sessionstart`,qe),Le.addEventListener(`sessionend`,Je),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){U(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(T===!0)return;let n=Le.enabled===!0&&Le.isPresenting===!0,r=C!==null&&(O===null||n)&&C.begin(w,O);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),Le.enabled===!0&&Le.isPresenting===!0&&(C===null||C.isCompositing()===!1)&&(Le.cameraAutoUpdate===!0&&Le.updateCamera(t),t=Le.getCamera()),e.isScene===!0&&e.onBeforeRender(w,e,t,O),b=R.get(e,S.length),b.init(t),S.push(b),_e.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),me.setFromProjectionMatrix(_e,Gr,t.reversedDepth),ge=this.localClippingEnabled,he=z.init(this.clippingPlanes,ge),y=L.get(e,x.length),y.init(),x.push(y),Le.enabled===!0&&Le.isPresenting===!0){let e=w.xr.getDepthSensingMesh();e!==null&&Xe(e,t,-1/0,w.sortObjects)}Xe(e,t,0,w.sortObjects),y.finish(),w.sortObjects===!0&&y.sort(le,ue),xe=Le.enabled===!1||Le.isPresenting===!1||Le.hasDepthSensing()===!1,xe&&Ae.addToRenderList(y,e),this.info.render.frame++,he===!0&&z.beginShadows();let i=b.state.shadowsArray;if(B.render(i,e,t),he===!0&&z.endShadows(),this.info.autoReset===!0&&this.info.reset(),(r&&C.hasRenderPass())===!1){let n=y.opaque,r=y.transmissive;if(b.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];Qe(n,r,e,a)}xe&&Ae.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];Ze(y,e,n,n.viewport)}}else r.length>0&&Qe(n,r,e,t),xe&&Ae.render(e),Ze(y,e,t)}O!==null&&D===0&&(F.updateMultisampleRenderTarget(O),F.updateRenderTargetMipmap(O)),r&&C.end(w),e.isScene===!0&&e.onAfterRender(w,e,t),Pe.resetDefaultState(),ee=-1,k=null,S.pop(),S.length>0?(b=S[S.length-1],he===!0&&z.setGlobalState(w.clippingPlanes,b.state.camera)):b=null,x.pop(),y=x.length>0?x[x.length-1]:null};function Xe(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)b.pushLight(e),e.castShadow&&b.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||me.intersectsSprite(e)){r&&ye.setFromMatrixPosition(e.matrixWorld).applyMatrix4(_e);let t=Oe.update(e),i=e.material;i.visible&&y.push(e,t,i,n,ye.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||me.intersectsObject(e))){let t=Oe.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),ye.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ye.copy(e.boundingSphere.center)),ye.applyMatrix4(e.matrixWorld).applyMatrix4(_e)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&y.push(e,t,s,n,ye.z,o)}}else i.visible&&y.push(e,t,i,n,ye.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)Xe(i[e],t,n,r)}function Ze(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;b.setupLightsView(n),he===!0&&z.setGlobalState(w.clippingPlanes,n),r&&N.viewport(te.copy(r)),i.length>0&&$e(i,t,n),a.length>0&&$e(a,t,n),o.length>0&&$e(o,t,n),N.buffers.depth.setTest(!0),N.buffers.depth.setMask(!0),N.buffers.color.setMask(!0),N.setPolygonOffset(!1)}function Qe(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(b.state.transmissionRenderTarget[r.id]===void 0){let e=M.has(`EXT_color_buffer_half_float`)||M.has(`EXT_color_buffer_float`);b.state.transmissionRenderTarget[r.id]=new Ji(1,1,{generateMipmaps:!0,type:e?Mn:Tn,minFilter:wn,samples:Math.max(4,Ce.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:J.workingColorSpace})}let a=b.state.transmissionRenderTarget[r.id],o=r.viewport||te;a.setSize(o.z*w.transmissionResolutionScale,o.w*w.transmissionResolutionScale);let s=w.getRenderTarget(),c=w.getActiveCubeFace(),l=w.getActiveMipmapLevel();w.setRenderTarget(a),w.getClearColor(ie),ae=w.getClearAlpha(),ae<1&&w.setClearColor(16777215,.5),w.clear(),xe&&Ae.render(n);let u=w.toneMapping;w.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),b.setupLightsView(r),he===!0&&z.setGlobalState(w.clippingPlanes,r),$e(e,n,r),F.updateMultisampleRenderTarget(a),F.updateRenderTargetMipmap(a),M.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,et(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(F.updateMultisampleRenderTarget(a),F.updateRenderTargetMipmap(a))}w.setRenderTarget(s,c,l),w.setClearColor(ie,ae),d!==void 0&&(r.viewport=d),w.toneMapping=u}function $e(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&et(o,t,n,s,l,c)}}function et(e,t,n,r,i,a){e.onBeforeRender(w,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(w,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,w.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,w.renderBufferDirect(n,t,r,i,e,a),i.side=2):w.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(w,t,n,r,i,a)}function tt(e,t,n){t.isScene!==!0&&(t=be);let r=P.get(e),i=b.state.lights,a=b.state.shadowsArray,o=i.state.version,s=I.getParameters(e,i.state,a,t,n),c=I.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Te.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,Ve),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return rt(e,s),d}else s.uniforms=I.getUniforms(e),e.onBeforeCompile(s,w),d=I.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=z.uniform),rt(e,s),r.needsLights=ot(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.currentProgram=d,r.uniformsList=null,d}function nt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=lf.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function rt(e,t){let n=P.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function it(e,t,n,r,i){t.isScene!==!0&&(t=be),F.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=O===null?w.outputColorSpace:O.isXRRenderTarget===!0?O.texture.colorSpace:Br,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Te.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(O===null||O.isXRRenderTarget===!0)&&(h=w.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=P.get(r),y=b.state.lights;if(he===!0&&(ge===!0||e!==k)){let t=e===k&&r.id===ee;z.setState(r,e,t)}let x=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?x=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?x=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==z.numPlanes||v.numIntersection!==z.numIntersection)?x=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h?v.morphTargetsCount!==_&&(x=!0):x=!0:x=!0:x=!0:(x=!0,v.__version=r.version);let S=v.currentProgram;x===!0&&(S=tt(r,t,i));let C=!1,T=!1,E=!1,D=S.getUniforms(),te=v.uniforms;if(N.useProgram(S.program)&&(C=!0,T=!0,E=!0),r.id!==ee&&(ee=r.id,T=!0),C||k!==e){N.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),D.setValue(A,`projectionMatrix`,e.projectionMatrix),D.setValue(A,`viewMatrix`,e.matrixWorldInverse);let t=D.map.cameraPosition;t!==void 0&&t.setValue(A,ve.setFromMatrixPosition(e.matrixWorld)),Ce.logarithmicDepthBuffer&&D.setValue(A,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&D.setValue(A,`isOrthographic`,e.isOrthographicCamera===!0),k!==e&&(k=e,T=!0,E=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&D.setValue(A,`directionalShadowMap`,y.state.directionalShadowMap,F),y.state.spotShadowMap.length>0&&D.setValue(A,`spotShadowMap`,y.state.spotShadowMap,F),y.state.pointShadowMap.length>0&&D.setValue(A,`pointShadowMap`,y.state.pointShadowMap,F)),i.isSkinnedMesh){D.setOptional(A,i,`bindMatrix`),D.setOptional(A,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),D.setValue(A,`boneTexture`,e.boneTexture,F))}i.isBatchedMesh&&(D.setOptional(A,i,`batchingTexture`),D.setValue(A,`batchingTexture`,i._matricesTexture,F),D.setOptional(A,i,`batchingIdTexture`),D.setValue(A,`batchingIdTexture`,i._indirectTexture,F),D.setOptional(A,i,`batchingColorTexture`),i._colorsTexture!==null&&D.setValue(A,`batchingColorTexture`,i._colorsTexture,F));let ne=n.morphAttributes;if((ne.position!==void 0||ne.normal!==void 0||ne.color!==void 0)&&je.update(i,n,S),(T||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,D.setValue(A,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(te.envMapIntensity.value=t.environmentIntensity),te.dfgLUT!==void 0&&(te.dfgLUT.value=kp()),T&&(D.setValue(A,`toneMappingExposure`,w.toneMappingExposure),v.needsLights&&at(te,E),a&&r.fog===!0&&ke.refreshFogUniforms(te,a),ke.refreshMaterialUniforms(te,r,ce,se,b.state.transmissionRenderTarget[e.id]),lf.upload(A,nt(v),te,F)),r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(lf.upload(A,nt(v),te,F),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&D.setValue(A,`center`,i.center),D.setValue(A,`modelViewMatrix`,i.modelViewMatrix),D.setValue(A,`normalMatrix`,i.normalMatrix),D.setValue(A,`modelMatrix`,i.matrixWorld),r.isShaderMaterial||r.isRawShaderMaterial){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];Fe.update(n,S),Fe.bind(n,S)}}return S}function at(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return E},this.getActiveMipmapLevel=function(){return D},this.getRenderTarget=function(){return O},this.setRenderTargetTextures=function(e,t,n){let r=P.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),P.get(e.texture).__webglTexture=t,P.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=P.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0};let st=A.createFramebuffer();this.setRenderTarget=function(e,t=0,n=0){O=e,E=t,D=n;let r=null,i=!1,a=!1;if(e){let o=P.get(e);if(o.__useDefaultFramebuffer!==void 0){N.bindFramebuffer(A.FRAMEBUFFER,o.__webglFramebuffer),te.copy(e.viewport),ne.copy(e.scissor),re=e.scissorTest,N.viewport(te),N.scissor(ne),N.setScissorTest(re),ee=-1;return}if(o.__webglFramebuffer===void 0)F.setupRenderTarget(e);else if(o.__hasExternalTextures)F.rebindTextures(e,P.get(e.texture).__webglTexture,P.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&P.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.`);F.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=P.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&F.useMultisampledRTT(e)===!1?P.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,te.copy(e.viewport),ne.copy(e.scissor),re=e.scissorTest}else te.copy(de).multiplyScalar(ce).floor(),ne.copy(fe).multiplyScalar(ce).floor(),re=pe;if(n!==0&&(r=st),N.bindFramebuffer(A.FRAMEBUFFER,r)&&N.drawBuffers(e,r),N.viewport(te),N.scissor(ne),N.setScissorTest(re),i){let r=P.get(e.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=P.get(e.textures[t]);A.framebufferTextureLayer(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=P.get(e.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,t.__webglTexture,n)}ee=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){U(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=P.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){N.bindFramebuffer(A.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+s),!Ce.textureFormatReadable(c)){U(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!Ce.textureTypeReadable(l)){U(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&A.readPixels(t,n,r,i,V.convert(c),V.convert(l),a)}finally{let e=O===null?null:P.get(O).__webglFramebuffer;N.bindFramebuffer(A.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=P.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){N.bindFramebuffer(A.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+s),!Ce.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!Ce.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=A.createBuffer();A.bindBuffer(A.PIXEL_PACK_BUFFER,d),A.bufferData(A.PIXEL_PACK_BUFFER,a.byteLength,A.STREAM_READ),A.readPixels(t,n,r,i,V.convert(l),V.convert(u),0);let f=O===null?null:P.get(O).__webglFramebuffer;N.bindFramebuffer(A.FRAMEBUFFER,f);let p=A.fenceSync(A.SYNC_GPU_COMMANDS_COMPLETE,0);return A.flush(),await ei(A,p,4),A.bindBuffer(A.PIXEL_PACK_BUFFER,d),A.getBufferSubData(A.PIXEL_PACK_BUFFER,0,a),A.deleteBuffer(d),A.deleteSync(p),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;F.setTexture2D(e,0),A.copyTexSubImage2D(A.TEXTURE_2D,n,0,0,o,s,i,a),N.unbindTexture()};let ct=A.createFramebuffer(),lt=A.createFramebuffer();this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=V.convert(t.format),_=V.convert(t.type),v;t.isData3DTexture?(F.setTexture3D(t,0),v=A.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(F.setTexture2DArray(t,0),v=A.TEXTURE_2D_ARRAY):(F.setTexture2D(t,0),v=A.TEXTURE_2D),A.pixelStorei(A.UNPACK_FLIP_Y_WEBGL,t.flipY),A.pixelStorei(A.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),A.pixelStorei(A.UNPACK_ALIGNMENT,t.unpackAlignment);let y=A.getParameter(A.UNPACK_ROW_LENGTH),b=A.getParameter(A.UNPACK_IMAGE_HEIGHT),x=A.getParameter(A.UNPACK_SKIP_PIXELS),S=A.getParameter(A.UNPACK_SKIP_ROWS),C=A.getParameter(A.UNPACK_SKIP_IMAGES);A.pixelStorei(A.UNPACK_ROW_LENGTH,h.width),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,h.height),A.pixelStorei(A.UNPACK_SKIP_PIXELS,l),A.pixelStorei(A.UNPACK_SKIP_ROWS,u),A.pixelStorei(A.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=P.get(e),r=P.get(t),h=P.get(n.__renderTarget),g=P.get(r.__renderTarget);N.bindFramebuffer(A.READ_FRAMEBUFFER,h.__webglFramebuffer),N.bindFramebuffer(A.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,P.get(e).__webglTexture,i,d+n),A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,P.get(t).__webglTexture,a,m+n)),A.blitFramebuffer(l,u,o,s,f,p,o,s,A.DEPTH_BUFFER_BIT,A.NEAREST);N.bindFramebuffer(A.READ_FRAMEBUFFER,null),N.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||P.has(e)){let n=P.get(e),r=P.get(t);N.bindFramebuffer(A.READ_FRAMEBUFFER,ct),N.bindFramebuffer(A.DRAW_FRAMEBUFFER,lt);for(let e=0;e<c;e++)w?A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):A.framebufferTexture2D(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,n.__webglTexture,i),T?A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):A.framebufferTexture2D(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,r.__webglTexture,a),i===0?T?A.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):A.copyTexSubImage2D(v,a,f,p,l,u,o,s):A.blitFramebuffer(l,u,o,s,f,p,o,s,A.COLOR_BUFFER_BIT,A.NEAREST);N.bindFramebuffer(A.READ_FRAMEBUFFER,null),N.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?A.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?A.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):A.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?A.texSubImage2D(A.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?A.compressedTexSubImage2D(A.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):A.texSubImage2D(A.TEXTURE_2D,a,f,p,o,s,g,_,h);A.pixelStorei(A.UNPACK_ROW_LENGTH,y),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,b),A.pixelStorei(A.UNPACK_SKIP_PIXELS,x),A.pixelStorei(A.UNPACK_SKIP_ROWS,S),A.pixelStorei(A.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&A.generateMipmap(v),N.unbindTexture()},this.initRenderTarget=function(e){P.get(e).__webglFramebuffer===void 0&&F.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?F.setTextureCube(e,0):e.isData3DTexture?F.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?F.setTexture2DArray(e,0):F.setTexture2D(e,0),N.unbindTexture()},this.resetState=function(){E=0,D=0,O=null,N.reset(),Pe.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Gr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=J._getDrawingBufferColorSpace(e),t.unpackColorSpace=J._getUnpackColorSpace()}};function jp(e,t){if(t===0)return console.warn(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.`),e;if(t===2||t===1){let n=e.getIndex();if(n===null){let t=[],r=e.getAttribute(`position`);if(r!==void 0){for(let e=0;e<r.count;e++)t.push(e);e.setIndex(t),n=e.getIndex()}else return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.`),e}let r=n.count-2,i=[];if(t===2)for(let e=1;e<=r;e++)i.push(n.getX(0)),i.push(n.getX(e)),i.push(n.getX(e+1));else for(let e=0;e<r;e++)e%2==0?(i.push(n.getX(e)),i.push(n.getX(e+1)),i.push(n.getX(e+2))):(i.push(n.getX(e+2)),i.push(n.getX(e+1)),i.push(n.getX(e)));i.length/3!==r&&console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.`);let a=e.clone();return a.setIndex(i),a.clearGroups(),a}return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:`,t),e}function Mp(e){let t=new Map,n=new Map,r=e.clone();return Np(e,r,function(e,r){t.set(r,e),n.set(e,r)}),r.traverse(function(e){if(!e.isSkinnedMesh)return;let r=e,i=t.get(e),a=i.skeleton.bones;r.skeleton=i.skeleton.clone(),r.bindMatrix.copy(i.bindMatrix),r.skeleton.bones=a.map(function(e){return n.get(e)}),r.bind(r.skeleton,r.bindMatrix)}),r}function Np(e,t,n){n(e,t);for(let r=0;r<e.children.length;r++)Np(e.children[r],t.children[r],n)}var Pp=class extends bl{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(e){return new Bp(e)}),this.register(function(e){return new Vp(e)}),this.register(function(e){return new Xp(e)}),this.register(function(e){return new Zp(e)}),this.register(function(e){return new Qp(e)}),this.register(function(e){return new Up(e)}),this.register(function(e){return new Wp(e)}),this.register(function(e){return new Gp(e)}),this.register(function(e){return new Kp(e)}),this.register(function(e){return new zp(e)}),this.register(function(e){return new qp(e)}),this.register(function(e){return new Hp(e)}),this.register(function(e){return new Yp(e)}),this.register(function(e){return new Jp(e)}),this.register(function(e){return new Lp(e)}),this.register(function(e){return new $p(e,$.EXT_MESHOPT_COMPRESSION)}),this.register(function(e){return new $p(e,$.KHR_MESHOPT_COMPRESSION)}),this.register(function(e){return new em(e)})}load(e,t,n,r){let i=this,a;if(this.resourcePath!==``)a=this.resourcePath;else if(this.path!==``){let t=Jl.extractUrlBase(e);a=Jl.resolveURL(t,this.path)}else a=Jl.extractUrlBase(e);this.manager.itemStart(e);let o=function(t){r?r(t):console.error(t),i.manager.itemError(e),i.manager.itemEnd(e)},s=new Cl(this.manager);s.setPath(this.path),s.setResponseType(`arraybuffer`),s.setRequestHeader(this.requestHeader),s.setWithCredentials(this.withCredentials),s.load(e,function(n){try{i.parse(n,a,function(n){t(n),i.manager.itemEnd(e)},o)}catch(e){o(e)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let i,a={},o={},s=new TextDecoder;if(typeof e==`string`)i=JSON.parse(e);else if(e instanceof ArrayBuffer){if(s.decode(new Uint8Array(e,0,4))===tm){try{a[$.KHR_BINARY_GLTF]=new im(e)}catch(e){r&&r(e);return}i=JSON.parse(a[$.KHR_BINARY_GLTF].content)}else i=JSON.parse(s.decode(e))}else i=e;if(i.asset===void 0||i.asset.version[0]<2){r&&r(Error(`THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.`));return}let c=new Am(i,{path:t||this.resourcePath||``,crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let e=0;e<this.pluginCallbacks.length;e++){let t=this.pluginCallbacks[e](c);t.name||console.error(`THREE.GLTFLoader: Invalid plugin found: missing name`),o[t.name]=t,a[t.name]=!0}if(i.extensionsUsed)for(let e=0;e<i.extensionsUsed.length;++e){let t=i.extensionsUsed[e],n=i.extensionsRequired||[];switch(t){case $.KHR_MATERIALS_UNLIT:a[t]=new Rp;break;case $.KHR_DRACO_MESH_COMPRESSION:a[t]=new am(i,this.dracoLoader);break;case $.KHR_TEXTURE_TRANSFORM:a[t]=new om;break;case $.KHR_MESH_QUANTIZATION:a[t]=new sm;break;default:n.indexOf(t)>=0&&o[t]===void 0&&console.warn(`THREE.GLTFLoader: Unknown extension "`+t+`".`)}}c.setExtensions(a),c.setPlugins(o),c.parse(n,r)}parseAsync(e,t){let n=this;return new Promise(function(r,i){n.parse(e,t,r,i)})}};function Fp(){let e={};return{get:function(t){return e[t]},add:function(t,n){e[t]=n},remove:function(t){delete e[t]},removeAll:function(){e={}}}}function Ip(e,t,n){let r=e.json.materials[t];return r.extensions&&r.extensions[n]?r.extensions[n]:null}var $={KHR_BINARY_GLTF:`KHR_binary_glTF`,KHR_DRACO_MESH_COMPRESSION:`KHR_draco_mesh_compression`,KHR_LIGHTS_PUNCTUAL:`KHR_lights_punctual`,KHR_MATERIALS_CLEARCOAT:`KHR_materials_clearcoat`,KHR_MATERIALS_DISPERSION:`KHR_materials_dispersion`,KHR_MATERIALS_IOR:`KHR_materials_ior`,KHR_MATERIALS_SHEEN:`KHR_materials_sheen`,KHR_MATERIALS_SPECULAR:`KHR_materials_specular`,KHR_MATERIALS_TRANSMISSION:`KHR_materials_transmission`,KHR_MATERIALS_IRIDESCENCE:`KHR_materials_iridescence`,KHR_MATERIALS_ANISOTROPY:`KHR_materials_anisotropy`,KHR_MATERIALS_UNLIT:`KHR_materials_unlit`,KHR_MATERIALS_VOLUME:`KHR_materials_volume`,KHR_TEXTURE_BASISU:`KHR_texture_basisu`,KHR_TEXTURE_TRANSFORM:`KHR_texture_transform`,KHR_MESH_QUANTIZATION:`KHR_mesh_quantization`,KHR_MATERIALS_EMISSIVE_STRENGTH:`KHR_materials_emissive_strength`,EXT_MATERIALS_BUMP:`EXT_materials_bump`,EXT_TEXTURE_WEBP:`EXT_texture_webp`,EXT_TEXTURE_AVIF:`EXT_texture_avif`,EXT_MESHOPT_COMPRESSION:`EXT_meshopt_compression`,KHR_MESHOPT_COMPRESSION:`KHR_meshopt_compression`,EXT_MESH_GPU_INSTANCING:`EXT_mesh_gpu_instancing`},Lp=class{constructor(e){this.parser=e,this.name=$.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n=`light:`+e,r=t.cache.get(n);if(r)return r;let i=t.json,a=((i.extensions&&i.extensions[this.name]||{}).lights||[])[e],o,s=new X(16777215);a.color!==void 0&&s.setRGB(a.color[0],a.color[1],a.color[2],Br);let c=a.range===void 0?0:a.range;switch(a.type){case`directional`:o=new ql(s),o.target.position.set(0,0,-1),o.add(o.target);break;case`point`:o=new Wl(s),o.distance=c;break;case`spot`:o=new Hl(s),o.distance=c,a.spot=a.spot||{},a.spot.innerConeAngle=a.spot.innerConeAngle===void 0?0:a.spot.innerConeAngle,a.spot.outerConeAngle=a.spot.outerConeAngle===void 0?Math.PI/4:a.spot.outerConeAngle,o.angle=a.spot.outerConeAngle,o.penumbra=1-a.spot.innerConeAngle/a.spot.outerConeAngle,o.target.position.set(0,0,-1),o.add(o.target);break;default:throw Error(`THREE.GLTFLoader: Unexpected light type: `+a.type)}return o.position.set(0,0,0),Sm(o,a),a.intensity!==void 0&&(o.intensity=a.intensity),o.name=t.createUniqueName(a.name||`light_`+e),r=Promise.resolve(o),t.cache.add(n,r),r}getDependency(e,t){if(e===`light`)return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],i=(r.extensions&&r.extensions[this.name]||{}).light;return i===void 0?null:this._loadLight(i).then(function(e){return n._getNodeRef(t.cache,i,e)})}},Rp=class{constructor(){this.name=$.KHR_MATERIALS_UNLIT}getMaterialType(){return Vo}extendParams(e,t,n){let r=[];e.color=new X(1,1,1),e.opacity=1;let i=t.pbrMetallicRoughness;if(i){if(Array.isArray(i.baseColorFactor)){let t=i.baseColorFactor;e.color.setRGB(t[0],t[1],t[2],Br),e.opacity=t[3]}i.baseColorTexture!==void 0&&r.push(n.assignTexture(e,`map`,i.baseColorTexture,zr))}return Promise.all(r)}},zp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}},Bp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&r.push(this.parser.assignTexture(t,`clearcoatMap`,n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,`clearcoatRoughnessMap`,n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(r.push(this.parser.assignTexture(t,`clearcoatNormalMap`,n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){let e=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new G(e,e)}return Promise.all(r)}},Vp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion===void 0?0:n.dispersion),Promise.resolve()}},Hp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&r.push(this.parser.assignTexture(t,`iridescenceMap`,n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,`iridescenceThicknessMap`,n.iridescenceThicknessTexture)),Promise.all(r)}},Up=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_SHEEN}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];if(t.sheenColor=new X(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){let e=n.sheenColorFactor;t.sheenColor.setRGB(e[0],e[1],e[2],Br)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&r.push(this.parser.assignTexture(t,`sheenColorMap`,n.sheenColorTexture,zr)),n.sheenRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,`sheenRoughnessMap`,n.sheenRoughnessTexture)),Promise.all(r)}},Wp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&r.push(this.parser.assignTexture(t,`transmissionMap`,n.transmissionTexture)),Promise.all(r)}},Gp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_VOLUME}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];t.thickness=n.thicknessFactor===void 0?0:n.thicknessFactor,n.thicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,`thicknessMap`,n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let i=n.attenuationColor||[1,1,1];return t.attenuationColor=new X().setRGB(i[0],i[1],i[2],Br),Promise.all(r)}},Kp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_IOR}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);return n===null||(t.ior=n.ior===void 0?1.5:n.ior),Promise.resolve()}},qp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];t.specularIntensity=n.specularFactor===void 0?1:n.specularFactor,n.specularTexture!==void 0&&r.push(this.parser.assignTexture(t,`specularIntensityMap`,n.specularTexture));let i=n.specularColorFactor||[1,1,1];return t.specularColor=new X().setRGB(i[0],i[1],i[2],Br),n.specularColorTexture!==void 0&&r.push(this.parser.assignTexture(t,`specularColorMap`,n.specularColorTexture,zr)),Promise.all(r)}},Jp=class{constructor(e){this.parser=e,this.name=$.EXT_MATERIALS_BUMP}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return t.bumpScale=n.bumpFactor===void 0?1:n.bumpFactor,n.bumpTexture!==void 0&&r.push(this.parser.assignTexture(t,`bumpMap`,n.bumpTexture)),Promise.all(r)}},Yp=class{constructor(e){this.parser=e,this.name=$.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Ip(this.parser,e,this.name)===null?null:qc}extendMaterialParams(e,t){let n=Ip(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&r.push(this.parser.assignTexture(t,`anisotropyMap`,n.anisotropyTexture)),Promise.all(r)}},Xp=class{constructor(e){this.parser=e,this.name=$.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,r=n.textures[e];if(!r.extensions||!r.extensions[this.name])return null;let i=r.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures`);return null}return t.loadTextureImage(e,i.source,a)}},Zp=class{constructor(e){this.parser=e,this.name=$.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return n.loadTextureImage(e,a.source,s)}},Qp=class{constructor(e){this.parser=e,this.name=$.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return n.loadTextureImage(e,a.source,s)}},$p=class{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let e=n.extensions[this.name],r=this.parser.getDependency(`buffer`,e.buffer),i=this.parser.options.meshoptDecoder;if(!i||!i.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files`);return null}return r.then(function(t){let n=e.byteOffset||0,r=e.byteLength||0,a=e.count,o=e.byteStride,s=new Uint8Array(t,n,r);return i.decodeGltfBufferAsync?i.decodeGltfBufferAsync(a,o,s,e.mode,e.filter).then(function(e){return e.buffer}):i.ready.then(function(){let t=new ArrayBuffer(a*o);return i.decodeGltfBuffer(new Uint8Array(t),a,o,s,e.mode,e.filter),t})})}return null}},em=class{constructor(e){this.name=$.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let r=t.meshes[n.mesh];for(let e of r.primitives)if(e.mode!==dm.TRIANGLES&&e.mode!==dm.TRIANGLE_STRIP&&e.mode!==dm.TRIANGLE_FAN&&e.mode!==void 0)return null;let i=n.extensions[this.name].attributes,a=[],o={};for(let e in i)a.push(this.parser.getDependency(`accessor`,i[e]).then(t=>(o[e]=t,o[e])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(e=>{let t=e.pop(),n=t.isGroup?t.children:[t],r=e[0].count,i=[];for(let e of n){let t=new Y,n=new K,a=new ki,s=new K(1,1,1),c=new Ts(e.geometry,e.material,r);for(let e=0;e<r;e++)o.TRANSLATION&&n.fromBufferAttribute(o.TRANSLATION,e),o.ROTATION&&a.fromBufferAttribute(o.ROTATION,e),o.SCALE&&s.fromBufferAttribute(o.SCALE,e),c.setMatrixAt(e,t.compose(n,a,s));for(let t in o)if(t===`_COLOR_0`){let e=o[t];c.instanceColor=new _s(e.array,e.itemSize,e.normalized)}else t!==`TRANSLATION`&&t!==`ROTATION`&&t!==`SCALE`&&e.geometry.setAttribute(t,o[t]);Ca.prototype.copy.call(c,e),this.parser.assignFinalMaterial(c),i.push(c)}return t.isGroup?(t.clear(),t.add(...i),t):i[0]}))}},tm=`glTF`,nm=12,rm={JSON:1313821514,BIN:5130562},im=class{constructor(e){this.name=$.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,nm),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==tm)throw Error(`THREE.GLTFLoader: Unsupported glTF-Binary header.`);if(this.header.version<2)throw Error(`THREE.GLTFLoader: Legacy binary file detected.`);let r=this.header.length-nm,i=new DataView(e,nm),a=0;for(;a<r;){let t=i.getUint32(a,!0);a+=4;let r=i.getUint32(a,!0);if(a+=4,r===rm.JSON){let r=new Uint8Array(e,nm+a,t);this.content=n.decode(r)}else if(r===rm.BIN){let n=nm+a;this.body=e.slice(n,n+t)}a+=t}if(this.content===null)throw Error(`THREE.GLTFLoader: JSON content not found.`)}},am=class{constructor(e,t){if(!t)throw Error(`THREE.GLTFLoader: No DRACOLoader instance provided.`);this.name=$.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,r=this.dracoLoader,i=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},s={},c={};for(let e in a){let t=gm[e]||e.toLowerCase();o[t]=a[e]}for(let t in e.attributes){let r=gm[t]||t.toLowerCase();if(a[t]!==void 0){let i=n.accessors[e.attributes[t]];c[r]=fm[i.componentType].name,s[r]=i.normalized===!0}}return t.getDependency(`bufferView`,i).then(function(e){return new Promise(function(t,n){r.decodeDracoFile(e,function(e){for(let t in e.attributes){let n=e.attributes[t],r=s[t];r!==void 0&&(n.normalized=r)}t(e)},o,c,Br,n)})})}},om=class{constructor(){this.name=$.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}},sm=class{constructor(){this.name=$.KHR_MESH_QUANTIZATION}},cm=class extends tl{constructor(e,t,n,r){super(e,t,n,r)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r*3+r;for(let e=0;e!==r;e++)t[e]=n[i+e];return t}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=o*2,c=o*3,l=r-t,u=(n-t)/l,d=u*u,f=d*u,p=e*c,m=p-c,h=-2*f+3*d,g=f-d,_=1-h,v=g-d+u;for(let e=0;e!==o;e++){let t=a[m+e+o],n=a[m+e+s]*l,r=a[p+e+o],c=a[p+e]*l;i[e]=_*t+v*n+h*r+g*c}return i}},lm=new ki,um=class extends cm{interpolate_(e,t,n,r){let i=super.interpolate_(e,t,n,r);return lm.fromArray(i).normalize().toArray(i),i}},dm={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},fm={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},pm={9728:yn,9729:Sn,9984:bn,9985:Cn,9986:xn,9987:wn},mm={33071:_n,33648:vn,10497:gn},hm={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},gm={POSITION:`position`,NORMAL:`normal`,TANGENT:`tangent`,TEXCOORD_0:`uv`,TEXCOORD_1:`uv1`,TEXCOORD_2:`uv2`,TEXCOORD_3:`uv3`,COLOR_0:`color`,WEIGHTS_0:`skinWeight`,JOINTS_0:`skinIndex`},_m={scale:`scale`,translation:`position`,rotation:`quaternion`,weights:`morphTargetInfluences`},vm={CUBICSPLINE:void 0,LINEAR:jr,STEP:Ar},ym={OPAQUE:`OPAQUE`,MASK:`MASK`,BLEND:`BLEND`};function bm(e){return e.DefaultMaterial===void 0&&(e.DefaultMaterial=new Kc({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:0})),e.DefaultMaterial}function xm(e,t,n){for(let r in n.extensions)e[r]===void 0&&(t.userData.gltfExtensions=t.userData.gltfExtensions||{},t.userData.gltfExtensions[r]=n.extensions[r])}function Sm(e,t){t.extras!==void 0&&(typeof t.extras==`object`?Object.assign(e.userData,t.extras):console.warn(`THREE.GLTFLoader: Ignoring primitive type .extras, `+t.extras))}function Cm(e,t,n){let r=!1,i=!1,a=!1;for(let e=0,n=t.length;e<n;e++){let n=t[e];if(n.POSITION!==void 0&&(r=!0),n.NORMAL!==void 0&&(i=!0),n.COLOR_0!==void 0&&(a=!0),r&&i&&a)break}if(!r&&!i&&!a)return Promise.resolve(e);let o=[],s=[],c=[];for(let l=0,u=t.length;l<u;l++){let u=t[l];if(r){let t=u.POSITION===void 0?e.attributes.position:n.getDependency(`accessor`,u.POSITION);o.push(t)}if(i){let t=u.NORMAL===void 0?e.attributes.normal:n.getDependency(`accessor`,u.NORMAL);s.push(t)}if(a){let t=u.COLOR_0===void 0?e.attributes.color:n.getDependency(`accessor`,u.COLOR_0);c.push(t)}}return Promise.all([Promise.all(o),Promise.all(s),Promise.all(c)]).then(function(t){let n=t[0],o=t[1],s=t[2];return r&&(e.morphAttributes.position=n),i&&(e.morphAttributes.normal=o),a&&(e.morphAttributes.color=s),e.morphTargetsRelative=!0,e})}function wm(e,t){if(e.updateMorphTargets(),t.weights!==void 0)for(let n=0,r=t.weights.length;n<r;n++)e.morphTargetInfluences[n]=t.weights[n];if(t.extras&&Array.isArray(t.extras.targetNames)){let n=t.extras.targetNames;if(e.morphTargetInfluences.length===n.length){e.morphTargetDictionary={};for(let t=0,r=n.length;t<r;t++)e.morphTargetDictionary[n[t]]=t}else console.warn(`THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.`)}}function Tm(e){let t,n=e.extensions&&e.extensions[$.KHR_DRACO_MESH_COMPRESSION];if(t=n?`draco:`+n.bufferView+`:`+n.indices+`:`+Em(n.attributes):e.indices+`:`+Em(e.attributes)+`:`+e.mode,e.targets!==void 0)for(let n=0,r=e.targets.length;n<r;n++)t+=`:`+Em(e.targets[n]);return t}function Em(e){let t=``,n=Object.keys(e).sort();for(let r=0,i=n.length;r<i;r++)t+=n[r]+`:`+e[n[r]]+`;`;return t}function Dm(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw Error(`THREE.GLTFLoader: Unsupported normalized accessor component type.`)}}function Om(e){return e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0?`image/jpeg`:e.search(/\.webp($|\?)/i)>0||e.search(/^data\:image\/webp/)===0?`image/webp`:e.search(/\.ktx2($|\?)/i)>0||e.search(/^data\:image\/ktx2/)===0?`image/ktx2`:`image/png`}var km=new Y,Am=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new Fp,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,r=-1,i=!1,a=-1;if(typeof navigator<`u`&&navigator.userAgent!==void 0){let e=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(e)===!0;let t=e.match(/Version\/(\d+)/);r=n&&t?parseInt(t[1],10):-1,i=e.indexOf(`Firefox`)>-1,a=i?e.match(/Firefox\/([0-9]+)\./)[1]:-1}this.textureLoader=typeof createImageBitmap>`u`||n&&r<17||i&&a<98?new El(this.options.manager):new Xl(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Cl(this.options.manager),this.fileLoader.setResponseType(`arraybuffer`),this.options.crossOrigin===`use-credentials`&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,r=this.json,i=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(e){return e._markDefs&&e._markDefs()}),Promise.all(this._invokeAll(function(e){return e.beforeRoot&&e.beforeRoot()})).then(function(){return Promise.all([n.getDependencies(`scene`),n.getDependencies(`animation`),n.getDependencies(`camera`)])}).then(function(t){let a={scene:t[0][r.scene||0],scenes:t[0],animations:t[1],cameras:t[2],asset:r.asset,parser:n,userData:{}};return xm(i,a,r),Sm(a,r),Promise.all(n._invokeAll(function(e){return e.afterRoot&&e.afterRoot(a)})).then(function(){for(let e of a.scenes)e.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n].joints;for(let t=0,n=r.length;t<n;t++)e[r[t]].isBone=!0}for(let t=0,r=e.length;t<r;t++){let r=e[t];r.mesh!==void 0&&(this._addNodeRef(this.meshCache,r.mesh),r.skin!==void 0&&(n[r.mesh].isSkinnedMesh=!0)),r.camera!==void 0&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let r=n.clone(),i=(e,t)=>{let n=this.associations.get(e);n!=null&&this.associations.set(t,n);for(let[n,r]of e.children.entries())i(r,t.children[n])};return i(n,r),r.name+=`_instance_`+e.uses[t]++,r}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let r=e(t[n]);if(r)return r}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let r=0;r<t.length;r++){let i=e(t[r]);i&&n.push(i)}return n}getDependency(e,t){let n=e+`:`+t,r=this.cache.get(n);if(!r){switch(e){case`scene`:r=this.loadScene(t);break;case`node`:r=this._invokeOne(function(e){return e.loadNode&&e.loadNode(t)});break;case`mesh`:r=this._invokeOne(function(e){return e.loadMesh&&e.loadMesh(t)});break;case`accessor`:r=this.loadAccessor(t);break;case`bufferView`:r=this._invokeOne(function(e){return e.loadBufferView&&e.loadBufferView(t)});break;case`buffer`:r=this.loadBuffer(t);break;case`material`:r=this._invokeOne(function(e){return e.loadMaterial&&e.loadMaterial(t)});break;case`texture`:r=this._invokeOne(function(e){return e.loadTexture&&e.loadTexture(t)});break;case`skin`:r=this.loadSkin(t);break;case`animation`:r=this._invokeOne(function(e){return e.loadAnimation&&e.loadAnimation(t)});break;case`camera`:r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(n){return n!=this&&n.getDependency&&n.getDependency(e,t)}),!r)throw Error(`Unknown type: `+e)}this.cache.add(n,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,r=this.json[e+(e===`mesh`?`es`:`s`)]||[];t=Promise.all(r.map(function(t,r){return n.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!==`arraybuffer`)throw Error(`THREE.GLTFLoader: `+t.type+` buffer type is not supported.`);if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[$.KHR_BINARY_GLTF].body);let r=this.options;return new Promise(function(e,i){n.load(Jl.resolveURL(t.uri,r.path),e,void 0,function(){i(Error(`THREE.GLTFLoader: Failed to load buffer "`+t.uri+`".`))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency(`buffer`,t.buffer).then(function(e){let n=t.byteLength||0,r=t.byteOffset||0;return e.slice(r,r+n)})}loadAccessor(e){let t=this,n=this.json,r=this.json.accessors[e];if(r.bufferView===void 0&&r.sparse===void 0){let e=hm[r.type],t=fm[r.componentType],n=r.normalized===!0,i=new t(r.count*e);return Promise.resolve(new fo(i,e,n))}let i=[];return r.bufferView===void 0?i.push(null):i.push(this.getDependency(`bufferView`,r.bufferView)),r.sparse!==void 0&&(i.push(this.getDependency(`bufferView`,r.sparse.indices.bufferView)),i.push(this.getDependency(`bufferView`,r.sparse.values.bufferView))),Promise.all(i).then(function(e){let i=e[0],a=hm[r.type],o=fm[r.componentType],s=o.BYTES_PER_ELEMENT,c=s*a,l=r.byteOffset||0,u=r.bufferView===void 0?void 0:n.bufferViews[r.bufferView].byteStride,d=r.normalized===!0,f,p;if(u&&u!==c){let e=Math.floor(l/u),n=`InterleavedBuffer:`+r.bufferView+`:`+r.componentType+`:`+e+`:`+r.count,c=t.cache.get(n);c||(f=new o(i,e*u,r.count*u/s),c=new Oo(f,u/s),t.cache.add(n,c)),p=new Ao(c,a,l%u/s,d)}else f=i===null?new o(r.count*a):new o(i,l,r.count*a),p=new fo(f,a,d);if(r.sparse!==void 0){let t=hm.SCALAR,n=fm[r.sparse.indices.componentType],s=r.sparse.indices.byteOffset||0,c=r.sparse.values.byteOffset||0,l=new n(e[1],s,r.sparse.count*t),u=new o(e[2],c,r.sparse.count*a);i!==null&&(p=new fo(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let e=0,t=l.length;e<t;e++){let t=l[e];if(p.setX(t,u[e*a]),a>=2&&p.setY(t,u[e*a+1]),a>=3&&p.setZ(t,u[e*a+2]),a>=4&&p.setW(t,u[e*a+3]),a>=5)throw Error(`THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.`)}p.normalized=d}return p})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,i=t.images[r],a=this.textureLoader;if(i.uri){let e=n.manager.getHandler(i.uri);e!==null&&(a=e)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){let r=this,i=this.json,a=i.textures[e],o=i.images[t],s=(o.uri||o.bufferView)+`:`+a.sampler;if(this.textureCache[s])return this.textureCache[s];let c=this.loadImageSource(t,n).then(function(t){t.flipY=!1,t.name=a.name||o.name||``,t.name===``&&typeof o.uri==`string`&&o.uri.startsWith(`data:image/`)===!1&&(t.name=o.uri);let n=(i.samplers||{})[a.sampler]||{};return t.magFilter=pm[n.magFilter]||1006,t.minFilter=pm[n.minFilter]||1008,t.wrapS=mm[n.wrapS]||1e3,t.wrapT=mm[n.wrapT]||1e3,t.generateMipmaps=!t.isCompressedTexture&&t.minFilter!==1003&&t.minFilter!==1006,r.associations.set(t,{textures:e}),t}).catch(function(){return null});return this.textureCache[s]=c,c}loadImageSource(e,t){let n=this,r=this.json,i=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(e=>e.clone());let a=r.images[e],o=self.URL||self.webkitURL,s=a.uri||``,c=!1;if(a.bufferView!==void 0)s=n.getDependency(`bufferView`,a.bufferView).then(function(e){c=!0;let t=new Blob([e],{type:a.mimeType});return s=o.createObjectURL(t),s});else if(a.uri===void 0)throw Error(`THREE.GLTFLoader: Image `+e+` is missing URI and bufferView`);let l=Promise.resolve(s).then(function(e){return new Promise(function(n,r){let a=n;t.isImageBitmapLoader===!0&&(a=function(e){let t=new Gi(e);t.needsUpdate=!0,n(t)}),t.load(Jl.resolveURL(e,i.path),a,void 0,r)})}).then(function(e){return c===!0&&o.revokeObjectURL(s),Sm(e,a),e.userData.mimeType=a.mimeType||Om(a.uri),e}).catch(function(e){throw console.error(`THREE.GLTFLoader: Couldn't load texture`,s),e});return this.sourceCache[e]=l,l}assignTexture(e,t,n,r){let i=this;return this.getDependency(`texture`,n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),i.extensions[$.KHR_TEXTURE_TRANSFORM]){let e=n.extensions===void 0?void 0:n.extensions[$.KHR_TEXTURE_TRANSFORM];if(e){let t=i.associations.get(a);a=i.extensions[$.KHR_TEXTURE_TRANSFORM].extendTexture(a,e),i.associations.set(a,t)}}return r!==void 0&&(a.colorSpace=r),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,r=t.attributes.tangent===void 0,i=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let e=`PointsMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new Js,Mo.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,t.sizeAttenuation=!1,this.cache.add(e,t)),n=t}else if(e.isLine){let e=`LineBasicMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new Ps,Mo.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,this.cache.add(e,t)),n=t}if(r||i||a){let e=`ClonedMaterial:`+n.uuid+`:`;r&&(e+=`derivative-tangents:`),i&&(e+=`vertex-colors:`),a&&(e+=`flat-shading:`);let t=this.cache.get(e);t||(t=n.clone(),i&&(t.vertexColors=!0),a&&(t.flatShading=!0),r&&(t.normalScale&&(t.normalScale.y*=-1),t.clearcoatNormalScale&&(t.clearcoatNormalScale.y*=-1)),this.cache.add(e,t),this.associations.set(t,this.associations.get(n))),n=t}e.material=n}getMaterialType(){return Kc}loadMaterial(e){let t=this,n=this.json,r=this.extensions,i=n.materials[e],a,o={},s=i.extensions||{},c=[];if(s[$.KHR_MATERIALS_UNLIT]){let e=r[$.KHR_MATERIALS_UNLIT];a=e.getMaterialType(),c.push(e.extendParams(o,i,t))}else{let n=i.pbrMetallicRoughness||{};if(o.color=new X(1,1,1),o.opacity=1,Array.isArray(n.baseColorFactor)){let e=n.baseColorFactor;o.color.setRGB(e[0],e[1],e[2],Br),o.opacity=e[3]}n.baseColorTexture!==void 0&&c.push(t.assignTexture(o,`map`,n.baseColorTexture,zr)),o.metalness=n.metallicFactor===void 0?1:n.metallicFactor,o.roughness=n.roughnessFactor===void 0?1:n.roughnessFactor,n.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(o,`metalnessMap`,n.metallicRoughnessTexture)),c.push(t.assignTexture(o,`roughnessMap`,n.metallicRoughnessTexture))),a=this._invokeOne(function(t){return t.getMaterialType&&t.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(t){return t.extendMaterialParams&&t.extendMaterialParams(e,o)})))}i.doubleSided===!0&&(o.side=2);let l=i.alphaMode||ym.OPAQUE;if(l===ym.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,l===ym.MASK&&(o.alphaTest=i.alphaCutoff===void 0?.5:i.alphaCutoff)),i.normalTexture!==void 0&&a!==Vo&&(c.push(t.assignTexture(o,`normalMap`,i.normalTexture)),o.normalScale=new G(1,1),i.normalTexture.scale!==void 0)){let e=i.normalTexture.scale;o.normalScale.set(e,e)}if(i.occlusionTexture!==void 0&&a!==Vo&&(c.push(t.assignTexture(o,`aoMap`,i.occlusionTexture)),i.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=i.occlusionTexture.strength)),i.emissiveFactor!==void 0&&a!==Vo){let e=i.emissiveFactor;o.emissive=new X().setRGB(e[0],e[1],e[2],Br)}return i.emissiveTexture!==void 0&&a!==Vo&&c.push(t.assignTexture(o,`emissiveMap`,i.emissiveTexture,zr)),Promise.all(c).then(function(){let n=new a(o);return i.name&&(n.name=i.name),Sm(n,i),t.associations.set(n,{materials:e}),i.extensions&&xm(r,n,i),n})}createUniqueName(e){let t=fu.sanitizeNodeName(e||``);return t in this.nodeNamesUsed?t+`_`+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,r=this.primitiveCache;function i(e){return n[$.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e,t).then(function(n){return Mm(n,e,t)})}let a=[];for(let n=0,o=e.length;n<o;n++){let o=e[n],s=Tm(o),c=r[s];if(c)a.push(c.promise);else{let e;e=o.extensions&&o.extensions[$.KHR_DRACO_MESH_COMPRESSION]?i(o):Mm(new Do,o,t),r[s]={primitive:o,promise:e},a.push(e)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,r=this.extensions,i=n.meshes[e],a=i.primitives,o=[];for(let e=0,t=a.length;e<t;e++){let t=a[e].material===void 0?bm(this.cache):this.getDependency(`material`,a[e].material);o.push(t)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(n){let o=n.slice(0,n.length-1),s=n[n.length-1],c=[];for(let n=0,l=s.length;n<l;n++){let l=s[n],u=a[n],d,f=o[n];if(u.mode===dm.TRIANGLES||u.mode===dm.TRIANGLE_STRIP||u.mode===dm.TRIANGLE_FAN||u.mode===void 0)d=i.isSkinnedMesh===!0?new ds(l,f):new $o(l,f),d.isSkinnedMesh===!0&&d.normalizeSkinWeights(),u.mode===dm.TRIANGLE_STRIP?d.geometry=jp(d.geometry,1):u.mode===dm.TRIANGLE_FAN&&(d.geometry=jp(d.geometry,2));else if(u.mode===dm.LINES)d=new Ks(l,f);else if(u.mode===dm.LINE_STRIP)d=new Hs(l,f);else if(u.mode===dm.LINE_LOOP)d=new qs(l,f);else if(u.mode===dm.POINTS)d=new $s(l,f);else throw Error(`THREE.GLTFLoader: Primitive mode unsupported: `+u.mode);Object.keys(d.geometry.morphAttributes).length>0&&wm(d,i),d.name=t.createUniqueName(i.name||`mesh_`+e),Sm(d,i),u.extensions&&xm(r,d,u),t.assignFinalMaterial(d),c.push(d)}for(let n=0,r=c.length;n<r;n++)t.associations.set(c[n],{meshes:e,primitives:n});if(c.length===1)return i.extensions&&xm(r,c[0],i),c[0];let l=new wa;i.extensions&&xm(r,l,i),t.associations.set(l,{meshes:e});for(let e=0,t=c.length;e<t;e++)l.add(c[e]);return l})}loadCamera(e){let t,n=this.json.cameras[e],r=n[n.type];if(!r)console.warn(`THREE.GLTFLoader: Missing camera parameters.`);else return n.type===`perspective`?t=new Bl(Oi.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):n.type===`orthographic`&&(t=new Gl(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Sm(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let e=0,r=t.joints.length;e<r;e++)n.push(this._loadNodeShallow(t.joints[e]));return t.inverseBindMatrices===void 0?n.push(null):n.push(this.getDependency(`accessor`,t.inverseBindMatrices)),Promise.all(n).then(function(e){let n=e.pop(),r=e,i=[],a=[];for(let e=0,o=r.length;e<o;e++){let o=r[e];if(o){i.push(o);let t=new Y;n!==null&&t.fromArray(n.array,e*16),a.push(t)}else console.warn(`THREE.GLTFLoader: Joint "%s" could not be found.`,t.joints[e])}return new gs(i,a)})}loadAnimation(e){let t=this.json,n=this,r=t.animations[e],i=r.name?r.name:`animation_`+e,a=[],o=[],s=[],c=[],l=[];for(let e=0,t=r.channels.length;e<t;e++){let t=r.channels[e],n=r.samplers[t.sampler],i=t.target,u=i.node,d=r.parameters===void 0?n.input:r.parameters[n.input],f=r.parameters===void 0?n.output:r.parameters[n.output];i.node!==void 0&&(a.push(this.getDependency(`node`,u)),o.push(this.getDependency(`accessor`,d)),s.push(this.getDependency(`accessor`,f)),c.push(n),l.push(i))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(s),Promise.all(c),Promise.all(l)]).then(function(e){let t=e[0],a=e[1],o=e[2],s=e[3],c=e[4],l=[];for(let e=0,r=t.length;e<r;e++){let r=t[e],i=a[e],u=o[e],d=s[e],f=c[e];if(r===void 0)continue;r.updateMatrix&&r.updateMatrix();let p=n._createAnimationTracks(r,i,u,d,f);if(p)for(let e=0;e<p.length;e++)l.push(p[e])}let u=new ml(i,void 0,l);return Sm(u,r),u})}createNodeMesh(e){let t=this.json,n=this,r=t.nodes[e];return r.mesh===void 0?null:n.getDependency(`mesh`,r.mesh).then(function(e){let t=n._getNodeRef(n.meshCache,r.mesh,e);return r.weights!==void 0&&t.traverse(function(e){if(e.isMesh)for(let t=0,n=r.weights.length;t<n;t++)e.morphTargetInfluences[t]=r.weights[t]}),t})}loadNode(e){let t=this.json,n=this,r=t.nodes[e],i=n._loadNodeShallow(e),a=[],o=r.children||[];for(let e=0,t=o.length;e<t;e++)a.push(n.getDependency(`node`,o[e]));let s=r.skin===void 0?Promise.resolve(null):n.getDependency(`skin`,r.skin);return Promise.all([i,Promise.all(a),s]).then(function(e){let t=e[0],n=e[1],r=e[2];r!==null&&t.traverse(function(e){e.isSkinnedMesh&&e.bind(r,km)});for(let e=0,r=n.length;e<r;e++)t.add(n[e]);if(t.userData.pivot!==void 0&&n.length>0){let e=t.userData.pivot,r=n[0];t.pivot=new K().fromArray(e),t.position.x-=e[0],t.position.y-=e[1],t.position.z-=e[2],r.position.set(0,0,0),delete t.userData.pivot}return t})}_loadNodeShallow(e){let t=this.json,n=this.extensions,r=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let i=t.nodes[e],a=i.name?r.createUniqueName(i.name):``,o=[],s=r._invokeOne(function(t){return t.createNodeMesh&&t.createNodeMesh(e)});return s&&o.push(s),i.camera!==void 0&&o.push(r.getDependency(`camera`,i.camera).then(function(e){return r._getNodeRef(r.cameraCache,i.camera,e)})),r._invokeAll(function(t){return t.createNodeAttachment&&t.createNodeAttachment(e)}).forEach(function(e){o.push(e)}),this.nodeCache[e]=Promise.all(o).then(function(t){let o;if(o=i.isBone===!0?new fs:t.length>1?new wa:t.length===1?t[0]:new Ca,o!==t[0])for(let e=0,n=t.length;e<n;e++)o.add(t[e]);if(i.name&&(o.userData.name=i.name,o.name=a),Sm(o,i),i.extensions&&xm(n,o,i),i.matrix!==void 0){let e=new Y;e.fromArray(i.matrix),o.applyMatrix4(e)}else i.translation!==void 0&&o.position.fromArray(i.translation),i.rotation!==void 0&&o.quaternion.fromArray(i.rotation),i.scale!==void 0&&o.scale.fromArray(i.scale);if(!r.associations.has(o))r.associations.set(o,{});else if(i.mesh!==void 0&&r.meshCache.refs[i.mesh]>1){let e=r.associations.get(o);r.associations.set(o,{...e})}return r.associations.get(o).nodes=e,o}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],r=this,i=new wa;n.name&&(i.name=r.createUniqueName(n.name)),Sm(i,n),n.extensions&&xm(t,i,n);let a=n.nodes||[],o=[];for(let e=0,t=a.length;e<t;e++)o.push(r.getDependency(`node`,a[e]));return Promise.all(o).then(function(e){for(let t=0,n=e.length;t<n;t++){let n=e[t];n.parent===null?i.add(n):i.add(Mp(n))}return r.associations=(e=>{let t=new Map;for(let[e,n]of r.associations)(e instanceof Mo||e instanceof Gi)&&t.set(e,n);return e.traverse(e=>{let n=r.associations.get(e);n!=null&&t.set(e,n)}),t})(i),i})}_createAnimationTracks(e,t,n,r,i){let a=[],o=e.name?e.name:e.uuid,s=[];_m[i.path]===_m.weights?e.traverse(function(e){e.morphTargetInfluences&&s.push(e.name?e.name:e.uuid)}):s.push(o);let c;switch(_m[i.path]){case _m.weights:c=ll;break;case _m.rotation:c=dl;break;case _m.translation:case _m.scale:c=pl;break;default:switch(n.itemSize){case 1:c=ll;break;default:c=pl}}let l=r.interpolation===void 0?jr:vm[r.interpolation],u=this._getArrayFromAccessor(n);for(let e=0,n=s.length;e<n;e++){let n=new c(s[e]+`.`+_m[i.path],t.array,u,l);r.interpolation===`CUBICSPLINE`&&this._createCubicSplineTrackInterpolant(n),a.push(n)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let e=Dm(t.constructor),n=new Float32Array(t.length);for(let r=0,i=t.length;r<i;r++)n[r]=t[r]*e;t=n}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(e){return new(this instanceof dl?um:cm)(this.times,this.values,this.getValueSize()/3,e)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function jm(e,t,n){let r=t.attributes,i=new qa;if(r.POSITION!==void 0){let e=n.json.accessors[r.POSITION],t=e.min,a=e.max;if(t!==void 0&&a!==void 0){if(i.set(new K(t[0],t[1],t[2]),new K(a[0],a[1],a[2])),e.normalized){let t=Dm(fm[e.componentType]);i.min.multiplyScalar(t),i.max.multiplyScalar(t)}}else{console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`);return}}else return;let a=t.targets;if(a!==void 0){let e=new K,t=new K;for(let r=0,i=a.length;r<i;r++){let i=a[r];if(i.POSITION!==void 0){let r=n.json.accessors[i.POSITION],a=r.min,o=r.max;if(a!==void 0&&o!==void 0){if(t.setX(Math.max(Math.abs(a[0]),Math.abs(o[0]))),t.setY(Math.max(Math.abs(a[1]),Math.abs(o[1]))),t.setZ(Math.max(Math.abs(a[2]),Math.abs(o[2]))),r.normalized){let e=Dm(fm[r.componentType]);t.multiplyScalar(e)}e.max(t)}else console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`)}}i.expandByVector(e)}e.boundingBox=i;let o=new yo;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,e.boundingSphere=o}function Mm(e,t,n){let r=t.attributes,i=[];function a(t,r){return n.getDependency(`accessor`,t).then(function(t){e.setAttribute(r,t)})}for(let t in r){let n=gm[t]||t.toLowerCase();n in e.attributes||i.push(a(r[t],n))}if(t.indices!==void 0&&!e.index){let r=n.getDependency(`accessor`,t.indices).then(function(t){e.setIndex(t)});i.push(r)}return J.workingColorSpace!==`srgb-linear`&&`COLOR_0`in r&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${J.workingColorSpace}" not supported.`),Sm(e,t),jm(e,t,n),Promise.all(i).then(function(){return t.targets===void 0?e:Cm(e,t.targets,n)})}var Nm=class extends Ma{constructor(){super(),this.name=`RoomEnvironment`,this.position.y=-3.5;let e=new oc;e.deleteAttribute(`uv`);let t=new Kc({side:1}),n=new Kc,r=new Wl(16777215,900,28,2);r.position.set(.418,16.199,.3),this.add(r);let i=new $o(e,t);i.position.set(-.757,13.219,.717),i.scale.set(31.713,28.305,28.591),this.add(i);let a=new Ts(e,n,6),o=new Ca;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);let s=new $o(e,Pm(50));s.position.set(-16.116,14.37,8.208),s.scale.set(.1,2.428,2.739),this.add(s);let c=new $o(e,Pm(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let l=new $o(e,Pm(17));l.position.set(14.904,12.198,-1.832),l.scale.set(.15,4.265,6.331),this.add(l);let u=new $o(e,Pm(43));u.position.set(-.462,8.89,14.52),u.scale.set(4.38,5.441,.088),this.add(u);let d=new $o(e,Pm(20));d.position.set(3.235,11.486,-12.541),d.scale.set(2.5,2,.1),this.add(d);let f=new $o(e,Pm(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function Pm(e){return new Jc({color:0,emissive:16777215,emissiveIntensity:e})}function Fm(){let e=document.createElement(`canvas`);e.width=1024,e.height=512;let t=e.getContext(`2d`),n=t.createImageData(e.width,e.height),r=808,i=()=>(r^=r<<13,r^=r>>>17,r^=r<<5,(r>>>0)/4294967296);for(let t=0;t<e.height;t++)for(let r=0;r<e.width;r++){let a=(t*e.width+r)*4,o=.82+i()*.18;n.data[a]=n.data[a+1]=n.data[a+2]=Math.round(o*255),n.data[a+3]=255}t.putImageData(n,0,0);let a=new nc(e);return a.wrapS=a.wrapT=gn,a.anisotropy=8,a}function Im(e,t,n=0){let r=e===`oak_light`?2.3:e===`oak_end`?1.1:1.7,i=new qc({color:e===`oak_inlay`?`#e7c28b`:`#fff3df`,roughness:.46,metalness:0,clearcoat:.15,clearcoatRoughness:.42,bumpMap:t,bumpScale:e===`oak_inlay`?.004:.012});return i.name=e,i.onBeforeCompile=i=>{i.uniforms.craftedGrain={value:t},i.uniforms.craftOffset={value:new G((Math.sin(n*13.7)*.5+.5)*.7,(Math.sin(n*8.2)*.5+.5)*.5)},i.vertexShader=i.vertexShader.replace(`#include <common>`,`#include <common>
varying vec3 vCraftPosition;varying vec3 vCraftNormal;`),i.vertexShader=i.vertexShader.replace(`#include <begin_vertex>`,`#include <begin_vertex>
vCraftPosition=(modelMatrix*vec4(position,1.)).xyz;vCraftNormal=normalize(mat3(modelMatrix)*normal);`),i.fragmentShader=i.fragmentShader.replace(`#include <common>`,`#include <common>
uniform sampler2D craftedGrain;uniform vec2 craftOffset;varying vec3 vCraftPosition;varying vec3 vCraftNormal;`);let a=e===`oak_inlay`?`mix(vec3(1.),texture2D(craftedGrain,craftUV).rgb*3.0,.12)`:`texture2D(craftedGrain,craftUV).rgb*${r.toFixed(1)}`;i.fragmentShader=i.fragmentShader.replace(`#include <color_fragment>`,`#include <color_fragment>\nvec3 cn=abs(normalize(vCraftNormal));vec2 craftUV=(cn.y>.55?vCraftPosition.xz*vec2(.10,.12):(cn.x>.55?vCraftPosition.zy*vec2(.10,.20):vCraftPosition.xy*vec2(.10,.20)))+craftOffset;diffuseColor.rgb*=${a};`)},i.customProgramCacheKey=()=>`crafted-${e}`,i}function Lm(e=`潮水尺`){let t=document.createElement(`canvas`);t.width=1536,t.height=160;let n=t.getContext(`2d`);n.clearRect(0,0,1536,160),n.fillStyle=`#246d8b`,n.strokeStyle=`#3183a1`,n.lineWidth=3,n.beginPath(),n.moveTo(260,128),n.lineTo(1480,128),n.stroke();for(let e=0;e<=100;e++){let t=260+e*12.2;n.lineWidth=e%10==0?3:1.6,n.beginPath(),n.moveTo(t,e%10==0?55:e%5==0?75:91),n.lineTo(t,128),n.stroke()}n.font=`bold `+(e.length>3?36:49)+`px "Microsoft YaHei UI",sans-serif`,n.fillText(e,35,105),n.lineWidth=6,n.beginPath(),n.moveTo(183,105),n.bezierCurveTo(220,100,205,68,229,68),n.bezierCurveTo(251,68,229,106,246,106),n.stroke();let r=new nc(t);return r.colorSpace=zr,r}function Rm(){let e=document.createElement(`canvas`);e.width=e.height=256;let t=e.getContext(`2d`);t.strokeStyle=`#ffedc9`,t.lineWidth=8,t.lineCap=`round`,t.beginPath(),t.arc(128,128,107,0,Math.PI*2),t.stroke(),t.lineWidth=11,t.beginPath(),t.moveTo(58,153),t.bezierCurveTo(126,161,99,82,145,86),t.bezierCurveTo(195,89,126,166,194,146),t.stroke(),t.lineWidth=6,t.beginPath(),t.moveTo(58,176),t.bezierCurveTo(104,190,149,158,197,170),t.stroke();let n=new nc(e);return n.colorSpace=zr,n}function zm(){let e=document.createElement(`canvas`);e.width=512,e.height=256;let t=e.getContext(`2d`);t.strokeStyle=`#76f6ff`,t.lineWidth=12,t.lineCap=`round`,t.shadowColor=`#35d5ff`,t.shadowBlur=20;for(let e of[140,372])t.beginPath(),t.arc(e,147,49,Math.PI,Math.PI*2),t.stroke();let n=new nc(e);return n.colorSpace=zr,n}function Bm(){let e=document.createElement(`canvas`);e.width=e.height=128;let t=e.getContext(`2d`),n=t.createRadialGradient(64,64,8,64,64,62);return n.addColorStop(0,`rgba(45,29,12,.6)`),n.addColorStop(.5,`rgba(45,29,12,.3)`),n.addColorStop(1,`rgba(45,29,12,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),new nc(e)}var Vm=-2.18,Hm=5.24,Um=class{el=document.createElement(`div`);renderer;scene=new Ma;camera=new Bl(28,1,.1,120);model;width=1;height=1;frame=0;lastTime=0;focused=!0;view=18;targetView=18;target=new K(0,.4,.2);pointer=new G;projected=[];binding;texture;sand;sandWidth=1;sandDepth=1;sandOrigin=new K;selection;brushCursor;detachCanvas;tools=new Map;contacts=new Map;sun=new ql(`#fff0ce`,2.7);sky=new Ol(`#b9e7f6`,`#b99562`,1.1);tide=0;knob;rulerHalo;eyes;rulerMarks;rulerLabel=`潮水尺`;reduced=!1;needLayout=!0;host;constructor(e,t){this.host=e,this.reduced=t,this.el.className=`workbench-scene`,this.el.setAttribute(`aria-hidden`,`true`),this.renderer=new Ap({alpha:!0,antialias:!0,powerPreference:`high-performance`}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65)),this.renderer.outputColorSpace=zr,this.renderer.toneMapping=4,this.renderer.toneMappingExposure=.9,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=3,this.el.append(this.renderer.domElement),this.camera.position.set(0,8.8,17),this.camera.lookAt(this.target),this.sun.position.set(8,14,-7),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(2048,2048),Object.assign(this.sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:45}),this.sun.shadow.normalBias=.025,this.sun.shadow.bias=-7e-5,this.sun.shadow.radius=4,this.sun.shadow.blurSamples=6,this.scene.add(this.sun,this.sky);let n=new Lu(this.renderer),r=new Nm;this.scene.environment=n.fromScene(r,.04).texture,this.scene.environmentIntensity=.25,r.dispose(),n.dispose();let i=new ql(`#fff1d7`,.5);i.position.set(-9,7,10),this.scene.add(i),this.sand=new $o(new Fc(1,1),new Kc({color:`#e5c594`,roughness:.94,polygonOffset:!0,polygonOffsetFactor:-1})),this.sand.rotation.x=-Math.PI/2,this.sand.receiveShadow=!0;let a=new Do().setFromPoints([new K(-.5,0,-.5),new K(.5,0,-.5),new K(.5,0,.5),new K(-.5,0,.5)]);this.selection=new qs(a,new Ps({color:`#42b4a5`,transparent:!0,opacity:.9})),this.selection.visible=!1,this.scene.add(this.selection),this.brushCursor=new qs(new Do().setFromPoints(Array.from({length:64},(e,t)=>new K(Math.cos(t/64*Math.PI*2),0,Math.sin(t/64*Math.PI*2)))),new Ps({color:`#368e91`,transparent:!0,opacity:.9})),this.brushCursor.visible=!1,new ResizeObserver(()=>this.resize()).observe(e),e.addEventListener(`pointermove`,e=>{this.pointer.set(e.clientX/this.width*2-1,e.clientY/this.height*2-1)}),e.addEventListener(`pointerleave`,()=>this.pointer.set(0,0))}async load(){let e=await new Pp().loadAsync(new URL(new URL(`coastal-workbench-Dr6oHNY7.glb`,import.meta.url).href,``+import.meta.url).href);this.model=e.scene;let[t,n]=await Promise.all([new El().loadAsync(new URL(new URL(`wood-CytwZXDA.webp`,import.meta.url).href,``+import.meta.url).href),new El().loadAsync(new URL(new URL(`paper-DFchPXRQ.webp`,import.meta.url).href,``+import.meta.url).href)]),r=Fm();t.colorSpace=zr,t.wrapS=t.wrapT=gn,t.anisotropy=8,n.colorSpace=zr,n.anisotropy=8;let i=new Map;this.model.traverse(e=>{if(!(e instanceof $o))return;e.castShadow=!0,e.receiveShadow=!0;let a=e.material,o=a.name;if(!i.has(o)){if(o.startsWith(`oak`))i.set(o,Im(o,t));else if(o===`sand_grain`)i.set(o,new Kc({color:`#dfbe8e`,roughness:.98,map:r,bumpMap:r,bumpScale:.018}));else if(o===`paper`)i.set(o,new Kc({color:`#fff4dd`,map:n,roughness:.95,emissive:`#e9dbb7`,emissiveIntensity:.2}));else if(o===`teal_enamel`)i.set(o,new qc({color:a.color,metalness:.25,roughness:.28,clearcoat:.8,clearcoatRoughness:.2,envMapIntensity:1.4}));else if(o===`ivory_ceramic`)i.set(o,new qc({color:a.color,roughness:.26,clearcoat:.3,clearcoatRoughness:.2,envMapIntensity:1.1}));else{let e=a.clone();e.envMapIntensity=.5,o===`eye_glow`&&(e.emissive.set(`#65efff`),e.emissiveIntensity=2.5),i.set(o,e)}}e.material=o===`oak_table`?Im(o,t,Number(e.name.match(/\d+/)?.[0]??0)):i.get(o),e.name.startsWith(`eye_smile`)&&(e.visible=!1)}),this.scene.add(this.model);let a=this.node(`anchor_sand_tl`).position,o=this.node(`anchor_sand_tr`).position,s=this.node(`anchor_sand_br`).position;this.sandWidth=o.x-a.x,this.sandDepth=s.z-o.z,this.sandOrigin.copy(a).add(s).multiplyScalar(.5),this.sandOrigin.y+=.002,this.sand.geometry.dispose(),this.sand.geometry=new Fc(this.sandWidth,this.sandDepth),this.sand.position.copy(this.sandOrigin),this.selection.scale.set(this.sandWidth/32,1,this.sandDepth/32),this.node(`tray`).add(this.sand,this.selection,this.brushCursor),this.eyes=new $o(new Fc(1.15,.56),new Vo({map:zm(),transparent:!0,depthWrite:!1,toneMapped:!1})),this.eyes.position.set(0,0,.577),this.node(`robot_head`).add(this.eyes);let c=Bm();for(let[e,t,n]of[[`tool_groove`,1.7,1.3],[`tool_smooth`,1.8,1.5],[`tool_flatten`,1.8,1.1],[`companion`,1.7,1.3],[`observation_board`,3.6,1.4],[`ruler`,8,1.5]]){let r=this.node(e).getWorldPosition(new K),i=new $o(new Fc(t,n),new Vo({map:c,transparent:!0,depthWrite:!1,opacity:.52}));i.rotation.x=-Math.PI/2,i.position.set(r.x,.007,r.z),this.scene.add(i),this.contacts.set(e,i)}let l=new Ts(new Pc(.021,0),new Kc({color:`#e6c99a`,roughness:.9}),1800),u=808,d=()=>(u^=u<<13,u^=u>>>17,u^=u<<5,(u>>>0)/4294967296),f=new Ca;for(let e=0;e<1800;e++){let t=e%4,n=d(),r=d()*.16;f.position.set(t<2?(t===0?-3.86:3.86)+(t===0?r:-r):(n-.5)*7.7,.32+d()*.025,t<2?(n-.5)*7.4:(t===2?-3.72:3.72)+(t===2?r:-r)),f.scale.setScalar(.5+d()),f.rotation.set(d()*3,d()*3,d()*3),f.updateMatrix(),l.setMatrixAt(e,f.matrix)}l.receiveShadow=!0,this.node(`tray`).add(l);let p=new Ts(new Pc(.011,0),new Kc({color:`#d2ad75`,roughness:1}),2100);for(let e=0;e<2100;e++){let t=Math.sqrt(d())*.625,n=d()*Math.PI*2;f.position.set(Math.cos(n)*t,1.28+.055*(1-t*t/.39)+d()*.018,Math.sin(n)*t),f.scale.setScalar(.65+d()),f.rotation.set(d()*3,d()*3,d()*3),f.updateMatrix(),p.setMatrixAt(e,f.matrix),p.setColorAt(e,new X().setHSL(.1+d()*.025,.34+d()*.15,.59+d()*.21))}p.receiveShadow=!0,this.node(`tool_smooth`).add(p);for(let e of[`groove`,`smooth`,`flatten`]){let t=this.node(`tool_`+e);this.tools.set(e,{root:t,rest:t.position.y,hover:0})}this.knob=this.node(`ruler_knob`);let m=[];for(let e of[-1,1])for(let t=0;t<=32;t++){let n=(e===1?-Math.PI/2:Math.PI/2)+Math.PI*t/32;m.push(new K(e*3.195+.455*Math.cos(n),.16,.455*Math.sin(n)))}let h=new gc(m,!0);this.rulerHalo=new wa;for(let[e,t]of[[.014,1],[.055,.15]])this.rulerHalo.add(new $o(new Ic(h,144,e,6,!0),new Vo({color:`#69fff1`,transparent:!0,opacity:t,depthWrite:!1,toneMapped:!1})));this.rulerHalo.visible=!1,this.node(`ruler`).add(this.rulerHalo);let g=new $o(new Fc(.42,.42),new Vo({map:Rm(),transparent:!0,depthWrite:!1}));g.rotation.x=-Math.PI/2,g.position.y=.512,this.knob.add(g);let _=this.rulerMarks=new $o(new Fc(6.6,.54),new Vo({map:Lm(),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}));_.rotation.x=-Math.PI/2,_.position.set(0,.185,0),this.node(`ruler`).add(_),this.host.classList.add(`scene-ready`),this.resize(),this.render(0)}node(e){let t=this.model.getObjectByName(e);if(!t)throw Error(`工作台缺少模型部件：`+e);return t}resize(){this.width=this.host.clientWidth,this.height=this.host.clientHeight,this.renderer.setSize(this.width,this.height,!1),this.needLayout=!0}setReducedMotion(e){this.reduced=e}toggleFocus(){return this.focused=!this.focused,this.targetView=this.focused?18:21,this.needLayout=!0,this.focused}get isFocused(){return this.focused}highlightRuler(e){this.rulerHalo&&(this.rulerHalo.visible=e)}setTask(e){let t=this.projected.find(e=>e.prefix===`task`);t&&(t.el=e),this.binding&&(this.binding.task=e),this.needLayout=!0}setLocation(e){this.sun.intensity=e?.4:2.7,this.sky.intensity=e?.35:1.1,this.needLayout=!0}bind(e){this.detachCanvas?.(),this.binding=e,this.projected=[];let t=e.object.querySelector(`.tray-canvas`),n=e.object.querySelector(`.tray-frame`),r=!!t&&!!n;if(this.host.classList.toggle(`is-sand-scene`,r),this.node(`tray`).visible=r,this.node(`observation_board`).visible=r,this.node(`task_sign`).visible=r,this.sand.visible=r,this.selection.visible=!1,this.brushCursor.visible=!1,this.node(`companion`).visible=r,e.companion.hidden=!r,r){this.texture?.dispose(),this.texture=new nc(t),this.texture.colorSpace=zr,this.texture.anisotropy=8;let r=this.sand.material;r.map=this.texture,r.color.set(`#ffffff`),r.needsUpdate=!0;let i=()=>{this.texture.needsUpdate=!0},a=e=>{let t=e.detail;this.selection.position.copy(this.sandOrigin).add(new K(((t%32+.5)/32-.5)*this.sandWidth,.01,((Math.floor(t/32)+.5)/32-.5)*this.sandDepth)),this.selection.visible=!0},o=e=>{let t=e.detail;this.brushCursor.visible=!!t,t&&(this.brushCursor.position.copy(this.sandOrigin).add(new K((t.point[0]-.5)*this.sandWidth,.012,(t.point[1]-.5)*this.sandDepth)),this.brushCursor.scale.set(t.radius/32*this.sandWidth,1,t.radius/32*this.sandDepth),this.brushCursor.material.color.set(t.brush===`flatten`?`#fff5d8`:`#368e91`))};t.addEventListener(`sand:render`,i),t.addEventListener(`sand:inspect`,a),t.addEventListener(`sand:cursor`,o),this.detachCanvas=()=>{t.removeEventListener(`sand:render`,i),t.removeEventListener(`sand:inspect`,a),t.removeEventListener(`sand:cursor`,o)},this.projected.push({el:n,prefix:`sand`,width:512,height:512},{el:e.inspector,prefix:`paper`,width:320,height:366},{el:e.task,prefix:`task`,width:230,height:250})}let i=e.timeline?.querySelector(`input[type="range"]`),a=!!i||!!e.timeline?.querySelector(`.ruler-next`);e.timeline?.classList.toggle(`is-controls`,!a),this.node(`ruler`).visible=a&&r;for(let[t,n]of this.tools)n.button=e.tools.querySelector(`[data-brush="${t}"]`)??void 0,n.root.visible=!!n.button,n.button&&(n.button.addEventListener(`pointerenter`,()=>{n.hover=1}),n.button.addEventListener(`pointerleave`,()=>{n.hover=0}),n.button.addEventListener(`focus`,()=>{n.hover=1}),n.button.addEventListener(`blur`,()=>{n.hover=0}));for(let[e,t]of this.contacts)t.visible=this.node(e).visible;let o=i?.getAttribute(`aria-label`)??`潮水尺`,s={回看真实步骤:`采样回放`,两支签的混合比例:`混合比例`}[o]??o;if(this.rulerMarks&&s!==this.rulerLabel&&(this.rulerMarks.material.map?.dispose(),this.rulerMarks.material.map=Lm(s),this.rulerMarks.material.needsUpdate=!0,this.rulerLabel=s),i){let e=()=>{let e=Number(i.min),t=Number(i.max)-e;this.tide=t>0?Oi.clamp((Number(i.value)-e)/t,0,1):0};i.addEventListener(`input`,e),e()}else this.tide=0;this.needLayout=!0}screen(e){let t=e.clone().project(this.camera);return[(t.x+1)*this.width/2,(1-t.y)*this.height/2]}quad(e){return[`tl`,`tr`,`br`,`bl`].map(t=>this.screen(this.node(`anchor_`+e+`_`+t).getWorldPosition(new K)))}box(e){let t=new qa().setFromObject(e),n=[];for(let e of[t.min.x,t.max.x])for(let r of[t.min.y,t.max.y])for(let i of[t.min.z,t.max.z])n.push(this.screen(new K(e,r,i)));return{left:Math.min(...n.map(e=>e[0])),top:Math.min(...n.map(e=>e[1])),right:Math.max(...n.map(e=>e[0])),bottom:Math.max(...n.map(e=>e[1]))}}placeRulerInput(e,t){let n=this.binding?.timeline,r=this.knob,i=[`--knob-left`,`--knob-track`,`--knob-size`,`--knob-top`];if(!n)return;if(!r||!this.host.classList.contains(`is-sand-scene`)||n.classList.contains(`is-controls`)||!n.querySelector(`input[type="range"]`)){for(let e of i)n.style.removeProperty(e);return}let a=r.position.x,o=e=>(r.position.x=Vm+e*Hm,r.updateMatrixWorld(!0),this.box(r)),s=o(0),c=o(1);r.position.x=a,r.updateMatrixWorld(!0);let l=Math.max(34,(s.right-s.left+c.right-c.left)/2),u=(s.left+s.right)/2,d=(c.left+c.right)/2;n.style.setProperty(`--knob-left`,u-l/2-e+`px`),n.style.setProperty(`--knob-track`,d-u+l+`px`),n.style.setProperty(`--knob-size`,l+`px`),n.style.setProperty(`--knob-top`,Math.min(0,Math.min(s.top,c.top)-t)+`px`)}placeBox(e,t,n=0){let r=this.box(t);Object.assign(e.style,{left:r.left-n+`px`,top:r.top-n+`px`,width:r.right-r.left+n*2+`px`,height:r.bottom-r.top+n*2+`px`})}layout(){if(!this.binding)return;for(let{el:e,prefix:t,width:n,height:r}of this.projected){let i=Ye(this.quad(t),n,r);i&&Object.assign(e.style,{width:n+`px`,height:r+`px`,transform:i})}for(let e of this.tools.values())e.button&&this.placeBox(e.button,e.root,5);if(this.placeBox(this.binding.companion,this.node(`companion`),4),this.binding.timeline){let e=this.quad(`ruler`),t=Math.min(...e.map(e=>e[0])),n=Math.max(...e.map(e=>e[0])),r=Math.max(...e.map(e=>e[1])),i=this.binding.timeline.classList.contains(`is-controls`)?Math.min(...e.map(e=>e[1])):r-30;Object.assign(this.binding.timeline.style,{left:t+`px`,top:i+`px`,width:n-t+`px`}),this.host.style.setProperty(`--ruler-y`,Math.min(...e.map(e=>e[1]))+`px`),this.placeRulerInput(t,i)}let e=this.binding.tools.classList.contains(`context-tools`),t=this.binding.tools.querySelector(`.seed-board`);if(t&&this.host.classList.contains(`is-sand-scene`)){let e=this.box(this.node(`tray`)),n=this.box(this.node(`task_sign`)),r=Math.min(246,Math.max(160,e.left-56));this.binding.tools.style.setProperty(`--utility-width`,r+`px`);let i=this.host.querySelector(`.activity-dock`)?.offsetTop??this.height-130;this.binding.tools.style.setProperty(`--utility-x`,Math.max(24,(e.left-r)/2)+r/2+`px`),this.binding.tools.style.setProperty(`--utility-y`,Math.max(150,Math.min(n.bottom+16,i-t.offsetHeight-20))+`px`)}else{let t=this.screen(e?new K(-5.9,1.5,.3):new K(-5.65,.2,4.22));this.binding.tools.style.setProperty(`--utility-x`,t[0]+`px`),this.binding.tools.style.setProperty(`--utility-y`,t[1]+`px`)}let n=this.binding.object.querySelector(`.tray-label`);if(n){let e=this.screen(new K(0,.42,3.94));Object.assign(n.style,{left:e[0]+`px`,top:e[1]-14+`px`})}}render=e=>{if(this.frame=requestAnimationFrame(this.render),e-this.lastTime<1e3/30&&e!==0)return;if(this.lastTime=e,Math.abs(this.targetView-this.view)>.002&&(this.view=this.reduced?this.targetView:Oi.lerp(this.view,this.targetView,.16),this.needLayout=!0),this.needLayout){this.camera.aspect=this.width/this.height;let e=this.camera.position.distanceTo(this.target);this.camera.fov=Oi.radToDeg(2*Math.atan(this.view/(2*e*this.camera.aspect))),this.camera.updateProjectionMatrix(),this.scene.updateMatrixWorld(!0),this.layout(),this.needLayout=!1}for(let e of this.tools.values())e.root.position.y=Oi.lerp(e.root.position.y,e.rest+(this.reduced?0:e.hover*.06),.18);this.knob&&(this.knob.position.x=Vm+this.tide*Hm);let t=this.model?.getObjectByName(`robot_head`);if(t&&!this.reduced&&(t.rotation.y=Oi.lerp(t.rotation.y,this.pointer.x*.12,.05),t.rotation.x=Oi.lerp(t.rotation.x,this.pointer.y*.05,.05)),this.eyes&&!this.reduced){let t=e%5600;this.eyes.scale.y=t>5250?Math.max(.13,Math.abs(t-5425)/175):1}this.renderer.render(this.scene,this.camera)}},Wm=[[`起笔`,`潮水尺`,`先猜再看`,`乱沙规律`,`尝试修复`],[`手工与模型`,`噪声练习本`,`只收一步`,`一步与多步`,`不同潮水`],[`编号贝壳`,`重新计算`,`起点与近邻`,`步数与用时`,`我的配方`],[`条件签`,`条件力度`,`自主对照`,`混合比例`,`配方挑战`],[`编排作品`,`观众点题`,`检查标识`,`来源与贡献`,`灯塔开演`]],Gm=class{root;meta;practice;state;repository;review=new URLSearchParams(location.search).get(`review`)===`1`;session=new Map;results=new Map;header=j(`header.global-header`);content=j(`main.scene-main`);dialog=j(`dialog.paper-dialog`);stage=j(`div.festival`);band=j(`section.lesson-band`);dock=j(`footer.activity-dock`);stationNav=j(`nav.station-nav`,{"aria-label":`五站工具`});tourCard;workbench;toastEl=j(`div.toast`,{role:`status`,"aria-live":`polite`,hidden:!0});returnHost=j(`div.return-host`,{"data-nova-return-host":``});controller;control;modelPromise;reviewed=new Set;previousFocus;progressSignature;toastTimer=0;status=j(`p.compute-status`,{role:`status`},`工具就绪`);busyTools=j(`div.busy-tools`,{hidden:!0});retryJob;retryResolve;audio;preferences;constructor(e,t,n,r,i){this.root=e,this.meta=t,this.practice=n,this.state=r,this.repository=i,this.preferences=i.preferences()}async start(){this.stage.classList.toggle(`reduced-motion`,this.preferences.reducedMotion),this.stage.append(j(`div.coast-layer`,{"aria-hidden":`true`}),this.header,this.band,this.content,this.dock),this.root.replaceChildren(this.stage,this.dialog,this.toastEl),this.workbench=new Um(this.stage,this.preferences.reducedMotion);let e=j(`div.scene-loading`,{role:`status`},Fe(`beach`),j(`h2`,{},`正在布置海边工作台`),R(`把画具与沙盘准备好，就可以开始了。`));this.stage.prepend(this.workbench.el),this.stage.append(e),await this.workbench.load(),e.remove(),this.dialog.addEventListener(`click`,e=>{e.target===this.dialog&&this.closeModal()}),window.addEventListener(`keydown`,e=>{e.key===`Escape`&&(this.dialog.open?this.closeModal():this.endTour())}),this.dialog.addEventListener(`close`,()=>{this.tourCard&&(this.tourCard.hidden=!1),this.previousFocus?.isConnected&&this.previousFocus.focus({preventScroll:!0})}),document.addEventListener(`tides:error`,e=>this.toast(e.detail.message));let t=/^#lesson\/(\d+)$/.exec(location.hash);this.go(t&&this.isOpen(Number(t[1]))?Number(t[1]):this.state.current),addEventListener(`hashchange`,()=>{let e=/^#lesson\/(\d+)$/.exec(location.hash);e&&this.go(Number(e[1]))}),!this.state.workspace?.introSeen&&!this.review&&this.intro(),this.publishProgress()}get step(){return this.state.current}get loc(){return n(this.step)}get busy(){return!!this.controller}get drawing(){return this.state.drawing?ie(ge(this.state.drawing)):null}get seed(){return this.recipe.seed}get recipe(){return this.workspace.recipe}get workspace(){return this.state.workspace??={recipe:{seed:427,steps:20,w:3,cls:0},tide:0}}get programSignature(){return this.state.program.join(`|`)}ev(e=this.step){return this.state.evidence[String(e)]??={}}memory(e,t){return this.session.has(e)||this.session.set(e,t()),this.session.get(e)}isOpen(e){return Number.isInteger(e)&&e>=1&&e<=25}isDone(e){return ae(this.state).includes(e)||this.reviewed.has(e)}firstOpen(){return t.find(e=>!this.isDone(e.id))?.id??25}save(){if(this.review)return!1;try{if(!this.repository.write(this.state))return!1}catch{return this.toast(`当前页已保留；暂时不能保存，请导出记录。`),!1}return this.publishProgress(),!0}publishProgress(){if(this.review||this.repository.rejectedRaw!==void 0)return;let e=ae(this.state).length;if(this.progressSignature===void 0&&!e&&!this.state.album.length&&!this.state.drawing)return;let t={chapter:8,completed:e,total:25,pathLabel:`完整探索`,artifactCount:this.state.album.length},n=JSON.stringify(t);n!==this.progressSignature&&(this.progressSignature=n,window.dispatchEvent(new CustomEvent(`nova:progress`,{detail:t})))}done(e=this.step){let t=se(this.state,e);if(t.length)return this.toast(t[0]),!1;let n=!this.isDone(e);return this.review?this.reviewed.add(e):(oe(this.state,e),this.save()),n&&(this.sound(),this.toast(`发现已收进手册；可以继续试，也可以换一个工具。`)),this.renderHeader(),this.renderBand(),!0}addWork(e,t=this.step,n){let r=u(e,this.meta.classes),i=this.results.get(r);if(!i||!i.frames.length)throw Error(`需要完整真实计算后才能保存作品。`);let a=this.state.album.find(e=>u(e.recipe,this.meta.classes)===r&&e.generation?.model===this.meta.version);if(a)return a;let o={id:_e(),recipe:structuredClone(e),step:t,created:Date.now(),title:n,preview:he(re(i.image)),generation:{model:this.meta.version,ms:i.ms,computedAt:Date.now()}};return this.state.album.push(o),this.save(),o}setProgram(e){let t=[...new Set(e)].filter(e=>this.state.album.some(t=>t.id===e)).slice(0,6);if(t.join(`|`)!==this.programSignature){this.state.program=t,Object.assign(this.ev(25),{watched:!1,watchedProgram:``,showProgram:``,index:0,frame:0,viewed:[]});for(let e of this.session.keys())e.startsWith(`show-`)&&this.session.delete(e);t.includes(String(this.ev(21).rejectedWork))&&(delete this.ev(21).rejectedWork,delete this.ev(21).rejectionReason),t.includes(String(this.ev(23).checkedWork))||(this.ev(23).checked=!1,delete this.ev(23).fileInfo),this.save()}}async model(){return this.modelPromise??=le.create(this.meta,new URL(`models/`+this.meta.onnx.file,document.baseURI).href).catch(e=>{throw this.modelPromise=void 0,e})}check(e=this.controller?.signal){if(e?.aborted)throw new DOMException(`本次计算已停止`,`AbortError`)}async generate(e,t=!1,n){let r=this.controller?.signal,i=await this.model();this.check(r);let a=await i.generate(structuredClone(e),{useCache:!t,shouldStop:()=>!!r?.aborted,onFrame:async(e,t,i)=>{this.check(r),this.workProgress(`实际采样 `+(t+1)+` / `+i+` 步`),await n?.(e,t,i),this.check(r)}});return this.check(r),this.results.set(u(e,this.meta.classes),a),a}cached(e){let t=u(e,this.meta.classes),n=this.results.get(t);if(n)return n;let r=this.state.album.find(e=>u(e.recipe,this.meta.classes)===t);if(r?.preview)return{image:ie(ge(r.preview)),frames:[],ms:0}}async restore(e,t,n=20,r){let i=this.controller?.signal,a=await this.model();this.check(i);let o=await a.restore(e,t,n,async(e,t,n)=>{this.check(i),this.workProgress(`实际修复 `+(t+1)+` / `+n+` 步`),await r?.(e,t,n)},()=>!!i?.aborted);return this.check(i),o}async controlled(e,t,n=!1){let r=new ce(n);return this.control=r,this.updateBusy(),this.generate(e,!0,async(e,n,i)=>{t(e,n,i),await Ce(),n<i-1&&(await r.afterFrame(),this.check())})}async run(e,t){if(this.busy)return;let n=new AbortController;this.controller=n,this.workProgress(e),this.updateBusy();try{for(;;)try{let e=await t();return this.check(n.signal),this.retryJob=void 0,e}catch(e){if(e instanceof Error&&e.name===`AbortError`){this.workProgress(`已停止；先前作品和配方保留。`);return}this.workProgress(`这次计算未完成，原配方和先前作品保留。`);let t=await new Promise(e=>{this.retryResolve=e,this.retryJob=async()=>{e(!0)},this.updateBusy()});if(this.retryResolve=void 0,this.retryJob=void 0,!t)return;this.check(n.signal),this.workProgress(`按原配方重新计算……`),this.updateBusy()}}finally{this.controller===n&&(this.controller=void 0,this.control=void 0,this.retryResolve=void 0,this.retryJob=void 0,this.updateBusy())}}stop(){this.controller?.abort(),this.control?.stop(),this.retryResolve?.(!1),this.workProgress(`正在结束当前实际计算……`)}workProgress(e){this.status.textContent=e}updateBusy(){for(let e of this.stage.querySelectorAll(`.model-input,.location-button,.activity-button`))this.busy?(e.dataset.wasDisabled??=String(e.disabled),e.disabled=!0):e.dataset.wasDisabled!==void 0&&(e.disabled=e.dataset.wasDisabled===`true`,delete e.dataset.wasDisabled);if(this.busyTools.replaceChildren(),this.busyTools.hidden=!this.busy&&!this.retryJob,this.control){let e=this.control,t=I(e.paused?`继续采样`:`暂停采样`,()=>{e.paused?(e.resume(),t.textContent=`暂停采样`):(e.pause(),t.textContent=`继续采样`)},`secondary`);this.busyTools.append(t,I(`下一真实步`,()=>{e.next(),t.textContent=`继续采样`},`secondary`))}this.busy&&this.busyTools.append(I(`停止本次计算`,()=>this.stop(),`secondary`)),this.retryJob&&this.busyTools.append(I(`重试本次计算`,()=>this.retryJob?.(),`primary`)),this.stage.setAttribute(`aria-busy`,String(this.busy))}mount(e,t,n=[],r){let i=j(`aside.tool-rack`,{"aria-label":`操作工具`},...n.filter(e=>e.classList.contains(`brush-tool`))),a=n.filter(e=>!e.classList.contains(`brush-tool`));if(a.length){let e=j(`div.tool-utilities`,{},...a);a.some(e=>e.classList.contains(`seed-shell`))&&(e.classList.add(`seed-board`),e.prepend(j(`header.seed-heading`,{},j(`strong`,{},`起点贝壳`),j(`span`,{},`选一枚，换一个随机起点`)))),i.append(e)}let o=j(`section.scene-center`,{"aria-label":`主要操作区`},j(`div.object-stage`,{},e),r?j(`div.timeline`,{},r):null);if(e.classList.contains(`tray`)&&this.loc.id===`beach`&&!n.some(e=>e.classList.contains(`brush-tool`)))for(let[e,t]of[[`groove`,`画笔`],[`smooth`,`沙刷`],[`flatten`,`橡皮`]]){let n=I(``,()=>{this.go(1),this.content.querySelector(`[data-brush="${e}"]`)?.click()},`brush-tool`);n.dataset.brush=e,n.setAttribute(`aria-label`,`回到起笔使用`+t),n.append(j(`span`,{},t)),i.prepend(n)}i.classList.toggle(`context-tools`,!i.querySelector(`[data-brush]`));let s=I(``,()=>this.guide(),`scene-guide`);s.setAttribute(`aria-label`,`查看本环节提示`);let c=j(`aside.inspector`,{"aria-label":`当前观察`},t);this.content.replaceChildren(i,o,c,s);let l=this.band.querySelector(`.current-task`);this.workbench.bind({object:e,inspector:c,tools:i,task:l,timeline:o.querySelector(`.timeline`)??void 0,companion:s}),this.busyTools=j(`div.busy-tools`,{hidden:!0}),this.dock.replaceChildren(this.stationNav,j(`div.dock-actions`,{},ke(I(`‹ 上一个`,()=>this.go(this.step-1),`secondary activity-button`,this.step===1),I(this.step===25?`回到起笔`:`下一个 ›`,()=>this.go(this.step===25?1:this.step+1),`secondary activity-button`)),this.status,this.busyTools,I(`保存观察`,()=>this.done(),`primary`))),this.updateBusy()}refresh(){dn(this),this.renderHeader(),this.renderBand(),fn(this,this.step)}go(e){this.busy?this.toast(`先停止这次计算，再换地点。`):this.isOpen(e)&&(dn(this),this.endTour(),this.closeModal(),this.state.current=e,this.save(),this.workProgress(`工具就绪`),history.replaceState(null,``,location.pathname+location.search+`#lesson/`+e),this.refresh())}advance(){this.go(this.step===25?1:this.step+1)}renderHeader(){this.stationNav.replaceChildren(...e.map((e,t)=>{let n=I(``,()=>this.go(t*5+1),`location-button station `+(e.id===this.loc.id?`selected`:``));return n.dataset.place=e.id,n.setAttribute(`aria-label`,e.name),n.setAttribute(`aria-current`,e.id===this.loc.id?`location`:`false`),n.title=e.name+` · `+e.question,n.append(mn(e.id),j(`span.station-copy`,{},j(`b`,{},[`沙滩`,`修复棚`,`市集`,`配方摊`,`夜场`][t]))),n}));let t=(e,t,n)=>{let r=I(``,n,`utility`);return r.setAttribute(`aria-label`,e),r.append(Fe(t),j(`span`,{},e)),r},n=I(``,()=>this.guide(),`utility guide-button`);n.append(j(`span`,{},`玩法`)),n.setAttribute(`aria-label`,`玩法提示`);let r=t(this.workbench.isFocused?`看全景`:`沙盘聚焦`,`view`,()=>{this.workbench.toggleFocus(),this.renderHeader()});r.setAttribute(`aria-pressed`,String(!this.workbench.isFocused)),this.header.replaceChildren(this.returnHost,j(`div.brand`,{},j(`span.brand-emblem`,{},Fe(`beach`)),j(`div.brand-copy`,{},j(`strong`,{},`08 潮汐沙画节`))),j(`span.header-space`),r,n,t(`作品`,`art`,()=>this.album()),t(`手册`,`book`,()=>this.journal()),t(`设置`,`settings`,()=>this.settings())),window.NovaCourseLinks?.mountReturn?.(),this.returnHost.children.length||this.returnHost.append(j(`a`,{href:`../../courses/?view=2&chapter=8`},`‹ 返回奇点`))}renderBand(){let e=Math.floor((this.step-1)/5),n=j(`nav.activity-tabs`,{"aria-label":`本站活动`},...Wm[e].map((t,n)=>{let r=e*5+n+1,i=I(``,()=>this.go(r),`activity-button `+(r===this.step?`selected`:``));return i.append(j(`span.step-index`,{},this.isDone(r)?`✓`:String(n+1)),j(`span.step-name`,{},t)),i.setAttribute(`aria-current`,r===this.step?`step`:`false`),i.setAttribute(`aria-label`,n+1+` `+t),i.title=t,i}));this.band.replaceChildren(j(`div.current-task`,{},j(`p.eyebrow`,{},this.loc.name),j(`h1`,{},t[this.step-1].title)),n),this.stage.dataset.location=this.loc.id,this.workbench.setLocation(this.loc.id===`night`),this.workbench.setTask(this.band.querySelector(`.current-task`))}home(){this.go(1),this.intro()}map(){this.modal(`五站随时可以去`,L(...e.map((e,t)=>I(e.name+` · `+e.question,()=>this.go(t*5+1),`map-choice`))))}intro(){let e=j(`div.intro-art`,{"aria-hidden":`true`},mn(`beach`),...[[`01`,`留下一幅原画`],[`02`,`试着逐步去噪`],[`03`,`策划你的夜场`]].map(([e,t],n)=>j(`span.intro-chip.step-${n+1}`,{},j(`b`,{},e),t)),j(`span.intro-caption`,{},`潮水退去，沙画开场`)),t=L(R(`先画、再试、再比较。五个地点随时能去，操作提示随时能回看。`,`lead`),I(`认识工具，开始起笔`,()=>{this.workspace.introSeen=!0,this.save(),this.go(1),this.startTour()},`primary intro-start`),I(`直接自由探索`,()=>{this.workspace.introSeen=!0,this.save(),this.closeModal()},`intro-free`),z(`沙盘显示32×32的真实图像。模型已经训练好；这里的“收沙步数”是生成步骤，不是训练次数。`));this.modal(`从一幅原画，到你的 AI 沙画节`,j(`div.intro-layout`,{},e,t),!0),this.dialog.classList.add(`intro-card`),this.dialog.querySelector(`.dialog-heading`)?.prepend(j(`span.intro-sub`,{},`第八章 · 潮汐沙画节`))}guide(){let e=i.find(e=>e.step===this.step);this.modal(`眼前这件事，怎么试`,L(R(t[this.step-1].task,`lead`),z(a[this.step-1]),R(e?.meaning??t[this.step-1].insight),ke(I(`回到沙盘`,()=>this.closeModal(),`primary`),I(`认识界面工具`,()=>{this.closeModal(),this.startTour()},`secondary`),I(`重看入场介绍`,()=>this.intro(),`secondary`))))}endTour(){this.tourCard?.remove(),this.tourCard=void 0,this.stage.querySelectorAll(`.tour-target`).forEach(e=>e.classList.remove(`tour-target`)),this.workbench.highlightRuler(!1)}startTour(e=0){this.endTour(),e===0&&this.step!==1&&this.go(1),e>0&&e<3&&this.step!==2&&this.go(2);let t=[{target:`.brush-tool[data-brush="groove"]`,title:`第一步 · 留下一幅原画`,copy:`选画笔，在沙盘画几笔；也可以从右侧借一幅再改。`},{target:`.timeline`,title:`第二步 · 推动潮水尺`,copy:`拖动木柄，观察同一幅画怎样变化。原图一直为你保留。`},{target:`.inspector`,title:`第三步 · 看见一格的变化`,copy:`点沙盘一格，再打开“像素与系数”。看看原来的数，变成了多少。`},{target:`.station-nav`,title:`第四步 · 带着问题去探索`,copy:`去修复棚试着去噪，再到市集、配方摊和夜场，创作自己的沙画。`}],n=t[e];this.stage.querySelector(n.target)?.classList.add(`tour-target`),this.workbench.highlightRuler(e===1);let r=()=>{e===0&&!this.drawing?this.toast(`先画几笔，或借一幅原画，再继续。`):e===1&&this.workspace.tide===0?this.toast(`先推动一下木柄，看看画面发生的变化。`):e===2&&Number(this.ev(2).cell??-1)<0?this.toast(`先点沙盘中的任意一格。`):e===3?this.endTour():this.startTour(e+1)},i=this.tourCard=j(`aside.tour-card`,{role:`region`,"aria-label":`操作引导`,"data-step":String(e)},j(`span.tour-count`,{},`${e+1} / ${t.length}`),j(`h3`,{},n.title),R(n.copy),ke(I(`稍后再学`,()=>this.endTour(),`text`),I(e===t.length-1?`开始自由探索`:`试好了，下一步`,r,`primary`)));this.stage.append(i),i.querySelector(`.primary`)?.focus({preventScroll:!0})}toast(e){this.toastEl.textContent=e,this.toastEl.hidden=!1,clearTimeout(this.toastTimer),this.toastTimer=window.setTimeout(()=>this.toastEl.hidden=!0,4500)}modal(e,t,n=!1,r=!1){r?this.tourCard&&(this.tourCard.hidden=!0):this.endTour(),this.dialog.open&&this.dialog.close(),this.previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:void 0,this.dialog.classList.toggle(`wide`,n),this.dialog.classList.remove(`intro-card`),this.dialog.replaceChildren(j(`header.dialog-heading`,{},j(`h2`,{},e),I(`关闭`,()=>this.closeModal(),`secondary`)),j(`div.dialog-body`,{},t)),this.dialog.showModal()}closeModal(){this.dialog.open&&this.dialog.close()}journal(n=this.loc.id,i=this.step,a=0){let o=t.filter(e=>e.location===n).map(e=>e.id);o.includes(i)||(i=o[0]);let s=x(this.state,i,this.meta.classes).flatMap(e=>M(e,120,3)),c=s.slice(a*2,a*2+2),l=b(this.state,i).filter(e=>e.submitted).at(-1),d=L(ke(...e.map(e=>I(e.name,()=>this.journal(e.id,t.find(t=>t.location===e.id).id),`tab `+(e.id===n?`selected`:``)))),ke(...o.map(e=>I(String(e),()=>this.journal(n,e),`tab `+(e===i?`selected`:``)))),j(`h3`,{},t[i-1].title),...c.map(e=>z(e)),s.length?null:z(`还没有实际观察记录。可以自由试，再回来看看。`));l&&d.append(I(`查看这次真实 A/B`,()=>this.modal(`实验对照 · 已保存的实际结果`,L(Pe([l.a,l.b].map((e,t)=>V(e.preview?ie(ge(e.preview)):null,(t?`B`:`A`)+` · `+u(e.recipe,this.meta.classes),{size:200,palette:`dusk`})),2),I(`回到这页手册`,()=>this.journal(n,i,a),`primary`)),!0),`secondary`)),d.append(ke(I(`上一页`,()=>this.journal(n,i,a-1),`secondary`,a===0),R(a+1+` / `+Math.max(1,Math.ceil(s.length/2))),I(`下一页`,()=>this.journal(n,i,a+1),`secondary`,(a+1)*2>=s.length),I(`导出我的学习手册`,()=>this.exportJournal(),`primary`))),this.modal(`我的发现 · `+r[n].souvenir,d,!0)}exportJournal(){let e=e=>b(this.state,e).filter(e=>e.submitted).map(e=>`<div class='comparison'>`+[e.a,e.b].map((e,t)=>e.preview?`<figure><img width='192' height='192' src='`+Ne(ie(ge(e.preview)),`dusk`,`sand`,192).toDataURL(`image/png`)+`'><figcaption>`+(t?`B`:`A`)+` · `+A(u(e.recipe,this.meta.classes))+`</figcaption></figure>`:``).join(``)+`</div>`).join(``),n=t.map(t=>`<section><h2>`+t.id+` · `+t.title+`</h2><p>`+A(t.insight)+`</p>`+e(t.id)+x(this.state,t.id,this.meta.classes).map(e=>`<p>`+A(e)+`</p>`).join(``)+`</section>`).join(``),r=`<!doctype html><html lang='zh-CN'><meta charset='utf-8'><title>我的潮汐学习手册</title><style>body{max-width:850px;margin:40px auto;padding:24px;font:18px/1.8 system-ui;color:#234a45;background:#faf6eb}section{border-top:1px solid #dccdaf;padding:20px 0}.comparison{display:flex;gap:24px;flex-wrap:wrap}figure{margin:0;max-width:220px}img{max-width:100%}a{color:#24747a}</style><h1>我的潮汐沙画节</h1><p>有效完成 `+ae(this.state).length+` / 25；完成记录不等于掌握程度。</p>`+n+`<h2>我的夜场</h2><p>`+A(this.state.programTitle??``)+` · AI 生成</p><p>`+A(this.state.creditText??``)+`</p>`+o.map(e=>`<p><a href='`+e.url+`'>`+e.title+`</a></p>`).join(``)+`</html>`;Ie(new Blob([r],{type:`text/html;charset=utf-8`}),`我的潮汐学习手册.html`),this.toast(`已请求保存学习手册。`)}album(e,t=0){let n=this.state.album.slice(t*6,t*6+6),r=Pe(n.map(n=>L(V(n.preview?ie(ge(n.preview)):null,u(n.recipe,this.meta.classes),{size:128,palette:`dusk`}),I(e?`选这幅`:`查看配方`,()=>e?(this.closeModal(),e(n)):this.modal(`可以重算的配方`,L(V(n.preview?ie(ge(n.preview)):null,u(n.recipe,this.meta.classes),{size:240}),R(`预览来自保存结果；复现需要重新运行模型。`),R(n.generation?`模型 `+n.generation.model+` · 首次采样 `+(n.generation.ms/1e3).toFixed(2)+` 秒`:`旧记录未保存模型与计算时间。`),I(`回到卡册`,()=>this.album(e,t),`primary`))),`secondary`))),3);this.modal(`我的配方卡册`,L(n.length?r:z(`还没有完整作品。到市集或配方摊运行一次，就能保存。`),ke(I(`上一页`,()=>this.album(e,t-1),`secondary`,t===0),R(t+1+` / `+Math.max(1,Math.ceil(this.state.album.length/6))),I(`下一页`,()=>this.album(e,t+1),`secondary`,(t+1)*6>=this.state.album.length))),!0)}settings(){this.stage.classList.toggle(`reduced-motion`,this.preferences.reducedMotion),this.workbench.setReducedMotion(this.preferences.reducedMotion);let e=j(`input`,{type:`file`,accept:`.json,application/json`,hidden:!0});e.onchange=async()=>{let t=e.files?.[0];if(!t)return;let n=await t.text(),r=me(n);r.warning?this.toast(`导入未通过校验，当前原件保留。`):this.modal(`导入这份有效进度`,L(R(`含 `+ae(r.state).length+` 个有效环节和 `+r.state.album.length+` 幅作品。`),ke(I(`导入并继续`,()=>this.replaceState(this.repository.accept(n)),`primary`),I(`保留当前记录`,()=>this.settings(),`secondary`))))},this.modal(`设置与记录`,L(z(`学习记录保存在本浏览器，可导出后续学。`),ke(I(this.preferences.muted?`开启轻音效`:`静音`,()=>{this.preferences.muted=!this.preferences.muted,this.repository.savePreferences(this.preferences),this.settings()},`secondary`),I(this.preferences.reducedMotion?`恢复轻动态`:`减少动态`,()=>{this.preferences.reducedMotion=!this.preferences.reducedMotion,this.repository.savePreferences(this.preferences),this.settings()},`secondary`)),ke(I(`导出进度`,()=>Ie(new Blob([xe(this.state)],{type:`application/json`}),`潮汐沙画节-进度.json`),`primary`),I(`导入进度`,()=>e.click(),`secondary`),I(`重看介绍`,()=>this.intro(),`secondary`)),e,this.repository.rejectedRaw===void 0?null:I(`导出未读原记录`,()=>Ie(new Blob([this.repository.rejectedRaw],{type:`text/plain;charset=utf-8`}),`潮汐沙画节-未读记录.txt`),`secondary`),I(`重新开始`,()=>this.modal(`重新开始这段旅程`,L(R(`当前记录会被新旅程替换。可以先返回设置导出原记录。`),ke(I(`确认重新开始`,()=>{this.repository.reset(),this.replaceState(pe())},`primary`),I(`返回设置`,()=>this.settings(),`secondary`)))),`text`)))}replaceState(e){if(this.busy)this.toast(`先停止计算，再导入或重置。`);else{dn(this);for(let e of Object.keys(this.state))delete this.state[e];Object.assign(this.state,e),this.session.clear(),this.results.clear(),this.reviewed.clear(),this.save(),this.go(this.state.current)}}sound(){if(!this.preferences.muted)try{let e=this.audio??=new AudioContext,t=e.createOscillator(),n=e.createGain();t.type=`sine`,t.frequency.setValueAtTime(660,e.currentTime),t.frequency.exponentialRampToValueAtTime(880,e.currentTime+.08),n.gain.setValueAtTime(.025,e.currentTime),n.gain.exponentialRampToValueAtTime(.001,e.currentTime+.14),t.connect(n),n.connect(e.destination),t.start(),t.stop(e.currentTime+.15)}catch{}}returnToHub(e=8){let t=window.NovaCourseLinks?.returnUrl(location.href);location.href=t??new URL(`../../courses/?view=2&chapter=`+e,location.href).href}},Km=class e{items=[];blurred=[];index;stats;constructor(e,t){this.index=e,this.stats=t}get size(){return this.items.length}byClass(e){return this.items.filter(t=>t.cls===e)}static async load(t){let[n,r]=await Promise.all([fetch(new URL(`practice.json`,t)).then(e=>e.json()),fetch(new URL(`data-stats.json`,t)).then(e=>e.json())]),i=new e(n,r);await Promise.all(n.files.map(async(e,r)=>{let a=new Image;a.src=new URL(e,t).href,await a.decode();let o=document.createElement(`canvas`);o.width=a.width,o.height=a.height;let s=o.getContext(`2d`,{willReadFrequently:!0});s.drawImage(a,0,0);let c=s.getImageData(0,0,o.width,o.height).data;for(let e=0;e<n.perClass;e++){let t=e%n.cols*32,a=Math.floor(e/n.cols)*32,s=new Uint8Array(w);for(let e=0;e<32;e++)for(let n=0;n<32;n++)s[e*32+n]=c[((a+e)*o.width+t+n)*4];i.items[r*n.perClass+e]={cls:r,index:e,image:ie(s)}}}));for(let e of i.items)i.blurred.push(ze(e.image));return i}};async function qm(){let e=document.querySelector(`#app`);try{let t=new URL(`models/`,document.baseURI),[n,r]=await Promise.all([ue(new URL(`sand-master.json`,t).href),Km.load(t.href)]),i=await be(),a=i.read(),o=new Gm(e,n,r,a.state,i);await o.start(),a.warning&&o.toast(a.warning)}catch(t){e.replaceChildren(j(`div.boot`,{},j(`span`,{},`潮汐沙画节`),j(`h1`,{},`实验材料还没准备好`),j(`p`,{},t instanceof Error?t.message:String(t)),j(`button`,{onclick:()=>location.reload()},`重新准备`)))}}qm();