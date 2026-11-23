// The shop screen: a night market where Madame Phalène sells hats, glasses,
// flames, trails and celebrations (and hints). The four Lumignons try on
// whatever the player looks at; buying is celebrated; a surprise chest, a
// daily offer, a daily gift and a collection book keep things exciting.
// Éclats are earned by playing only: there is no real money anywhere.
import * as A from '../game/art.js';
import * as W from '../wallet.js';
import { Particles } from '../game/fx.js';
import { CATALOG, findItem, HINT_PRICE, REWARD, GIFT } from '../economy.js';
import { COSMETICS, FREE, ODDS, MILESTONES, COLLECTOR, RARITIES } from '../data/cosmetics.js';
import { HATS_INFO } from '../data/meta.js';
import { RARITY_COLORS, drawChest } from './shop-scene.js';
import { LUMI_NAMES } from '../engine/core.js';

export const COIN_SVG = '<svg class="coin-ico" viewBox="0 0 24 24"><path d="M12 1.8l2.7 7.5 7.5 2.7-7.5 2.7-2.7 7.5-2.7-7.5L1.8 12l7.5-2.7z"/></svg>';

const TAB_ICONS = {
  featured: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  hat: '<svg viewBox="0 0 24 24"><path d="M3 18h18M6 18l1.5-9 4.5 3 4.5-3 1.5 9"/></svg>',
  glasses: '<svg viewBox="0 0 24 24"><circle cx="7" cy="13" r="3.5"/><circle cx="17" cy="13" r="3.5"/><path d="M10.5 12.5c1-1 2-1 3 0M3.5 12l-1.5-3M20.5 12l1.5-3"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 21c-4 0-6-2.8-6-6 0-4 4-6 3.5-11 3 2 7.5 5.5 7.5 11 0 3.2-2 6-5 6Z"/><path d="M12 21c-1.6 0-2.6-1.2-2.6-2.7 0-1.8 1.6-2.8 2.4-4.8 1.2 1 2.8 2.6 2.8 4.8 0 1.5-1 2.7-2.6 2.7Z"/></svg>',
  trail: '<svg viewBox="0 0 24 24"><path d="M3 17c4-6 7 2 11-4"/><circle cx="18" cy="9" r="2.4"/><path d="M4 21h.01M8 19h.01"/></svg>',
  party: '<svg viewBox="0 0 24 24"><path d="M4 20l5-12 7 7z"/><path d="M14 4l1 2M19 5l-2 2M20 10l-2-.5M11 3.5v2"/></svg>',
  hints: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z"/></svg>',
  collection: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
};
const TABS = ['featured', 'hat', 'glasses', 'flame', 'trail', 'party', 'hints', 'collection'];
const WEARABLE = ['hat', 'glasses', 'flame', 'trail', 'party'];
const PARTY_EMOJI = { classic: '✨', confetti: '🎊', balloons: '🎈', butterflies: '🦋', fireworks: '🎆', starfall: '🌠' };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

