import { CAMPAIGNS, MODELS } from './championship.js';
import { ChampionshipRenderer } from './championship-render.js';
import { readProgress, saveResult } from './progress.js';

const $ = id => document.getElementById(id), kind = document.body.dataset.game, config = CAMPAIGNS[kind];
const isGolf = kind === 'pocket-golf', isBike = kind === 'bike-rider', isRace = kind === 'neon-rally' || kind === 'triathlon-sprint';
let storage; try { storage = localStorage; } catch { storage = { getItem: () => null, setItem: () => {} }; }
const progress = readProgress(storage, kind, config.stages.length);
const canvas = $('canvas'), held = new Map(), keys = new Set();
let level = progress.unlocked, model = new MODELS[kind](level), state = 'menu', renderer, assetError = false;
let action = false, targetX, drag = null, steerPointer, angle = -Math.PI / 2, power = 330, hole = 0;
let lastTime = 0, accumulator = 0, countdown = 0, roundSent = false, sound = false, context, beat = 0, nextBeat = 0;
try { sound = storage.getItem('cooked:sound') === 'on'; } catch {}
document.documentElement.style.setProperty('--accent', config.accent);
$('game-name').textContent = config.title; $('hint').textContent = config.hint;
function changeState(next) { state = next; document.body.dataset.state = next; $('pause').disabled = next !== 'playing'; for (const b of document.querySelectorAll('.control')) b.disabled = next !== 'playing'; $('power').disabled = next !== 'playing'; }
function clearInput() { keys.clear(); held.clear(); drag = null; steerPointer = undefined; targetX = undefined; action = false; for (const b of document.querySelectorAll('.control')) b.classList.remove('held'); }
function note(frequency, duration = .12, volume = .035, type = 'triangle') {
  if (!sound || context?.state !== 'running') return;
  const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
  osc.type = type; osc.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  osc.connect(gain); gain.connect(context.destination); osc.start(); osc.stop(now + duration + .01);
}
function initAudio() { if (!sound) return; try { context ||= new (window.AudioContext || window.webkitAudioContext)(); context.resume().catch(() => {}); } catch {} }
function effect(type) { const hz = { coin:880, hit:95, brick:460, bounce:250, putt:360, jump:560, land:170, hole:1046, win:1046, stage:784, end:110, water:90 }[type]; if (hz) note(hz, type === 'win' || type === 'hole' ? .4 : .13); }
function music() {
  if (!sound || context?.state !== 'running' || context.currentTime < nextBeat) return;
  nextBeat = context.currentTime + (isGolf ? .32 : .24); const tune = isGolf ? [0,7,12,7,4,7,11,7,2,9,14,9,5,9,12,9] : [0,0,7,12,0,7,10,7,3,3,10,15,3,10,12,7];
  note(130.81 * 2 ** (tune[beat % 16] / 12), .18, .011, 'triangle'); if (beat % 4 === 0 && !isGolf) note(60, .09, .023, 'sine'); beat++;
}
function soundLabel() { $('sound').textContent = sound ? '♪ On' : '♪ Off'; $('sound').setAttribute('aria-pressed', String(sound)); $('sound').setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on'); }
$('sound').onclick = () => { sound = !sound; try { storage.setItem('cooked:sound', sound ? 'on' : 'off'); } catch {} initAudio(); soundLabel(); };
soundLabel();
function stageOptions() {
  $('stages').replaceChildren();
  config.stages.forEach((name, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.disabled = i > progress.unlocked;
    b.setAttribute('aria-pressed', String(i === level)); b.setAttribute('aria-label', `${i + 1}. ${name}${b.disabled ? ', locked' : ''}`);
    const number = document.createElement('span'); number.className = 'stage-number'; number.textContent = String(i + 1).padStart(2,'0');
    const text = document.createElement('span'); text.textContent = name;
    const medal = document.createElement('span'); medal.className = 'medal'; medal.textContent = b.disabled ? 'LOCK' : progress.medals[i] ? ['','●','●●','●●●'][progress.medals[i]] : '—';
    b.append(number, text, medal); b.onclick = () => { level = i; model = new MODELS[kind](level); stageOptions(); bestLabel(); }; $('stages').append(b);
  });
}
function bestLabel() { const best = progress.scores[level]; $('best').textContent = best ? `${config.stages[level]} · Best ${best.toLocaleString()}` : `${config.stages[level]} · ${level === 0 ? 'Learn the course' : level === config.stages.length - 1 ? 'Final challenge' : 'New patterns. Higher stakes.'}`; }
function overlay(title, message, eyebrow, primary) {
  $('title').textContent = title; $('instructions').textContent = message; $('eyebrow').textContent = eyebrow; $('start').textContent = primary;
  $('overlay').hidden = false; $('start').disabled = !renderer && !assetError;
  $('stages').hidden = state !== 'menu'; $('menu').hidden = state === 'menu'; $('retry').hidden = state !== 'paused';
  $('best').hidden = state === 'paused'; bestLabel();
}
function menu() { clearInput(); changeState('menu'); model = new MODELS[kind](level); stageOptions(); overlay(config.title, config.controls, `${config.stages.length} EVENTS · EARN YOUR PLACE`, renderer ? 'Start event →' : 'Loading artwork…'); }
function start() {
  if (assetError) { location.reload(); return; } if (!renderer) return;
  initAudio(); clearInput();
  if (state !== 'paused') { if (state === 'finished' && model.won && level < config.stages.length - 1) level++; model = new MODELS[kind](level); roundSent = false; angle = -Math.PI / 2; power = 330; hole = model.hole || 0; $('power').value = String(power); }
  countdown = state === 'paused' ? .8 : 2.4; changeState('countdown'); $('overlay').hidden = true; $('countdown').hidden = false; canvas.focus({ preventScroll: true }); lastTime = 0; accumulator = 0;
}
function pause() { if (state !== 'playing' && state !== 'countdown') return; changeState('paused'); clearInput(); $('countdown').hidden = true; overlay('Take a breather.', 'Your position and score are saved for this pause.', config.title.toUpperCase(), 'Resume'); $('start').focus({ preventScroll:true }); }
function complete() {
  changeState('finished'); clearInput(); saveResult(storage, kind, progress, level, model);
  const medal = ['','BRONZE','SILVER','GOLD'][model.medal] || '';
  overlay(model.won ? `${medal} MEDAL` : 'One more run?', model.message, config.stages[level].toUpperCase(), model.won && level < config.stages.length - 1 ? 'Next event →' : 'Play again');
  $('retry').hidden = !model.won || level === config.stages.length - 1; $('retry').textContent = 'Replay event';
  if (!roundSent) { roundSent = true; if (parent !== window) parent.postMessage({ type:'cooked:round-complete', game:kind }, location.origin); }
  $('start').focus({ preventScroll:true });
}
$('start').onclick = start; $('pause').onclick = pause; $('menu').onclick = menu;
$('retry').onclick = () => { changeState('menu'); start(); }; 
function aim() {
  if (drag) { const vx = (drag.start.x - drag.current.x) * 3.2, vy = (drag.start.y - drag.current.y) * 3.2, scale = Math.min(1, 520 / (Math.hypot(vx,vy) || 1)); return { vx:vx * scale, vy:vy * scale }; }
  return { vx:Math.cos(angle) * power, vy:Math.sin(angle) * power };
}
function act() { if (state !== 'playing') return; initAudio(); if (isGolf) { const a = aim(); model.shoot(a.vx, a.vy); drag = null; } else action = true; }
for (const [name,label] of config.actions) {
  const b = document.createElement('button'); b.type = 'button'; b.className = `control ${['action','pace','pedal'].includes(name) ? 'primary' : ''}`; b.dataset.action = name; b.textContent = label; b.setAttribute('aria-label', `${label} control`);
  b.onpointerdown = e => { if (state !== 'playing') return; e.preventDefault(); initAudio(); b.setPointerCapture(e.pointerId); held.set(e.pointerId,name); b.classList.add('held'); if (name === 'action') act(); };
  const release = e => { held.delete(e.pointerId); if (![...held.values()].includes(name)) b.classList.remove('held'); };
  b.onpointerup = release; b.onpointercancel = release; b.onlostpointercapture = release;
  b.onclick = e => { if (e.detail !== 0 || state !== 'playing') return; if (name === 'action') act(); if (isGolf && name === 'left') angle -= .1; if (isGolf && name === 'right') angle += .1; };
  $('controls').append(b);
}
function point(e) { const r = canvas.getBoundingClientRect(); return { x:(e.clientX - r.left) * 420 / r.width, y:(e.clientY - r.top) * 600 / r.height }; }
canvas.onpointerdown = e => { if (state !== 'playing') return; e.preventDefault(); initAudio(); if (isGolf) { if (!model.canShoot || drag) return; const p = point(e); drag = { id:e.pointerId, start:p, current:p }; } else if (isRace || kind === 'orbit-breaker') { if (steerPointer !== undefined) return; steerPointer = e.pointerId; targetX = point(e).x; } else act(); canvas.setPointerCapture(e.pointerId); };
canvas.onpointermove = e => { if (state !== 'playing') return; if (drag?.id === e.pointerId) drag.current = point(e); if (steerPointer === e.pointerId) targetX = point(e).x; };
canvas.onpointerup = e => { if (drag?.id === e.pointerId) { if (Math.hypot(drag.start.x - drag.current.x, drag.start.y - drag.current.y) > 7) act(); drag = null; } if (steerPointer === e.pointerId) { targetX = undefined; steerPointer = undefined; } };
canvas.onpointercancel = canvas.onlostpointercapture = e => { if (drag?.id === e.pointerId) drag = null; if (steerPointer === e.pointerId) { steerPointer = undefined; targetX = undefined; } };
document.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'playing' || state === 'countdown') { e.preventDefault(); pause(); } return; }
  if (state !== 'playing' || e.target === $('power') || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS'].includes(e.code)) return;
  e.preventDefault(); keys.add(e.code); if (e.code === 'Space' && !e.repeat && !isRace) act();
});
document.addEventListener('keyup', e => keys.delete(e.code));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }); window.addEventListener('blur', pause);
window.addEventListener('message', e => { if (e.source === parent && e.origin === location.origin && e.data?.type === 'cooked:pause') pause(); });
const heldAction = name => [...held.values()].includes(name);
function input() { const left = heldAction('left') || keys.has('ArrowLeft') || keys.has('KeyA'), right = heldAction('right') || keys.has('ArrowRight') || keys.has('KeyD'); const down = keys.has('ArrowDown') || keys.has('KeyS'); return { left,right,targetX,action,pace:heldAction('pace') || (isRace && keys.has('Space')), brake:heldAction('brake') || down, focus:heldAction('focus') || down, pedal:heldAction('pedal') || (isBike && (keys.has('ArrowUp') || keys.has('KeyW'))) }; }
$('power-row').hidden = !isGolf;
$('power').oninput = e => { power = Number(e.target.value); $('power-value').textContent = `${Math.round(power / 5.2)}%`; };
function resize() { const area = $('arena').getBoundingClientRect(), scale = Math.max(.1, Math.min(area.width / 420, area.height / 600)), dpr = Math.min(2, devicePixelRatio || 1); canvas.style.width = `${420 * scale}px`; canvas.style.height = `${600 * scale}px`; canvas.width = Math.round(420 * dpr); canvas.height = Math.round(600 * dpr); canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0); }
new ResizeObserver(resize).observe($('arena')); resize();
function frame(time) {
  const dt = lastTime ? Math.min(.1, (time - lastTime) / 1000) : 0; lastTime = time;
  if (state === 'countdown') { countdown -= dt; $('countdown').textContent = countdown > .45 ? String(Math.ceil(countdown)) : 'GO'; if (countdown <= 0) { changeState('playing'); $('countdown').hidden = true; } }
  if (state === 'playing') {
    accumulator += dt; while (accumulator >= 1 / 120 && state === 'playing') {
      const controls = input();
      if (isGolf) {
        if (model.canShoot && !drag) { angle += ((controls.right ? 1 : 0) - (controls.left ? 1 : 0)) / 120 * 1.6; power = Math.max(50, Math.min(520, power + ((keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0)) / 120 * 180)); }
        if (hole !== model.hole) { hole = model.hole; angle = Math.atan2(model.course.cup[1] - model.ball.y, model.course.cup[0] - model.ball.x); drag = null; }
      }
      model.tick(1 / 120, controls); action = false; accumulator -= 1 / 120;
      for (const event of model.events.splice(0)) effect(event);
      if (model.done) complete();
    } music();
  }
  renderer?.draw(model, isGolf ? aim() : null);
  $('score').textContent = Math.floor(model.score).toLocaleString(); $('status').textContent = `${level + 1} / ${config.stages.length}`;
  if (isGolf) { $('power').value = String(Math.round(power)); $('power-value').textContent = `${Math.round(power / 5.2)}%`; }
  requestAnimationFrame(frame);
}
function image(src) { return new Promise((resolve,reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = new URL(src, import.meta.url).href; }); }
menu();
const requested = { sports: kind === 'triathlon-sprint' || isBike ? './sports/sprites.webp' : null, bike:isBike ? './sports/bike-background.webp' : null, rally:kind === 'neon-rally' ? './assets/rally-sprites.webp' : null, orbit:kind === 'orbit-breaker' ? './assets/orbit-background.webp' : null, stack:kind === 'stack-circuit' ? './assets/stack-background.webp' : null };
Promise.all(Object.entries(requested).map(async ([name,path]) => [name,path ? await image(path) : null])).then(entries => { renderer = new ChampionshipRenderer(canvas, kind, Object.fromEntries(entries)); $('start').disabled = false; $('start').textContent = 'Start event →'; }).catch(() => { assetError = true; $('start').disabled = false; $('start').textContent = 'Reload game'; $('instructions').textContent = 'Some game artwork did not load. Reload to try again.'; });
requestAnimationFrame(frame);
