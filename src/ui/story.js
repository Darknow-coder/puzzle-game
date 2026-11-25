// Story chapters: a few illustrated pages, drawn live on a canvas (sky, island,
// Lumignons, comets) so they need no image and stay animated.
import * as A from '../game/art.js';

export const STORIES = {
  comets: {
    title: { fr: 'Chapitre 8 · Le ciel éteint', en: 'Chapter 8 · The dark sky' },
    pages: [
      {
        scene: 'sleep',
        text: {
          fr: 'L’aube s’est levée sur l’île de cristal. Fatigués et heureux, les Lumignons se sont endormis dans leurs lanternes…',
          en: 'Dawn has broken over the crystal island. Tired and happy, the Lumignons fell asleep in their lanterns…',
        },
      },
      {
        scene: 'dark',
        text: {
          fr: '…mais le soir suivant, Pip ouvre les yeux et pousse un cri : le ciel est tout noir. Plus une seule étoile !',
          en: '…but the next evening, Pip opens his eyes and cries out: the sky is pitch black. Not a single star left!',
        },
      },
      {
        scene: 'fallen',
        text: {
          fr: 'Les étoiles sont tombées tout là-haut, dans le Jardin des Comètes. Une comète ne guide qu’un seul pas… puis elle remonte briller dans le ciel.',
          en: 'The stars have fallen up there, into the Comet Garden. A comet guides a single step… then it flies back up to shine in the sky.',
        },
      },
      {
        scene: 'quest',
        text: {
          fr: 'Gardien des chemins, aide Pip, Nim, Lou et Bo à renvoyer chaque étoile à sa place !',
          en: 'Keeper of the paths, help Pip, Nim, Lou and Bo send every star back where it belongs!',
        },
      },
    ],
  },
  epilogue: {
    title: { fr: 'Épilogue · Mille étoiles', en: 'Epilogue · A thousand stars' },
    pages: [
      {
        scene: 'return',
        text: {
          fr: 'La dernière comète s’envole… et d’un coup, le ciel s’illumine de mille étoiles.',
          en: 'The last comet flies away… and all at once the sky lights up with a thousand stars.',
        },
      },
      {
        scene: 'constellation',
        text: {
          fr: 'Tout en haut, une nouvelle constellation est apparue : quatre petites flammes qui se tiennent la main.',
          en: 'High above, a new constellation has appeared: four little flames holding hands.',
        },
      },
      {
        scene: 'thanks',
        text: {
          fr: 'Merci, gardien des chemins. Chaque nuit, en levant les yeux, les Lumignons penseront à toi.',
          en: 'Thank you, keeper of the paths. Every night, looking up, the Lumignons will think of you.',
        },
      },
    ],
  },
};

const W = 300;
const H = 190;
const STARS = A.makeStars(140, 31);

/** Ground: a strip of floating island across the bottom of the picture. */
function island(g, style, y) {
  const st = A.WORLD_STYLES[style];
  g.fillStyle = st.side[1];
  g.beginPath();
  g.moveTo(-10, y);
  g.lineTo(W + 10, y);
  g.lineTo(W + 10, y + 26);
  g.quadraticCurveTo(W * 0.5, y + 44, -10, y + 26);
  g.closePath();
  g.fill();
  g.fillStyle = st.side[0];
  g.fillRect(-10, y, W + 20, 9);
  g.fillStyle = st.grass[0];
  g.beginPath();
  g.moveTo(-10, y + 2);
  g.quadraticCurveTo(W * 0.5, y - 12, W + 10, y + 2);
  g.lineTo(W + 10, y + 4);
  g.lineTo(-10, y + 4);
  g.closePath();
  g.fill();
  g.fillRect(-10, y - 2, W + 20, 6);
  g.strokeStyle = st.grassEdge;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-10, y);
  g.quadraticCurveTo(W * 0.5, y - 14, W + 10, y);
  g.stroke();
}

