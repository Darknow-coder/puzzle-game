// Victory card: a 1080×1350 picture of the finished board (with the constellation
// of the path), framed on the world's sky, to share or keep.
import * as A from './game/art.js';

const STAR = (g, x, y, r, on) => {
  if (on) A.glow(g, x, y, r * 2.4, 'rgba(255,200,90,', 0.55);
  g.fillStyle = on ? '#ffd45e' : 'rgba(255,255,255,0.22)';
  A.star(g, x, y, r, 5, 0.45);
  if (on) {
    g.strokeStyle = '#c7811d';
    g.lineWidth = r * 0.08;
    g.stroke();
  }
};

/**
 * crop: {canvas, x, y, w, h} region of the game view (device pixels)
 * label: level line, stars: 0..3, line: text under the stars, footer: small text (address)
 */
export function makeShareCard({ crop, worldKey, label, stars, line, footer }) {
  const W = 1080;
  const H = 1350;
  const cv = A.makeCanvas(W, H);
  const g = cv.getContext('2d');
  g.drawImage(A.renderSky(W, H, worldKey), 0, 0);
  A.drawStars(g, A.makeStars(150, 31), W, H, 1.7, 1, 2.2);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  // Title.
  g.font = '700 112px Fredoka, sans-serif';
  g.fillStyle = '#fff4d6';
  g.shadowColor = 'rgba(255,170,70,0.85)';
  g.shadowBlur = 36;
  g.fillText('Lumignons', W / 2, 150);
  g.shadowBlur = 0;
  g.font = '500 44px Fredoka, sans-serif';
  g.fillStyle = '#efe6ff';
  g.fillText(label, W / 2, 222, W - 120);
  // The board, as a framed snapshot.
  const box = { w: 940, h: 760 };
  const k = Math.min(box.w / crop.w, box.h / crop.h);
  const bw = crop.w * k;
  const bh = crop.h * k;
  const bx = (W - bw) / 2;
  const by = 270 + (box.h - bh) / 2;
  g.save();
  g.shadowColor = 'rgba(10,4,30,0.55)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 14;
  g.fillStyle = 'rgba(255,248,234,0.95)';
  g.beginPath();
  A.roundRect(g, bx - 14, by - 14, bw + 28, bh + 28, 38);
  g.fill();
  g.restore();
  g.save();
  g.beginPath();
  A.roundRect(g, bx, by, bw, bh, 28);
  g.clip();
  g.drawImage(crop.canvas, crop.x, crop.y, crop.w, crop.h, bx, by, bw, bh);
  g.restore();
  // Stars and result.
  const sy = 1145;
  [-1, 0, 1].forEach((d, i) => STAR(g, W / 2 + d * 130, sy - (d === 0 ? 14 : 0), d === 0 ? 62 : 52, i < stars));
  g.font = '600 46px Fredoka, sans-serif';
  g.fillStyle = '#fff4d6';
  if (line) g.fillText(line, W / 2, 1258, W - 120);
  if (footer) {
    g.font = '500 30px Fredoka, sans-serif';
    g.fillStyle = 'rgba(239,230,255,0.75)';
    g.fillText(footer, W / 2, 1316, W - 120);
  }
  return cv;
}

/** Shares a picture with the system sheet when possible, else downloads it. */
export async function shareImage(canvas, text, filename) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'failed';
  const file = typeof File === 'function' ? new File([blob], filename, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
