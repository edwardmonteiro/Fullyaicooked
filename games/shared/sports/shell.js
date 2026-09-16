import { Triathlon, Bike, Golf, COURSES, clamp } from './models.js';
import { Renderer } from './render.js';

const $ = id => document.getElementById(id);
const kind = document.body.dataset.game;
const golf = kind === 'pocket-golf', bike = kind === 'bike-rider';
const config = {
  'triathlon-sprint': {
    title: 'Triathlon Sprint', Model: Triathlon, tag: 'SWIM. CYCLE. RUN.',
    instructions: 'Finish three 400 m stages. Steer around orange markers and collect energy rings. Hold Pace to go faster; release it to refill stamina.',
    hint: 'Drag or ← → to steer · Hold Pace or Space to sprint', buttons: [['left', '←', 'Steer left'], ['pace', 'Hold pace', 'Hold for a faster pace'], ['right', '→', 'Steer right']]
  },
  'bike-rider': {
    title: 'Bike Rider', Model: Bike, tag: 'TAKE THE SCENIC ROUTE.',
    instructions: 'Ride the alpine trail to the finish flag. Jump over rocks, collect golden rings, and land on the rolling hills. Hold Pedal for more speed.',
    hint: 'Space or ↑ to jump · Hold Pedal or → to speed up', buttons: [['jump', 'Jump ↑', 'Jump over obstacles'], ['pedal', 'Hold pedal', 'Hold to pedal faster']]
  },
  'pocket-golf': {
    title: 'Pocket Golf', Model: Golf, tag: 'SIX GREENS. YOUR BEST LINE.',
    instructions: 'Drag backwards anywhere on the course, then release to putt. Longer drags hit harder. Bank off walls, avoid water (+1 stroke), and use a soft touch near the cup.',
    hint: 'Drag to aim · ← → aim · ↑ ↓ power · Space to putt', buttons: [['aimLeft', '↶', 'Aim counterclockwise'], ['putt', 'Putt', 'Hit the golf ball'], ['aimRight', '↷', 'Aim clockwise']]
  }
}[kind];

const canvas = $('canvas'), overlay = $('overlay'), start = $('start');
let model = new config.Model(), state = 'intro', lastTime = 0, roundSent = false;
let targetX, drag = null, jumpQueued = false, angle = -Math.PI / 2, power = 330, previousHole = 0;
let audioContext, sound = false, assetError = false, best = 0;
const keys = new Set(), held = new Map();
try { best = Number(localStorage.getItem(`cooked:best:${kind}`)) || 0; } catch {}
$('title').textContent = config.title; $('eyebrow').textContent = config.tag;
$('instructions').textContent = config.instructions; $('hint').textContent = config.hint;
$('best').textContent = best ? `YOUR BEST  ${best.toLocaleString()}` : 'Free to play. Make this round yours.';
$('pause').disabled = true;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = new URL(src, import.meta.url).href;
  });
}
let renderer;
Promise.all([loadImage('./sprites.webp'), bike ? loadImage('./bike-background.webp') : Promise.resolve(null)])
  .then(([atlas, background]) => { renderer = new Renderer(canvas, kind, atlas, background); start.disabled = false; start.textContent = "Let's play"; })
  .catch(() => { assetError = true; start.disabled = false; start.textContent = 'Reload game'; $('instructions').textContent = 'The game artwork did not load. Reload to try again.'; });