function plainSky(g, top, bottom) {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

const skyCache = new Map();
function worldSky(g, key) {
  let c = skyCache.get(key);
  if (!c) skyCache.set(key, (c = A.renderSky(W * 2, H * 2, key)));
  g.drawImage(c, 0, 0, W, H);
}

/** Four little star-flames joined by lines: the Lumignons' constellation. */
function constellation(g, cx, cy, r, t, k = 1) {
  const pts = [
    [-1.5, 0.35],
    [-0.5, -0.15],
    [0.5, -0.15],
    [1.5, 0.35],
  ].map(([x, y], i) => [cx + x * r, cy + y * r + Math.sin(t * 1.3 + i) * 1.5]);
  g.save();
  g.globalAlpha = k;
  g.strokeStyle = 'rgba(255,226,150,0.6)';
  g.lineWidth = 1.4;
  g.setLineDash([3, 4]);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.setLineDash([]);
  pts.forEach(([x, y], i) => {
    A.glow(g, x, y, 16, A.LUMI[i].glow, 0.9);
    g.fillStyle = A.LUMI[i].core;
    A.star(g, x, y, 5.5, 5, 0.45);
  });
  g.restore();
}

/** One of the islands' props (the same drawings as in the levels). */
function prop(g, kind, world, x, y, size, v = 1) {
  const spr = A.propSprite(kind, size, world, v, 2);
  g.drawImage(spr.canvas, x - spr.ax, y - spr.ay, spr.w, spr.h);
}

const SCENES = {
  sleep(g, t) {
    worldSky(g, 'dawn');
    island(g, 'dawn', 138);
    prop(g, 'prism', 'dawn', 16, 146, 34, 1);
    prop(g, 'prism', 'dawn', 286, 144, 30, 2);
    [44, 114, 186, 256].forEach((x, i) => {
      A.drawLantern(g, x - 8, 140, 50, i, { lit: 0.35, t });
      A.drawLumi(g, x + 18, 152, 38, { color: i, dir: 2, t: t + i, mood: 'sleep' });
    });
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = 'bold 13px Fredoka, sans-serif';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.4 + i / 3) % 1;
      g.globalAlpha = 1 - k;
      g.fillText('z', 140 + i * 5 + k * 12, 104 - k * 30);
    }
    g.globalAlpha = 1;
  },
  dark(g, t) {
    plainSky(g, '#040310', '#1b1636');
    // An empty sky: only a few specks where stars used to be.
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 20; i++) g.fillRect(STARS[i].x * W, STARS[i].y * H, 1, 1);
    island(g, 'comets', 140);
    prop(g, 'rock', 'gloom', 18, 148, 30);
    prop(g, 'rock', 'gloom', 284, 146, 26, 2);
    A.drawLantern(g, 52, 142, 50, 1, { lit: 0.2, t });
    A.drawLantern(g, 248, 142, 50, 2, { lit: 0.2, t });
    A.drawLumi(g, 150, 156, 60, { color: 0, dir: 0, t, mood: 'scared' });
    A.drawLumi(g, 88, 156, 40, { color: 1, dir: 2, t: t + 1, mood: 'sleep' });
    A.drawLumi(g, 212, 156, 40, { color: 2, dir: 2, t: t + 2, mood: 'sleep' });
    g.fillStyle = '#fff4d6';
    g.font = 'bold 26px Fredoka, sans-serif';
    g.textAlign = 'center';
    g.fillText('?!', 186, 70 + Math.sin(t * 6) * 2);
    g.textAlign = 'left';
  },
  fallen(g, t) {
    worldSky(g, 'comets');
    island(g, 'comets', 128);
    prop(g, 'crystal', 'comets', 282, 132, 34);
    [[34, 140, 1], [92, 156, 2], [250, 140, 3], [204, 160, 0]].forEach(([x, y, d], i) => A.drawComet(g, x, y, 50, d, { t: t + i }));
    // One comet keeps flying back up to the sky.
    const k = (t * 0.35) % 1;
    A.drawComet(g, 160, 138 - k * 10, 54, 0, { t, fly: k });
    A.drawLumi(g, 130, 170, 44, { color: 3, dir: 1, t, mood: 'happy' });
  },
  quest(g, t) {
    worldSky(g, 'comets');
    const n = Math.floor(40 * (0.5 + 0.5 * Math.sin(t * 0.5)));
    A.drawStars(g, STARS.slice(0, n), W, H * 0.8, t);
    island(g, 'comets', 134);
    prop(g, 'telescope', 'comets', 16, 140, 36);
    prop(g, 'starrock', 'comets', 290, 140, 30);
    A.drawComet(g, 150, 142, 56, 0, { t });
    [46, 96, 204, 254].forEach((x, i) => A.drawLumi(g, x, 166, 46, { color: i, dir: i < 2 ? 1 : 3, t: t + i, mood: 'happy' }));
  },
  return(g, t) {
    plainSky(g, '#06051c', '#2a2370');
    const lit = Math.min(1, (t % 6) / 4);
    A.drawStars(g, STARS, W, H, t, lit);
    island(g, 'comets', 140);
    // Stars rising from the island, each with its golden tail, fading as they climb.
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.3 + i / 5) % 1;
      const x = 32 + i * 59 + Math.sin(k * 3 + i) * 6;
      const y = 140 - k * 120;
      const a = Math.min(1, k * 6) * (1 - k * 0.7);
      const tail = g.createLinearGradient(x, y, x, y + 34);
      tail.addColorStop(0, `rgba(255,236,160,${0.8 * a})`);
      tail.addColorStop(1, 'rgba(160,190,255,0)');
      g.fillStyle = tail;
      g.beginPath();
      g.moveTo(x - 4, y);
      g.quadraticCurveTo(x - 2, y + 22, x, y + 34);
      g.quadraticCurveTo(x + 2, y + 22, x + 4, y);
      g.closePath();
      g.fill();
      A.glow(g, x, y, 16, 'rgba(255,225,140,', 0.8 * a);
      g.globalAlpha = a;
      g.fillStyle = '#ffe9a0';
      A.star(g, x, y, 6, 5, 0.46);
      g.globalAlpha = 1;
    }
    [110, 190].forEach((x, i) => A.drawLumi(g, x, 170, 46, { color: i, dir: 0, t: t + i, mood: 'happy' }));
  },
  constellation(g, t) {
    plainSky(g, '#05041a', '#231c5c');
    A.drawStars(g, STARS, W, H, t);
    constellation(g, 150, 52, 46, t);
    island(g, 'comets', 146);
    [72, 122, 178, 228].forEach((x, i) => A.drawLumi(g, x, 172, 40, { color: i, dir: 0, t: t + i, mood: 'happy' }));
  },
  thanks(g, t) {
    plainSky(g, '#070622', '#3a2f7d');
    A.drawStars(g, STARS, W, H, t);
    constellation(g, 222, 38, 26, t, 0.8);
    island(g, 'meadow', 136);
    prop(g, 'flowers', 'meadow', 8, 144, 26, 1);
    prop(g, 'flowers', 'meadow', 294, 142, 24, 2);
    [40, 112, 186, 258].forEach((x, i) => {
      A.drawLantern(g, x - 14, 138, 44, i, { lit: 1, t });
      A.drawLumi(g, x + 12, 156, 42, { color: i, dir: 2, t: t + i * 0.7, mood: 'happy' });
    });
  },
};

