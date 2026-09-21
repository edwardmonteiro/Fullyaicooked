export const clone = value => JSON.parse(JSON.stringify(value));
export function random(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffle(values, rng = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export const freshSeed = () => Math.floor(Math.random() * 0x100000000);
export const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export const STORAGE = 'cooked:classics:v1:';
export function readSave(storage, kind, restore) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE + kind));
    if (value?.version !== 1) return null;
    return {model: restore(value.model), recorded: value.recorded === true};
  } catch { return null; }
}
export function writeSave(storage, kind, model, recorded) {
  try { storage.setItem(STORAGE + kind, JSON.stringify({version: 1, model: model.serialize(), recorded})); return true; } catch { return false; }
}
