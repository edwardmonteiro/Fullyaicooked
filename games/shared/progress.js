export function readProgress(storage, kind, count) {
  let value; try { value = JSON.parse(storage.getItem(`cooked:campaign:v2:${kind}`)); } catch {}
  const medals = Array.from({ length: count }, (_, i) => Number.isInteger(value?.medals?.[i]) ? Math.max(0, Math.min(3, value.medals[i])) : 0);
  const scores = Array.from({ length: count }, (_, i) => Number.isFinite(value?.scores?.[i]) ? Math.max(0, Math.floor(value.scores[i])) : 0);
  // A stage unlocks only when its predecessor has a medal.
  let unlocked = 0; while (unlocked < count - 1 && medals[unlocked] > 0) unlocked++;
  return { unlocked, medals, scores };
}
export function saveResult(storage, kind, progress, level, model) {
  if (model.won) { progress.medals[level] = Math.max(progress.medals[level], model.medal); progress.unlocked = Math.min(progress.medals.length - 1, Math.max(progress.unlocked, level + 1)); }
  progress.scores[level] = Math.max(progress.scores[level], Math.floor(model.score));
  try { storage.setItem(`cooked:campaign:v2:${kind}`, JSON.stringify(progress)); } catch {}
}
