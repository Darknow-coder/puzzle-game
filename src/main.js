// Lumignons — application shell: screens, menus, HUD and the render loop.
import { WORLDS } from './data/levels.js';
import { SOLUTIONS } from './data/solutions.js';
import { NOTEBOOK, HATS_INFO, ACHIEVEMENTS } from './data/meta.js';
import * as SV from './save.js';
import { t, tr, setLang, detectLang, getLang } from './i18n.js';
import { sound } from './audio.js';
import { GameScene } from './game/scene.js';
import { TitleScene, MapBackdrop } from './ui/backdrops.js';
import * as A from './game/art.js';
import { parseLevel, rateRun, KIND, PIECE_KINDS } from './engine/core.js';
import { EditorScene } from './editor/editor-scene.js';
import { createAtelier } from './editor/ui.js';
import { verifyAsync } from './editor/verify.js';
import { THEMES } from './editor/model.js';
import { dailyFor, recordDaily, liveStreak, dayKey } from './daily.js';

const VERSION = '2.0.0';
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z"/></svg>';
const ICONS = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  hat: '<svg viewBox="0 0 24 24"><path d="M4 17h16M7 17l2-9 3 3 3-3 2 9"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M8 5v14l11-7z"/></svg>',
  shoot: '<svg viewBox="0 0 24 24"><path d="M14 10 4 20M17 4l1.2 2.6L21 7.5l-2 2 .4 2.8-2.4-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z"/></svg>',
  slow: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-.8 1.6-1.6 0-1.3-1-1.6-1-2.6 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/></svg>',
  resize: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M14 4v16M4 14h16"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>',
};

// ---------------------------------------------------------------------------
// App

const app = {
  t,
  tr,
  notebook: NOTEBOOK,
  screen: null,
  modalStack: [],
  settings: () => SV.save.data.settings,
  hat: () => SV.save.data.hat || 'none',
  progressGlow: () => {
    const s = SV.summary();
    return Math.min(1, s.stars / Math.max(1, s.totalLevels * 3));
  },
};
window.lumignons = app; // handy for debugging and automated tests

const canvas = $('#view');
const ctx = canvas.getContext('2d');
const title = new TitleScene(app);
const mapBg = new MapBackdrop();
const game = new GameScene(app);
const editorScene = new EditorScene(app);
let active = title;
let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  title.resize(W, H, DPR);
  mapBg.resize(W, H, DPR);
  if (game.L) layoutGame();
  if (app.screen === 'editor') layoutEditor();
}

function layoutEditor() {
  const top = $('#screen-editor .hud-top').getBoundingClientRect().bottom;
  const panel = $('#screen-editor .hud-bottom').getBoundingClientRect();
  const side = panel.left > W * 0.5 && panel.height > H * 0.4;
  if (side) editorScene.resize(W, H, DPR, top + 6, 10, W - panel.left + 8);
  else editorScene.resize(W, H, DPR, top + 6, H - panel.top + 4, 0);
}

