// Lightweight particle system: sparkles, puffs and splashes, plus the victory
// celebrations sold in the shop (confetti, balloons, butterflies, fireworks,
// shooting stars).
import { glow, TAU, star, ellipse } from './art.js';

const CONFETTI = ['#ff6fa8', '#ffd24a', '#6cc8ff', '#7eebb0', '#c58bff', '#ff9a4a'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Particles {
  constructor() {
    this.list = [];
  }
  clear() {
    this.list.length = 0;
  }
  push(p) {
    this.list.push({ vx: 0, vy: 0, g: 0, life: 0, max: 1, size: 4, color: 'rgba(255,230,150,', fill: '#fff6c2', spin: 0, drag: 1.5, delay: 0, ...p });
  }
  emit(type, x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? TAU) : Math.random() * TAU;
      const sp = (opts.speed ?? 60) * (0.4 + Math.random() * 0.8);
      this.push({
        type,
        x: x + (Math.random() - 0.5) * (opts.jitter ?? 0),
        y: y + (Math.random() - 0.5) * (opts.jitter ?? 0),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + (opts.vy ?? 0),
        g: opts.gravity ?? 0,
        max: (opts.life ?? 0.8) * (0.7 + Math.random() * 0.6),
        size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8),
        color: opts.color || 'rgba(255,230,150,',
        fill: opts.fill === 'random' ? pick(CONFETTI) : opts.fill || '#fff6c2',
        spin: (Math.random() - 0.5) * 6,
        drag: opts.drag ?? 1.5,
        delay: opts.delay ? Math.random() * opts.delay : 0,
      });
    }
  }

  /**
   * A victory celebration over the whole view (w×h), from the cells where the
   * Lumignons arrived (points). 'classic' adds nothing to the usual sparkles.
   */
  party(style, w, h, points, S = 50) {
    const from = points.length ? points : [[w / 2, h / 2]];
    switch (style) {
      case 'confetti':
        for (let i = 0; i < 110; i++) {
          this.push({ type: 'confetti', x: Math.random() * w, y: -20 - Math.random() * h * 0.25, vx: (Math.random() - 0.5) * 60, vy: 70 + Math.random() * 90, g: 40, drag: 0.6, max: 3.2 + Math.random() * 1.2, size: S * (0.09 + Math.random() * 0.06), fill: pick(CONFETTI), spin: (Math.random() - 0.5) * 12, delay: Math.random() * 0.7 });
        }
        for (const [x, y] of from) this.emit('confetti', x, y, 24, { speed: 260, life: 2.2, size: S * 0.11, gravity: 260, vy: -160, drag: 0.8, fill: 'random' });
        break;
      case 'balloons':
        for (let i = 0; i < 14; i++) {
          this.push({ type: 'balloon', x: w * (0.08 + Math.random() * 0.84), y: h + 40 + Math.random() * 80, vx: (Math.random() - 0.5) * 20, vy: -(70 + Math.random() * 60), g: 0, drag: 0, max: 5.5, size: S * (0.28 + Math.random() * 0.12), fill: pick(CONFETTI), spin: Math.random() * TAU, delay: Math.random() * 1.2 });
        }
        break;
      case 'butterflies':
        for (const [x, y] of from) {
          for (let i = 0; i < 5; i++) {
            this.push({ type: 'butterfly', x, y, vx: (Math.random() - 0.5) * 90, vy: -(50 + Math.random() * 60), g: 0, drag: 0.2, max: 3.6 + Math.random(), size: S * (0.26 + Math.random() * 0.1), fill: pick(CONFETTI), spin: Math.random() * TAU, delay: Math.random() * 0.8 });
          }
        }
        break;
      case 'fireworks':
        for (let i = 0; i < 7; i++) {
          const x = w * (0.15 + Math.random() * 0.7);
          const peak = h * (0.12 + Math.random() * 0.3);
          const vy = -Math.sqrt(2 * 520 * (h - peak));
          this.push({ type: 'rocket', x, y: h + 10, vx: (Math.random() - 0.5) * 40, vy, g: 520, drag: 0, max: -vy / 520, size: S * 0.06, color: pick(['rgba(255,120,170,', 'rgba(255,215,90,', 'rgba(110,200,255,', 'rgba(126,235,176,', 'rgba(197,139,255,']), delay: i * 0.16 + Math.random() * 0.1, burst: true });
        }
        break;
      case 'starfall':
        for (let i = 0; i < 12; i++) {
          this.push({ type: 'shooting', x: -60 + Math.random() * w * 0.7, y: Math.random() * h * 0.45, vx: 420 + Math.random() * 240, vy: 140 + Math.random() * 90, g: 0, drag: 0, max: 1.1 + Math.random() * 0.5, size: S * 0.07, delay: Math.random() * 2.2 });
        }
        for (const [x, y] of from) this.emit('star', x, y, 14, { speed: 160, life: 1.4, size: S * 0.08, color: 'rgba(255,240,180,' });
        break;
      default:
        break;
    }
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.life += dt;
      if (p.life >= p.max) {
        l.splice(i, 1);
        if (p.burst) this.emit('spark', p.x, p.y, 34, { speed: 230, life: 1.3, size: 2.6, color: p.color, gravity: 90, drag: 1.2 });
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(g) {
    for (const p of this.list) {
      if (p.delay > 0) continue;
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
        case 'confetti': {
          // A paper rectangle tumbling down.
          g.save();
          g.globalAlpha = Math.min(1, a * 3);
          g.translate(p.x + Math.sin(p.life * 5 + p.spin) * 6, p.y);
          g.rotate(p.spin * p.life);
          g.scale(Math.cos(p.life * 9 + p.spin), 1);
          g.fillStyle = p.fill;
          g.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
          g.restore();
          break;
        }
        case 'balloon': {
          const x = p.x + Math.sin(p.life * 1.6 + p.spin) * 10;
          g.save();
          g.globalAlpha = Math.min(1, a * 4);
          g.strokeStyle = 'rgba(255,255,255,0.55)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x, p.y + p.size * 0.6);
          g.quadraticCurveTo(x + Math.sin(p.life * 3) * 6, p.y + p.size * 1.3, x - 3, p.y + p.size * 1.9);
          g.stroke();
          g.fillStyle = p.fill;
          ellipse(g, x, p.y, p.size * 0.5, p.size * 0.6);
          g.fill();
          g.beginPath();
          g.moveTo(x - p.size * 0.08, p.y + p.size * 0.62);
          g.lineTo(x + p.size * 0.08, p.y + p.size * 0.62);
          g.lineTo(x, p.y + p.size * 0.52);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.55)';
          ellipse(g, x - p.size * 0.18, p.y - p.size * 0.22, p.size * 0.1, p.size * 0.16);
          g.fill();
          g.restore();
          break;
        }
        case 'butterfly': {
          const x = p.x + Math.sin(p.life * 2.4 + p.spin) * 18;
          const flap = Math.abs(Math.sin(p.life * 14 + p.spin));
          g.save();
          g.globalAlpha = Math.min(1, a * 3);
          g.translate(x, p.y);
          g.rotate(Math.sin(p.life * 2 + p.spin) * 0.35);
          for (const sg of [-1, 1]) {
            g.save();
            g.scale(sg * (0.25 + 0.75 * flap), 1);
            g.fillStyle = p.fill;
            ellipse(g, p.size * 0.45, -p.size * 0.2, p.size * 0.45, p.size * 0.35);
            g.fill();
            ellipse(g, p.size * 0.35, p.size * 0.25, p.size * 0.3, p.size * 0.25);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,0.5)';
            ellipse(g, p.size * 0.5, -p.size * 0.25, p.size * 0.12, p.size * 0.1);
            g.fill();
            g.restore();
          }
          g.fillStyle = '#3a2a4a';
          ellipse(g, 0, 0, p.size * 0.08, p.size * 0.35);
          g.fill();
          g.restore();
          glow(g, x, p.y, p.size * 1.4, 'rgba(255,240,200,', a * 0.25);
          break;
        }
        case 'rocket':
          glow(g, p.x, p.y, p.size * 4, p.color, 0.9);
          g.strokeStyle = 'rgba(255,240,200,0.6)';
          g.lineWidth = p.size * 0.6;
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
          g.stroke();
          break;
        case 'shooting': {
          const len = 0.12;
          const grd = g.createLinearGradient(p.x, p.y, p.x - p.vx * len, p.y - p.vy * len);
          grd.addColorStop(0, `rgba(255,250,220,${a})`);
          grd.addColorStop(1, 'rgba(255,250,220,0)');
          g.strokeStyle = grd;
          g.lineWidth = p.size;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x - p.vx * len, p.y - p.vy * len);
          g.stroke();
          glow(g, p.x, p.y, p.size * 5, 'rgba(255,240,180,', a);
          break;
        }
        default:
          break;
      }
    }
  }
}
