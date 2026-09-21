// Independently authored mechanics and river layouts; no cartridge data or ROM assets.
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const knots = [[0,80,112],[110,76,108],[220,94,100],[320,99,108],[440,86,120],[550,60,98],[660,67,98],[740,80,94],[800,80,54],[840,80,112]];
export function riverAt(z) {
  z = Math.max(0, z);
  const section = Math.floor(z / 840), local = z % 840;
  let a = knots[0], b = knots[1];
  for (let i = 1; i < knots.length; i++) if (local <= knots[i][0]) { a = knots[i - 1]; b = knots[i]; break; }
  const t = (local - a[0]) / (b[0] - a[0]);
  let center = lerp(a[1], b[1], t), width = lerp(a[2], b[2], t);
  if (section % 2) center = 160 - center;
  width -= Math.min(section, 8) * 1.5;
  const island = local > 292 && local < 410 ? Math.sin((local - 292) / 118 * Math.PI) * (12 + Math.min(section, 5)) : 0;
  return { left: center - width / 2, right: center + width / 2, center, island };
}
export class RiverRaid {
  constructor() {
    Object.assign(this, { x:80, distance:35, speed:35, fuel:100, lives:3, score:0, bridges:0, checkpoint:35, time:0, dead:0, done:false, won:false, extra:10000, bullet:null, cooldown:0, refill:false });
    this.objects = []; this.sections = new Set(); this.events = []; this.particles = []; this.populate();
  }
  populate() {
    const from = Math.floor(this.distance / 840), to = Math.floor((this.distance + 230) / 840);
    for (let n = from; n <= to; n++) {
      if (this.sections.has(n)) continue;
      this.sections.add(n);
      const definitions = [[125,'ship',-.45],[185,'fuel',.25],[262,'helicopter',-.38],[345,'ship',.64],[444,'fuel',-.3],[525,'helicopter',.35],[607,'jet',-.4],[692,'fuel',.23],[745,'ship',-.12],[840,'bridge',0]];
      for (const [offset,type,lane] of definitions) {
        const z = n * 840 + offset, bank = riverAt(z);
        this.objects.push({ z, type, x:bank.center + lane * (bank.right - bank.left) * .36, dir:n % 2 ? -1 : 1, removed:false, id:n * 10 + this.objects.length, w:type === 'bridge' ? 26 : type === 'ship' ? 14 : type === 'fuel' ? 12 : 12, h:type === 'fuel' ? 30 : type === 'bridge' ? 8 : 9 });
      }
    }
    this.objects = this.objects.filter(o => o.z > this.distance - 60);
  }
  addScore(value) {
    this.score += value;
    while (this.score >= this.extra) { this.lives++; this.extra += 10000; this.events.push('extra'); }
  }
  crash(reason) {
    if (this.dead || this.done) return;
    this.lives--; this.dead = 1.15; this.reason = reason; this.events.push('hit'); this.bullet = null;
  }
  step(dt, input = {}) {
    this.events = [];
    if (this.done) return;
    this.time += dt;
    if (this.dead > 0) {
      this.dead = Math.max(0,this.dead-dt);
      if (this.dead <= 0) {
        if (!this.lives) { this.done = true; this.message = this.reason; return; }
        this.distance = this.checkpoint; this.x = riverAt(this.distance).center; this.fuel = 100; this.speed = 35;
        this.sections.clear(); this.objects = []; this.populate();
      }
      return;
    }
    const steer = Number(!!input.right) - Number(!!input.left);
    this.speed += ((input.up ? 61 : input.down ? 18 : 35) - this.speed) * Math.min(1, dt * 4);
    this.x = clamp(this.x + steer * 65 * dt, 3, 157);
    this.distance += this.speed * dt;
    this.fuel = Math.max(0, this.fuel - 3.2 * dt); this.refill = false;
    this.populate();
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (input.action && !this.bullet && !this.cooldown) { this.bullet = { x:this.x, z:this.distance + 9 }; this.cooldown = .16; this.events.push('shoot'); }
    if (this.bullet) {
      this.bullet.z += 235 * dt; this.bullet.x += steer * 48 * dt;
      if (this.bullet.z > this.distance + 150) this.bullet = null;
    }
    for (const o of this.objects) {
      if (o.removed) continue;
      if ((o.type === 'helicopter' || o.type === 'jet') && o.z - this.distance < 112) {
        const bank = riverAt(o.z), v = o.type === 'jet' ? 46 : 15 + Math.min(14, this.bridges * 2);
        o.x += o.dir * v * dt;
        if (o.x < bank.left + 10 || o.x > bank.right - 10) { o.dir *= -1; o.x = clamp(o.x, bank.left + 10, bank.right - 10); }
      }
      if (this.bullet && Math.abs(this.bullet.x - o.x) < o.w / 2 + 1 && Math.abs(this.bullet.z - o.z) < o.h / 2 + 3) {
        o.removed = true; this.bullet = null; this.events.push('destroy');
        this.addScore({ship:30,helicopter:60,fuel:80,jet:100,bridge:500}[o.type]);
        this.particles.push({x:o.x,z:o.z,until:this.time + .35});
        if (o.type === 'bridge') { this.checkpoint = o.z + 28; this.bridges++; this.events.push('bridge'); }
        continue;
      }
      if (o.type === 'fuel') {
        if (Math.abs(o.z - this.distance) < o.h / 2 + 3 && Math.abs(o.x - this.x) < 8) {
          this.fuel = Math.min(100, this.fuel + 72 * dt); this.refill = true;
        }
      } else if (Math.abs(o.z - this.distance) < o.h / 2 + 5 && (o.type === 'bridge' || Math.abs(o.x - this.x) < o.w / 2 + 3)) this.crash('Your jet hit ' + (o.type === 'bridge' ? 'a bridge. Shoot its center before crossing.' : 'an enemy.'));
    }
    const bank = riverAt(this.distance);
    if (this.x - 3 < bank.left || this.x + 3 > bank.right || (bank.island > 2 && Math.abs(this.x - bank.center) < bank.island + 3)) this.crash('Your jet hit the riverbank.');
    if (this.fuel <= 0) this.crash('Out of fuel. Slow down over a fuel depot without shooting it.');
    this.particles = this.particles.filter(p => p.until > this.time);
  }
}
