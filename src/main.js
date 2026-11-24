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
import { dailyFor, recordDaily, liveStreak, dayKey, dailyInfo } from './daily.js';
import { exportBackup, importBackup } from './backup.js';
import { makeShareCard, shareImage } from './share.js';
import * as Wallet from './wallet.js';
import { winReward, dailyReward, REWARD, HINT_PRICE } from './economy.js';
import { createShop, COIN_SVG } from './ui/shop.js';
import { drawChest } from './ui/shop-scene.js';
import { ShopScene } from './ui/shop-scene.js';
import { createOnline } from './online/online.js';
import { levelBoard, dailyBoard } from './online/score.js';
import { createRanks, PODIUM_SVG } from './ui/ranks.js';
import { createTour } from './ui/tour.js';
import { createStory } from './ui/story.js';
import { enigmaId, packSize, tierOf, enigmaInfo } from './enigmas.js';
import * as Q from './quests.js';

const VERSION = '3.10.0';
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z"/></svg>';
const ICONS = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  hat: '<svg viewBox="0 0 24 24"><path d="M4 17h16M7 17l2-9 3 3 3-3 2 9"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M10.3 2.8h3.4l.5 2.4 1.9.8 2-1.4 2.4 2.4-1.4 2 .8 1.9 2.4.5v3.4l-2.4.5-.8 1.9 1.4 2-2.4 2.4-2-1.4-1.9.8-.5 2.4h-3.4l-.5-2.4-1.9-.8-2 1.4-2.4-2.4 1.4-2-.8-1.9-2.4-.5v-3.4l2.4-.5.8-1.9-1.4-2 2.4-2.4 2 1.4 1.9-.8z"/></svg>',
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
  podium: PODIUM_SVG,
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
  hat: () => Wallet.look(0).hat,
  /** drawLumi options for what the Lumignon of this colour wears. */
  dress: (color) => {
    const l = Wallet.look(color);
    return { hat: l.hat, glasses: l.glasses, flameStyle: l.flame };
  },
  party: () => Wallet.wallet().party,
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
const shopScene = new ShopScene(app);
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
  if (app.screen === 'shop') layoutShop();
}

function layoutEditor() {
  const top = $('#screen-editor .hud-top').getBoundingClientRect().bottom;
  const panel = $('#screen-editor .hud-bottom').getBoundingClientRect();
  const side = panel.left > W * 0.5 && panel.height > H * 0.4;
  if (side) editorScene.resize(W, H, DPR, top + 6, 10, W - panel.left + 8);
  else editorScene.resize(W, H, DPR, top + 6, H - panel.top + 4, 0);
}

/** The shop's stage: between its header and the chips under the podium. */
function layoutShop() {
  const r = $('#screen-shop');
  const head = r.querySelector('.shop-head');
  const tabs = r.querySelector('.shop-tabs2');
  if (!head || !tabs) return;
  const chips = r.querySelector('.shop-stage:not(.no-who) .who');
  const bottom = (chips || tabs).getBoundingClientRect().top - 4;
  shopScene.resize(W, H, DPR, head.getBoundingClientRect().bottom, bottom);
}

let shopReturn = 'title';
function leaveShop() {
  if (shopReturn === 'game' && game.L) {
    showScreen('game');
    layoutGame();
    app.hudChanged();
  } else if (shopReturn === 'map') {
    buildMap();
    showScreen('map');
  } else {
    buildTitle();
    showScreen('title');
  }
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
let sinceSave = 0;
function frame(now) {
  const real = Math.min(1000, now - last);
  const dt = Math.min(0.05, real / 1000);
  last = now;
  // Time spent on a level counts for its ranking (not behind a window, not after the win).
  if (app.screen === 'game' && current && !document.hidden && !app.modalStack.length && game.mode !== 'result-win') {
    const bid = boardOf(current);
    if (bid) {
      online.tick(bid, real);
      sinceSave += real;
      if (sinceSave > 15000) {
        sinceSave = 0;
        SV.persist();
      }
    }
  }
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
  openFriendLink();
});

/** "#ami=…" (add a friend) or "#defi=…" (a duel) in the address. */
function openFriendLink() {
  const h = location.hash;
  if (!/(ami|defi)=/.test(h)) return;
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    /* ignore */
  }
  ranks.openLink(h);
}
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
  } else if (app.screen === 'shop') {
    leaveShop();
  }
});

function showScreen(name) {
  app.screen = name;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === 'screen-' + name);
  active = name === 'title' || name === 'hello' ? title : name === 'map' || name === 'atelier' ? mapBg : name === 'editor' ? editorScene : name === 'shop' ? shopScene : game;
  if (name !== 'game') hideInfo();
  if (name === 'atelier') mapBg.setWorld('meadow');
  sound.startMusic(name === 'game' ? game.worldKey : name === 'map' ? mapBg.key : name === 'editor' ? editorScene.model?.theme || 'meadow' : name === 'shop' ? 'shop' : 'title');
}

