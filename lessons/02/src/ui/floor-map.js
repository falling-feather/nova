import { rooms } from "../content.js";
import { spatialPlan } from "../spatial/layout.js";
import { escapeHTML as esc } from "./archive-markup.js";
import { routePaths } from "../spatial/visitor-route.js";
/** A glanceable corner map: the same plan, hall numbers only, plus the visitor arrow. */
export function minimapMarkup() {
  const paths = spatialPlan.corridors
    .map(
      (c) =>
        `<path d="${c.points.map(([x, z], i) => `${i ? "L" : "M"}${x} ${z}`).join(" ")}" class="mm-path" stroke-width="${c.width}"/>`,
    )
    .join("");
  const halls = rooms
    .map(
      (r) =>
        `<g class="mm-room" data-mm-room="${r.id}">${r.shape === "circle" ? `<circle cx="${r.centerX}" cy="${r.centerZ}" r="${r.radius}"/>` : `<rect x="${r.x}" y="${r.z}" width="${r.width}" height="${r.depth}" rx="0.6"/>`}<text x="${r.centerX}" y="${r.centerZ + 1.6}">${r.n}</text></g>`,
    )
    .join("");
  return `<svg viewBox="-10 -10 119 73" aria-hidden="true">${paths}${halls}<g class="mm-room" data-mm-room="atrium"><circle cx="-5" cy="6" r="2.6"/></g><g id="minimap-player"><circle r="3.2" class="mm-halo"/><path d="M0 -2.9 L2.1 2.2 L0 1.1 L-2.1 2.2 Z" class="mm-arrow"/></g></svg>`;
}
/** The navigation map uses the same metre coordinates as the built campus. */
export function floorMapMarkup() {
  const paths = spatialPlan.corridors
    .map(
      (c) =>
        `<path d="${c.points.map(([x, z], i) => `${i ? "L" : "M"}${x} ${z}`).join(" ")}" fill="none" stroke="${c.id === "CR" ? "#d9d0bf" : "#e4ddcf"}" stroke-width="${c.width}" stroke-linejoin="miter"/>`,
    )
    .join("");
  const route = routePaths
    .map(
      (p) =>
        `<path d="${p.points.map(([x, z], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${z.toFixed(2)}`).join(" ")}" fill="none" stroke="#3b638e" stroke-width=".5" opacity=".65" pointer-events="none"/>`,
    )
    .join("");
  const tint = (r) => `color-mix(in srgb, ${r.color} 13%, #f3eee5)`;
  const galleries = rooms
    .map(
      (r) =>
        `<g class="map-room" tabindex="0" role="button" data-room="${r.id}" aria-label="前往${esc(r.name)}">${r.shape === "circle" ? `<circle class="fill" cx="${r.centerX}" cy="${r.centerZ}" r="${r.radius}" fill="${tint(r)}" stroke="#1d1a16" stroke-width=".18"/><rect x="${r.centerX - r.core.w / 2}" y="${r.centerZ - r.core.d / 2}" width="${r.core.w}" height="${r.core.d}" fill="none" stroke="#1d1a16" stroke-width=".12" stroke-dasharray=".5 .5"/>` : `<rect class="fill" x="${r.x}" y="${r.z}" width="${r.width}" height="${r.depth}" fill="${tint(r)}" stroke="#1d1a16" stroke-width=".18"/>`}<text x="${r.centerX}" y="${r.centerZ - 1.2}" text-anchor="middle" font-size="2.2" font-family="Bahnschrift, Segoe UI, sans-serif" fill="${r.color}">${r.n}</text><text x="${r.centerX}" y="${r.centerZ + 1.5}" text-anchor="middle" font-size="1.5" letter-spacing=".12" font-family="Thought Court Serif, SimSun, serif" fill="#1d1a16">${esc(r.name)}</text></g>`,
    )
    .join("");
  return `<svg viewBox="-10 -10 119 73" aria-label="七座展厅：四座方形或矩形厅与三座圆厅相连">${paths}${galleries}${route}<g class="map-room" tabindex="0" role="button" data-room="atrium" aria-label="回到入口"><rect x="-7.4" y="3.6" width="4.8" height="4.8" fill="#1d1a16"/><text x="-5" y="11.6" text-anchor="middle" font-size="1.5" letter-spacing=".1" fill="#1d1a16">入口</text></g><text x="25" y="61.4" text-anchor="middle" font-size="1.5" letter-spacing=".1" fill="#857b6b">研究卡 · 下一站</text><g id="map-you" class="map-you"><g class="map-you-arrow"><circle r="2.6"/><path d="M0 -2.3 L1.7 1.8 L0 0.9 L-1.7 1.8 Z"/></g></g></svg>`;
}