function layoutGame() {
  const top = $('#screen-game .hud-top').getBoundingClientRect().bottom;
  const panel = $('#screen-game .hud-bottom').getBoundingClientRect();
  // The tool panel is either a bottom bar or (landscape) a right-hand column.
  const side = panel.left > W * 0.5 && panel.height > H * 0.4;
  if (side) game.resize(W, H, DPR, top + 6, 10, W - panel.left + 8);
  else game.resize(W, H, DPR, top + 6, H - panel.top + 4, 0);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  active.update(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // Scenes paint an opaque sky, but if its pixels were lost the previous frames
  // must not stay on screen.
  ctx.clearRect(0, 0, W, H);
  active.render(ctx);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Screens

// Android back button / browser back: walk back through the app instead of leaving it.
let navDepth = 0;
function pushNav(name) {
  try {
    history.pushState({ lumignons: name }, '');
    navDepth++;
  } catch {
    /* ignore */
  }
}
window.addEventListener('hashchange', () => {
  const shared = location.hash.match(/play=(LUMI1\.[A-Za-z0-9_-]+)/);
  if (shared) atelier.playShared(shared[1]);
});
window.addEventListener('popstate', () => {
  if (/play=LUMI1/.test(location.hash)) return; // handled by hashchange
  if (navDepth > 0) navDepth--;
  const top = app.modalStack[app.modalStack.length - 1];
  if (top) {
    if (top.onBack) {
      top.onBack();
      return;
    }
    top.close();
    pushNav(app.screen);
    return;
  }
  if (app.screen === 'game') {
    game.stop();
    hideFail();
    if (current?.custom) leaveCustom();
    else if (current?.daily) {
      buildTitle();
      showScreen('title');
    } else openMap(false, true);
  } else if (app.screen === 'map' || app.screen === 'atelier') {
    buildTitle();
    showScreen('title');
  } else if (app.screen === 'editor') {
    atelier.openList();
  }
});

function showScreen(name) {
  app.screen = name;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === 'screen-' + name);
  active = name === 'title' ? title : name === 'map' || name === 'atelier' ? mapBg : name === 'editor' ? editorScene : game;
  if (name !== 'game') hideInfo();
  if (name === 'atelier') mapBg.setWorld('meadow');
  sound.startMusic(name === 'game' ? game.worldKey : name === 'map' ? mapBg.key : name === 'editor' ? editorScene.model?.theme || 'meadow' : 'title');
}

function buildTitle() {
  const s = SV.summary();
  const root = $('#screen-title');
  const started = s.completed > 0;
  root.innerHTML = `
    <div class="logo"><h1>Lumignons</h1><p>${t('tagline')}</p></div>
    <div class="title-actions">
      <button class="btn btn-primary" data-act="play">${ICONS.play}${started ? t('continue') : t('play')}</button>
      <div class="title-duo">
        <button class="btn btn-ghost daily-btn" data-act="daily">${ICONS.sun}<span>${t('daily')}</span>${dailyBadge()}</button>
        <button class="btn btn-ghost" data-act="atelier">${ICONS.pencil}${t('atelier')}</button>
      </div>
      <div class="title-row">
        <button class="tile-btn" data-act="wardrobe">${ICONS.hat}<span>${t('collection')}</span></button>
        <button class="tile-btn" data-act="achievements">${ICONS.trophy}<span>${t('achievements')}</span></button>
        <button class="tile-btn" data-act="notebook">${ICONS.book}<span>${t('notebook')}</span></button>
        <button class="tile-btn" data-act="settings">${ICONS.gear}<span>${t('settings')}</span></button>
      </div>
      <div class="title-progress">${started ? `★ ${s.stars} / ${s.totalLevels * 3} · ${s.completed}/${s.totalLevels} ${t('level').toLowerCase()}s` : '&nbsp;'}</div>
      ${deferredInstall ? `<button class="install-btn" data-act="install">${t('install')}</button>` : ''}
    </div>`;
  root.querySelector('[data-act=play]').onclick = () => {
    click();
    openMap(true);
  };
  root.querySelector('[data-act=daily]').onclick = () => {
    click();
    if (!SV.isDone('1-5')) {
      sound.sfx('invalid');
      toast(t('dailyLocked'), 2800);
      return;
    }
    startDaily();
  };
  root.querySelector('[data-act=atelier]').onclick = () => {
    click();
    pushNav('atelier');
    atelier.openList();
  };
  root.querySelector('[data-act=wardrobe]').onclick = () => (click(), openWardrobe());
  root.querySelector('[data-act=achievements]').onclick = () => (click(), openAchievements());
  root.querySelector('[data-act=notebook]').onclick = () => (click(), openNotebook());
  root.querySelector('[data-act=settings]').onclick = () => (click(), openSettings());
  const ib = root.querySelector('[data-act=install]');
  if (ib) ib.onclick = () => installApp();
}

function click() {
  sound.unlock();
  sound.sfx('tap');
}

// ----------------------------------------------------------------------- map

const NODE_PATH = [
  [50, 6],
  [24, 15],
  [44, 25],
  [74, 32],
  [58, 43],
  [28, 50],
  [22, 62],
  [50, 69],
  [78, 77],
  [56, 87],
];

function openMap(scrollToCurrent = false, fromBack = false) {
  if (app.screen === 'title' && !fromBack) pushNav('map');
  buildMap();
  showScreen('map');
  if (scrollToCurrent) {
    const cur = document.querySelector('#screen-map .node.current') || document.querySelector('#screen-map .node.open');
    const sc = $('#screen-map .map-scroll');
    if (cur) {
      const r = cur.getBoundingClientRect();
      const top = sc.scrollTop + r.top - sc.getBoundingClientRect().top - sc.clientHeight / 2;
      sc.scrollTop = Math.max(0, top);
    }
  }
  updateMapSky();
}

function buildMap() {
  const root = $('#screen-map');
  const scroll = root.querySelector('.map-scroll');
  const prevScroll = scroll ? scroll.scrollTop : 0;
  const target = SV.continueTarget();
  root.innerHTML = `
    <div class="map-head">
      <button class="icon-btn" data-act="back" aria-label="${t('back')}">${ICONS.back}</button>
      <h2>${t('map')}</h2>
      <div class="star-total"><span class="st">★</span>${SV.totalStars()}</div>
    </div>
    <div class="map-scroll"></div>`;
  root.querySelector('[data-act=back]').onclick = () => {
    click();
    if (navDepth > 0) history.back();
    else {
      buildTitle();
      showScreen('title');
    }
  };
  const sc = root.querySelector('.map-scroll');
  WORLDS.forEach((w, wi) => {
    if (!w.levels.length) return;
    const unlocked = SV.worldUnlocked(wi);
    const sec = el('section', 'world' + (unlocked ? '' : ' locked'));
    sec.dataset.world = w.id;
    const reason = SV.worldLockReason(wi);
    const lockTxt = reason ? (reason.type === 'stars' ? t('starsNeeded', reason.n) : t('finishPrev')) : '';
    sec.innerHTML = `
      <div class="world-card">
        <div class="wnum">${t('world')} ${wi + 1}</div>
        <h3>${tr(w.name)}</h3>
        <p>${tr(w.blurb)}</p>
        <div class="world-meta">
          ${unlocked ? `<span><span class="st">★</span> ${SV.worldStars(w)} / ${(w.levels.length + 1) * 3}</span>` : `<span class="lock-note">${ICONS.lock}${lockTxt}</span>`}
        </div>
      </div>`;
    const con = el('div', 'constellation');
    // Alternate the constellation's orientation from one world to the next.
    const flip = wi % 2 === 1;
    const pts = NODE_PATH.map(([x, y]) => [flip ? 100 - x : x, y]);
    const bonusPt = [flip ? 20 : 80, 97];
    let svg = `<svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none">`;
    for (let i = 0; i < w.levels.length - 1; i++) {
      const done = SV.isDone(w.levels[i].id) && SV.isDone(w.levels[i + 1].id);
      svg += `<line class="${done ? 'done' : ''}" x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[i + 1][0]}" y2="${pts[i + 1][1]}" vector-effect="non-scaling-stroke"/>`;
    }
    svg += `<line x1="${pts[9][0]}" y1="${pts[9][1]}" x2="${bonusPt[0]}" y2="${bonusPt[1]}" vector-effect="non-scaling-stroke"/>`;
    svg += '</svg>';
    con.innerHTML = svg;
    w.levels.forEach((lv, li) => {
      const rec = SV.levelRecord(lv.id);
      const open = SV.levelUnlocked(wi, li);
      const done = !!rec?.done;
      const b = el('button', 'node' + (done ? '' : open ? ' open' : ' locked') + (lv.id === target ? ' current' : ''));
      b.style.left = pts[li][0] + '%';
      b.style.top = pts[li][1] + '%';
      b.setAttribute('aria-label', `${t('level')} ${wi + 1}-${li + 1}`);
      const st = rec?.stars || 0;
      b.innerHTML = open || done ? `${li + 1}<span class="stars">${[1, 2, 3].map((k) => `<span class="${st >= k ? 'on' : ''}">★</span>`).join('')}</span>` : ICONS.lock;
      if (open || done) b.onclick = () => (click(), startLevel(lv.id));
      else b.onclick = () => (sound.unlock(), sound.sfx('invalid'), toast(unlocked ? t('locked') : lockTxt));
      con.appendChild(b);
    });
    // Shooting-star bonus level.
    const bopen = SV.bonusUnlocked(wi);
    const brec = SV.levelRecord(w.bonus.id);
    const bb = el('button', 'node bonus' + (bopen ? '' : ' locked'));
    bb.style.left = bonusPt[0] + '%';
    bb.style.top = bonusPt[1] + '%';
    const bst = brec?.stars || 0;
    bb.innerHTML = `${ICONS.shoot}${bopen ? `<span class="stars">${[1, 2, 3].map((k) => `<span class="${bst >= k ? 'on' : ''}">★</span>`).join('')}</span>` : ''}`;
    bb.onclick = () => {
      sound.unlock();
      if (bopen) {
        sound.sfx('tap');
        startLevel(w.bonus.id);
      } else {
        sound.sfx('invalid');
        toast(t('bonusLocked'), 3000);
      }
    };
    con.appendChild(bb);
    sec.appendChild(con);
    sc.appendChild(sec);
  });
  const end = el('div', 'map-end', `Lumignons ${VERSION}`);
  sc.appendChild(end);
  sc.scrollTop = prevScroll;
  sc.addEventListener('scroll', updateMapSky, { passive: true });
}

function updateMapSky() {
  const sc = $('#screen-map .map-scroll');
  if (!sc) return;
  const mid = H * 0.5;
  let best = null;
  for (const sec of sc.querySelectorAll('.world')) {
    const r = sec.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) best = sec.dataset.world;
    else if (!best && r.top > mid) best = sec.dataset.world;
  }
  if (best && best !== mapBg.key) {
    mapBg.setWorld(best);
    if (app.screen === 'map') sound.startMusic(best);
  }
}

// ---------------------------------------------------------------------- game

let current = null;
let tipTimer = 0;

function levelLabel(f) {
  if (f.custom) return '✎';
  if (f.daily) return '☀';
  return f.bonus ? `${f.wi + 1}-★` : `${f.wi + 1}-${f.li + 1}`;
}

function dailyBadge() {
  if (!SV.isDone('1-5')) return `<i class="daily-lock">${ICONS.lock}</i>`;
  const st = SV.save.data.daily;
  const done = st?.results?.[dayKey()];
  const streak = liveStreak(st);
  return `${done ? `<i class="daily-done">${'★'.repeat(done)}</i>` : '<i class="daily-new"></i>'}${streak > 1 ? `<i class="daily-streak">🔥${streak}</i>` : ''}`;
}

/** Today's puzzle, drawn from the worlds already opened. */
function startDaily() {
  const themes = WORLDS.filter((w, i) => SV.worldUnlocked(i)).map((w) => w.id);
  const d = dailyFor(themes);
  if (!d) return;
  const wi = Math.max(0, THEMES.indexOf(d.theme));
  const world = WORLDS[wi] || { id: d.theme };
  current = { daily: d, def: d.def, world, wi, li: 0, bonus: false };
  closeAllModals();
  hideFail();
  game.load({ def: d.def, world, wi, li: 0, bonus: false, solution: d.solution });
  const date = new Date().toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
  $('#screen-game .lv-num').textContent = '☀';
  $('#screen-game .lv-name').textContent = `${t('daily')} · ${date}`;
  buildTray();
  setSpeedLabel();
  $('#screen-game').classList.remove('running', 'result');
  if (app.screen !== 'game') pushNav('game');
  showScreen('game');
  layoutGame();
  app.hudChanged();
  introCards(current);
}