function buildTitle() {
  const s = SV.summary();
  const root = $('#screen-title');
  const started = s.completed > 0;
  root.innerHTML = `
    <div class="title-me"></div>
    <div class="title-top">${shop.pill()}<button class="icon-btn title-gear" data-act="settings" aria-label="${t('settings')}">${ICONS.gear}</button></div>
    <div class="logo"><h1>Lumignons</h1><p>${t('tagline')}</p></div>
    <div class="title-actions">
      <button class="btn btn-primary" data-act="play">${ICONS.play}${started ? t('continue') : t('play')}</button>
      <div class="title-row">
        <button class="tile-btn daily-btn" data-act="daily">${ICONS.sun}<span>${t('dailyShort')}</span>${dailyBadge()}</button>
        <button class="tile-btn" data-act="achievements">${ICONS.trophy}<span>${t('quests.tile')}</span>${Q.toClaim(SV.save, questCtx()) ? '<i class="gift-dot"></i>' : ''}</button>
        <button class="tile-btn" data-act="ranks">${ICONS.podium}<span>${t('podium')}</span></button>
        <button class="tile-btn shop-tile" data-act="shop">${ICONS.bag}<span>${t('shop')}</span>${Wallet.giftState().available ? '<i class="gift-dot"></i>' : ''}</button>
      </div>
      <div class="title-more">
        <button data-act="atelier">${ICONS.pencil}${t('atelier')}</button>
        <button data-act="notebook">${ICONS.book}${t('notebook')}</button>
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
  root.querySelectorAll('[data-act=shop]').forEach((b) => (b.onclick = () => (click(), shop.open('featured'))));
  root.querySelector('[data-act=achievements]').onclick = () => (click(), openQuests());
  root.querySelector('[data-act=ranks]').onclick = () => (click(), ranks.openRanks());
  const me = root.querySelector('.title-me');
  if (online.me().name || !online.me().optOut) me.appendChild(ranks.chip());
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
      ${shop.pill()}
      <div class="star-total"><span class="st">★</span>${SV.totalStars()}</div>
    </div>
    <div class="map-scroll"></div>`;
  root.querySelector('[data-act=shop]').onclick = () => (click(), shop.open('featured'));
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
          ${unlocked && w.story ? `<button class="story-btn" data-story="${w.story}">📖 ${t('story.read')}</button>` : ''}
          ${unlocked && w.story && wi === WORLDS.length - 1 && SV.worldComplete(w) ? `<button class="story-btn" data-story="epilogue">✨ ${t('story.epilogue')}</button>` : ''}
        </div>
      </div>`;
    sec.querySelectorAll('.story-btn').forEach((b) => (b.onclick = () => (click(), story.open(b.dataset.story))));
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
    const size = packSize(w.id);
    if (size) {
      const open = SV.enigmasOpen(wi);
      const st = SV.enigmaStats(wi);
      const card = el('button', 'enigma-card' + (open ? '' : ' locked'));
      card.innerHTML = `<span class="en-ico">🧩</span><span class="grow"><b>${t('enigmas.title')}</b><small>${open ? t('enigmas.progress', st.done, size) : t('enigmas.locked')}</small></span>${open ? `<span class="en-stars"><span class="st">★</span> ${st.stars} / ${size * 3}</span>` : ICONS.lock}`;
      card.onclick = () => {
        sound.unlock();
        if (!open) {
          sound.sfx('invalid');
          toast(t('enigmas.locked'), 2600);
          return;
        }
        click();
        openEnigmas(wi);
      };
      sec.appendChild(card);
    }
    sc.appendChild(sec);
  });
  const end = el('div', 'map-end', `Lumignons ${VERSION}`);
  sc.appendChild(end);
  sc.scrollTop = prevScroll;
  sc.addEventListener('scroll', updateMapSky, { passive: true });
}

/** A world's book of énigmes: 20 puzzles, harder and harder. */
function openEnigmas(wi) {
  const w = WORLDS[wi];
  const size = packSize(w.id);
  const st = SV.enigmaStats(wi);
  const box = el('div', 'enigmas');
  const tiers = [0, 1, 2].map((k) => t('enigmas.tier.' + k));
  let html = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
    <div class="eyebrow">${t('world')} ${wi + 1} · ${tr(w.name)}</div><h2>🧩 ${t('enigmas.title')}</h2>
    <p>${t('enigmas.intro')}</p><div class="en-total"><span class="st">★</span> ${st.stars} / ${size * 3}</div>`;
  for (let k = 0; k < 3; k++) {
    html += `<div class="en-tier t${k}"><div class="en-tier-name">${tiers[k]}</div><div class="en-grid">`;
    for (let i = 0; i < size; i++) {
      if (tierOf(i) !== k) continue;
      const id = enigmaId(wi, i);
      const r = SV.levelRecord(id);
      const s = r?.stars || 0;
      html += `<button class="en-node ${r?.done ? 'done' : ''}" data-id="${id}">${i + 1}<span class="stars">${[1, 2, 3].map((q) => `<span class="${s >= q ? 'on' : ''}">★</span>`).join('')}</span></button>`;
    }
    html += '</div></div>';
  }
  box.innerHTML = html;
  const m = openModal(box);
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  box.querySelectorAll('.en-node').forEach((b) => (b.onclick = () => (click(), m.close(), startLevel(b.dataset.id))));
}
app.openEnigmas = openEnigmas;

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
let sessionTries = 0; // Go presses since the level was opened (for "first try" quests)

