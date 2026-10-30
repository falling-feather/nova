import { mountReturn } from './ui/return-host.ts';
import './ui/style.css';
import './ui/conservatory.css';
import '../../../shared/linkage/course-links.js';
import { Garden, loadJson, type World as GardenData, type MemoryBook } from './content/world.ts';
import { Tokenizer, type TokenizerData } from './core/tokenizer.ts';
import { Session, QUESTIONS } from './core/session.ts';
import { initializeStorage } from './core/storage.ts';
import { App } from './ui/app.ts';
const root = document.querySelector<HTMLElement>('#app')!;
async function start() {
  try {
    const base = import.meta.env.BASE_URL;
    const [world, book, data] = await Promise.all([
      loadJson<GardenData>(base + 'data/world.json'),
      loadJson<MemoryBook>(base + 'data/memory.json'),
      loadJson<TokenizerData>(base + 'models/garden-tokenizer.json'),
    ]);
    const garden = new Garden(world, book);
    await initializeStorage(garden, QUESTIONS.length);
    await new App(root, new Session(garden, new Tokenizer(data))).start();
  } catch (error) {
    root.innerHTML =
      '<div id="interface"><header><div class="brand"><span>NOVA / 奇点 · 第九章</span><h1>四季问询亭</h1></div><nav class="top-tools" data-nova-return-host></nav></header></div><div class="loading"><small>NOVA / 奇点</small><h1>温室还没能开门</h1><p id="error"></p><button onclick="location.reload()">重新尝试</button></div>';
    mountReturn(root);
    document.querySelector('#error')!.textContent =
      error instanceof Error ? error.message : String(error);
    console.error(error);
  }
}
void start();