function resize() {
  const area = $('arena').getBoundingClientRect();
  const scale = Math.max(0.1, Math.min(area.width / 420, area.height / 600));
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = `${420 * scale}px`; canvas.style.height = `${600 * scale}px`;
  canvas.width = Math.round(420 * scale * ratio); canvas.height = Math.round(600 * scale * ratio);
  canvas.getContext('2d').setTransform(canvas.width / 420, 0, 0, canvas.height / 600, 0, 0);
}
new ResizeObserver(resize).observe($('arena')); resize();
function clearInput() { keys.clear(); held.clear(); targetX = undefined; drag = null; jumpQueued = false; for (const b of document.querySelectorAll('.control')) b.classList.remove('held'); }
function isHeld(action) { return [...held.values()].includes(action); }
function initAudio() {
  if (!sound) return;
  try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => {}); } catch {}
}
function tone(type) {
  if (!sound || !audioContext || audioContext.state !== 'running') return;
  const frequencies = { coin: 740, hit: 130, jump: 440, putt: 580, hole: 880, win: 1046, stage: 659, end: 180, water: 110 };
  if (!frequencies[type]) return;
  try {
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), time = audioContext.currentTime;
    oscillator.type = type === 'hit' ? 'triangle' : 'sine'; oscillator.frequency.setValueAtTime(frequencies[type], time);
    oscillator.frequency.exponentialRampToValueAtTime(frequencies[type] * (type === 'coin' || type === 'win' ? 1.5 : 0.7), time + 0.14);
    gain.gain.setValueAtTime(0.045, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(time); oscillator.stop(time + 0.19);
  } catch {}
}
function golfAim() {
  if (drag) {
    const vx = (drag.start.x - drag.current.x) * 3.2, vy = (drag.start.y - drag.current.y) * 3.2;
    const length = Math.hypot(vx, vy), factor = length > 520 ? 520 / length : 1;
    return { vx: vx * factor, vy: vy * factor };
  }
  return { vx: Math.cos(angle) * power, vy: Math.sin(angle) * power };
}
function putt() { if (state === 'playing' && golf) { const aim = golfAim(); model.shoot(aim.vx, aim.vy); drag = null; } }

for (const [action, label, aria] of config.buttons) {
  const button = document.createElement('button'); button.type = 'button'; button.className = `control ${action === 'pace' || action === 'pedal' || action === 'putt' ? 'primary' : ''}`;
  button.dataset.action = action; button.textContent = label; button.setAttribute('aria-label', aria); button.disabled = true;
  if (action === 'putt') button.addEventListener('click', putt);
  else {
    button.addEventListener('pointerdown', event => {
      if (state !== 'playing') return; event.preventDefault(); initAudio(); held.set(event.pointerId, action); button.classList.add('held');
      button.setPointerCapture(event.pointerId); if (action === 'jump') jumpQueued = true;
    });
    const release = event => { held.delete(event.pointerId); button.classList.remove('held'); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('click', event => {
      if (event.detail !== 0 || state !== 'playing') return;
      if (action === 'jump') jumpQueued = true;
      if (action === 'aimLeft') angle -= 0.15;
      if (action === 'aimRight') angle += 0.15;
    });
  }
  $('controls').append(button);
}
if (golf) {
  $('power-row').hidden = false;
  $('power').value = String(power);
  $('power').addEventListener('input', event => { power = Number(event.target.value); $('power-value').value = `${Math.round(power / 5.2)}%`; });
}
function controlsEnabled(enabled) { for (const button of document.querySelectorAll('.control')) button.disabled = !enabled; $('power').disabled = !enabled; }
function showOverlay(title, message, eyebrow, button) {
  $('title').textContent = title; $('instructions').textContent = message; $('eyebrow').textContent = eyebrow; start.textContent = button;
  overlay.hidden = false; controlsEnabled(false); start.focus({ preventScroll: true });
}
function begin() {
  if (assetError) { location.reload(); return; }
  initAudio(); clearInput();
  if (state !== 'paused') { model = new config.Model(); roundSent = false; previousHole = 0; angle = -Math.PI / 2; power = 330; $('power').value = '330'; $('power-value').value = '63%'; }
  state = 'playing'; lastTime = 0; overlay.hidden = true; $('pause').disabled = false; controlsEnabled(true);
  canvas.focus({ preventScroll: true });
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; clearInput(); $('pause').disabled = true;
  showOverlay('Take a breather', 'Your round is right where you left it.', config.title.toUpperCase(), 'Resume game');
}
function complete() {
  if (state !== 'playing') return;
  state = 'finished'; clearInput(); $('pause').disabled = true;
  if (model.score > best) { best = model.score; try { localStorage.setItem(`cooked:best:${kind}`, String(best)); } catch {} }
  $('best').textContent = `SCORE ${model.score.toLocaleString()}  ·  BEST ${best.toLocaleString()}`;
  $('scorecard').replaceChildren(); $('scorecard').hidden = !golf;
  if (golf) for (const [index, card] of model.cards.entries()) {
    const item = document.createElement('span'); item.textContent = `${index + 1}: ${card.strokes}${card.pickedUp ? '*' : ''}`;
    item.title = `Hole ${index + 1}: ${card.strokes} strokes, par ${card.par}${card.pickedUp ? ', picked up' : ''}`; $('scorecard').append(item);
  }
  showOverlay(model.won ? golf ? 'Clubhouse time.' : 'Finish line feeling.' : 'One more try?', model.message, config.title.toUpperCase(), 'Play again');
  if (!roundSent) { roundSent = true; window.parent.postMessage({ type: 'cooked:round-complete', score: model.score }, location.origin); }
}
start.addEventListener('click', () => { $('scorecard').hidden = true; begin(); });
$('pause').addEventListener('click', pause);
$('sound').addEventListener('click', () => { sound = !sound; $('sound').textContent = sound ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(sound)); initAudio(); });

const acceptedKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyP', 'Escape']);
window.addEventListener('keydown', event => {
  if (!acceptedKeys.has(event.code) || event.target instanceof HTMLInputElement) return;
  if (event.code === 'KeyP' || event.code === 'Escape') { if (state === 'playing') { event.preventDefault(); pause(); } return; }
  if (state !== 'playing') return;
  event.preventDefault(); keys.add(event.code);
  if (event.repeat) return;
  if (bike && ['Space', 'ArrowUp', 'KeyW'].includes(event.code)) jumpQueued = true;
  if (golf && event.code === 'Space') putt();
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
function point(event) { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) / r.width * 420, y: (event.clientY - r.top) / r.height * 600 }; }
canvas.addEventListener('pointerdown', event => {
  if (state !== 'playing') return; event.preventDefault(); initAudio(); canvas.setPointerCapture(event.pointerId);
  if (golf && model.canShoot && !drag) { const p = point(event); drag = { id: event.pointerId, start: p, current: p }; }
  else if (!golf && !bike) targetX = point(event).x;
  else if (bike) jumpQueued = true;
});
canvas.addEventListener('pointermove', event => {
  if (state !== 'playing') return;
  if (drag?.id === event.pointerId) drag.current = point(event);
  else if (!golf && !bike && canvas.hasPointerCapture(event.pointerId)) targetX = point(event).x;
});
canvas.addEventListener('pointerup', event => {
  if (drag?.id === event.pointerId) { drag.current = point(event); const aim = golfAim(); angle = Math.atan2(aim.vy, aim.vx); putt(); }
  targetX = undefined;
});
canvas.addEventListener('pointercancel', () => { drag = null; targetX = undefined; });
canvas.addEventListener('lostpointercapture', () => { drag = null; targetX = undefined; });
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('message', event => { if (event.source === window.parent && event.origin === location.origin && event.data?.type === 'cooked:pause') pause(); });

let scoreText = '', statusText = '';
function frame(timestamp) {
  const dt = lastTime ? Math.min(0.035, Math.max(0, (timestamp - lastTime) / 1000)) : 0; lastTime = timestamp;
  if (state === 'playing' && dt > 0) {
    const left = keys.has('ArrowLeft') || keys.has('KeyA'), right = keys.has('ArrowRight') || keys.has('KeyD');
    if (golf && model.canShoot) {
      angle += ((right || isHeld('aimRight') ? 1 : 0) - (left || isHeld('aimLeft') ? 1 : 0)) * dt * 1.65;
      power = clamp(power + ((keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0)) * dt * 180, 50, 520);
      $('power').value = String(Math.round(power)); $('power-value').value = `${Math.round(power / 5.2)}%`;
    }
    model.tick(dt, { left: left || isHeld('left'), right: right || isHeld('right'), targetX,
      pace: keys.has('Space') || isHeld('pace'), pedal: right || isHeld('pedal'), jump: jumpQueued });
    jumpQueued = false;
    if (golf && model.hole !== previousHole) {
      previousHole = model.hole; const course = COURSES[model.hole]; angle = Math.atan2(course.cup[1] - model.ball.y, course.cup[0] - model.ball.x); drag = null;
    }
    for (const event of model.events.splice(0)) tone(event);
    if (model.done) complete();
  }
  renderer?.draw(model, golf ? golfAim() : null);
  const score = Math.floor(model.score).toLocaleString();
  if (score !== scoreText) { scoreText = score; $('score').textContent = score; }
  const status = golf ? `Hole ${model.hole + 1} of 6` : bike ? 'Alpine trail' : model.stage.name;
  if (status !== statusText) { statusText = status; $('status').textContent = status; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