/** Plays a level from the workshop (or received through a link). */
function startCustom(entry, { from = 'atelier' } = {}) {
  const wi = Math.max(0, THEMES.indexOf(entry.theme));
  const def = { ...entry.def, id: entry.id, name: { fr: entry.name, en: entry.name } };
  const world = { id: entry.theme, name: { fr: entry.name, en: entry.name } };
  current = { custom: true, entry, from, def, world, wi, li: 0, bonus: false };
  closeAllModals();
  hideFail();
  const v = entry.verified;
  game.load({ def, world, wi, li: 0, bonus: false, solution: v?.status === 'ok' ? { par: v.par, sol: v.sol, alt: v.alt } : null });
  $('#screen-game .lv-num').textContent = '✎';
  $('#screen-game .lv-name').textContent = entry.name;
  buildTray();
  setSpeedLabel();
  $('#screen-game').classList.remove('running', 'result');
  if (app.screen !== 'game') pushNav('game');
  showScreen('game');
  layoutGame();
  app.hudChanged();
  introCards(current);
  if (!v) {
    // Work out the par quietly so stars and hints become available.
    verifyAsync(def, 15000).then((res) => {
      entry.verified = res;
      if (from !== 'link') atelier.store(entry);
      if (current?.entry === entry && res.status === 'ok') {
        game.solution = { par: res.par, sol: res.sol, alt: res.alt };
        game.par = res.par;
        app.hudChanged();
      }
    });
  }
}

function leaveCustom() {
  const from = current?.from;
  const entry = current?.entry;
  if (from === 'editor' && entry) atelier.openEditor(entry);
  else if (from === 'link') {
    buildTitle();
    showScreen('title');
  } else atelier.openList();
}

function startLevel(id) {
  const f = SV.findLevel(id);
  if (!f) return;
  current = f;
  SV.save.data.last = id;
  SV.persist();
  closeAllModals();
  hideFail();
  game.load({ def: f.def, world: f.world, wi: f.wi, li: f.li, bonus: f.bonus, solution: SOLUTIONS[id] });
  $('#screen-game .lv-num').textContent = levelLabel(f);
  $('#screen-game .lv-name').textContent = tr(f.def.name);
  buildTray();
  setSpeedLabel();
  const gs = $('#screen-game');
  gs.classList.remove('running', 'result');
  if (app.screen !== 'game') pushNav('game');
  showScreen('game');
  layoutGame();
  app.hudChanged();
  introCards(f);
}

/** Tutorial cards for elements met for the first time, then level tips. */
function introCards(f) {
  const L = game.L;
  const seen = SV.save.data.seen;
  const cards = [];
  if (!seen.lumi) {
    cards.push({ kind: 'welcome' });
    for (const id of ['lumi', 'lantern', 'arrow', 'void', 'firefly']) seen[id] = 1;
  }
  for (const e of NOTEBOOK) {
    if (!seen[e.id] && e.has(L)) {
      cards.push({ kind: 'entry', e });
      seen[e.id] = 1;
    }
  }
  const tip = f.def.tip;
  if (tip && TIP_CARDS[tip] && !SV.save.data.tips[tip]) {
    cards.push({ kind: 'tip', tip });
    SV.save.data.tips[tip] = 1;
  }
  SV.persist();
  const next = () => {
    const c = cards.shift();
    if (!c) {
      afterIntro(f);
      return;
    }
    showIntroCard(c, next);
  };
  next();
}

const TIP_CARDS = {
  stars: {
    title: { fr: 'Les trois étoiles', en: 'The three stars' },
    text: {
      fr: '★ Ramène tous les Lumignons chez eux.<br>★★ Attrape aussi toutes les lucioles.<br>★★★ Fais-le avec le moins de pièces possible : le nombre à battre s’affiche en haut à droite.',
      en: '★ Bring every Lumignon home.<br>★★ Also catch every firefly.<br>★★★ Do it with as few pieces as possible: the number to beat is shown top right.',
    },
    illu: 'stars',
  },
  two: {
    title: { fr: 'Voici Nim !', en: 'Meet Nim!' },
    text: {
      fr: 'Chaque Lumignon rentre dans la lanterne de sa couleur. Ils se traversent sans se gêner, mais tes flèches comptent pour tout le monde.',
      en: 'Each Lumignon goes to the lantern of its colour. They pass through each other, but your arrows work on everyone.',
    },
    illu: 'two',
  },
  loop: {
    title: { fr: 'Tourner en rond', en: 'Going in circles' },
    text: {
      fr: 'Si les Lumignons se retrouvent exactement dans une situation déjà vécue, ils tourneront en rond pour toujours : le niveau est perdu. Casse la boucle… au bon moment.',
      en: 'If the Lumignons ever get back to exactly the same situation, they will circle forever and the level is lost. Break the loop… at the right moment.',
    },
    illu: 'loop',
  },
  place: null,
};

function afterIntro(f) {
  if (f.def.tip === 'place' && !SV.save.data.tips.placeDone) {
    game.startCoach('place');
    tipTimer = setTimeout(() => toast(t('tapToPlace'), 6000, true), 300);
  } else if (f.def.id === '1-2' && !SV.save.data.tips.swipe) {
    SV.save.data.tips.swipe = 1;
    SV.persist();
    game.startCoach('swipe');
    tipTimer = setTimeout(() => toast(t('swipeTip'), 5500, true), 400);
  } else if (f.def.id === '1-4' && !SV.save.data.tips.long) {
    SV.save.data.tips.long = 1;
    SV.persist();
    tipTimer = setTimeout(() => toast(t('longPressTip'), 5500, true), 400);
  }
}

function buildTray() {
  const tray = $('#screen-game .tray');
  tray.innerHTML = '';
  const inv = game.L.inventory;
  for (const k of PIECE_KINDS) {
    if (!inv[k]) continue;
    const b = el('button', 'tray-item');
    b.dataset.piece = k;
    b.setAttribute('aria-label', t('pieceName.' + k));
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 128;
    A.paint(cv, (g) => {
      g.scale(2, 2);
      A.drawPieceIcon(g, k, 32, 32, 50, 0);
    });
    b.appendChild(cv);
    b.appendChild(el('span', 'count', '0'));
    b.onclick = () => {
      click();
      game.selected = k;
      game.picker = null;
      app.hudChanged();
    };
    tray.appendChild(b);
  }
}

app.hudChanged = () => {
  if (!game.L) return;
  const gs = $('#screen-game');
  const left = game.inventoryLeft();
  for (const b of gs.querySelectorAll('.tray-item')) {
    const k = b.dataset.piece;
    b.querySelector('.count').textContent = left[k];
    b.classList.toggle('sel', game.selected === k && game.L.inventory[k] > 0);
    b.classList.toggle('empty', left[k] <= 0);
  }
  const used = game.placements.size;
  const par = game.solution ? game.par : '?';
  const ffTotal = game.L.fireflies.length;
  const running = game.mode !== 'plan';
  const ffGot = running ? game.liveFireflies || 0 : 0;
  const ff = gs.querySelector('.chip-fireflies');
  ff.style.display = ffTotal ? '' : 'none';
  ff.querySelector('.ff-count').textContent = `${ffGot}/${ffTotal}`;
  ff.classList.toggle('ok', running && ffGot === ffTotal);
  const pc = gs.querySelector('.chip-pieces');
  pc.querySelector('.pc-count').textContent = running ? game.runPieces : used;
  pc.querySelector('.pc-par').textContent = `/ ${par}`;
  pc.classList.toggle('over', !!game.solution && (running ? game.runPieces : used) > par);
  gs.classList.toggle('running', game.mode === 'run' || game.mode === 'post');
  gs.classList.toggle('paused', game.mode === 'run' && !!game.paused);
  gs.querySelector('[data-act=playpause] .lbl').textContent = game.paused ? t('resume') : t('pause');
  gs.classList.toggle('result', game.mode === 'result-win' || game.mode === 'result-fail');
  gs.querySelector('[data-act=undo]').disabled = !game.history.length;
  gs.querySelector('[data-act=reset]').disabled = !game.placements.size;
  gs.querySelector('.go-lbl').textContent = running ? t('stop') : t('go');
  gs.querySelector('.go-btn').classList.toggle('glow', !running && used > 0 && current?.def.id === '1-1');
  if (used > 0 && current?.def.tip === 'place' && !SV.save.data.tips.placeDone) {
    SV.save.data.tips.placeDone = 1;
    SV.persist();
  }
};

