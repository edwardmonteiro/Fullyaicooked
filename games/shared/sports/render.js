import { clamp, LEGS, terrainHeight } from './models.js';

// Each rectangle addresses one original generated sprite in the shared atlas.
const SPRITES = [
  [163, 18, 154, 415], [597, 30, 184, 402], [1029, 31, 162, 404], [1471, 55, 157, 384],
  [35, 509, 403, 338], [503, 467, 380, 353], [1013, 576, 191, 190], [1382, 570, 340, 238]
];
export class Renderer {
  constructor(canvas, kind, atlas, background) {
    this.ctx = canvas.getContext('2d'); this.kind = kind; this.atlas = atlas; this.background = background;
  }
  text(value, x, y, size = 14, color = '#f6fff6', align = 'left', weight = 600) {
    const c = this.ctx; c.font = `${weight} ${size}px Arial,sans-serif`; c.textAlign = align; c.fillStyle = color; c.fillText(value, x, y);
  }
  box(x, y, w, h, color, radius = 10) {
    const c = this.ctx; c.fillStyle = color; c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, radius);
    else {
      const r = Math.min(radius, w / 2, h / 2); c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    c.fill();
  }
  circle(x, y, r, color) { const c = this.ctx; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  sprite(index, x, y, w, h) { if (this.atlas?.complete && this.atlas.naturalWidth) this.ctx.drawImage(this.atlas, ...SPRITES[index], x, y, w, h); }
  ring(x, y, r = 12) {
    const c = this.ctx; c.strokeStyle = '#ffdb74'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#fff5c6'; c.lineWidth = 1.5; c.beginPath(); c.arc(x - 1, y - 1, r - 1, 3.5, 5.2); c.stroke();
  }
  hud(label, sub, progress, hearts) {
    this.box(16, 14, 388, 64, '#092b30ee', 15);
    this.text(label, 30, 37, 14); this.text(sub, 30, 56, 12, '#bdd4cc', 'left', 400);
    if (hearts !== undefined) this.text('♥'.repeat(hearts) + '♡'.repeat(3 - hearts), 388, 41, 20, '#ffae98', 'right');
    this.box(30, 65, 358, 3, '#45635f', 1.5); this.box(30, 65, Math.max(3, 358 * progress), 3, '#d9ff88', 1.5);
  }
  draw(model, aim) {
    const c = this.ctx; c.save(); c.clearRect(0, 0, 420, 600);
    if (this.kind === 'triathlon-sprint') this.triathlon(model);
    else if (this.kind === 'bike-rider') this.bike(model);
    else this.golf(model, aim);
    c.restore();
  }
  triathlon(m) {
    const c = this.ctx, swim = m.leg === 0, cycle = m.leg === 1;
    const gradient = c.createLinearGradient(0, 0, 420, 600);
    gradient.addColorStop(0, swim ? '#07566d' : cycle ? '#264b42' : '#285944');
    gradient.addColorStop(1, swim ? '#198f9b' : cycle ? '#133b37' : '#183d30');
    c.fillStyle = gradient; c.fillRect(0, 0, 420, 600);
    if (swim) {
      c.strokeStyle = '#b4fff321'; c.lineWidth = 2;
      for (let y = -30; y < 650; y += 36) {
        const yy = y + m.scroll % 36;
        for (let x = 0; x < 450; x += 58) { c.beginPath(); c.ellipse(x + Math.sin(y) * 12, yy, 20, 4, 0, 0, Math.PI); c.stroke(); }
      }
      for (const x of [34, 386]) {
        c.strokeStyle = '#a8eae6'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 600); c.stroke();
        for (let y = -24; y < 620; y += 24) this.circle(x, y + m.scroll % 24, 4, Math.floor(y / 24) % 2 ? '#fa9c81' : '#ffe4ad');
      }
    } else {
      c.fillStyle = cycle ? '#385258' : '#ba725c'; c.fillRect(38, 0, 344, 600);
      c.fillStyle = cycle ? '#e0cd9c' : '#e5bd98'; c.fillRect(35, 0, 4, 600); c.fillRect(381, 0, 4, 600);
      for (const x of [152, 268]) {
        c.strokeStyle = cycle ? '#f5edc766' : '#ffe8cfaa'; c.lineWidth = 2; c.setLineDash(cycle ? [30, 30] : []); c.lineDashOffset = -m.scroll;
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 600); c.stroke();
      }
      c.setLineDash([]);
      for (let y = -80; y < 650; y += 80) { const yy = y + m.scroll % 80; this.box(11, yy, 8, 30, '#81b88c', 3); this.box(401, yy + 35, 8, 30, '#81b88c', 3); }
    }
    for (const o of m.objects) {
      if (o.pickup) { this.circle(o.x, o.y, 19, '#132f36c9'); this.ring(o.x, o.y, 12); this.text('+', o.x, o.y + 5, 17, '#fff9cf', 'center'); }
      else { this.sprite(6, o.x - 21, o.y - 21, 42, 42); }
    }
    c.save();
    if (m.invincible > 0 && Math.floor(m.invincible * 12) % 2) c.globalAlpha = 0.4;
    if (m.boosting) { this.circle(m.x, 500, 34, '#d9ff8822'); this.circle(m.x, 500, 25, '#d9ff8822'); }
    const idx = swim ? Math.floor(m.time * 5) % 2 : cycle ? 2 : 3;
    const w = swim ? 37 : cycle ? 35 : 34;
    const bob = !swim && !cycle ? Math.sin(m.time * 15) * 2 : 0;
    this.sprite(idx, m.x - w / 2, 451 + bob, w, 90);
    c.restore();
    this.hud(`${m.leg + 1} / 3   ${LEGS[m.leg].name.toUpperCase()}`, `${Math.min(400, Math.floor(m.distance))} / 400 m  ·  ${m.time.toFixed(1)} s`, m.progress, m.hearts);
    this.box(55, 559, 310, 30, '#092b30ed', 10);
    this.text(m.exhausted ? 'RECOVER' : 'STAMINA', 68, 578, 10, '#d5e5d9');
    this.box(136, 570, 215, 8, '#45635f', 4); this.box(136, 570, Math.max(4, m.energy * 2.15), 8, m.energy < 28 ? '#ffb093' : '#d9ff88', 4);
    if (m.transition > 0) {
      this.box(55, 235, 310, 122, '#092b30f2', 20);
      this.text('NEXT STAGE', 210, 268, 11, '#bfd5c7', 'center');
      this.text(LEGS[m.leg].name, 210, 308, 34, '#d9ff88', 'center', 700);
      this.text('Stamina restored. Keep going!', 210, 334, 12, '#e8f4e8', 'center', 400);
    }
  }
  bike(m) {
    const c = this.ctx;
    c.fillStyle = '#215960'; c.fillRect(0, 0, 420, 600);
    if (this.background?.complete && this.background.naturalWidth) {
      const w = this.background.naturalWidth / this.background.naturalHeight * 600;
      c.drawImage(this.background, -(w - 420) * 0.52 - Math.sin(m.x / 3000) * 70, 0, w, 600);
    }
    // This contour is also the collision surface: the wheels always land on it.
    const groundPath = () => {
      c.beginPath(); c.moveTo(-5, terrainHeight(m.scroll - 5));
      for (let x = 0; x <= 430; x += 5) c.lineTo(x, terrainHeight(m.scroll + x));
    };
    groundPath(); c.lineTo(430, 600); c.lineTo(-5, 600); c.closePath(); c.fillStyle = '#493e37'; c.fill();
    groundPath(); c.strokeStyle = '#94b790'; c.lineWidth = 17; c.stroke();
    groundPath(); c.strokeStyle = '#e6ba88'; c.lineWidth = 8; c.stroke();
    for (let wx = Math.floor(m.scroll / 70) * 70; wx < m.scroll + 450; wx += 70) {
      this.box(wx - m.scroll + 17, terrainHeight(wx) + 40 + Math.sin(wx) * 12, 12, 3, '#786151', 1);
    }
    for (const ring of m.rings) { const x = ring.x - m.scroll; if (!ring.hit && x > -25 && x < 445) this.ring(x, ring.y, 11); }
    for (const rock of m.obstacles) {
      const x = rock.x - m.scroll; if (x < -60 || x > 480) continue;
      c.save(); c.globalAlpha = rock.hit ? 0.45 : 1; this.sprite(7, x - rock.w / 2, terrainHeight(rock.x) - rock.h, rock.w, rock.h); c.restore();
    }
    const finish = m.finishX - m.scroll;
    if (finish < 450) {
      const y = terrainHeight(m.finishX);
      c.fillStyle = '#f1ebd0'; c.fillRect(finish - 2, y - 130, 4, 130);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) { c.fillStyle = (row + col) % 2 ? '#163738' : '#faf3de'; c.fillRect(finish + col * 10, y - 130 + row * 10, 10, 10); }
    }
    c.save(); c.translate(110, m.y); c.rotate(m.angle);
    if (m.invincible > 0 && Math.floor(m.invincible * 12) % 2) c.globalAlpha = 0.4;
    this.sprite(m.grounded ? 4 : 5, -52, -87, 104, 87); c.restore();
    this.hud('ALPINE TRAIL', `${Math.min(100, Math.floor(m.progress * 100))}%  ·  ${m.coins} rings  ·  ${m.time.toFixed(1)} s`, m.progress, m.hearts);
    this.box(116, 550, 188, 32, '#092b30e8', 16);
    this.text(`${Math.round(m.speed / 6)} km/h   ·   ${m.grounded ? 'ON THE TRAIL' : 'AIR TIME'}`, 210, 571, 11, '#e7f3d6', 'center');
  }
  golf(m, aim) {
    const c = this.ctx, course = m.course, ball = m.ball;
    c.fillStyle = '#123e36'; c.fillRect(0, 0, 420, 600);
    this.box(14, 80, 392, 500, '#071f1b', 19); this.box(20, 84, 380, 488, '#d2c6a0', 13);
    c.save(); c.beginPath(); c.rect(24, 88, 372, 480); c.clip();
    c.fillStyle = '#40966d'; c.fillRect(24, 88, 372, 480);
    for (let y = 88; y < 568; y += 80) { c.fillStyle = '#4b9f733e'; c.fillRect(24, y, 372, 40); }
    for (const sand of course.sand) {
      this.box(sand.x, sand.y, sand.w, sand.h, '#eac993', 3);
      for (let x = sand.x + 8; x < sand.x + sand.w - 3; x += 14) for (let y = sand.y + 8; y < sand.y + sand.h - 3; y += 15) this.circle(x, y, 1, '#aa8a593f');
    }
    for (const water of course.water) {
      this.box(water.x, water.y, water.w, water.h, '#257f9c', 3);
      c.strokeStyle = '#a6f3f55c'; c.lineWidth = 1.5;
      for (let y = water.y + 13; y < water.y + water.h - 4; y += 17) for (let x = water.x + 9; x < water.x + water.w - 15; x += 28) {
        const offset = Math.sin(m.time * 2 + x) * 3; c.beginPath(); c.moveTo(x + offset, y); c.lineTo(x + 13 + offset, y); c.stroke();
      }
    }
    for (const wall of course.walls) {
      this.box(wall.x, wall.y + 3, wall.w, wall.h, '#123b30aa', 2);
      this.box(wall.x, wall.y, wall.w, wall.h, '#ede0b9', 2);
      c.fillStyle = '#fff1cc'; c.fillRect(wall.x + 3, wall.y + 2, wall.w - 6, 3);
    }
    const [cx, cy] = course.cup;
    this.circle(cx, cy, 14, '#8acb8f'); this.circle(cx, cy, 10, '#123b30'); this.circle(cx, cy + 2, 6, '#091e1a');
    c.strokeStyle = '#fff0cb'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 50); c.stroke();
    c.fillStyle = '#ff936f'; c.beginPath(); c.moveTo(cx, cy - 50); c.lineTo(cx + 25, cy - 40); c.lineTo(cx, cy - 30); c.closePath(); c.fill();
    this.text(String(m.hole + 1), cx + 9, cy - 37, 10, '#572919', 'center', 700);
    if (m.canShoot && aim) {
      const power = Math.hypot(aim.vx, aim.vy), length = Math.min(135, power * 0.35), ux = aim.vx / (power || 1), uy = aim.vy / (power || 1);
      c.strokeStyle = '#fff3b4'; c.lineWidth = 3; c.setLineDash([6, 7]); c.beginPath(); c.moveTo(ball.x, ball.y); c.lineTo(ball.x + ux * length, ball.y + uy * length); c.stroke(); c.setLineDash([]);
      c.save(); c.translate(ball.x + ux * length, ball.y + uy * length); c.rotate(Math.atan2(uy, ux));
      c.fillStyle = '#fff3b4'; c.beginPath(); c.moveTo(7, 0); c.lineTo(-4, -5); c.lineTo(-4, 5); c.closePath(); c.fill(); c.restore();
    }
    if (m.phase !== 'water' && m.phase !== 'holed') {
      this.circle(ball.x + 2, ball.y + 3, 8, '#133e3866'); this.circle(ball.x, ball.y, 8, '#fff9df'); this.circle(ball.x - 2.2, ball.y - 2.6, 2.5, '#ffffff');
    }
    c.restore();
    this.hud(`${m.hole + 1} / 6   ${course.name.toUpperCase()}`, `PAR ${course.par}  ·  ${m.strokes} ${m.strokes === 1 ? 'stroke' : 'strokes'}  ·  ${m.totalStrokes} total`, m.progress);
    const instruction = m.canShoot ? 'Pull back anywhere. Release to putt.' : m.phase === 'play' ? 'Watch your line…' : '';
    this.text(instruction, 210, 595, 11, '#d5e6cd', 'center', 400);
    if (m.phase !== 'play' || m.noticeTimer > 0) {
      this.box(38, 96, 344, 44, '#092b30ed', 12);
      this.text(m.notice, 210, 123, m.notice.length > 33 ? 12 : 16, '#f9e8ae', 'center');
    }
  }
}