export function createStory({ el, openModal, tr, getLang, click, sound }) {
  const seenKey = (id) => 'story-' + id;

  /** Opens a chapter; `onEnd` runs when it is closed. */
  function open(id, onEnd) {
    const story = STORIES[id];
    if (!story) return onEnd?.();
    let page = 0;
    let raf = 0;
    const box = el('div', 'story');
    box.innerHTML = `<div class="eyebrow">${tr(story.title)}</div>
      <canvas class="story-art" width="${W * 2}" height="${H * 2}"></canvas>
      <p class="story-text"></p>
      <div class="story-dots">${story.pages.map(() => '<i></i>').join('')}</div>
      <div class="actions"><button class="btn btn-ghost btn-small" data-a="skip"></button><button class="btn btn-primary" data-a="next"></button></div>`;
    const cv = box.querySelector('.story-art');
    const fr = getLang() === 'fr';
    const show = () => {
      const p = story.pages[page];
      const txt = box.querySelector('.story-text');
      txt.textContent = tr(p.text);
      txt.classList.remove('in');
      void txt.offsetWidth;
      txt.classList.add('in');
      box.querySelectorAll('.story-dots i').forEach((d, i) => d.classList.toggle('on', i === page));
      const last = page === story.pages.length - 1;
      box.querySelector('[data-a=next]').textContent = last ? (fr ? (id === 'epilogue' ? 'Fin' : 'C’est parti !') : id === 'epilogue' ? 'The end' : 'Let’s go!') : fr ? 'Suivant' : 'Next';
      box.querySelector('[data-a=skip]').textContent = fr ? 'Passer' : 'Skip';
      box.querySelector('[data-a=skip]').style.visibility = last ? 'hidden' : '';
    };
    const t0 = performance.now();
    const frame = (now) => {
      if (!cv.isConnected && now - t0 > 1000) return;
      const g = cv.getContext('2d');
      if (g) {
        g.setTransform(2, 0, 0, 2, 0, 0);
        g.globalAlpha = 1;
        g.clearRect(0, 0, W, H);
        SCENES[story.pages[page].scene](g, (now - t0) / 1000);
      }
      raf = requestAnimationFrame(frame);
    };
    const m = openModal(box, {
      cls: 'story-modal',
      onClose: () => {
        cancelAnimationFrame(raf);
        onEnd?.();
      },
    });
    box.querySelector('[data-a=next]').onclick = () => {
      click();
      if (page < story.pages.length - 1) {
        page++;
        sound?.sfx('select');
        show();
      } else m.close();
    };
    box.querySelector('[data-a=skip]').onclick = () => (click(), m.close());
    show();
    raf = requestAnimationFrame(frame);
    return m;
  }

  return { open, seenKey };
}
