(function () {
    'use strict';
    const $ = id => document.getElementById(id), M = NovaMath, state = new NovaCore.Experience(), sound = new NovaAudio.Sound(), hold = new NovaInput.HoldSession(), renderGate = new NovaChoreography.RenderGate();
    let scene = null, resources = null, last = 0, raf = 0, lastRenderError = null, quality = 'auto', motionOverride = false, measured = [], frames = 0, renderedFrames = 0, lastPhase = '', homeFocusSource = null, redraw = true;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    state.reduced = media.matches;
    const dialogs = [...document.querySelectorAll('dialog')], isModal = () => dialogs.some(d => d.open);
    const soundShouldPause=()=>document.hidden||isModal()||state.phase==='courses';
    const phaseNames = { intro: '白鸽序幕', explore: '双手探索', holding: '长按共鸣', contact: '双手已经接触', fracture: '空间碎裂', courses: '课程图谱已展开' };
    const atlas = new NovaCourseHost.CourseHost($('course-stage'),()=>reset(false),value=>{motionOverride=true;state.reduced=value;syncMotion();savePreferences();});
    try {
        const saved = JSON.parse(localStorage.getItem('nova-preferences') || 'null');
        if (saved && typeof saved.reduced === 'boolean') {
            state.reduced = saved.reduced;
            motionOverride = true;
        }
        if (['auto', 'full', 'low'].includes(saved?.quality))
            quality = saved.quality;
    }
    catch { }
    function say(text) { $('announcer').textContent = text; }
    function savePreferences() { try {
        localStorage.setItem('nova-preferences', JSON.stringify({ reduced: state.reduced, quality }));
    }
    catch { } }
    function syncMotion() { redraw=true;renderGate.invalidate(); atlas.present(state.phase,state.reduced,state.generation); document.body.dataset.reduced = String(state.reduced); $('motion-setting').checked = state.reduced; $('hold-label').textContent = state.reduced ? '点击指尖，开启柔和转场' : '长按指尖，开启共鸣'; $('touch').setAttribute('aria-label', state.reduced ? '点击或按 Enter 开启共鸣，使用减少动态的转场' : '按住鼠标、空格或 Enter 1.65 秒，连接双手；提前松开可取消'); }
    function resize() { redraw=true;renderGate.invalidate(); if (!scene)
        return; scene.low = quality === 'low' || (quality === 'auto' && scene.low); const dpr = scene.low ? Math.min(devicePixelRatio || 1, .8) : Math.min(devicePixelRatio || 1, 1.55); scene.resize(innerWidth, innerHeight, dpr); }
    function updatePhase() {
        redraw=true;
        const p = state.phase;
        document.body.dataset.phase = p;
        $('intro-ui').hidden = p !== 'intro';
        if(p!=='intro')document.body.style.removeProperty('--intro-ink');
        $('home-ui').hidden = !['explore', 'holding', 'contact'].includes(p);
        $('touch').disabled = p === 'explore' && !state.canInteract();
        atlas.present(p,state.reduced,state.generation);
        sound.pause(soundShouldPause());
        const showingAtlas=['fracture','courses'].includes(p);
        document.querySelectorAll('.masthead,.footer,.corners,.grain').forEach(el=>{el.hidden=showingAtlas;});
        $('experience').hidden=p==='courses';
        $('sequence-caption').textContent = { contact: '共 鸣' }[p] || '';
        $('footer-hint').textContent = p === 'explore' ? (state.reduced ? '点击指尖 · 柔和共鸣' : '移动探索 · 长按共鸣') : '感知 · 连接 · 共生';
        if (p === 'contact')
            sound.contact();
        say(phaseNames[p] || p);
        lastPhase = p;
    }
    state.onchange = updatePhase;
    function cancelHold() { hold.cancel(); state.release(); }
    function openDialog(id) { cancelHold(); state.pause(true); sound.pause(true); last = 0; $(id).showModal(); }
    function closeDialog(d) { if (d?.open)
        d.close(); }
    for (const d of dialogs) {
        d.addEventListener('keydown', e => {
            if (e.key !== 'Tab')
                return;
            const focusable = [...d.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
            if (!focusable.length) {
                e.preventDefault();
                d.focus();
                return;
            }
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
        d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(d)));
        d.addEventListener('close', () => { state.pause(document.hidden || isModal()); sound.pause(soundShouldPause()); last = 0; });
        d.addEventListener('click', e => { if (e.target === d) {
            const b = d.getBoundingClientRect();
            if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)
                closeDialog(d);
        } });
    }
    function requestHomeFocus() {
        if (state.canInteract()) { $('touch').focus({preventScroll:true}); homeFocusSource=null; }
        else homeFocusSource=document.activeElement;
    }
    function reset(intro = false) { homeFocusSource=null; for (const d of dialogs)
        closeDialog(d); cancelHold(); state.reset(intro); syncMotion(); last = 0; if (!intro)
            requestHomeFocus(); }
    $('menu-open').addEventListener('click', () => openDialog('options-dialog'));
    $('about-open').addEventListener('click', () => openDialog('about-dialog'));
    $('brand-home').addEventListener('click', () => { if (state.ready)
        reset(false); });
    $('skip-intro').addEventListener('click', () => { state.skip(); if (state.ready)
        requestHomeFocus();
    else
        say('仍在准备真实资源，准备完成后直接进入首页。'); });
    for (const id of ['replay-intro', 'dialog-replay'])
        $(id).addEventListener('click', () => { if (state.ready)
            reset(true); });
    for (const id of ['dialog-home'])
        $(id).addEventListener('click', () => reset(false));
    $('sound-toggle').addEventListener('click', async () => { const on = await sound.toggle(); $('sound-toggle').setAttribute('aria-pressed', String(on)); $('sound-toggle').setAttribute('aria-label', on ? '关闭声音' : '开启声音'); $('sound-label').textContent = on ? '声音开启' : '声音关闭'; say(sound.lastError ? '当前环境无法开启声音。' : on ? '声音已开启' : '声音已关闭'); });
    $('motion-setting').addEventListener('change', e => { motionOverride = true; state.reduced = e.target.checked; syncMotion(); savePreferences(); });
    media.addEventListener('change', () => { if (!motionOverride) {
        state.reduced = media.matches;
        syncMotion();
    } });
    $('quality-setting').value = quality;
    $('quality-setting').addEventListener('change', e => { quality = e.target.value; if (scene)
        scene.low = quality === 'low'; resize(); savePreferences(); });
    const touch = $('touch');
    touch.addEventListener('pointerdown', e => {
        if (e.button !== 0 || hold.active || state.reduced)
            return;
        if (state.press() && hold.begin('pointer', e.pointerId, performance.now())) {
            e.preventDefault();
            touch.focus({ preventScroll: true });
            try {
                touch.setPointerCapture(e.pointerId);
            }
            catch { }
        }
    });
    const release = e => { const duration = hold.finish('pointer', e.pointerId, performance.now()); if (duration !== null)
        state.release(e.type === 'pointerup' ? duration : undefined); };
    touch.addEventListener('pointerup', release);
    touch.addEventListener('pointercancel', release);
    touch.addEventListener('lostpointercapture', release);
    touch.addEventListener('click', e => { if (state.reduced) {
        e.preventDefault();
        state.activate();
    } });
    touch.addEventListener('contextmenu', e => e.preventDefault());
    touch.addEventListener('keydown', e => { if (![' ', 'Enter'].includes(e.key) || e.repeat)
        return; e.preventDefault(); if (state.reduced)
        state.activate();
    else if (!hold.active && state.press())
        hold.begin('keyboard', e.key, performance.now()); });
    touch.addEventListener('keyup', e => { if ([' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        const duration = hold.finish('keyboard', e.key, performance.now());
        if (duration !== null)
            state.release(duration);
    } });
    touch.addEventListener('blur', cancelHold);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', cancelHold);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !isModal() && state.ready) {
        e.preventDefault();
        reset(false);
    } });
    window.addEventListener('pointermove', e => { if (scene && !state.reduced && !isModal())
        scene.pointer = [(e.clientX / innerWidth - .5) * 2, (e.clientY / innerHeight - .5) * 2]; }, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => { state.pause(document.hidden || isModal()); sound.pause(soundShouldPause()); hold.cancel(); last = 0; });
    async function enterCourse() {
        if (!state.ready)
            return;
        const config = window.NOVA_CONFIG || {};
        const detail = { source: 'nova-home', reducedMotion: state.reduced };
        if (typeof config.onEnterCourse === 'function') {
            try {
                await config.onEnterCourse(detail);
            }
            catch (error) {
                $('course-message').textContent = '课程暂时无法打开，请稍后重试。';
                console.error('NOVA course callback failed:', error);
                openDialog('course-dialog');
            }
            return;
        }
        const event = new CustomEvent('nova:enter-course', { detail, cancelable: true });
        window.dispatchEvent(event);
        if (!event.defaultPrevented) {
            if(atlas.loaded){for(const d of dialogs)closeDialog(d);state.enter('courses');}
        }
    }
    function renderUI() {
        const p = state.phase;
        if (p === 'intro') {
            const fraction = state.total ? state.loaded / state.total : 0;
            const plate = NovaFlight.plan(state.phaseTime,state.reduced);
            const ink = Math.round(238 - 208 * plate.blueprint);
            document.body.style.setProperty('--intro-ink', `rgb(${ink},${ink+3},${ink+10})`);
            $('resource-path').style.strokeDashoffset = 1 - fraction;
            const labels = document.querySelectorAll('.intro-word span');
            labels.forEach((el, i) => el.style.setProperty('--letter-opacity', state.reduced ? 1 : M.smooth((state.phaseTime - 1.75 - i * .62) / .65)));
            $('intro-ui').style.opacity = 1 - NovaChoreography.introDissolve(state.phaseTime, state.reduced);
            $('show-label').textContent = state.ready ? (state.reduced ? '减少动态 · 即将进入首页' : '资源已就绪 · 正在演绎连续曝光序幕') : '轨迹显示真实资源准备进度';
        }
        if (['explore', 'holding', 'contact'].includes(p)) {
            const arriving=!state.reduced && state.arrival<1;
            $('touch').disabled=p==='explore' && !state.canInteract();
            $('home-ui').setAttribute('aria-busy',String(arriving));
            $('meeting').style.opacity=String(state.reduced?1:M.smooth((state.arrival-.68)/.32));
            if(homeFocusSource&&state.canInteract()) {
                const active=document.activeElement;
                if(active===homeFocusSource||active===document.body||(active&&!active.getClientRects().length))
                    $('touch').focus({preventScroll:true});
                homeFocusSource=null;
            }
            $('charge-arc').style.strokeDashoffset = 1 - state.charge;
            $('hold-meter').textContent = p === 'holding' ? Math.round(state.charge * 100) + ' / 100' : p === 'contact' ? 'CONNECTED' : '';
            $('meeting-title').textContent = p === 'holding' ? '让 指 尖 靠 近' : '于 此 相 遇';
            document.body.style.setProperty('--home-fade', p === 'contact' ? 1 - M.smooth(state.progress()) : 1);
            const contact = scene?.diagnostics()?.contact;
            if (contact) {
                $('meeting').style.left = contact[0] + 'px';
                $('meeting').style.top = contact[1] + 'px';
            }
        }
    }
    function frame(now) {
        raf = requestAnimationFrame(frame);
        if (!scene)
            return;
        const dt = last ? Math.max(0, (now - last) / 1000) : 0;
        last = now;
        if (document.hidden)
            return;
        const modal=isModal();
        state.tick(dt);
        if (state.phase === 'holding' && hold.active) {
            state.holdFor(hold.elapsed(now));
            if (state.phase !== 'holding')
                hold.cancel();
        }
        if (!modal && state.phase!=='courses' && dt > 0 && dt < 1) {
            measured.push(dt * 1000);
            if (measured.length > 150)
                measured.shift();
            frames++;
            if (quality === 'auto' && !scene.low && frames > 18 && measured.length >= 18 && measured.reduce((a, b) => a + b, 0) / measured.length > 45) {
                scene.low = true;
                resize();
                say('已自动切换节能渲染，保留完整交互流程。');
            }
        }
        try {
            const backgroundChanged=scene.advanceBackgrounds(dt,state);
            if(backgroundChanged)renderGate.invalidate();
            if ((!modal||redraw||backgroundChanged) && (redraw||renderGate.shouldDraw(state))) {
                scene.render(state, dt);
                renderedFrames++;
                redraw=false;
            }
            renderUI();
        }
        catch (e) {
            lastRenderError = String(e?.message || e);
            console.error('NOVA renderer failed:', e);
            useFallback('渲染中断，已切换静态兼容模式');
        }
    }
    function contextLost(e){e.preventDefault();useFallback('图形上下文已中断 · 已切换静态兼容模式');}
    function useFallback(reason) { if (!resources?.images)
        return; const cycle=scene?.backgrounds?.cycle;const old = $('world'), fresh = document.createElement('canvas');
        old.removeEventListener('webglcontextlost',contextLost);scene?.dispose();
        fresh.id = 'world'; fresh.setAttribute('aria-hidden', 'true'); old.replaceWith(fresh); scene = new NovaFallback.Fallback(fresh, resources.images,{cycle}); state.reduced = true; $('fallback-notice').hidden = false; $('fallback-notice').textContent = reason || '静态兼容模式 · 已减少空间运动'; $('engine-label').textContent = 'Canvas 2D · 静态背景轮播 · 本地离线'; syncMotion(); resize(); say(reason); }
    async function start() {
        cancelAnimationFrame(raf);
        last = 0;
        $('boot').hidden = false;
        $('load-error').hidden = true;
        const coursePreparation=atlas.prepare();
        resources = await NovaResources.loadResources((loaded, total, failed) => { state.resources(loaded, total, failed); const fraction = total ? loaded / total : 0; $('resource-path').style.strokeDashoffset = 1 - fraction; $('resource-progress').setAttribute('aria-valuemax', String(total)); $('resource-progress').setAttribute('aria-valuenow', String(loaded)); $('resource-label').textContent = `本地资源 ${loaded} / ${total}${failed ? ' · ' + failed + ' 项失败' : ''}`; });
        if (resources.failed) {
            $('load-error').hidden = false;
            return;
        }
        const courseResult=await coursePreparation;
        if(!courseResult.ok){$('load-error').firstChild.textContent=courseResult.error+' ';$('load-error').hidden=false;return;}
        try {
            if (window.NOVA_CONFIG?.forceFallback)
                throw Error('Configured compatibility mode');
            scene = new NovaScene.Scene($('world'), resources.images);
            $('engine-label').textContent = '奇点 · 连续曝光 + 三组背景 + 独立双手前景 · 本地离线';
            $('world').addEventListener('webglcontextlost', contextLost);
        }
        catch (error) {
            useFallback('静态兼容模式 · 当前环境未启用 WebGL');
        }
        resize();
        resources.completePreparation();
        $('boot').hidden = true;
        syncMotion();
        updatePhase();
        raf = requestAnimationFrame(frame);
    }
    $('retry-load').addEventListener('click', start);
    window.NOVA = Object.freeze({ revision: 'singularity-atlas', getState: () => state.snapshot(), getDiagnostics: () => ({ ...(scene?.diagnostics() || {}), atlas:atlas.diagnostics(), frames, renderedFrames, lastRenderError, activeInput: hold.kind, samples: measured.length, meanFrameMs: measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : null, qualitySetting: quality, soundEnabled: sound.enabled, audioContextState: sound.ctx?.state || 'not-created', audioError: sound.lastError, resourceResults: resources?.results || [] }), reset: () => reset(false), playIntro: () => reset(true), enterCourse });
    if(window.NOVA_CONFIG?.debug === true) {
        window.NOVA_QA = {
            seek(phase,progress=0,time=12) {
                cancelHold(); state.phase=phase;state.phaseTime=progress*(phase==='intro'?9.7:((state.reduced?NovaCore.QUIET:NovaCore.DURATION)[phase]||1));
                state.time=time;state.pose=['explore','intro'].includes(phase)?0:1;state.arrival=phase==='intro'?0:1;state.paused=true;
                updatePhase();if(scene){scene.render(state);renderUI();}return scene?.diagnostics();
            },
            resume(){state.pause(false);last=0;},
            setQuality(value){quality=value;scene.low=value==='low';resize();},
            setReduced(value){state.reduced=!!value;syncMotion();}
        };
    }
    syncMotion();
    updatePhase();
    start();
})();