export function createShop(api) {
  const { el, t, tr, click, sound, openModal, toast, ICONS, save, persist, summary, onChange, scene, show, back } = api;
  const journalTitle = () => (api.getLang() === 'fr' ? 'Journal' : 'Journal');
  const coins = (n) => `<span class="coins">${COIN_SVG}${n}</span>`;
  const root = () => document.getElementById('screen-shop');
  let tab = 'featured';
  let selected = null; // the item being looked at
  let shownCoins = 0;
  let bubbleTimer = 0;
  let offerTimer = 0;

  // ------------------------------------------------------------ small parts

  /** "✦ 245" button for the title and the map; a dot when something waits in the shop. */
  function pill() {
    const w = W.wallet();
    return `<button class="coin-pill" data-act="shop" aria-label="${t('shop')}">${COIN_SVG}<b>${w.coins}</b>${attention() ? '<i class="gift-dot"></i>' : ''}</button>`;
  }

  /** The daily gift, or today's offer not seen yet. */
  function attention() {
    const w = W.wallet();
    if (W.giftState().available) return true;
    const o = W.offer();
    return !!o && !o.bought && w.offerSeen !== o.day;
  }

  function canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w * 2;
    cv.height = h * 2;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    return cv;
  }

  /** The colour being dressed (-1: all four). */
  const who = () => (W.wallet().same ? -1 : scene.who < 0 ? 0 : scene.who);
  const target = () => Math.max(0, who());
  const nameOf = (it) => tr(it.name || HATS_INFO.find((h) => h.id === it.id)?.name || '');
  const label = (it) => (it.kind === 'hints' ? t('hintPack', it.qty) : nameOf(it));
  const slotOf = (it) => it.slot || (it.kind !== 'hints' ? it.kind : null);

  /** Little picture of an item, for cards (a dark silhouette when not owned, in the book). */
  function preview(cv, it, { silhouette = false } = {}) {
    const slot = slotOf(it);
    A.paint(cv, (g) => {
      const w = cv.width / 2;
      const h = cv.height / 2;
      g.scale(2, 2);
      const color = target();
      if (it.kind === 'hints') hintIcon(g, w, h, it.qty);
      else if (slot === 'hat' || slot === 'glasses' || slot === 'flame') {
        A.drawLumi(g, w / 2, h * 0.93, h * 0.66, { color, dir: 2, t: 1.3, mood: 'happy', hat: slot === 'hat' ? it.id : null, glasses: slot === 'glasses' ? it.id : null, flameStyle: slot === 'flame' ? it.id : 'classic' });
      } else if (slot === 'trail') {
        for (let i = 0; i < 18; i++) A.drawTrailDot(g, it.id, 6 + (i * (w - 40)) / 18, h * 0.62 - Math.sin(i / 4.5) * h * 0.18, h * 0.5, (i + 1) / 18, A.LUMI[color].glow, i * 2, 1.3);
        A.drawLumi(g, w - 18, h * 0.86, h * 0.42, { color, dir: 1, t: 1.3, mood: 'happy' });
      } else if (slot === 'party') {
        const fx = new Particles();
        if (it.id === 'classic') fx.emit('star', w / 2, h / 2, 14, { speed: 70, life: 3, size: 5, drag: 3 });
        else fx.party(it.id, w, h, [[w / 2, h * 0.72]], 22);
        for (let k = 0; k < (it.id === 'fireworks' ? 70 : it.id === 'balloons' ? 120 : 45); k++) fx.update(1 / 50);
        fx.draw(g);
        if (it.id === 'balloons' || it.id === 'classic') {
          g.font = `${Math.round(h * 0.32)}px sans-serif`;
          g.textAlign = 'center';
          g.fillText(PARTY_EMOJI[it.id], w / 2, h * 0.62);
        }
      }
      if (silhouette) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(28,18,58,0.94)';
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over';
      }
    });
    return cv;
  }

  function hintIcon(g, w, h, n) {
    const x = w / 2;
    const y = h * 0.45;
    A.glow(g, x, y, h * 0.5, 'rgba(255,210,90,', 0.9);
    g.fillStyle = '#ffe07a';
    g.beginPath();
    g.arc(x, y, h * 0.22, 0, A.TAU);
    g.fill();
    g.fillStyle = '#c9b48a';
    A.roundRect(g, x - h * 0.1, y + h * 0.2, h * 0.2, h * 0.13, 3);
    g.fill();
    g.strokeStyle = '#ffb547';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(x - h * 0.08, y + h * 0.03);
    g.quadraticCurveTo(x, y - h * 0.1, x + h * 0.08, y + h * 0.03);
    g.stroke();
    if (n > 1) {
      g.font = `700 ${Math.round(h * 0.22)}px Fredoka, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = '#7a3fb0';
      g.fillText('×' + n, x + h * 0.32, h * 0.9);
    }
  }

  /** The purse counts up or down to its new value. */
  function setPurse(to) {
    const b = root()?.querySelector('.purse b');
    if (!b) return;
    const from = shownCoins;
    shownCoins = to;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 650);
      b.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Coins fly from the purse to the podium. */
  function coinFlight(n = 9) {
    const purse = root()?.querySelector('.purse');
    if (!purse || !purse.animate) return;
    const a = purse.getBoundingClientRect();
    const spots = scene.spots();
    const c = target();
    const [tx, ty] = who() < 0 ? [(spots[0][0] + spots[3][0]) / 2, spots[0][1] - scene.S] : [spots[c][0], spots[c][1] - scene.S];
    for (let i = 0; i < n; i++) {
      const coin = el('span', 'coin-fly', COIN_SVG);
      document.body.appendChild(coin);
      const x0 = a.left + a.width / 2;
      const y0 = a.top + a.height / 2;
      const mx = (x0 + tx) / 2 + (Math.random() - 0.5) * 140;
      const my = Math.min(y0, ty) - 30 - Math.random() * 60;
      const anim = coin.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(0.6)`, opacity: 0 },
          { transform: `translate(${mx}px, ${my}px) scale(1.25)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${tx + (Math.random() - 0.5) * 30}px, ${ty}px) scale(0.5)`, opacity: 0.2 },
        ],
        { duration: 700, delay: i * 45, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' },
      );
      anim.onfinish = () => {
        coin.remove();
        if (i % 2 === 0) sound.sfx('coin');
      };
    }
  }

  // ------------------------------------------------------------ Madame Phalène

  function say(kind, mood = 'idle') {
    const b = root()?.querySelector('.bubble');
    if (!b) return;
    const lines = t('phalene.' + kind);
    b.textContent = Array.isArray(lines) ? pickOne(lines) : lines;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    scene.say(mood);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => b.classList.remove('show'), 4200);
  }

  // ------------------------------------------------------------ screen

  function open(which = 'featured') {
    tab = TABS.includes(which) ? which : 'featured';
    selected = null;
    scene.setPreview(null);
    scene.who = W.wallet().same ? -1 : Math.max(0, scene.who);
    shownCoins = W.wallet().coins;
    scene.signText = t('shopName');
    build();
    show();
    say(W.giftState().available ? 'giftWaiting' : 'greet');
    sound.sfx('shopBell');
  }

  function build() {
    const r = root();
    const w = W.wallet();
    r.innerHTML = `
      <header class="shop-head">
        <button class="icon-btn" data-a="back" aria-label="${t('back')}">${ICONS.back}</button>
        <h2 class="sr-only">${t('shopName')}</h2><span class="grow"></span>
        <span class="coin-pill big purse">${COIN_SVG}<b>${shownCoins}</b></span>
        <span class="hint-pill">💡 <b>${w.hints}</b></span>
        <button class="icon-btn info-btn" data-a="info" aria-label="${t('info')}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg></button>
      </header>
      <div class="shop-stage"><div class="bubble"></div>
        <div class="who">${[-1, 0, 1, 2, 3].map((c) => `<button data-who="${c}" class="${(c < 0 ? w.same : !w.same && scene.who === c) ? 'on' : ''}">${c < 0 ? t('everyone') : LUMI_NAMES[c]}</button>`).join('')}</div>
      </div>
      <nav class="shop-tabs2">${TABS.map((k) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${TAB_ICONS[k]}<span>${t('shopTab.' + k)}</span>${tabHasNew(k) ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>
      <div class="shop-panel"></div>
      <div class="shop-action"></div>`;
    r.querySelector('[data-a=back]').onclick = () => (click(), back());
    r.querySelector('[data-a=info]').onclick = () => (click(), infoDialog());
    r.querySelectorAll('[data-tab]').forEach((b) => {
      b.onclick = () => {
        click();
        goTab(b.dataset.tab);
      };
    });
    r.querySelectorAll('[data-who]').forEach((b) => (b.onclick = () => setWho(Number(b.dataset.who))));
    renderPanel();
    renderAction();
    const nav = r.querySelector('.shop-tabs2 .on');
    if (nav) nav.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function goTab(k) {
    tab = k;
    selected = null;
    scene.setPreview(null);
    build();
    api.layout();
  }

  function setWho(c) {
    click();
    W.setSame(c < 0);
    scene.who = c;
    scene.hop(c);
    root()
      .querySelectorAll('[data-who]')
      .forEach((b) => b.classList.toggle('on', Number(b.dataset.who) === c));
    if (selected) scene.setPreview(slotOf(selected) ? { slot: slotOf(selected), id: selected.id } : null);
    renderPanelKeepScroll();
    renderAction();
    onChange();
  }

  function tabHasNew(k) {
    return WEARABLE.includes(k) && COSMETICS.some((c) => c.slot === k && W.isNew(c.id) && !W.owns(c.id, c.slot));
  }

  function renderPanel() {
    const panel = root().querySelector('.shop-panel');
    panel.innerHTML = '';
    clearInterval(offerTimer);
    if (tab === 'featured') renderFeatured(panel);
    else if (tab === 'hints') renderGrid(panel, CATALOG.filter((c) => c.kind === 'hints'));
    else if (tab === 'collection') renderCollection(panel);
    else {
      const items = [...FREE.filter((f) => f.slot === tab), ...(tab === 'hat' ? earnedHats() : []), ...COSMETICS.filter((c) => c.slot === tab)];
      renderGrid(panel, items);
      // The "new" ribbons go once the tab has been seen.
      const ids = COSMETICS.filter((c) => c.slot === tab).map((c) => c.id);
      setTimeout(() => W.markSeen(ids), 1500);
    }
  }

  function renderPanelKeepScroll() {
    const panel = root()?.querySelector('.shop-panel');
    if (!panel) return;
    const y = panel.scrollTop;
    renderPanel();
    panel.scrollTop = y;
  }

  /** Hats earned by playing, shown with the shop's (rarity by how hard they are to get). */
  const earnedHats = () =>
    HATS_INFO.filter((h) => !h.need.shop).map((h) => ({
      id: h.id,
      slot: 'hat',
      rarity: h.id === 'none' ? 'common' : h.need.perfect || h.need.collector ? 'legendary' : h.need.world !== undefined || h.need.bonus !== undefined ? 'epic' : 'rare',
      price: 0,
      name: h.name,
      earned: h,
    }));

  function state(it) {
    if (it.kind === 'hints') return 'buy';
    const slot = slotOf(it);
    if (!W.owns(it.id, slot)) return it.earned ? 'locked' : 'buy';
    return W.worn(slot, target()) === it.id ? 'worn' : 'owned';
  }

  function condition(n) {
    if (n.stars !== undefined) return t('unlockAt', n.stars);
    if (n.world !== undefined) return `${t('world')} ${n.world + 1} ✓`;
    if (n.bonus !== undefined) return `☄ ${t('bonus')}`;
    if (n.perfect) return '★★★ ×' + summary().totalLevels;
    if (n.collector) return t('fullCollection');
    return '';
  }

  function card(it) {
    const st = state(it);
    const offer = W.offer();
    const isOffer = offer && !offer.bought && offer.item.id === it.id;
    const rar = it.rarity || 'common';
    const sel = selected && selected.id === it.id && slotOf(selected) === slotOf(it);
    const b = el('button', `sk-card r-${rar} st-${st}${sel ? ' sel' : ''}`);
    b.dataset.item = it.id;
    b.appendChild(preview(canvas(96, 84), it));
    let tag = '';
    if (st === 'buy') tag = isOffer ? `<s>${it.price}</s> ${coins(offer.price)}` : coins(it.price);
    else if (st === 'worn') tag = `<b class="worn">${t('worn')}</b>`;
    else if (st === 'owned') tag = `<b class="owned">✓ ${t('ownedShort')}</b>`;
    else tag = `<span class="cond">${ICONS.lock.replace('<svg', '<svg style="width:11px;height:11px;vertical-align:-1px"')} ${condition(it.earned.need)}</span>`;
    b.insertAdjacentHTML('beforeend', `<span class="sk-name">${label(it)}</span><span class="sk-tag">${tag}</span>`);
    if (it.kind !== 'hints' && (it.price || it.earned) && it.id !== 'none') b.insertAdjacentHTML('beforeend', `<span class="sk-rar">${t('rarity.' + rar)}</span>`);
    if (isOffer) b.insertAdjacentHTML('beforeend', '<i class="ribbon offer">−30 %</i>');
    else if (it.price && st === 'buy' && W.isNew(it.id)) b.insertAdjacentHTML('beforeend', `<i class="ribbon new">${t('newRibbon')}</i>`);
    b.onclick = () => choose(it);
    return b;
  }

  function renderGrid(panel, items) {
    if (tab === 'hints') panel.insertAdjacentHTML('beforeend', `<p class="shop-note">${t('hintsHelp')}</p>`);
    const grid = el('div', 'sk-grid');
    for (const it of items) grid.appendChild(card(it));
    panel.appendChild(grid);
  }

  /** A tap on a card: the Lumignons try it on, Madame Phalène comments. */
  function choose(it) {
    sound.unlock();
    sound.sfx('select');
    selected = it;
    const slot = slotOf(it);
    if (slot) scene.setPreview({ slot, id: it.id });
    const st = state(it);
    if (st === 'buy' && it.kind !== 'hints') say(W.wallet().coins >= W.priceOf(it.id) ? (it.rarity === 'legendary' ? 'legendary' : 'preview') : 'poor', 'happy');
    else if (st === 'locked') say('earnIt');
    else if (it.kind !== 'hints') say('preview', 'happy');
    renderPanelKeepScroll();
    renderAction();
  }

  function renderAction() {
    const bar = root().querySelector('.shop-action');
    bar.innerHTML = '';
    bar.classList.toggle('show', !!selected);
    if (!selected) return;
    const it = selected;
    const st = state(it);
    const slot = slotOf(it);
    const w = W.wallet();
    const forWho = slot && ['hat', 'glasses', 'flame'].includes(slot) ? ' · ' + (who() < 0 ? t('forAll') : t('forOne', LUMI_NAMES[target()])) : '';
    const title = `<span class="act-name"><b>${label(it)}</b><small class="r-${it.rarity || 'common'}">${it.kind === 'hints' ? '' : t('rarity.' + (it.rarity || 'common'))}${forWho}</small></span>`;
    if (st === 'buy') {
      const price = it.kind === 'hints' ? it.price : W.priceOf(it.id);
      if (w.coins >= price) {
        bar.innerHTML = `${title}<button class="btn btn-primary buy-btn" data-a="buy">${t('buy')} · ${coins(price)}</button>`;
        bar.querySelector('[data-a=buy]').onclick = () => purchase(it);
      } else {
        const pct = Math.round((w.coins / price) * 100);
        bar.innerHTML = `${title}<span class="need"><span class="need-txt">${t('missingShort', price - w.coins)}</span><span class="need-bar"><i style="width:${pct}%"></i></span></span>`;
      }
    } else if (st === 'locked') {
      bar.innerHTML = `${title}<span class="need-txt">${condition(it.earned.need)}</span>`;
    } else if (st === 'owned') {
      bar.innerHTML = `${title}<button class="btn btn-primary" data-a="wear">${t('wear')}</button>`;
      bar.querySelector('[data-a=wear]').onclick = () => equip(slot, it.id);
    } else {
      const free = it.id === 'none' || it.id === 'classic';
      bar.innerHTML = `${title}${free ? `<b class="worn">${t('worn')}</b>` : `<button class="btn btn-ghost" data-a="off">${t('takeOff')}</button>`}`;
      const off = bar.querySelector('[data-a=off]');
      if (off) off.onclick = () => equip(slot, slot === 'hat' || slot === 'glasses' ? 'none' : 'classic');
    }
  }

  function equip(slot, id) {
    W.wear(slot, id, target());
    if (slot === 'hat') {
      save.data.hat = W.look(0).hat;
      persist();
    }
    sound.sfx('equip');
    scene.setPreview({ slot, id });
    scene.hop();
    renderPanelKeepScroll();
    renderAction();
    onChange();
  }

  function purchase(it) {
    const r = W.buy(it.id);
    if (!r.ok) {
      sound.sfx('invalid');
      if (r.why === 'coins') say('poor');
      return;
    }
    root().querySelector('[data-a=buy]')?.setAttribute('disabled', '');
    coinFlight(it.kind === 'hints' ? 6 : 10);
    setPurse(W.wallet().coins);
    setTimeout(() => {
      if (it.kind === 'hints') {
        sound.sfx('buy');
        toast(t('hintsBought', it.qty), 1800);
        root().querySelector('.hint-pill b').textContent = W.wallet().hints;
        say('buyHints', 'happy');
      } else {
        const slot = slotOf(it);
        W.wear(slot, it.id, target());
        if (slot === 'hat') save.data.hat = W.look(0).hat;
        persist();
        scene.setPreview({ slot, id: it.id });
        scene.celebrate(it.rarity);
        sound.sfx('fanfare', RARITIES.indexOf(it.rarity));
        say(it.rarity === 'legendary' ? 'legendaryBought' : 'buy', 'happy');
      }
      for (const m of r.milestones || []) milestoneReached(m);
      renderPanelKeepScroll();
      renderAction();
      onChange();
    }, 650);
  }

  function milestoneReached(m) {
    setTimeout(() => {
      setPurse(W.wallet().coins);
      sound.sfx('gift');
      toast(`📖 ${t('milestoneToast', m.pct, m.coins)}${m.pct === 100 ? ' · ' + tr(COLLECTOR.name) : ''}`, 3200);
      say('collection', 'happy');
    }, 900);
  }

  // ------------------------------------------------------------ featured

  function renderFeatured(panel) {
    const w = W.wallet();
    // Daily gift, with the week's streak.
    const gs = W.giftState();
    const streak = gs.available ? gs.day - 1 : gs.day;
    const inWeek = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
    const dots = Array.from({ length: 7 }, (_, i) => `<i class="${i < inWeek ? 'on' : ''}${i === 6 ? ' big' : ''}">${i === 6 ? '💡' : ''}</i>`).join('');
    const gift = el('div', 'feat gift-card' + (gs.available ? ' ready' : ''));
    gift.innerHTML = `<div class="feat-ico">🎁</div><div class="grow"><b>${t('giftTitle')}</b><small>${gs.available ? `${t('giftDay', gs.day)} : +${gs.gift.coins} ✦${gs.gift.hints ? ' + 💡' : ''}` : t('giftTomorrow', gs.next.coins)}</small><div class="streak-dots">${dots}</div></div>${gs.available ? `<button class="btn btn-primary btn-small" data-a="gift">${t('giftOpen')}</button>` : ''}`;
    panel.appendChild(gift);
    const gb = gift.querySelector('[data-a=gift]');
    if (gb) {
      gb.onclick = () => {
        const g = W.claimGift();
        if (!g) return;
        sound.unlock();
        sound.sfx('gift');
        coinFlight(7);
        setPurse(W.wallet().coins);
        if (g.hints) root().querySelector('.hint-pill b').textContent = W.wallet().hints;
        toast(`🎁 +${g.coins} ✦${g.hints ? ` · +${g.hints} 💡` : ''}`, 2200);
        say('gift', 'happy');
        scene.celebrate('rare');
        setTimeout(() => {
          renderPanelKeepScroll();
          onChange();
        }, 400);
      };
    }
    // Today's offer, with a countdown to midnight.
    const o = W.offer();
    if (o) {
      if (w.offerSeen !== o.day) {
        w.offerSeen = o.day;
        persist();
      }
      const box = el('div', `feat offer-card r-${o.item.rarity}`);
      box.appendChild(preview(canvas(104, 92), o.item));
      box.insertAdjacentHTML(
        'beforeend',
        `<div class="grow"><span class="feat-kicker">${t('offerTitle')} · <span class="countdown"></span></span><b>${nameOf(o.item)}</b><small class="r-${o.item.rarity}">${t('rarity.' + o.item.rarity)}</small>
        <div class="offer-price">${o.bought ? `<b class="owned">✓ ${t('ownedShort')}</b>` : `<s>${o.full}</s> ${coins(o.price)} <i class="deal">−30 %</i>`}</div></div>`,
      );
      if (!o.bought) {
        const b = el('button', 'btn btn-primary btn-small', t('see'));
        b.onclick = () => {
          click();
          goTab(o.item.slot);
          choose(COSMETICS.find((c) => c.id === o.item.id));
          root().querySelector(`.sk-card[data-item="${o.item.id}"]`)?.scrollIntoView({ block: 'nearest' });
        };
        box.appendChild(b);
      }
      panel.appendChild(box);
      const tick = () => {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const m = Math.max(0, Math.round((end - now) / 60000));
        const cd = box.querySelector('.countdown');
        if (cd) cd.textContent = t('endsIn', Math.floor(m / 60), m % 60);
      };
      tick();
      offerTimer = setInterval(tick, 30000);
    }
    // Surprise chest.
    const cs = W.chestState();
    const chest = el('div', 'feat chest-card');
    const ccv = canvas(96, 90);
    A.paint(ccv, (g) => {
      g.scale(2, 2);
      drawChest(g, 48, 60, 66, 0, 'rgba(255,220,120,', 0);
    });
    chest.appendChild(ccv);
    chest.insertAdjacentHTML(
      'beforeend',
      `<div class="grow"><b>${t('chestTitle')}</b><small>${cs.left ? t('chestText', cs.left) : t('chestEmpty')}</small>
      <div class="odds">${RARITIES.map((r) => `<span class="r-${r}">${t('rarity.' + r)} ${ODDS[r]} %</span>`).join('')}</div>
      ${cs.left ? `<small class="pity">${cs.guaranteed ? t('pityNow') : t('pityIn', cs.untilHigh)}</small>` : ''}</div>`,
    );
    if (cs.left) {
      const b = el('button', 'btn btn-primary btn-small chest-btn', `${t('chestOpen')} · ${coins(cs.price)}`);
      b.onclick = () => openChest();
      if (w.coins < cs.price) b.classList.add('poor');
      chest.appendChild(b);
    }
    panel.appendChild(chest);
    // Collection progress.
    const col = W.collection();
    const cc = el('div', 'feat coll-card');
    cc.innerHTML = `<div class="feat-ico">📖</div><div class="grow"><b>${t('collectionTitle')} · ${col.owned}/${col.total}</b><span class="need-bar"><i style="width:${col.pct}%"></i></span><small>${col.next ? t('nextMilestone', col.next.pct, col.next.coins) : t('collectionDone')}</small></div>`;
    const cb = el('button', 'btn btn-ghost btn-small', t('see'));
    cb.onclick = () => (click(), goTab('collection'));
    cc.appendChild(cb);
    panel.appendChild(cc);
  }

  // ------------------------------------------------------------ chest ceremony

  function openChest(free = false) {
    sound.unlock();
    const r = W.openChest(Math.random, { free });
    if (!r.ok) {
      sound.sfx('invalid');
      if (r.why === 'coins') {
        toast(t('missingCoins', r.missing), 2200);
        say('poor');
      }
      return;
    }
    if (!free) {
      coinFlight(8);
      setPurse(W.wallet().coins);
    }
    const it = r.item;
    const [hex, prefix] = RARITY_COLORS[it.rarity];
    const ov = el('div', 'chest-overlay');
    const size = Math.min(window.innerWidth - 40, 340);
    const cv = canvas(size, size);
    ov.appendChild(cv);
    const info = el('div', 'chest-info');
    ov.appendChild(info);
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    const g = cv.getContext('2d');
    const fx = new Particles();
    const t0 = performance.now();
    let opened = false;
    let lastTick = 0;
    let done = false;
    let last = t0;
    const close = (wearIt) => {
      click();
      ov.classList.remove('show');
      setTimeout(() => ov.remove(), 300);
      if (wearIt) {
        W.wear(it.slot, it.id, target());
        if (it.slot === 'hat') save.data.hat = W.look(0).hat;
        persist();
        if (tab !== 'featured' && tab !== it.slot) goTab(it.slot);
        scene.setPreview({ slot: it.slot, id: it.id });
        scene.celebrate(it.rarity);
      }
      W.markSeen([it.id]);
      for (const m of r.milestones || []) milestoneReached(m);
      say(it.rarity === 'legendary' ? 'legendaryBought' : 'buy', 'happy');
      renderPanelKeepScroll();
      renderAction();
      onChange();
    };
    const frame = (now) => {
      if (!ov.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = (now - t0) / 1000;
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.clearRect(0, 0, size, size);
      const cx = size / 2;
      const shake = k < 1.6 ? Math.pow(k / 1.6, 2) : 0;
      const open = k < 1.6 ? 0 : Math.min(1, (k - 1.6) / 0.3);
      if (k < 1.6 && k - lastTick > 0.34 - shake * 0.22) {
        lastTick = k;
        sound.sfx('chestShake', shake);
      }
      if (open > 0) {
        // Rays in the rarity's colour.
        g.save();
        g.translate(cx, size * 0.6);
        g.rotate(k * 0.5);
        for (let i = 0; i < 12; i++) {
          g.rotate(A.TAU / 12);
          g.fillStyle = prefix + 0.2 * open + ')';
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(-size * 0.08, -size * 0.75);
          g.lineTo(size * 0.08, -size * 0.75);
          g.closePath();
          g.fill();
        }
        g.restore();
      }
      drawChest(g, cx, size * 0.74, size * 0.5, open, prefix, shake);
      if (open > 0 && !opened) {
        opened = true;
        sound.sfx('chestOpen');
        setTimeout(() => sound.sfx('fanfare', RARITIES.indexOf(it.rarity)), 250);
        fx.emit('star', cx, size * 0.62, it.rarity === 'legendary' ? 40 : 24, { speed: 230, life: 1.4, size: 7, color: prefix });
        fx.emit('confetti', cx, size * 0.62, 30, { speed: 260, life: 2, size: 9, gravity: 300, vy: -200, drag: 0.8, fill: 'random' });
      }
      if (open >= 1) {
        const u = Math.max(0, Math.min(1, (k - 1.9) / 0.6));
        const ease = 1 - Math.pow(1 - u, 3);
        const iy = size * (0.6 - 0.28 * ease);
        A.glow(g, cx, iy, size * 0.32, prefix, 0.85);
        g.save();
        g.translate(cx, iy);
        g.scale(0.35 + 0.65 * ease, 0.35 + 0.65 * ease);
        drawBig(g, it, size, k);
        g.restore();
      }
      fx.update(dt);
      fx.draw(g);
      if (k > 2.4 && !done) {
        done = true;
        info.innerHTML = `<span class="chest-rar" style="color:${hex}">${t('rarity.' + it.rarity)}</span><b>${nameOf(it)}</b><span class="new-ribbon">${t('newRibbon')} !</span>
          <div class="actions"><button class="btn btn-ghost" data-a="later">${t('great')}</button><button class="btn btn-primary" data-a="wear">${t('wear')}</button></div>`;
        info.classList.add('show');
        info.querySelector('[data-a=later]').onclick = () => close(false);
        info.querySelector('[data-a=wear]').onclick = () => close(true);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** The item, large, centred at (0, 0), for the chest ceremony. */
  function drawBig(g, it, size, time) {
    const s = size * 0.42;
    if (it.slot === 'trail') {
      for (let i = 0; i < 20; i++) A.drawTrailDot(g, it.id, -s * 0.9 + i * s * 0.07, Math.sin(i / 4) * s * 0.15, s * 0.6, (i + 1) / 20, A.LUMI[0].glow, i * 2, time);
      A.drawLumi(g, s * 0.55, s * 0.35, s * 0.55, { color: 0, dir: 1, t: time, mood: 'happy' });
    } else if (it.slot === 'party') {
      g.font = `${Math.round(s * 0.7)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(PARTY_EMOJI[it.id] || '✨', 0, 0);
    } else {
      A.drawLumi(g, 0, s * 0.45, s, { color: 0, dir: 2, t: time, mood: 'happy', hat: it.slot === 'hat' ? it.id : null, glasses: it.slot === 'glasses' ? it.id : null, flameStyle: it.slot === 'flame' ? it.id : 'classic' });
    }
  }

  // ------------------------------------------------------------ collection

  function renderCollection(panel) {
    const col = W.collection();
    const w = W.wallet();
    const track = el('div', 'milestones');
    track.innerHTML = `<b>${t('collectionTitle')} · ${col.owned}/${col.total} (${col.pct} %)</b><span class="need-bar big"><i style="width:${col.pct}%"></i></span>
      <div class="ms-row">${MILESTONES.map((m) => `<span class="ms ${w.milestones[m.pct] ? 'got' : ''}"><b>${m.pct} %</b><small>+${m.coins} ✦${m.pct === 100 ? ' 👑' : ''}</small></span>`).join('')}</div>`;
    panel.appendChild(track);
    for (const slot of WEARABLE) {
      const items = slot === 'hat' ? [...earnedHats().filter((h) => h.id !== 'none'), ...COSMETICS.filter((c) => c.slot === slot)] : COSMETICS.filter((c) => c.slot === slot);
      const have = items.filter((i) => W.owns(i.id, i.slot)).length;
      panel.insertAdjacentHTML('beforeend', `<h3 class="coll-h">${TAB_ICONS[slot]} ${t('shopTab.' + slot)} <small>${have}/${items.length}</small></h3>`);
      const grid = el('div', 'sk-grid small');
      for (const it of items) {
        const owned = W.owns(it.id, it.slot);
        const b = el('button', `sk-card mini r-${it.rarity}${owned ? '' : ' unknown'}`);
        b.appendChild(preview(canvas(64, 56), it, { silhouette: !owned }));
        b.insertAdjacentHTML('beforeend', `<span class="sk-name">${owned ? nameOf(it) : '???'}</span>`);
        b.onclick = () => {
          if (owned || !it.earned) {
            click();
            goTab(it.slot);
            choose(it);
          } else {
            sound.sfx('tap');
            say('earnIt');
          }
        };
        grid.appendChild(b);
      }
      panel.appendChild(grid);
    }
  }

  // ------------------------------------------------------------ earning and journal

  function infoDialog() {
    const w = W.wallet();
    const rows = [
      [t('earn.first'), `+${REWARD.firstClear}`],
      [t('earn.star'), `+${REWARD.star}`],
      [t('earn.bonus'), `+${REWARD.bonusClear}`],
      [t('earn.world'), `+${REWARD.world}`],
      [t('earn.achievement'), `+${REWARD.achievement}`],
      [t('earn.daily', REWARD.dailyStreak, REWARD.dailyStreakMax), `+${REWARD.daily}`],
      [t('earn.gift'), `+${GIFT[0]}…${GIFT[GIFT.length - 1]}`],
      ...MILESTONES.map((m) => [t('milestoneToast', m.pct, m.coins).split(':')[0], `+${m.coins}`]),
    ];
    const fr = api.getLang() === 'fr';
    const when = (ts) => {
      const d = new Date(ts);
      return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
    };
    const what = (e) => {
      const it = e.id ? findItem(e.id) || COSMETICS.find((c) => c.id === e.id) : null;
      if ((e.k === 'buy' || e.k === 'chest') && it) return `${t('log.' + e.k)} · ${label(it)}`;
      if (e.k === 'milestone') return `${t('log.milestone')} · ${e.id} %`;
      return t('log.' + e.k) + (e.id && e.k === 'win' ? ` · ${e.id}` : '');
    };
    const box = el('div', 'shop-info');
    box.innerHTML = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
      <h2>${t('info')}</h2><p class="shop-note">${t('earnHelp')}</p>
      <div class="list">${rows.map(([a, b]) => `<div class="row"><span class="grow">${a}</span><b class="gain">${b} ✦</b></div>`).join('')}</div>
      <h3>${journalTitle()}</h3><p class="shop-note">${t('logTotals', w.earned, w.spent, w.hintsUsed)}</p>
      <div class="list log">${w.log.length ? w.log.map((e) => `<div class="row"><span class="grow">${what(e)}<small>${when(e.t)}</small></span><b class="${e.n >= 0 ? 'gain' : 'loss'}">${e.n >= 0 ? '+' : '−'}${Math.abs(e.n)} ✦</b></div>`).join('') : `<p>${t('logEmpty')}</p>`}</div>`;
    const m = openModal(box);
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  }

  // ------------------------------------------------------------ hints in a level

  /** No hint left: buy one on the spot (onUse runs when it is paid for). */
  function quickBuyHint(onUse) {
    const w = W.wallet();
    const enough = w.coins >= HINT_PRICE;
    const box = el('div');
    box.innerHTML = `<h2>${t('noHints')}</h2>
      <p>${enough ? t('buyHintText', HINT_PRICE, w.coins) : t('missingCoins', HINT_PRICE - w.coins)}</p>
      ${enough ? '' : `<p class="shop-note">${t('earnHelp')}</p>`}
      <div class="actions col">
        ${enough ? `<button class="btn btn-primary" data-a="buy">${t('buyHint')} · ${coins(HINT_PRICE)}</button>` : ''}
        <button class="btn btn-ghost btn-small" data-a="shop">${COIN_SVG}${t('shop')}</button>
        <button class="btn btn-ghost btn-small" data-a="close">${t('later')}</button>
      </div>`;
    const m = openModal(box);
    const bb = box.querySelector('[data-a=buy]');
    if (bb) {
      bb.onclick = () => {
        if (!W.buyAndUseHint()) return;
        sound.sfx('buy');
        m.close();
        onUse();
        onChange();
      };
    }
    box.querySelector('[data-a=shop]').onclick = () => (click(), m.close(), open('hints'));
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
  }

  /** Players from before the shop: what their progress was worth. */
  function welcome(n) {
    const box = el('div');
    box.innerHTML = `<div class="welcome-coins">${COIN_SVG}</div><h2>${t('shopOpens')}</h2>
      <p>${t('shopWelcome', n, W.wallet().hints)}</p>
      <div class="actions"><button class="btn btn-ghost" data-a="later">${t('later')}</button><button class="btn btn-primary" data-a="shop">${t('seeShop')}</button></div>`;
    const m = openModal(box);
    sound.sfx('gift');
    box.querySelector('[data-a=later]').onclick = () => (click(), m.close());
    box.querySelector('[data-a=shop]').onclick = () => (click(), m.close(), open('featured'));
  }

  /** A tap on the stage picks who to dress (or everyone, if they all share a look). */
  function stageTap(px, py) {
    const c = scene.hit(px, py);
    if (c >= 0 && !W.wallet().same) setWho(c);
    else if (c >= 0) {
      scene.hop(c);
      sound.sfx('tap');
    }
  }

  /** The chest of the week (weekly quests): the shop opens and the chest is free. False when nothing is left to win. */
  function freeChest() {
    if (!W.chestState().left) return false;
    open('featured');
    setTimeout(() => openChest(true), 450);
    return true;
  }

  return { open, pill, quickBuyHint, welcome, coins, stageTap, attention, say, freeChest, refresh: () => root()?.firstChild && build() };
}