app.pulseTray = (k) => {
  const b = $(`#screen-game .tray-item[data-piece=${k}]`);
  if (!b) return;
  b.classList.remove('pulse');
  void b.offsetWidth;
  b.classList.add('pulse');
};

app.onHint = () => {
  if (!current.custom && !current.daily) SV.recordHint(current.def.id);
};

app.onRunStart = () => {
  hideFail();
  hideInfo();
  if (!current.custom && !current.daily) SV.recordTry(current.def.id);
};

app.onFail = (cause, name, replayed = false) => {
  if (!replayed) {
    SV.save.data.stats.fails++;
    SV.persist();
  }
  const fb = $('#screen-game .fail-banner');
  fb.querySelector('.fail-title').textContent = t('fail.' + cause.type, name);
  fb.querySelector('.fail-sub').textContent = t('failHint');
  fb.querySelector('[data-act=retry]').innerHTML = `${ICONS.retry}${t('retry')}`;
  fb.querySelector('[data-act=replay-fail]').innerHTML = `${ICONS.slow}${t('replaySlow')}`;
  fb.classList.add('show');
  app.hudChanged();
};

function hideFail() {
  $('#screen-game .fail-banner').classList.remove('show');
}

app.onWin = (res) => {
  if (current.daily) {
    const stars = 1 + (res.allFireflies ? 1 : 0) + (res.allFireflies && res.pieces <= game.par ? 1 : 0);
    SV.save.data.daily = recordDaily(SV.save.data.daily, current.daily.key, stars);
    const unlocks = SV.collectUnlocks();
    SV.persistNow();
    showVictory(stars, res, unlocks, 0);
    app.hudChanged();
    return;
  }
  if (current.custom) {
    const known = !!game.solution;
    const stars = 1 + (res.allFireflies ? 1 : 0) + (known && res.allFireflies && res.pieces <= game.par ? 1 : 0);
    current.entry.best = Math.max(current.entry.best || 0, stars);
    if (current.from !== 'link') atelier.store(current.entry);
    showVictory(stars, res, { hats: [], worlds: [], achievements: [] }, 0);
    app.hudChanged();
    return;
  }
  const id = current.def.id;
  const stars = 1 + (res.allFireflies ? 1 : 0) + (res.allFireflies && res.pieces <= game.par ? 1 : 0);
  const rec = SV.levelRecord(id);
  if ((rec?.tries || 0) >= 10) SV.save.data.stats.stubborn = true;
  const { gained } = SV.recordWin(id, { stars, pieces: res.pieces, fireflies: res.fireflies, usedHint: res.hintsUsed > 0 });
  const unlocks = SV.collectUnlocks();
  SV.persistNow();
  showVictory(stars, res, unlocks, gained);
  app.hudChanged();
};

function retry() {
  click();
  hideFail();
  closeAllModals();
  game.retry();
}

function setSpeedLabel() {
  $('#screen-game .spd').textContent = '×' + game.speed;
}

