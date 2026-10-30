(function(root) {
  'use strict';
  const reserved = new Set(['__proto__', 'constructor', 'prototype']);
  const validRecordKey = key => typeof key === 'string' && key.length > 0 && key.length <= 160 && !reserved.has(key);
  const validArtifact = value => Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.id === 'string' && /^[a-zA-Z0-9_.:-]{1,120}$/.test(value.id) && !reserved.has(value.id)
    && typeof value.title === 'string' && value.title.trim() && value.title.length <= 200
    && ['application/json','text/html','text/plain','image/png'].includes(value.mimeType)
    && typeof value.data === 'string'
    && (value.mimeType !== 'image/png' || /^data:image\/png;base64,[a-zA-Z0-9+/]+={0,2}$/.test(value.data)));
  function randomUUID(provider = root.crypto) {
    const bytes = new Uint8Array(16);
    provider.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  // Also initialize when a bundler wraps this module as CommonJS in the browser.
  if (root.crypto && typeof root.crypto.randomUUID !== 'function') Object.defineProperty(root.crypto, 'randomUUID', {value: () => randomUUID(root.crypto), configurable: true});
  const contract = { validRecordKey, validArtifact, randomUUID, creatorDatabase: 'nova-creator-v1' };
  if (typeof module === 'object' && module.exports) module.exports = contract;
  else {
    // randomUUID is secure-context-only; getRandomValues also works on local HTTP LAN origins.
    // Supply the standard UUIDv4 operation once, before any chapter or personal client starts.
    root.NovaStorageContract = contract;
  }
})(typeof window === 'undefined' ? globalThis : window);
