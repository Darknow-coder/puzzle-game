// Lightweight particle system for sparkles, puffs and splashes.
import { glow, TAU, star } from './art.js';

export class Particles {
  constructor() {
    this.list = [];
  }
  clear() {
    this.list.length = 0;
  }
  emit(type, x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? TAU) : Math.random() * TAU;
      const sp = (opts.speed ?? 60) * (0.4 + Math.random() * 0.8);
      this.list.push({
        type,
        x: x + (Math.random() - 0.5) * (opts.jitter ?? 0),
        y: y + (Math.random() - 0.5) * (opts.jitter ?? 0),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + (opts.vy ?? 0),
        g: opts.gravity ?? 0,
        life: 0,
        max: (opts.life ?? 0.8) * (0.7 + Math.random() * 0.6),
        size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8),
        color: opts.color || 'rgba(255,230,150,',
        fill: opts.fill || '#fff6c2',
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }
  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life += dt;
      if (p.life >= p.max) {
        l.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= 1 - 1.5 * dt;
      p.vy *= 1 - 1.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  draw(g) {
    for (const p of this.list) {
      const k = p.life / p.max;
      const a = 1 - k;
      switch (p.type) {
        case 'spark':
          glow(g, p.x, p.y, p.size * 3, p.color, a);
          break;
        case 'star':
          g.save();
          g.globalAlpha = a;
          g.fillStyle = p.fill;
          g.translate(p.x, p.y);
          g.rotate(p.spin * p.life);
          star(g, 0, 0, p.size * (1 - k * 0.5), 4, 0.4);
          g.restore();
          glow(g, p.x, p.y, p.size * 2.5, p.color, a * 0.6);
          break;
        case 'puff':
          g.globalAlpha = a * 0.6;
          g.fillStyle = p.fill;
          g.beginPath();
          g.arc(p.x, p.y, p.size * (0.6 + k * 1.4), 0, TAU);
          g.fill();
          g.globalAlpha = 1;
          break;
        case 'drop':
          g.globalAlpha = a;
          g.fillStyle = p.fill;
          g.beginPath();
          g.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, TAU);
          g.fill();
          g.globalAlpha = 1;
          break;
        default:
          break;
      }
    }
  }
}