function bindGameHud() {
  const gs = $('#screen-game');
  gs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    sound.unlock();
    switch (act) {
      case 'pause':
        sound.sfx('tap');
        openPause();
        break;
      case 'goals':
        sound.sfx('tap');
        openGoals();
        break;
      case 'undo':
        game.undo();
        break;
      case 'reset':
        game.clearAll();
        break;
      case 'hint':
        if (!game.solution) toast(t('hintNeedsCheck'), 2600);
        else game.hint();
        break;
      case 'speed':
        game.setSpeed(game.speed >= 3 ? 1 : game.speed + 1);
        setSpeedLabel();
        sound.sfx('tap');
        break;
      case 'go':
        if (game.mode === 'plan') game.go();
        else if (game.mode === 'run' || game.mode === 'post') game.stop();
        else if (game.mode === 'result-fail') retry();
        app.hudChanged();
        break;
      case 'retry':
        retry();
        break;
      case 'replay-fail':
        hideFail();
        game.replayFail();
        break;
      case 'playpause':
        game.togglePause();
        break;
      case 'step':
        if (game.paused) game.stepOnce();
        else game.togglePause();
        break;
      default:
        break;
    }
  });
  // Board input.
  const pos = (e) => [e.clientX, e.clientY];
  const board = () => (app.screen === 'game' ? game : app.screen === 'editor' ? editorScene : null);
  canvas.addEventListener('pointerdown', (e) => {
    sound.unlock();
    const b = board();
    if (!b || app.modalStack.length) return;
    hideInfo();
    canvas.setPointerCapture?.(e.pointerId);
    b.pointerDown(...pos(e), e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const b = board();
    if (b) b.pointerMove(...pos(e), e.pointerId);
  });
  const up = (e) => {
    const b = board();
    if (!b) return;
    b.pointerUp(...pos(e), e.pointerId);
    if (b === game) app.hudChanged();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => {
    game.gesture = null;
    clearTimeout(game.longTimer);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// -------------------------------------------------------------------- modals

function openModal(content, { onClose, dismissable = true, cls = '', onBack = null } = {}) {
  const root = $('#modal-root');
  const m = el('div', 'modal ' + cls);
  const card = el('div', 'card');
  if (typeof content === 'string') card.innerHTML = content;
  else card.appendChild(content);
  m.appendChild(card);
  root.appendChild(m);
  requestAnimationFrame(() => m.classList.add('show'));
  const entry = {
    m,
    card,
    close: () => {
      const i = app.modalStack.indexOf(entry);
      if (i >= 0) app.modalStack.splice(i, 1);
      m.classList.remove('show');
      setTimeout(() => m.remove(), 260);
      onClose?.();
    },
    dismissable,
    onBack,
  };
  if (dismissable) {
    m.addEventListener('click', (e) => {
      if (e.target === m) entry.close();
    });
  }
  app.modalStack.push(entry);
  return entry;
}

function closeAllModals() {
  for (const m of [...app.modalStack]) {
    m.m.remove();
  }
  app.modalStack.length = 0;
}

function illustration(kind, w = 140, h = 120) {
  const cv = document.createElement('canvas');
  cv.className = 'card-illu';
  cv.width = w * 2;
  cv.height = h * 2;
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  return A.paint(cv, (g) => {
    g.scale(2, 2);
    const S = 64;
    const cx = w / 2;
    const by = h * 0.78;
    const tile = (x, y, col = '#8fd18a') => {
      g.fillStyle = col;
      g.beginPath();
      A.roundRect(g, x - S / 2, y - S / 2, S, S, 12);
      g.fill();
    };
    switch (kind) {
      case 'welcome':
        tile(cx - 34, by - 30);
        tile(cx + 30, by - 30, '#82c77e');
        A.drawLumi(g, cx - 34, by - 8, S, { color: 0, dir: 1, t: 1 });
        A.drawLantern(g, cx + 30, by - 8, S, 0, { lit: 0.8, t: 1 });
        break;
      case 'stars':
        g.fillStyle = '#ffcf5a';
        for (let i = 0; i < 3; i++) A.star(g, cx + (i - 1) * 40, h / 2 - (i === 1 ? 8 : 0), i === 1 ? 24 : 19, 5, 0.45);
        break;
      case 'two':
        A.drawLumi(g, cx - 28, by, S, { color: 0, dir: 1, t: 1, mood: 'happy' });
        A.drawLumi(g, cx + 28, by, S, { color: 1, dir: 3, t: 2, mood: 'happy' });
        break;
      case 'loop':
        g.strokeStyle = 'rgba(255,200,100,0.8)';
        g.lineWidth = 4;
        g.setLineDash([6, 8]);
        g.beginPath();
        g.ellipse(cx, h / 2 + 6, 46, 34, 0, 0, A.TAU);
        g.stroke();
        g.setLineDash([]);
        A.drawLumi(g, cx + 44, h / 2 + 22, S * 0.8, { color: 0, dir: 0, t: 1, mood: 'scared' });
        break;
      case 'lumi':
        A.drawLumi(g, cx, by, S * 1.2, { color: 0, dir: 2, t: 1 });
        break;
      case 'lantern':
        A.drawLantern(g, cx, by, S * 1.1, 1, { lit: 0.8, t: 1 });
        break;
      case 'arrow':
        A.drawArrowStone(g, cx, h / 2, S * 1.2, 1, {});
        break;
      case 'engraved':
        A.drawArrowStone(g, cx, h / 2, S * 1.2, 2, { fixed: true });
        break;
      case 'rock':
        g.drawImage(A.propSprite('rock', S, 'meadow', 1, 2).canvas, cx - 41.6, by - 105, 83.2, 121.6);
        break;
      case 'void':
        tile(cx, h / 2 - 10);
        A.drawLumi(g, cx + 6, by + 6, S * 0.8, { color: 0, dir: 2, t: 1, mood: 'scared', alpha: 0.85 });
        break;
      case 'firefly':
        A.drawFirefly(g, cx, by, S * 1.3, 1);
        break;
      case 'water':
        tile(cx, h / 2, '#3f8fd0');
        break;
      case 'lily':
        tile(cx, h / 2, '#3f8fd0');
        A.drawLily(g, cx, h / 2, S, { t: 1, fixed: true });
        break;
      case 'spark':
        A.drawSpark(g, cx - 30, by, S, 2, 1);
        A.drawLantern(g, cx + 30, by, S, 2, { lit: 0.1, locked: true, t: 1 });
        break;
      case 'mushroom':
        A.drawMushroom(g, cx, by, S * 1.2, { fixed: true });
        break;
      case 'daisy':
        A.drawDaisy(g, cx, by, S * 1.3, { fixed: true, t: 1 });
        break;
      case 'portal':
        A.drawPortal(g, cx - 32, h / 2, S, 0, 1);
        A.drawPortal(g, cx + 32, h / 2, S, 0, 2);
        break;
      case 'plate':
        A.drawPlate(g, cx, h / 2, S * 1.2, 0, { lit: true });
        break;
      case 'brambles':
        A.drawBrambles(g, cx, h / 2 + 4, S * 1.2, 0, 0, 1);
        break;
      case 'gloomnib':
        A.drawGloomnib(g, cx, by, S * 1.2, { t: 1 });
        break;
      case 'sleeper':
        A.drawGloomnib(g, cx, by, S * 1.2, { t: 1, sleeping: true });
        break;
      case 'vane':
        A.drawVane(g, cx, h / 2, S * 1.2, 0.5, 1);
        break;
      case 'cloud':
        A.drawCloud(g, cx, h / 2 - 6, S * 1.3, 1);
        break;
      case 'mirror': {
        // A ray of light bent by the mirror.
        const my = h / 2 + 6;
        g.strokeStyle = 'rgba(255,225,150,0.9)';
        g.lineWidth = 3;
        g.setLineDash([2, 7]);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(10, my);
        g.lineTo(cx, my);
        g.lineTo(cx, 8);
        g.stroke();
        g.setLineDash([]);
        A.drawMirror(g, cx, my, S * 1.15, 0, { flash: 0.5 });
        A.drawLumi(g, 26, my + 16, S * 0.62, { color: 1, dir: 1, t: 1, mood: 'happy' });
        break;
      }
      default:
        break;
    }
  });
}

function showIntroCard(c, done) {
  const box = el('div');
  let title;
  let text;
  let illu;
  if (c.kind === 'welcome') {
    title = { fr: 'Bienvenue, gardien des chemins !', en: 'Welcome, keeper of the paths!' };
    text = {
      fr: 'Les Lumignons sont de petites lueurs têtues : ils marchent <b>tout droit</b> sans regarder où ils vont. Pose des <b>flèches</b> pour les guider jusqu’à leur <b>lanterne</b>, puis appuie sur <b>Go !</b> Rien ne presse : tu peux réessayer autant que tu veux.',
      en: 'Lumignons are stubborn little lights: they walk <b>straight ahead</b> without looking. Place <b>arrows</b> to guide them to their <b>lantern</b>, then press <b>Go!</b> No rush: you can retry as often as you like.',
    };
    illu = 'welcome';
  } else if (c.kind === 'tip') {
    const tc = TIP_CARDS[c.tip];
    title = tc.title;
    text = tc.text;
    illu = tc.illu;
  } else {
    title = c.e.name;
    text = c.e.text;
    illu = c.e.id;
  }
  box.appendChild(illustration(illu));
  const eyebrow = c.kind === 'entry' ? `<div class="eyebrow">${getLang() === 'fr' ? 'Nouveau' : 'New'}</div>` : '';
  box.insertAdjacentHTML('beforeend', `${eyebrow}<h2>${tr(title)}</h2><p>${tr(text)}</p><div class="actions"><button class="btn btn-primary" data-ok>${t('ok')}</button></div>`);
  sound.sfx('page');
  const m = openModal(box, { onClose: done, dismissable: false });
  box.querySelector('[data-ok]').onclick = () => {
    click();
    m.close();
  };
}

function openGoals() {
  const L = game.L;
  const rec = SV.levelRecord(current.def.id);
  const box = el('div');
  box.innerHTML = `
    <div class="eyebrow">${levelLabel(current)} · ${tr(current.def.name)}</div>
    <h2>${t('goalsTitle')}</h2>
    <ul class="goal-list">
      <li class="${rec?.stars >= 1 ? 'ok' : ''}"><span class="mark">${rec?.stars >= 1 ? '✓' : '1'}</span>${t('goal1')}<span class="stars-req">★</span></li>
      ${L.fireflies.length ? `<li class="${rec?.stars >= 2 ? 'ok' : ''}"><span class="mark">${rec?.stars >= 2 ? '✓' : '2'}</span>${t('goal2')}<span class="stars-req">★★</span></li>` : ''}
      ${game.solution ? `<li class="${rec?.stars >= 3 ? 'ok' : ''}"><span class="mark">${rec?.stars >= 3 ? '✓' : '3'}</span>${t('goal3', game.par)}<span class="stars-req">★★★</span></li>` : ''}
    </ul>
    <div class="actions"><button class="btn btn-primary" data-ok>${t('ok')}</button></div>`;
  const m = openModal(box);
  box.querySelector('[data-ok]').onclick = () => (click(), m.close());
}

function openPause() {
  const box = el('div');
  box.innerHTML = `
    <div class="eyebrow">${levelLabel(current)} · ${tr(current.def.name)}</div>
    <h2>${t('pause')}</h2>
    <div class="actions col">
      <button class="btn btn-primary" data-a="resume">${ICONS.play}${t('resume')}</button>
      <button class="btn" data-a="restart">${ICONS.retry}${t('restart')}</button>
      <button class="btn btn-ghost" data-a="settings">${ICONS.gear}${t('settings')}</button>
      <button class="btn btn-ghost" data-a="map">${current.custom ? ICONS.pencil + t('atelier') : current.daily ? ICONS.back + t('home') : ICONS.map + t('map')}</button>
    </div>`;
  const m = openModal(box);
  box.querySelector('[data-a=resume]').onclick = () => (click(), m.close());
  box.querySelector('[data-a=restart]').onclick = () => {
    click();
    m.close();
    hideFail();
    game.retry();
    game.clearAll();
  };
  box.querySelector('[data-a=settings]').onclick = () => (click(), openSettings());
  box.querySelector('[data-a=map]').onclick = () => {
    click();
    m.close();
    game.stop();
    hideFail();
    if (navDepth > 0) history.back();
    else if (current.custom) leaveCustom();
    else if (current.daily) {
      buildTitle();
      showScreen('title');
    } else openMap();
  };
}

function showVictory(stars, res, unlocks, gained) {
  const L = game.L;
  const id = current.def.id;
  const custom = !!current.custom;
  const daily = !!current.daily;
  const next = custom || daily ? null : SV.nextLevel(id);
  const worldDone = !custom && !daily && !current.bonus && current.li === current.world.levels.length - 1;
  const lastWorld = current.wi === WORLDS.length - 1 && worldDone;
  const parKnown = !!game.solution;
  const box = el('div');
  const titleTxt = stars === 3 ? t('win3') : stars === 2 ? t('win2') : t('win1');
  const ffOk = res.allFireflies;
  const parOk = parKnown && res.pieces <= game.par;
  box.innerHTML = `
    <div class="eyebrow">${levelLabel(current)} · ${tr(current.def.name)}</div>
    <h2>${titleTxt}</h2>
    <div class="win-stars">${[0, 1, 2].map(() => `<span class="win-star">${STAR_SVG}</span>`).join('')}</div>
    <ul class="goal-list">
      <li class="ok"><span class="mark">✓</span>${t('goal1')}<span class="stars-req">★</span></li>
      ${L.fireflies.length ? `<li class="${ffOk ? 'ok' : ''}"><span class="mark">${ffOk ? '✓' : '✗'}</span>${t('goal2')} (${res.fireflies}/${L.fireflies.length})<span class="stars-req">★★</span></li>` : ''}
      ${parKnown ? `<li class="${ffOk && parOk ? 'ok' : ''}"><span class="mark">${ffOk && parOk ? '✓' : '✗'}</span>${t('goal3', game.par)} (${res.pieces})<span class="stars-req">★★★</span></li>` : ''}
    </ul>
    ${worldDone ? `<canvas class="world-sky" width="560" height="300"></canvas><p><b>${t('worldDone')}</b>${lastWorld ? '<br>' + t('ending') : current.world.outro ? '<br>' + tr(current.world.outro) : ''}</p>` : ''}
    ${daily ? `<p class="streak-line">🔥 ${t('streak', liveStreak(SV.save.data.daily))}<br><small>${t('dailyCome')}</small></p>` : ''}
    <div class="unlock-list"></div>
    <div class="actions col">
      ${next ? `<button class="btn btn-primary" data-a="next">${t('next')}${ICONS.next}</button>` : ''}
      <div class="actions" style="margin-top:0">
        <button class="btn btn-ghost btn-small" data-a="replay">${ICONS.retry}${t('replay')}</button>
        <button class="btn btn-ghost btn-small" data-a="tune" aria-label="${t('tune')}">♫</button>
        <button class="btn btn-ghost btn-small" data-a="map">${custom ? ICONS.pencil + t('atelier') : daily ? ICONS.back + t('home') : ICONS.map + t('map')}</button>
      </div>
      ${custom && current.from === 'link' ? `<button class="btn btn-ghost btn-small" data-a="keep">${ICONS.plus}${atelier.text().addToAtelier}</button>` : ''}
    </div>`;
  const ul = box.querySelector('.unlock-list');
  let shown = 0;
  const totalUnlocks = unlocks.hats.length + unlocks.worlds.length + unlocks.achievements.length;
  const addUnlock = (label, name, drawFn) => {
    if (shown >= 3) {
      if (shown === 3) {
        const more = totalUnlocks - 3;
        const txt = getLang() === 'fr' ? (more > 1 ? 'autres récompenses dans le menu' : 'autre récompense dans le menu') : more > 1 ? 'more rewards in the menu' : 'more reward in the menu';
        ul.appendChild(el('div', 'unlock', `<span>+ ${more} ${txt}</span>`));
      }
      shown++;
      return;
    }
    shown++;
    const row = el('div', 'unlock');
    const cv = document.createElement('canvas');
    cv.width = 72;
    cv.height = 72;
    cv.style.width = '36px';
    cv.style.height = '36px';
    A.paint(cv, drawFn);
    row.appendChild(cv);
    row.insertAdjacentHTML('beforeend', `<span><b>${label}</b> · ${name}</span>`);
    ul.appendChild(row);
  };
  for (const w of unlocks.worlds) {
    addUnlock(t('newWorld'), tr(w.name), (g) => {
      g.scale(2, 2);
      g.fillStyle = '#ffcf5a';
      A.star(g, 18, 18, 14, 5, 0.45);
    });
  }
  for (const h of unlocks.hats) {
    addUnlock(t('newHat'), tr(h.name), (g) => {
      g.scale(2, 2);
      A.drawLumi(g, 18, 33, 30, { color: 0, dir: 2, t: 1, hat: h.id, noShadow: true });
    });
  }
  for (const a of unlocks.achievements) {
    addUnlock(t('newAchievement'), tr(a.name), (g) => {
      g.font = '40px sans-serif';
      g.fillStyle = '#ffcf5a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(a.icon, 36, 40);
    });
  }
  const m = openModal(box, {
    dismissable: false,
    onBack: () => {
      m.close();
      if (custom) leaveCustom();
      else if (daily) {
        buildTitle();
        showScreen('title');
      } else openMap(true, true);
    },
  });
  const sky = box.querySelector('.world-sky');
  if (sky) lightConstellation(sky, current.wi);
  const starsEls = box.querySelectorAll('.win-star');
  starsEls.forEach((s, i) => {
    setTimeout(() => {
      if (i < stars) {
        s.classList.add('on');
        sound.sfx('star', i);
      } else s.classList.add('off');
    }, 350 + i * 330);
  });
  if (unlocks.hats.length || unlocks.worlds.length || unlocks.achievements.length) setTimeout(() => sound.sfx('unlock'), 1400);
  box.querySelector('[data-a=replay]').onclick = () => {
    click();
    m.close();
    game.retry();
  };
  box.querySelector('[data-a=tune]').onclick = () => {
    sound.unlock();
    game.playMelody();
  };
  box.querySelector('[data-a=map]').onclick = () => {
    click();
    m.close();
    if (custom) leaveCustom();
    else if (daily) {
      buildTitle();
      showScreen('title');
    } else openMap(true);
  };
  const kb = box.querySelector('[data-a=keep]');
  if (kb) {
    kb.onclick = () => {
      click();
      atelier.addShared(current.entry);
      kb.remove();
    };
  }
  const nb = box.querySelector('[data-a=next]');
  if (nb) nb.onclick = () => (click(), m.close(), startLevel(next));
}

/** World complete: the world's constellation lights up star after star. */
function lightConstellation(cv, wi) {
  const g = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  const flip = wi % 2 === 1;
  // The map's winding path, turned sideways to fit the card.
  const pts = NODE_PATH.map(([x, y]) => [((y - 2) / 90) * (W - 60) + 30, ((flip ? 100 - x : x) / 100) * (H - 50) + 25]);
  const style = A.WORLD_STYLES[WORLDS[wi].id];
  const t0 = performance.now();
  let lit = -1;
  const draw = (now) => {
    if (!cv.isConnected) return;
    const k = (now - t0) / 1000;
    const n = Math.min(pts.length, Math.floor(k / 0.22));
    if (n - 1 > lit && n > 0) {
      lit = n - 1;
      sound.sfx('star', lit % 3);
    }
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, style.sky[0]);
    grd.addColorStop(1, style.sky[2]);
    g.fillStyle = grd;
    g.beginPath();
    A.roundRect(g, 0, 0, W, H, 28);
    g.fill();
    A.drawStars(g, starField, W, H, k, 0.6, 2);
    g.strokeStyle = 'rgba(255,230,160,0.85)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).call(g, pts[i][0], pts[i][1]);
    g.stroke();
    for (let i = 0; i < pts.length; i++) {
      const on = i < n;
      const [x, y] = pts[i];
      if (on) A.glow(g, x, y, 34 + 6 * Math.sin(k * 3 + i), 'rgba(255,210,110,', 0.9);
      g.fillStyle = on ? '#fff6d6' : 'rgba(255,255,255,0.25)';
      A.star(g, x, y, on ? 11 : 6, 5, 0.45);
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
const starField = A.makeStars(90, 77);

function openSettings() {
  const s = SV.save.data.settings;
  const box = el('div');
  const render = () => {
    box.innerHTML = `
      <button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
      <h2>${t('settings')}</h2>
      <div class="list">
        <div class="row"><span class="grow">${t('music')}</span><button class="toggle ${s.music ? 'on' : ''}" data-k="music" aria-label="${t('music')}"></button></div>
        <div class="row"><span class="grow">${t('sound')}</span><button class="toggle ${s.sound ? 'on' : ''}" data-k="sound" aria-label="${t('sound')}"></button></div>
        <div class="row"><span class="grow">${t('vibration')}</span><button class="toggle ${s.vibration ? 'on' : ''}" data-k="vibration" aria-label="${t('vibration')}"></button></div>
        <div class="row"><span class="grow">${t('showGrid')}</span><button class="toggle ${s.dots ? 'on' : ''}" data-k="dots" aria-label="${t('showGrid')}"></button></div>
        <div class="row"><span class="grow">${t('reducedMotion')}</span><button class="toggle ${s.reducedMotion ? 'on' : ''}" data-k="reducedMotion" aria-label="${t('reducedMotion')}"></button></div>
        <div class="row"><span class="grow">${t('symbols')}<small>${t('symbolsHelp')}</small></span><button class="toggle ${s.symbols ? 'on' : ''}" data-k="symbols" aria-label="${t('symbols')}"></button></div>
        <div class="row"><span class="grow">${t('language')}</span><div class="seg"><button data-lang="fr" class="${getLang() === 'fr' ? 'on' : ''}">FR</button><button data-lang="en" class="${getLang() === 'en' ? 'on' : ''}">EN</button></div></div>
        <div class="row"><span class="grow">${t('defaultSpeed')}</span><div class="seg">${[1, 2, 3].map((v) => `<button data-speed="${v}" class="${s.speed === v ? 'on' : ''}">×${v}</button>`).join('')}</div></div>
      </div>
      <div class="actions col">
        <button class="btn btn-ghost btn-small" data-a="credits">${t('credits')}</button>
        <button class="btn btn-danger btn-small" data-a="reset">${t('resetProgress')}</button>
      </div>`;
    box.querySelectorAll('.toggle').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.k;
        s[k] = !s[k];
        applySettings();
        SV.persist();
        click();
        render();
      };
    });
    box.querySelectorAll('[data-lang]').forEach((b) => {
      b.onclick = () => {
        s.lang = b.dataset.lang;
        setLang(s.lang);
        SV.persist();
        click();
        refreshTexts();
        render();
      };
    });
    box.querySelectorAll('[data-speed]').forEach((b) => {
      b.onclick = () => {
        s.speed = Number(b.dataset.speed);
        game.setSpeed(s.speed);
        setSpeedLabel();
        SV.persist();
        click();
        render();
      };
    });
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
    box.querySelector('[data-a=credits]').onclick = () => (click(), openCredits());
    box.querySelector('[data-a=reset]').onclick = () => {
      click();
      confirmBox(t('resetConfirm'), () => {
        SV.resetSave();
        closeAllModals();
        buildTitle();
        showScreen('title');
      });
    };
  };
  render();
  const m = openModal(box);
}

function confirmBox(text, yes) {
  const box = el('div');
  box.innerHTML = `<p style="font-size:18px;color:var(--ink)">${text}</p><div class="actions"><button class="btn btn-ghost" data-a="no">${t('no')}</button><button class="btn btn-danger" data-a="yes">${t('yes')}</button></div>`;
  const m = openModal(box);
  box.querySelector('[data-a=no]').onclick = () => (click(), m.close());
  box.querySelector('[data-a=yes]').onclick = () => (click(), m.close(), yes());
}

function openCredits() {
  const box = el('div');
  const fr = getLang() === 'fr';
  box.innerHTML = `
    <button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
    <h2>${t('credits')}</h2>
    <div class="credits">
      <p><b>Lumignons</b> ${VERSION} — ${fr ? 'conception, programmation, illustrations, musique et niveaux originaux.' : 'original design, code, art, music and levels.'}</p>
      <p>${fr ? 'Toutes les images sont dessinées par le code (Canvas 2D) et tous les sons sont synthétisés en direct (Web Audio) : le jeu n’embarque aucune ressource tierce hormis la police.' : 'Every picture is drawn by code (Canvas 2D) and every sound is synthesised live (Web Audio): the game ships no third-party asset except the font.'}</p>
      <p>${fr ? 'Police' : 'Font'} : <b>Fredoka</b> — © The Fredoka Project Authors, SIL Open Font License 1.1.</p>
      <p>${fr ? 'Aucune bibliothèque externe, aucun traceur, aucune publicité. La progression reste sur cet appareil.' : 'No external library, no tracker, no ads. Your progress stays on this device.'}</p>
    </div>
    <div class="actions"><button class="btn btn-primary" data-a="ok">${t('ok')}</button></div>`;
  const m = openModal(box);
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  box.querySelector('[data-a=ok]').onclick = () => (click(), m.close());
}

function openWardrobe() {
  const box = el('div');
  const sum = SV.summary();
  const render = () => {
    box.innerHTML = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button><h2>${t('collection')}</h2><p>★ ${sum.stars}</p><div class="hat-grid"></div>`;
    const grid = box.querySelector('.hat-grid');
    for (const h of HATS_INFO) {
      const un = SV.hatUnlocked(h, sum);
      const b = el('button', 'hat' + (un ? '' : ' locked') + (SV.save.data.hat === h.id ? ' sel' : ''));
      const cv = document.createElement('canvas');
      cv.width = 140;
      cv.height = 140;
      cv.style.width = '70px';
      cv.style.height = '70px';
      A.paint(cv, (g) => {
        g.scale(2, 2);
        A.drawLumi(g, 35, 58, 46, { color: 0, dir: 2, t: 1.3, hat: h.id, mood: un ? 'happy' : 'idle', alpha: un ? 1 : 0.45 });
      });
      b.appendChild(cv);
      let req = '';
      if (!un) {
        const n = h.need;
        if (n.stars !== undefined) req = t('unlockAt', n.stars);
        else if (n.world !== undefined) req = `${t('world')} ${n.world + 1} ✓`;
        else if (n.bonus !== undefined) req = `☄ ${t('bonus')}`;
        else if (n.perfect) req = '★★★ ×' + sum.totalLevels;
      }
      b.insertAdjacentHTML('beforeend', `<span>${tr(h.name)}</span>${un ? '' : `<span class="req">${ICONS.lock.replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-1px"')} ${req}</span>`}`);
      b.onclick = () => {
        if (!un) {
          sound.unlock();
          sound.sfx('invalid');
          return;
        }
        click();
        SV.save.data.hat = h.id;
        SV.persist();
        render();
      };
      grid.appendChild(b);
    }
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  };
  render();
  const m = openModal(box);
}

function openAchievements() {
  const box = el('div');
  const sum = SV.summary();
  const got = SV.save.data.achievements;
  box.innerHTML = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button><h2>${t('achievements')}</h2><p>${Object.keys(got).length} / ${ACHIEVEMENTS.length}</p>
    <div class="list">${ACHIEVEMENTS.map((a) => {
      const pr = a.progress ? a.progress(sum) : null;
      const has = !!got[a.id];
      return `<div class="row ach ${has ? 'got' : ''}"><span class="ach-ico">${a.icon}</span><span class="grow">${tr(a.name)}<small>${tr(a.desc)}</small>${pr && !has ? `<div class="bar"><i style="width:${Math.min(100, (pr[0] / pr[1]) * 100)}%"></i></div>` : ''}</span></div>`;
    }).join('')}</div>`;
  const m = openModal(box);
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
}

function openNotebook() {
  const box = el('div');
  const seen = SV.save.data.seen;
  box.innerHTML = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button><h2>${t('notebook')}</h2><div class="list"></div>`;
  const list = box.querySelector('.list');
  for (const e of NOTEBOOK) {
    const known = !!seen[e.id];
    const row = el('div', 'row nb-entry' + (known ? '' : ' unknown'));
    const cv = illustration(known ? e.id : 'none', 64, 64);
    cv.className = '';
    row.appendChild(cv);
    row.insertAdjacentHTML('beforeend', `<span class="grow"><b>${known ? tr(e.name) : '???'}</b><small>${known ? tr(e.text) : ''}</small></span>`);
    list.appendChild(row);
  }
  const m = openModal(box);
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
}

// ------------------------------------------------------------ toasts & info

function toast(msg, ms = 1800, big = false) {
  const root = $('#toast-root');
  const d = el('div', 'toast' + (big ? ' big' : ''), msg);
  root.appendChild(d);
  requestAnimationFrame(() => d.classList.add('show'));
  setTimeout(() => {
    d.classList.remove('show');
    setTimeout(() => d.remove(), 300);
  }, ms);
  const extra = [...root.children].filter((c) => !c.classList.contains('update'));
  while (extra.length > 3) extra.shift().remove();
}
app.toast = toast;

// A new release took over (service worker update): offer to reload, never force it mid-level.
function showUpdate() {
  if ($('#toast-root .toast.update')) return;
  const d = el('div', 'toast update', `<span>${t('updateReady')}</span>`);
  const b = el('button', 'btn btn-primary btn-small', t('reload'));
  b.onclick = () => location.reload();
  d.appendChild(b);
  $('#toast-root').appendChild(d);
  requestAnimationFrame(() => d.classList.add('show'));
}
app.showUpdate = showUpdate;

let infoTimer = 0;
app.showInfo = (info, x, y) => {
  const b = $('#info-bubble');
  b.innerHTML = `<b>${info.title}</b>${info.text}`;
  b.classList.add('show');
  const r = b.getBoundingClientRect();
  let left = Math.min(W - r.width - 10, Math.max(10, x - r.width / 2));
  let top = y - r.height - 40;
  if (top < 70) top = y + 40;
  b.style.left = left + 'px';
  b.style.top = top + 'px';
  sound.sfx('page');
  clearTimeout(infoTimer);
  infoTimer = setTimeout(hideInfo, 5000);
};
function hideInfo() {
  $('#info-bubble').classList.remove('show');
}

// ------------------------------------------------------------------ settings

function applySettings() {
  const s = SV.save.data.settings;
  sound.setMusic(s.music);
  sound.setSound(s.sound);
  sound.vibrateOn = s.vibration;
  document.documentElement.classList.toggle('reduced', !!s.reducedMotion);
}

function refreshTexts() {
  for (const n of document.querySelectorAll('[data-t]')) n.textContent = t(n.dataset.t);
  if (app.screen === 'title') buildTitle();
  if (app.screen === 'map') buildMap();
  if (current) {
    $('#screen-game .lv-name').textContent = tr(current.def.name);
    buildTray();
    app.hudChanged();
  }
}

// ----------------------------------------------------------- PWA / install

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (app.screen === 'title') buildTitle();
});
async function installApp() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  try {
    await deferredInstall.userChoice;
  } catch {
    /* ignore */
  }
  deferredInstall = null;
  buildTitle();
}
window.addEventListener('load', () => {
  try {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !navigator.webdriver) {
      const sw = navigator.serviceWorker;
      const updating = !!sw.controller; // false on the very first install
      sw.addEventListener('controllerchange', () => updating && showUpdate());
      sw.register('sw.js')
        .then((reg) => {
          // An installed app is often resumed rather than reloaded: look for a release then.
          let checked = Date.now();
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible' || Date.now() - checked < 30 * 60e3) return;
            checked = Date.now();
            reg.update().catch(() => {});
          });
        })
        .catch(() => {});
    }
  } catch {
    /* sandboxed frames forbid service workers: the game still works online */
  }
});

// --------------------------------------------------------------- keyboard

window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (e.key === 'Escape') {
    const top = app.modalStack[app.modalStack.length - 1];
    if (top) {
      if (top.onBack) top.onBack();
      else top.close();
      return;
    }
    if (app.screen === 'game') {
      if (game.picker) game.picker = null;
      else openPause();
    } else if (app.screen === 'map') {
      buildTitle();
      showScreen('title');
    }
    return;
  }
  if (app.screen !== 'game' || app.modalStack.length) return;
  const k = e.key;
  if (k === ' ' || k === 'Enter') {
    e.preventDefault();
    $('#screen-game [data-act=go]').click();
  } else if (k === 'p' || k === 'P') game.togglePause();
  else if (k === '.' || k === 'n' || k === 'N') {
    if (game.paused) game.stepOnce();
  } else if ((k === 'z' || k === 'Z') && !e.altKey) game.undo();
  else if (k === 'h' || k === 'H') game.hint();
  else if (k.startsWith('Arrow')) {
    e.preventDefault();
    game.keyDir({ ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[k]);
  }
  app.hudChanged();
});

// ----------------------------------------------------------------- atelier

const atelier = createAtelier({
  $,
  el,
  getLang,
  ICONS,
  click,
  sound,
  openModal,
  toast,
  showScreen,
  confirmBox,
  save: SV.save,
  persist: SV.persist,
  scene: editorScene,
  startCustom,
  layoutEditor,
  back: () => {
    if (navDepth > 0) history.back();
    else {
      buildTitle();
      showScreen('title');
    }
  },
});
app.editorPaint = (idx, repeat) => atelier.paint(idx, repeat);
app.atelier = atelier;
app.editor = editorScene;

// ------------------------------------------------------------------- boot

function boot() {
  SV.loadSave();
  const s = SV.save.data.settings;
  setLang(s.lang || detectLang());
  applySettings();
  sound.musicOn = s.music;
  sound.soundOn = s.sound;
  refreshTexts();
  bindGameHud();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      SV.persistNow();
      if (sound.ctx) sound.ctx.suspend();
    } else {
      if (sound.ctx) sound.ctx.resume();
      A.checkCanvases(); // the system may have dropped our drawings meanwhile
    }
  });
  window.addEventListener('pageshow', (e) => e.persisted && A.checkCanvases());
  A.watchCanvas(canvas);
  A.checkCanvases();
  buildTitle();
  showScreen('title');
  const unlockAudio = () => sound.unlock();
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  requestAnimationFrame(frame);
  // Deep link for testing: #level=1-3
  const m = location.hash.match(/level=([\w-]+)/);
  if (m && SV.findLevel(m[1])) startLevel(m[1]);
  const shared = location.hash.match(/play=(LUMI1\.[A-Za-z0-9_-]+)/);
  if (shared) {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      /* ignore */
    }
    atelier.playShared(shared[1]);
  }
}

app.startLevel = startLevel;
app.worlds = WORLDS;
app.solutions = SOLUTIONS;
app.openMap = openMap;
app.game = game;
app.save = SV;
app.titleStep = (c, x, y) => {
  if (app.screen === 'title' && sound.ready() && Math.random() < 0.5) sound.step(c, x, y, 4, 'title');
};

if (document.fonts && document.fonts.load) {
  document.fonts.load('600 20px Fredoka').finally(boot);
} else boot();