function levelLabel(f) {
  if (f.custom) return '✎';
  if (f.daily) return '☀';
  if (f.enigma) return `🧩${f.wi + 1}-${f.li + 1}`;
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
  sessionTries = 0;
  online.track(dailyBoard(d));
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
  sessionTries = 0;
  SV.save.data.last = id;
  online.track(id, SV.levelRecord(id));
  SV.persist();
  closeAllModals();
  hideFail();
  game.load({ def: f.def, world: f.world, wi: f.wi, li: f.li, bonus: f.bonus, solution: f.solution || SOLUTIONS[id] });
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
  // A world with a chapter of the story tells it before its first level.
  const chapter = !f.enigma && !f.custom && !f.daily && f.world?.story;
  if (chapter && !SV.save.data.tips[story.seenKey(chapter)]) {
    SV.save.data.tips[story.seenKey(chapter)] = 1;
    SV.persist();
    story.open(chapter, () => introCards(f));
  } else introCards(f);
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
  const hb = gs.querySelector('.hint-badge');
  if (hb) {
    const w = Wallet.wallet();
    hb.innerHTML = w.hints > 0 ? String(w.hints) : `${HINT_PRICE}${COIN_SVG}`;
    hb.classList.toggle('price', w.hints <= 0);
  }
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

/** The ranking a level belongs to (campaign level or today's puzzle), or null. */
function boardOf(f) {
  if (!f || f.custom) return null;
  return f.daily ? dailyBoard(f.daily) : levelBoard(f.def.id);
}

app.onHint = () => {
  if (!current.custom && !current.daily) SV.recordHint(current.def.id);
  const bid = boardOf(current);
  if (bid) online.addHint(bid);
};

app.onRunStart = () => {
  hideFail();
  hideInfo();
  if (!current.custom && !current.daily) SV.recordTry(current.def.id);
  const bid = boardOf(current);
  if (bid) online.addTry(bid);
  sessionTries++;
};

/** What the weekly quests need to know about the player. */
function questCtx() {
  return { starsLeft: SV.summary().totalLevels * 3 - SV.totalStars(), dailyOpen: SV.isDone('1-5'), friends: online.friends().length };
}

/** A quest event; finished quests are returned (to show them on the victory card). */
function questEvent(ev) {
  const done = Q.recordQuest(SV.save, questCtx(), ev);
  SV.persist();
  return done.map((q) => ({ id: q.id, text: q.text[getLang()] ? q.text[getLang()](q.goal) : q.text.fr(q.goal) }));
}
app.onQuest = questEvent;
app.quests = Q;
app.questCtx = () => questCtx();

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

/** Pays a win (and the achievements it unlocked) into the wallet; returns the lines to show. */
function payReward(reward, unlocks, kind, id) {
  Wallet.earn(reward.total, kind, id);
  for (const a of unlocks.achievements) {
    Wallet.earn(REWARD.achievement, 'achievement', a.id);
    reward.lines.push({ key: 'achievement', n: REWARD.achievement });
    reward.total += REWARD.achievement;
  }
  return reward;
}

app.onWin = (res) => {
  if (current.daily) {
    const stars = 1 + (res.allFireflies ? 1 : 0) + (res.allFireflies && res.pieces <= game.par ? 1 : 0);
    const first = !SV.save.data.daily?.results?.[current.daily.key];
    SV.save.data.daily = recordDaily(SV.save.data.daily, current.daily.key, stars);
    const unlocks = SV.collectUnlocks();
    const reward = payReward(first ? dailyReward(SV.save.data.daily.streak) : { total: 0, lines: [] }, unlocks, 'daily', current.daily.key);
    const ranked = online.win(boardOf(current), { stars, pieces: res.pieces });
    unlocks.quests = [
      ...questEvent({ type: 'daily', day: current.daily.key }),
      ...questEvent({ type: 'win', board: boardOf(current), stars, newStars: 0, hint: res.hintsUsed > 0, firstTry: sessionTries === 1, fireflies: res.fireflies }),
    ];
    SV.persistNow();
    showVictory(stars, res, unlocks, 0, reward, ranked);
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
  const wasComplete = SV.worldComplete(current.world);
  const { gained, firstClear, prevStars } = SV.recordWin(id, { stars, pieces: res.pieces, fireflies: res.fireflies, usedHint: res.hintsUsed > 0 });
  const unlocks = SV.collectUnlocks();
  const worldDone = !wasComplete && SV.worldComplete(current.world);
  const reward = payReward(winReward({ firstClear, bonus: !!current.bonus, prevStars, stars, worldDone }), unlocks, 'win', id);
  const ranked = levelBoard(id) ? online.win(id, { stars, pieces: res.pieces }) : null;
  unlocks.quests = questEvent({ type: 'win', board: id, stars, newStars: gained, hint: res.hintsUsed > 0, firstTry: sessionTries === 1, fireflies: res.fireflies });
  SV.persistNow();
  showVictory(stars, res, unlocks, gained, reward, ranked);
  app.hudChanged();
};

function askHint() {
  if (game.mode !== 'plan') return;
  if (!game.solution) {
    toast(t('hintNeedsCheck'), 2600);
    return;
  }
  const h = game.nextHint();
  if (!h.next || game.hintShown(h)) {
    game.showHint(h);
    return;
  }
  if (Wallet.useHint()) {
    game.showHint(h);
    app.hudChanged();
    return;
  }
  sound.sfx('invalid');
  shop.quickBuyHint(() => game.showHint(h));
}

/** Refreshes every coin counter on screen (after a purchase, a gift, a win). */
function refreshCoins() {
  online.lookChanged();
  const w = Wallet.wallet();
  const gift = shop.attention();
  document.querySelectorAll('.coin-pill[data-act=shop], .shop-tile').forEach((p) => {
    const b = p.querySelector('b');
    if (b) b.textContent = w.coins;
    const dot = p.querySelector('.gift-dot');
    if (gift && !dot) p.insertAdjacentHTML('beforeend', '<i class="gift-dot"></i>');
    if (!gift && dot) dot.remove();
  });
  app.hudChanged();
}

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
        askHint();
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
    if (app.screen === 'shop') {
      if (!app.modalStack.length) shop.stageTap(e.clientX, e.clientY);
      return;
    }
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
      case 'comet': {
        // The comet turns the Lumignon, then flies away to the sky.
        const my = h / 2 + 8;
        g.strokeStyle = 'rgba(255,225,150,0.9)';
        g.lineWidth = 3;
        g.setLineDash([2, 7]);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(10, my);
        g.lineTo(cx, my);
        g.lineTo(cx, h - 4);
        g.stroke();
        g.setLineDash([]);
        A.drawComet(g, cx, my, S * 1.1, 2, { t: 1 });
        A.drawComet(g, cx + S * 0.55, my, S * 0.7, 0, { t: 1, fly: 0.55 });
        A.drawLumi(g, 26, my + 16, S * 0.62, { color: 2, dir: 1, t: 1, mood: 'happy' });
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
    const who = online.me().name;
    title = who ? { fr: `Bienvenue, ${escapeHtml(who)} !`, en: `Welcome, ${escapeHtml(who)}!` } : { fr: 'Bienvenue, gardien des chemins !', en: 'Welcome, keeper of the paths!' };
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
    <div class="actions">${boardOf(current) ? `<button class="btn btn-ghost" data-a="ranks">${ICONS.podium}${t('ranks.title')}</button>` : ''}<button class="btn btn-primary" data-ok>${t('ok')}</button></div>`;
  const m = openModal(box);
  box.querySelector('[data-ok]').onclick = () => (click(), m.close());
  const rb = box.querySelector('[data-a=ranks]');
  if (rb) rb.onclick = () => (click(), ranks.openRanks({ board: boardOf(current) }));
}

function openPause() {
  const box = el('div');
  box.innerHTML = `
    <div class="eyebrow">${levelLabel(current)} · ${tr(current.def.name)}</div>
    <h2>${t('pause')}</h2>
    <div class="actions col">
      <button class="btn btn-primary" data-a="resume">${ICONS.play}${t('resume')}</button>
      <button class="btn" data-a="restart">${ICONS.retry}${t('restart')}</button>
      ${boardOf(current) ? `<button class="btn btn-ghost" data-a="ranks">${ICONS.podium}${t('ranks.title')}</button>` : ''}
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
  const rb = box.querySelector('[data-a=ranks]');
  if (rb) rb.onclick = () => (click(), ranks.openRanks({ board: boardOf(current) }));
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

const rewardLabel = (l) => (l.key === 'stars' || l.key === 'streak' ? t('reward.' + l.key, l.count) : t('reward.' + l.key));

function showVictory(stars, res, unlocks, gained, reward = null, ranked = null) {
  const L = game.L;
  const id = current.def.id;
  const custom = !!current.custom;
  const daily = !!current.daily;
  const next = custom || daily ? null : SV.nextLevel(id);
  const worldDone = !custom && !daily && !current.bonus && !current.enigma && current.li === current.world.levels.length - 1;
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
    ${reward && reward.total ? `<div class="coins-earned"><span class="coin-pill big">${COIN_SVG}<b class="earned-count">+0</b></span><small>${reward.lines.map((l) => `${rewardLabel(l)} +${l.n}`).join(' · ')}</small></div>` : ''}
    ${worldDone ? `<canvas class="world-sky" width="560" height="300"></canvas><p><b>${t('worldDone')}</b>${lastWorld ? '<br>' + t('ending') : current.world.outro ? '<br>' + tr(current.world.outro) : ''}</p>` : ''}
    ${daily ? `<p class="streak-line">🔥 ${t('streak', liveStreak(SV.save.data.daily))}<br><small>${t('dailyCome')}</small></p>` : ''}
    <div class="rank-line"></div>
    <div class="unlock-list"></div>
    <div class="actions col">
      ${lastWorld ? `<button class="btn btn-primary" data-a="epilogue">✨ ${t('story.epilogue')}</button>` : ''}
      ${next ? `<button class="btn ${lastWorld ? 'btn-ghost' : 'btn-primary'}" data-a="next">${t('next')}${ICONS.next}</button>` : ''}
      <div class="actions" style="margin-top:0">
        <button class="btn btn-ghost btn-small" data-a="replay">${ICONS.retry}${t('replay')}</button>
        <button class="btn btn-ghost btn-small" data-a="tune" aria-label="${t('tune')}">♫</button>
        <button class="btn btn-ghost btn-small icon-only" data-a="share" aria-label="${t('share')}">${ICONS.share}</button>
        <button class="btn btn-ghost btn-small" data-a="map">${custom ? ICONS.pencil + t('atelier') : daily ? ICONS.back + t('home') : ICONS.map + t('map')}</button>
      </div>
      ${custom && current.from === 'link' ? `<button class="btn btn-ghost btn-small" data-a="keep">${ICONS.plus}${atelier.text().addToAtelier}</button>` : ''}
    </div>`;
  const ul = box.querySelector('.unlock-list');
  let shown = 0;
  const totalUnlocks = unlocks.hats.length + unlocks.worlds.length + unlocks.achievements.length + (unlocks.quests?.length || 0);
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
  for (const q of unlocks.quests || []) {
    addUnlock(t('quests.completed'), q.text, (g) => {
      g.scale(2, 2);
      g.fillStyle = '#7eebb0';
      A.star(g, 18, 18, 14, 5, 0.45);
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
  ranks.victory(box.querySelector('.rank-line'), custom ? null : boardOf(current), ranked);
  // The éclats won count up once the stars are in.
  const ec = box.querySelector('.earned-count');
  if (ec) {
    const total = reward.total;
    const t0 = performance.now() + 1000;
    let shown = 0;
    const tick = (now) => {
      if (!ec.isConnected) return;
      const k = Math.min(1, Math.max(0, (now - t0) / 700));
      const v = Math.round(total * k);
      if (v !== shown) {
        if (Math.floor(v / 6) !== Math.floor(shown / 6) || v === total) sound.sfx('coin');
        shown = v;
        ec.textContent = '+' + v;
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const starsEls = box.querySelectorAll('.win-star');
  starsEls.forEach((s, i) => {
    setTimeout(() => {
      if (i < stars) {
        s.classList.add('on');
        sound.sfx('star', i);
      } else s.classList.add('off');
    }, 350 + i * 330);
  });
  if (totalUnlocks) setTimeout(() => sound.sfx('unlock'), 1400);
  box.querySelector('[data-a=replay]').onclick = () => {
    click();
    m.close();
    game.retry();
  };
  box.querySelector('[data-a=tune]').onclick = () => {
    sound.unlock();
    game.playMelody();
  };
  box.querySelector('[data-a=share]').onclick = () => (click(), shareVictory(stars, res));
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
  const eb = box.querySelector('[data-a=epilogue]');
  if (eb) eb.onclick = () => (click(), story.open('epilogue'));
  // Right after the tutorial level, the main menu's guided tour, then level 1-2.
  if (id === WORLDS[0].levels[0].id && !SV.save.data.tips.tour) {
    const toTour = () => {
      click();
      m.close();
      startTour(next);
    };
    if (nb) nb.onclick = toTour;
    box.querySelector('[data-a=map]').onclick = toTour;
  }
}

/** The guided tour of the title screen (then `next` level, if any). */
function startTour(next = null) {
  SV.save.data.tips.tour = 1;
  SV.persist();
  closeAllModals();
  game.stop?.();
  buildTitle();
  showScreen('title');
  setTimeout(() => {
    tour.start((goOn) => {
      if (goOn && next) startLevel(next);
    });
  }, 450);
}

/** A picture of the finished board (as it is on screen) to share or keep. */
async function shareVictory(stars, res) {
  const L = game.L;
  const S = game.S;
  const k = canvas.width / W;
  const x0 = Math.max(0, game.ox - S * 0.8);
  const y0 = Math.max(0, game.oy - S * 1.4);
  const x1 = Math.min(W, game.ox + L.w * S + S * 0.8);
  const y1 = Math.min(H, game.oy + L.h * S + S * 0.9);
  const crop = { canvas, x: x0 * k, y: y0 * k, w: (x1 - x0) * k, h: (y1 - y0) * k };
  const daily = !!current.daily;
  const date = new Date().toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' });
  const what = daily ? `${t('daily')} · ${date}` : current.custom ? tr(current.def.name) : `${levelLabel(current)} · ${tr(current.def.name)}`;
  const streak = daily ? liveStreak(SV.save.data.daily) : 0;
  const line = t('shareLine', res.pieces) + (streak > 1 ? ` · 🔥 ${t('streak', streak)}` : '');
  const home = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : '';
  const card = makeShareCard({ crop, worldKey: game.worldKey, label: what, stars, line, footer: home.replace(/^https?:\/\//, '') });
  const how = await shareImage(card, `${t('shareText', what, stars)}${home ? ' ' + home : ''}`, `lumignons-${daily ? 'defi-' + dayKey() : current.def.id}.png`);
  if (how === 'downloaded') toast(t('cardSaved'), 2600);
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
        <div class="row"><span class="grow">${t('openAll')}<small>${t('openAllHelp')}</small></span><button class="toggle ${s.openAll ? 'on' : ''}" data-k="openAll" aria-label="${t('openAll')}"></button></div>
        <div class="row"><span class="grow">${t('language')}</span><div class="seg"><button data-lang="fr" class="${getLang() === 'fr' ? 'on' : ''}">FR</button><button data-lang="en" class="${getLang() === 'en' ? 'on' : ''}">EN</button></div></div>
        <div class="row"><span class="grow">${t('defaultSpeed')}</span><div class="seg">${[1, 2, 3].map((v) => `<button data-speed="${v}" class="${s.speed === v ? 'on' : ''}">×${v}</button>`).join('')}</div></div>
      </div>
      <div class="actions col">
        <button class="btn btn-ghost btn-small" data-a="profile">${ICONS.podium}${t('ranks.profile')} · ${online.me().name ? escapeHtml(online.me().name) : t('ranks.noName')}</button>
        <button class="btn btn-ghost btn-small" data-a="backup">${ICONS.download}${t('backup')}</button>
        <button class="btn btn-ghost btn-small" data-a="tour">${getLang() === 'fr' ? 'Revoir la visite du menu' : 'Menu tour again'}</button>
        <button class="btn btn-ghost btn-small" data-a="credits">${t('credits')}</button>
        <button class="btn btn-danger btn-small" data-a="reset">${t('resetProgress')}</button>
      </div>`;
    box.querySelectorAll('.toggle').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.k;
        s[k] = !s[k];
        // Opening everything is a choice, not a reward: no "new world" announcements.
        if (k === 'openAll' && s.openAll) for (const w of WORLDS) SV.save.data.worldsSeen[w.id] = 1;
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
    box.querySelector('[data-a=tour]').onclick = () => (click(), startTour(null));
    box.querySelector('[data-a=backup]').onclick = () => (click(), openBackup());
    box.querySelector('[data-a=profile]').onclick = () => (click(), ranks.openProfile());
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

/** The whole progress as a code to keep, and the way back in. */
async function openBackup() {
  const code = await exportBackup(SV.save.data);
  const box = el('div');
  box.innerHTML = `<h2>${t('backup')}</h2><p>${t('backupText')}</p>
    <textarea class="share-code" id="backup-code" readonly rows="4">${code}</textarea>
    <div class="actions">
      <button class="btn btn-primary" data-a="copy">${t('copy')}</button>
      ${navigator.share ? `<button class="btn btn-ghost" data-a="native">${ICONS.share}${t('share')}</button>` : ''}
    </div>
    <div class="actions col"><button class="btn btn-ghost btn-small" data-a="restore">${t('backupRestore')}</button><button class="btn btn-ghost btn-small" data-a="close">OK</button></div>`;
  const m = openModal(box);
  const ta = box.querySelector('textarea');
  box.querySelector('[data-a=copy]').onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t('copied'));
    } catch {
      ta.focus();
      ta.select();
      toast(t('copyFail'), 2600);
    }
  };
  const nb = box.querySelector('[data-a=native]');
  if (nb) nb.onclick = () => navigator.share({ title: 'Lumignons', text: code }).catch(() => {});
  box.querySelector('[data-a=restore]').onclick = () => (click(), restoreDialog());
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
}

function restoreDialog() {
  const box = el('div');
  box.innerHTML = `<h2>${t('backupRestore')}</h2><p>${t('backupPaste')}</p>
    <textarea class="share-code" id="restore-code" rows="4" placeholder="LUMISAVE1.…"></textarea>
    <div class="actions"><button class="btn btn-ghost" data-a="close">${t('back')}</button><button class="btn btn-primary" data-a="ok">${t('restore')}</button></div>`;
  const m = openModal(box);
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  box.querySelector('[data-a=ok]').onclick = async () => {
    let data;
    try {
      data = await importBackup(box.querySelector('textarea').value);
    } catch {
      sound.sfx('invalid');
      toast(t('backupBad'), 2600);
      return;
    }
    confirmBox(t('backupConfirm'), () => {
      if (!data.online && SV.save.data.online) data.online = SV.save.data.online;
      if (!data.boards && SV.save.data.boards) data.boards = SV.save.data.boards;
      SV.replaceSave(data);
      online.reset();
      setLang(SV.save.data.settings.lang || detectLang());
      applySettings();
      refreshTexts();
      closeAllModals();
      buildTitle();
      showScreen('title');
      toast(t('backupDone'));
    });
  };
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
      <p>${fr ? 'Aucune bibliothèque externe, aucun traceur, aucune publicité. La progression reste sur cet appareil ; seuls ton pseudo et tes meilleurs résultats partent vers les classements en ligne (Firebase, de Google), si tu y participes.' : 'No external library, no tracker, no ads. Your progress stays on this device; only your nickname and best results go to the online rankings (Firebase, by Google), if you take part.'}</p>
    </div>
    <div class="actions"><button class="btn btn-primary" data-a="ok">${t('ok')}</button></div>`;
  const m = openModal(box);
  box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  box.querySelector('[data-a=ok]').onclick = () => (click(), m.close());
}

/** Achievements, as rows (inside the quests window). */
function achievementsHtml() {
  const sum = SV.summary();
  const got = SV.save.data.achievements;
  return `<p>${Object.keys(got).length} / ${ACHIEVEMENTS.length}</p>
    <div class="list">${ACHIEVEMENTS.map((a) => {
      const pr = a.progress ? a.progress(sum) : null;
      const has = !!got[a.id];
      return `<div class="row ach ${has ? 'got' : ''}"><span class="ach-ico">${a.icon}</span><span class="grow">${tr(a.name)}<small>${tr(a.desc)}</small>${pr && !has ? `<div class="bar"><i style="width:${Math.min(100, (pr[0] / pr[1]) * 100)}%"></i></div>` : ''}</span><b class="ach-pay">${has ? '✓' : `+${REWARD.achievement}`} ✦</b></div>`;
    }).join('')}</div>`;
}

/** Weekly quests (and achievements): progress, rewards, the chest of the week. */
function openQuests(tab = 'week') {
  const box = el('div', 'quests');
  const m = openModal(box);
  const render = () => {
    const ctx = questCtx();
    const list = Q.questList(SV.save, ctx, getLang());
    const st = Q.weekState(SV.save, ctx);
    const left = Q.untilNextWeek();
    const days = Math.floor(left / 86400e3);
    const hours = Math.max(1, Math.ceil((left % 86400e3) / 3600e3));
    const ready = Q.bonusReady(SV.save, ctx);
    box.innerHTML = `
      <button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
      <h2>${t('quests.tile')}</h2>
      <div class="rk-tabs q-tabs" role="tablist">
        <button role="tab" data-tab="week" class="${tab === 'week' ? 'on' : ''}">${t('quests.tab.week')}</button>
        <button role="tab" data-tab="achievements" class="${tab === 'achievements' ? 'on' : ''}">${t('quests.tab.achievements')}</button>
      </div>
      ${
        tab === 'week'
          ? `<p class="q-intro">${t('quests.intro', Q.QUEST_REWARD)}</p>
        <div class="q-list">${list
          .map(
            (q) => `<div class="q-card ${q.done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}">
              <div class="q-head"><span class="q-mark">${q.claimed ? '✓' : q.done ? '★' : ''}</span><b>${q.text}</b></div>
              <div class="q-bar"><i style="width:${(q.have / q.goal) * 100}%"></i><span>${q.have} / ${q.goal}</span></div>
              ${q.claimed ? `<div class="q-state">${t('quests.done')}</div>` : q.done ? `<button class="btn btn-primary btn-small q-claim" data-id="${q.id}">${t('quests.claim', Q.QUEST_REWARD)}</button>` : ''}
            </div>`,
          )
          .join('')}</div>
        <div class="q-chest ${ready ? 'ready' : ''} ${st.bonus ? 'taken' : ''}">
          <canvas class="q-chest-cv"></canvas>
          <div class="grow"><b>${t('quests.chest')}</b><small>${st.bonus ? t('quests.chestTaken') : ready ? t('quests.chestText') : t('quests.chestLocked')}</small></div>
          ${ready ? `<button class="btn btn-primary btn-small q-open">${t('quests.chestOpen')}</button>` : ''}
        </div>
        <p class="q-renew">${t('quests.renew', days, hours)}</p>`
          : achievementsHtml()
      }`;
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
    box.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => (click(), (tab = b.dataset.tab), render())));
    const cv = box.querySelector('.q-chest-cv');
    if (cv) {
      cv.width = 128;
      cv.height = 112;
      A.paint(cv, (g) => {
        g.scale(2, 2);
        drawChest(g, 32, 40, 44, 0, 'rgba(255,220,120,', 0);
      });
    }
    box.querySelectorAll('.q-claim').forEach((b) => {
      b.onclick = () => {
        sound.unlock();
        const n = Q.claimQuest(SV.save, questCtx(), b.dataset.id);
        if (!n) return;
        Wallet.earn(n, 'quest', b.dataset.id);
        SV.persist();
        sound.sfx('coin');
        sound.sfx('buy');
        toast(t('quests.claimed', n), 1600);
        refreshCoins();
        render();
        refreshTitleDots();
      };
    });
    const ob = box.querySelector('.q-open');
    if (ob) {
      ob.onclick = () => {
        click();
        if (!Q.takeBonus(SV.save, questCtx())) return;
        SV.persist();
        m.close();
        if (!shop.freeChest()) {
          Wallet.earn(Q.WEEK_BONUS_COINS, 'weekChest');
          toast(t('quests.bonusCoins', Q.WEEK_BONUS_COINS), 2800);
          refreshCoins();
        }
        refreshTitleDots();
      };
    }
  };
  render();
}

/** The red dot on the quests tile. */
function refreshTitleDots() {
  const tile = $('#screen-title [data-act=achievements]');
  if (!tile) return;
  const want = Q.toClaim(SV.save, questCtx()) > 0;
  const dot = tile.querySelector('.gift-dot');
  if (want && !dot) tile.insertAdjacentHTML('beforeend', '<i class="gift-dot"></i>');
  if (!want && dot) dot.remove();
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
  else if (k === 'h' || k === 'H') askHint();
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
  onVerified: (entry) => {
    const done = questEvent({ type: 'atelier', id: entry.id });
    for (const q of done) toast(`${t('quests.completed')} · ${q.text}`, 3000);
  },
  back: () => {
    if (navDepth > 0) history.back();
    else {
      buildTitle();
      showScreen('title');
    }
  },
});
const shop = createShop({
  el,
  t,
  tr,
  getLang,
  click,
  sound,
  openModal,
  toast,
  ICONS,
  save: SV.save,
  persist: SV.persist,
  hatUnlocked: SV.hatUnlocked,
  summary: SV.summary,
  onChange: () => refreshCoins(),
  scene: shopScene,
  show: () => {
    if (app.screen !== 'shop') {
      shopReturn = app.screen;
      pushNav('shop');
    }
    showScreen('shop');
    layoutShop();
  },
  back: () => {
    if (navDepth > 0) history.back();
    else leaveShop();
  },
  layout: () => layoutShop(),
});
const LEVEL_IDS = WORLDS.flatMap((w) => [...w.levels, w.bonus].map((l) => l.id));
const online = createOnline({
  save: SV.save,
  persist: SV.persist,
  info: (bid) => {
    if (SOLUTIONS[bid]) return { min: SOLUTIONS[bid].min, par: SOLUTIONS[bid].par };
    if (/^e\d-\d\d$/.test(bid)) return enigmaInfo(bid, WORLDS);
    const m = /^d-\d{4}-\d{2}-\d{2}-([a-z]+)-(\d+)$/.exec(bid);
    return m ? dailyInfo(m[1], +m[2]) : null;
  },
  look: (c) => Wallet.look(c),
  levelBoards: () => LEVEL_IDS,
  onChange: (what) => {
    if (['name', 'taken', 'deleted', 'optout'].includes(what)) refreshMe();
  },
});

/** The player's chip on the title screen. */
function refreshMe() {
  const slot = $('#screen-title .title-me');
  if (!slot || app.screen !== 'title') return;
  slot.innerHTML = '';
  if (online.me().name || !online.me().optOut) slot.appendChild(ranks.chip());
}

const ranks = createRanks({
  el,
  t,
  getLang,
  click,
  sound,
  openModal,
  toast,
  confirmBox,
  ICONS,
  online,
  dress: (c) => app.dress(c),
  showScreen,
  worlds: () => WORLDS,
  isDone: (id) => SV.isDone(id),
  levelTitle: (id) => {
    const f = SV.findLevel(id);
    return f ? `${levelLabel(f)} · ${tr(f.def.name)}` : id;
  },
  lastLevel: () => (current && !current.custom && !current.daily ? current.def.id : SV.continueTarget()),
  dailyToday: () => {
    if (!SV.isDone('1-5')) return null;
    const d = dailyFor(WORLDS.filter((w, i) => SV.worldUnlocked(i)).map((w) => w.id));
    if (!d) return null;
    const date = new Date().toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return { bid: dailyBoard(d), label: `☀ ${date}` };
  },
  onProfileChange: () => refreshMe(),
  boardLabel: (bid) => {
    const f = SV.findLevel(bid);
    return f ? levelLabel(f) : t('daily');
  },
  playBoard: (bid) => {
    if (SV.findLevel(bid)) startLevel(bid);
    else if (bid === ranks_todayBoard()) startDaily();
    else toast(t('ranks.error'), 2400);
  },
  onFriendAhead: (bid) => {
    const done = questEvent({ type: 'friend', board: bid });
    for (const q of done) toast(`${t('quests.completed')} · ${q.text}`, 3000);
  },
});
function ranks_todayBoard() {
  const d = dailyFor(WORLDS.filter((w, i) => SV.worldUnlocked(i)).map((w) => w.id));
  return d ? dailyBoard(d) : null;
}

const story = createStory({ el, openModal, tr, getLang, click, sound });
app.story = story;

const tour = createTour({
  tr,
  getLang,
  click,
  sound,
  avatar: () => {
    const me = online.me();
    const d = app.dress(me.color);
    return ranks.avatar({ color: me.color, hat: d.hat, glasses: d.glasses, flame: d.flameStyle }, 44, 'tour-lumi');
  },
});
app.startTour = startTour;

app.shop = shop;
app.shopScene = shopScene;
app.online = online;
app.ranks = ranks;
app.wallet = Wallet;
app.trail = () => Wallet.wallet().trail;
app.editorPaint = (idx, repeat) => atelier.paint(idx, repeat);
app.atelier = atelier;
app.editor = editorScene;

// ------------------------------------------------------------------- boot

function boot() {
  A.loadSkyArt();
  A.loadArt({ chest: 'assets/shop/chest.webp' });
  A.loadArt(Object.fromEntries(Object.keys(A.PAINTED_PROPS).map((k) => ['prop-' + k, `assets/props/${k}.webp`])));
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
  online.migrate(SV.save.data.levels, SOLUTIONS);
  const welcome = Wallet.takeWelcome();
  const showWelcome = (ms) => welcome && !location.hash && setTimeout(() => shop.welcome(welcome), ms);
  const friendLink = /(ami|defi)=/.test(location.hash);
  if (online.needsName() && !online.me().asked && (!location.hash || friendLink)) {
    // First launch: the pseudo first, then straight into the tutorial.
    const fresh = SV.summary().completed === 0;
    ranks.hello({
      returning: !fresh,
      onDone: ({ name }) => {
        buildTitle();
        showScreen('title');
        if (friendLink) openFriendLink();
        else if (fresh) startLevel(WORLDS[0].levels[0].id);
        else {
          if (name) toast(t('ranks.welcomeBack', escapeHtml(name)), 2400);
          showWelcome(600);
        }
      },
    });
  } else {
    buildTitle();
    showScreen('title');
    showWelcome(700);
  }
  // Results waiting to be sent go when the game starts, comes back, or finds the network.
  let lastSync = 0;
  const syncSoon = () => {
    if (Date.now() - lastSync < 60000) return;
    lastSync = Date.now();
    online.sync().catch(() => {});
  };
  setTimeout(syncSoon, 2500);
  // "Online" on the player's card: a beat every few minutes while the game is in view.
  const beat = () => document.visibilityState === 'visible' && online.heartbeat().catch(() => {});
  setTimeout(beat, 4000);
  setInterval(beat, 60 * 1000);
  document.addEventListener('visibilitychange', beat);
  if (friendLink && app.screen !== 'hello') setTimeout(openFriendLink, 600);
  window.addEventListener('online', () => ((lastSync = 0), syncSoon()));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncSoon());
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
app.sound = sound;
app.titleStep = (c, x, y) => {
  if (app.screen === 'title' && sound.ready() && Math.random() < 0.5) sound.step(c, x, y, 4, 'title');
};

if (document.fonts && document.fonts.load) {
  document.fonts.load('600 20px Fredoka').finally(boot);
} else boot();
