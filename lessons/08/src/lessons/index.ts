import type { App } from "../app.ts";
import { renderBeach } from "./beach.ts";
import { renderWorkshop } from "./workshop.ts";
import { renderMarket } from "./market.ts";
import { renderRecipe } from "./recipe.ts";
import { renderNight } from "./night.ts";

const disposers = new WeakMap<App, () => void>();
export function onLeave(app:App,dispose:()=>void){disposers.set(app,dispose);}
export function disposeLesson(app:App){disposers.get(app)?.();disposers.delete(app);}
export function renderLesson(app:App,id:number){
  disposeLesson(app);
  if(id<=6)renderBeach(app,id);
  else if(id<=10)renderWorkshop(app,id);
  else if(id<=15)renderMarket(app,id);
  else if(id<=20)renderRecipe(app,id);
  else renderNight(app,id);
}
