export interface DeviceSettings { quality:"auto"|"fine"|"eco"; reducedMotion:boolean; muted:boolean }
const key="nova-type-house-device-v1";
export function readDeviceSettings(legacyReduced=false):DeviceSettings {
  const defaults:DeviceSettings={quality:"auto",reducedMotion:legacyReduced,muted:true};
  try { const saved=JSON.parse(localStorage.getItem(key)??"null"); if(saved&&["auto","fine","eco"].includes(saved.quality)&&typeof saved.reducedMotion==="boolean"&&typeof saved.muted==="boolean")return saved; } catch { /* optional device preferences cannot prevent learning */ }
  return defaults;
}
export function writeDeviceSettings(settings:DeviceSettings) { try {localStorage.setItem(key,JSON.stringify(settings));}catch{/* unavailable device preferences leave this session usable */} }
