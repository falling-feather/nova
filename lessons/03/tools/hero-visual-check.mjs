import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createState } from "../src/core/state.ts";
import { ACTIVITIES } from "../src/content/activities.ts";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, ".work", "hero-redraw-20261013");
const worldOnly = process.argv.includes("--world-only");
const base = process.env.FOREST_TEST_URL ?? (worldOnly ? "http://127.0.0.1:5193" : "http://127.0.0.1:5194");
await fs.mkdir(output, { recursive: true });
// The real game renderer is sampled at deterministic poses, not replaced by a mock sprite.
await fs.writeFile(
  path.join(output, "hero-poses.html"),
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>body{margin:0;background:#f4f1e3}canvas{display:block}</style><div id="stage"></div><script type="module">
import Phaser from '/node_modules/.vite/deps/phaser.js';
import {HERO_ASSETS,prepareHero,createHero} from '/src/render/hero/index.ts';
const entries=[['向右站立','right'],['向左站立','left'],['眨眼','blink'],['向右行走','walk-right'],['向左行走','walk-left'],['看向伙伴','glance'],['转身：右前方','quarter-right'],['转身：正面','front'],['转身：左前方','quarter-left']];
const snapshots=[];
new Phaser.Game({type:Phaser.AUTO,parent:'stage',width:1200,height:1110,backgroundColor:'#f4f1e3',banner:false,scene:{
preload(){for(const [key,url] of Object.entries(HERO_ASSETS))this.load.image(key,url)},
create(){prepareHero(this);entries.forEach(([label,kind],index)=>{
 const col=index%3,row=Math.floor(index/3),cx=col*400+200,cy=row*370+336;
 this.add.rectangle(cx,row*370+182,370,342,0xfffdf5).setStrokeStyle(1,0xded6bc);
 this.add.text(cx,row*370+21,label,{fontFamily:'Microsoft YaHei',fontSize:18,color:'#5f6948'}).setOrigin(.5,0);
 this.add.ellipse(cx,cy+3,92,14,0x8f9371,.15);
 const rig=createHero(this);let x=0,time=0;
 const step=(velocity)=>{time+=1/60;x+=velocity/60;rig.update({x,feetY:0,slope:0,velocityX:velocity,dt:1/60,time,groundAt:()=>0,reducedMotion:false,blocked:false});return rig.debugSnapshot()};
 let pose=step(0);
 if(kind==='left'){for(let n=0;n<15;n++)step(-210);for(let n=0;n<80;n++)pose=step(0)}
 else if(kind.startsWith('walk-')){for(let n=0;n<23;n++)pose=step(kind==='walk-left'?-210:210)}
 else if(['quarter-right','front','quarter-left'].includes(kind)){for(let n=0;n<30;n++)step(210);const count=kind==='quarter-right'?3:kind==='front'?4:6;for(let n=0;n<count;n++)pose=step(-210)}
 else if(kind==='blink'||kind==='glance'){for(let n=0;n<1800;n++){pose=step(0);if(kind==='blink'?pose.blink:pose.look>.7&&!pose.blink)break}}
 rig.root.setPosition(cx,cy).setScale(1.75);
 const heads=rig.root.list[0].list.filter(image=>image.texture?.key==='hero-head');
 snapshots.push({kind,frame:heads[0]?.frame.name,headCount:heads.length,mode:pose.mode,blink:pose.blink,look:pose.look,turnMix:pose.turnMix});
 });window.heroVisualCheck=snapshots;}
}});
</script></html>`,
  "utf8",
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [],
  requests = [],
  report = { poses: [], world: [], errors, requests };
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) requests.push({ url: r.url(), status: r.status() });
  });
};
try {
  if (!worldOnly) {
  const gallery = await browser.newPage({ viewport: { width: 1200, height: 1110 } });
  watch(gallery);
  await gallery.goto(base + "/.work/hero-redraw-20261013/hero-poses.html");
  await gallery.waitForFunction(() => window.heroVisualCheck?.length === 9);
  await gallery.screenshot({ path: path.join(output, "hero-nine-poses.png") });
  report.poses = await gallery.evaluate(() => window.heroVisualCheck);
  for (const pose of report.poses) assert.equal(pose.headCount, 1);
  assert.deepEqual(
    [...new Set(report.poses.map((p) => p.frame))].sort(),
    ["open", "blink", "glance", "quarter-right", "front", "quarter-left"].sort(),
  );
  await gallery.close();
  }
  const state = createState();
  state.player.x = 20450;
  state.completed = ACTIVITIES.map((a) => a.id);
  state.preferences.muted = true;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript(
    (s) => localStorage.setItem("nova-forest-whispers-v1", JSON.stringify(s)),
    state,
  );
  const page = await context.newPage();
  watch(page);
  await page.goto(base + "/?inspect=1");
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await page.locator(".start-button").click();
  await page.waitForTimeout(1800);
  const capture = async (name) => {
    await page.screenshot({
      path: path.join(output, `world-${name}.png`),
      clip: { x: 450, y: 440, width: 430, height: 310 },
    });
    const pose = await page.evaluate(() => window.forestInspect().scene.hero);
    report.world.push({
      name,
      mode: pose.mode,
      facing: pose.facing,
      blink: pose.blink,
      turnMix: pose.turnMix,
    });
  };
  await capture("right");
  await page.screenshot({
    path: path.join(output, "character-in-game.png"),
    clip: { x: 532, y: 496, width: 200, height: 220 },
  });
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyA");
  await page.waitForTimeout(400);
  await capture("left");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(550);
  await capture("walking");
  await page.keyboard.up("KeyD");
  await context.close();
  const camp = await browser.newPage({viewport:{width:1440,height:900}});
  watch(camp);
  await camp.goto(base+'/?inspect=1');
  await camp.waitForFunction(()=>window.forestInspect?.().ready);
  await camp.locator('.start-button').click();
  await camp.waitForTimeout(1800);
  await camp.screenshot({path:path.join(output,'world-camp.png')});
  await camp.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
} catch (error) {
  report.failure = String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, worldOnly ? "hero-production-check.json" : "hero-visual-check.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
