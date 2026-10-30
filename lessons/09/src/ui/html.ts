export const esc = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
export const button = (label: string, action: string, extra = '') =>
  `<button type="button" data-action="${action}" ${extra}>${label}</button>`;

const objects: Record<string, string> = {
  overview:
    '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c-2.6 2.6-3.9 5.6-3.9 9s1.3 6.4 3.9 9c2.6-2.6 3.9-5.6 3.9-9S14.6 5.6 12 3z"/>',
  map: '<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2zM9 4v14M15 6v14"/>',
  camera:
    '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.8 2.3c-.8.4-1.3 1-1.3 1.9v.6"/><circle cx="12" cy="17.2" r=".6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
  route:
    '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>',
  rain: '<path d="M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 2 9M7 17l-1 3M12 17l-1 3M17 17l-1 3"/>',
  collapse: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M16 4v16m-7-11 3 3-3 3"/>',
  expand: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M16 4v16m-4-11-3 3 3 3"/>',
  reception:
    '<path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6l-4.5 4v-4H7a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M8 9h8M8 12h5"/>',
  memory:
    '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13"/>',
  context:
    '<path d="M7 3.5h7l4 4V20a.6.6 0 0 1-.6.6H7.1a.6.6 0 0 1-.6-.6V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5"/>',
  archive:
    '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M4 9h16M4 15h16M10.5 6h3M10.5 12h3M10.5 18h3"/>',
  journal: '<path d="M6 4h12v16H6zM9 4v16M12 8h3M12 12h3M3.5 7H7M3.5 12H7M3.5 17H7"/>',
};
export const objectIcon = (name: string) =>
  `<svg class="object-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${objects[name] ?? objects.reception}</svg>`;

export const yuanPortrait = () =>
  `<svg class="yuan-portrait" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 15V9" fill="none" stroke="#5c8a3e" stroke-width="2.6" stroke-linecap="round"/><path d="M32 10c-5-5.5-12-4.5-11.5-.5 3.5 3 8 3 11.5.5z" fill="#86bd62"/><path d="M32 9.5c5.5-6.5 13-4.5 12-.5-3.5 3.5-8.5 3.5-12 .5z" fill="#a6d47c"/><g fill="#fbf4e4" stroke="#d6c59d" stroke-width="1.6"><ellipse cx="8.5" cy="37" rx="5.5" ry="3.6"/><ellipse cx="55.5" cy="37" rx="5.5" ry="3.6"/><rect x="9.5" y="14.5" width="45" height="39" rx="13"/></g><rect x="15.5" y="20" width="33" height="25" rx="8.5" fill="#2f6b58"/><g fill="#eafde9"><ellipse cx="25.5" cy="30" rx="2.8" ry="3.6"/><ellipse cx="38.5" cy="30" rx="2.8" ry="3.6"/></g><g fill="#f39b86" opacity=".75"><ellipse cx="21.5" cy="35.5" rx="2.4" ry="1.3"/><ellipse cx="42.5" cy="35.5" rx="2.4" ry="1.3"/></g><path d="M27.5 36q4.5 4 9 0" fill="none" stroke="#eafde9" stroke-width="2.4" stroke-linecap="round"/><g fill="#d6c59d"><circle cx="27" cy="49" r="1.1"/><circle cx="32" cy="49" r="1.1"/><circle cx="37" cy="49" r="1.1"/></g></svg>`;
