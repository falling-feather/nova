import { h } from './dom.ts';
import type { LocationId } from '../content/course.ts';

const places:LocationId[]=['beach','workshop','market','stall','night'];
/** Independent environmental thumbnails; labels remain live HTML. */
export function locationArt(place:LocationId){
  return h('span.location-vignette',{'aria-hidden':'true','data-place':place,style:'background-image:url('+new URL('./scene-assets/station-atlas.webp',import.meta.url).href+');background-position:'+places.indexOf(place)*25+'% center'},h('span.vignette-light'));
}
