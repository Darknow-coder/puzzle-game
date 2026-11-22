// The shop: éclats earned by playing are spent on hints and cosmetics. Also
// the daily gift, how to earn more, and the journal of what came in and out.
import * as A from '../game/art.js';
import * as W from '../wallet.js';
import { CATALOG, findItem, REWARD, GIFT, HINT_PRICE } from '../economy.js';
import { HATS_INFO, TRAILS } from '../data/meta.js';

export const COIN_SVG = '<svg class="coin-ico" viewBox="0 0 24 24"><path d="M12 1.8l2.7 7.5 7.5 2.7-7.5 2.7-2.7 7.5-2.7-7.5L1.8 12l7.5-2.7z"/></svg>';
const TABS = ['hints', 'hats', 'trails', 'earn', 'log'];

export function createShop(api) {
  const { el, t, tr, getLang, click, sound, openModal, toast, ICONS, save, persist, hatUnlocked, summary, onChange } = api;
  const coins = (n) => `<span class="coins">${COIN_SVG}${n}</span>`;
  let current = null; // the open shop modal, if any

  /** Small "✦ 245" button for the title and the map; a dot when the gift waits. */
  function pill() {
    const w = W.wallet();
    const gift = W.giftState().available;
    return `<button class="coin-pill" data-act="shop" aria-label="${t('shop')}">${COIN_SVG}<b>${w.coins}</b>${gift ? '<i class="gift-dot"></i>' : ''}</button>`;
  }

  function hintIcon(cv, n) {
    A.paint(cv, (g) => {
      g.scale(2, 2);
      A.glow(g, 32, 28, 34, 'rgba(255,210,90,', 0.9);
      g.fillStyle = '#ffe07a';
      g.beginPath();
      g.arc(32, 26, 15, 0, A.TAU);
      g.fill();
      g.fillStyle = '#c9b48a';
      A.roundRect(g, 25, 40, 14, 9, 3);
      g.fill();
      g.strokeStyle = '#ffb547';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(27, 28);
      g.quadraticCurveTo(32, 20, 37, 28);
      g.stroke();
      if (n > 1) {
        g.font = '700 15px Fredoka, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = '#7a3fb0';
        g.fillText('×' + n, 50, 58);
      }
    });
    return cv;
  }

  function trailPreview(cv, id) {
    A.paint(cv, (g) => {
      g.scale(2, 2);
      const S = 46;
      const col = A.LUMI[0].glow;
      for (let i = 0; i < 18; i++) {
        const k = (i + 1) / 18;
        const x = 8 + i * 5.2;
        const y = 44 - Math.sin(i / 5) * 14;
        A.drawTrailDot(g, id, x, y, S, k, col, i * 2, 1.3);
      }
      A.drawLumi(g, 106, 52, 40, { color: 0, dir: 1, t: 1.2, mood: 'happy' });
    });
    return cv;
  }

  function canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w * 2;
    cv.height = h * 2;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    return cv;
  }

  /** A price button that asks for a second tap before spending. */
  function priceButton(it, onBought) {
    const b = el('button', 'btn btn-primary btn-small price-btn', coins(it.price));
    let armed = 0;
    b.onclick = () => {
      sound.unlock();
      const w = W.wallet();
      if (w.coins < it.price) {
        sound.sfx('invalid');
        b.classList.remove('shake');
        void b.offsetWidth;
        b.classList.add('shake');
        toast(t('missingCoins', it.price - w.coins), 2400);
        return;
      }
      if (!armed) {
        click();
        b.innerHTML = t('confirmBuy');
        b.classList.add('armed');
        armed = setTimeout(() => {
          armed = 0;
          b.innerHTML = coins(it.price);
          b.classList.remove('armed');
        }, 3000);
        return;
      }
      clearTimeout(armed);
      armed = 0;
      const r = W.buy(it.id);
      if (!r.ok) {
        sound.sfx('invalid');
        return;
      }
      sound.sfx('buy');
      if (it.kind === 'hat') {
        save.data.hatsSeen[it.id] = 1;
        save.data.hat = it.id;
        persist();
      }
      if (it.kind === 'trail') W.setTrail(it.id);
      toast(t('bought'), 1600);
      onBought?.();
      onChange();
    };
    return b;
  }

  function open(tab = 'hints') {
    if (current) current.close();
    const box = el('div', 'shop');
    let active = TABS.includes(tab) ? tab : 'hints';
    const render = () => {
      const w = W.wallet();
      const gs = W.giftState();
      box.innerHTML = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
        <h2>${t('shop')}</h2>
        <div class="shop-purse"><span class="coin-pill big">${COIN_SVG}<b>${w.coins}</b></span><span class="hint-pill">${t('hintsLeft', w.hints)}</span></div>
        <div class="shop-gift ${gs.available ? 'ready' : ''}">${gs.available
          ? `<span>🎁 <b>${t('giftTitle')}</b> · ${t('giftDay', gs.day)} : +${gs.gift.coins} ✦${gs.gift.hints ? ` +${gs.gift.hints} 💡` : ''}</span><button class="btn btn-primary btn-small" data-a="gift">${t('giftOpen')}</button>`
          : `<span>🎁 ${t('giftTomorrow', gs.next.coins)}</span>`}</div>
        <div class="seg shop-tabs">${TABS.map((k) => `<button data-tab="${k}" class="${k === active ? 'on' : ''}">${t('shopTab.' + k)}</button>`).join('')}</div>
        <div class="shop-body"></div>`;
      const body = box.querySelector('.shop-body');
      if (active === 'hints') renderHints(body, render);
      else if (active === 'hats') renderHats(body, render);
      else if (active === 'trails') renderTrails(body, render);
      else if (active === 'earn') renderEarn(body);
      else renderLog(body);
      box.querySelectorAll('[data-tab]').forEach((b) => {
        b.onclick = () => {
          click();
          active = b.dataset.tab;
          render();
        };
      });
      const gb = box.querySelector('[data-a=gift]');
      if (gb) {
        gb.onclick = () => {
          const g = W.claimGift();
          if (!g) return;
          sound.unlock();
          sound.sfx('gift');
          toast(`🎁 +${g.coins} ✦${g.hints ? ` · +${g.hints} 💡` : ''}`, 2200);
          render();
          onChange();
        };
      }
      box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
    };
    render();
    const m = openModal(box, {
      onClose: () => {
        if (current === m) current = null;
      },
    });
    current = m;
    return m;
  }

  function renderHints(body, rerender) {
    body.insertAdjacentHTML('beforeend', `<p class="shop-note">${t('hintsHelp')}</p>`);
    const single = HINT_PRICE;
    for (const it of CATALOG.filter((c) => c.kind === 'hints')) {
      const row = el('div', 'shop-item');
      row.appendChild(hintIcon(canvas(64, 64), it.qty));
      const deal = Math.round((1 - it.price / (single * it.qty)) * 100);
      row.insertAdjacentHTML('beforeend', `<span class="grow"><b>${t('hintPack', it.qty)}</b><small>${deal > 0 ? `<span class="deal">−${deal} %</span> ` : ''}${t('perHint', Math.round((it.price / it.qty) * 10) / 10)}</small></span>`);
      row.appendChild(priceButton(it, rerender));
      body.appendChild(row);
    }
  }

  function renderHats(body, rerender) {
    const sum = summary();
    const grid = el('div', 'hat-grid');
    for (const h of HATS_INFO) {
      const un = hatUnlocked(h, sum);
      const sel = save.data.hat === h.id;
      const card = el('div', 'hat' + (un ? '' : ' locked') + (sel ? ' sel' : ''));
      const cv = canvas(70, 70);
      A.paint(cv, (g) => {
        g.scale(2, 2);
        A.drawLumi(g, 35, 58, 46, { color: 0, dir: 2, t: 1.3, hat: h.id, mood: un ? 'happy' : 'idle', alpha: un || h.need.shop ? 1 : 0.45 });
      });
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', `<span>${tr(h.name)}</span>`);
      if (un) {
        card.classList.add('wearable');
        card.insertAdjacentHTML('beforeend', `<span class="req">${sel ? t('worn') : t('wear')}</span>`);
        card.onclick = () => {
          click();
          save.data.hat = h.id;
          persist();
          rerender();
          onChange();
        };
      } else if (h.need.shop) {
        card.appendChild(priceButton(findItem(h.id), rerender));
      } else {
        const n = h.need;
        let req = '';
        if (n.stars !== undefined) req = t('unlockAt', n.stars);
        else if (n.world !== undefined) req = `${t('world')} ${n.world + 1} ✓`;
        else if (n.bonus !== undefined) req = `☄ ${t('bonus')}`;
        else if (n.perfect) req = '★★★ ×' + sum.totalLevels;
        card.insertAdjacentHTML('beforeend', `<span class="req">${ICONS.lock.replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-1px"')} ${req}</span>`);
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }

  function renderTrails(body, rerender) {
    const w = W.wallet();
    body.insertAdjacentHTML('beforeend', `<p class="shop-note">${t('trailsHelp')}</p>`);
    for (const tr0 of TRAILS) {
      const it = findItem(tr0.id);
      const owned = tr0.id === 'classic' || W.owns(tr0.id);
      const row = el('div', 'shop-item' + (w.trail === tr0.id ? ' sel' : ''));
      row.appendChild(trailPreview(canvas(128, 72), tr0.id));
      row.insertAdjacentHTML('beforeend', `<span class="grow"><b>${tr(tr0.name)}</b></span>`);
      if (owned) {
        const b = el('button', 'btn btn-ghost btn-small', w.trail === tr0.id ? t('used') : t('use'));
        b.disabled = w.trail === tr0.id;
        b.onclick = () => {
          click();
          W.setTrail(tr0.id);
          rerender();
          onChange();
        };
        row.appendChild(b);
      } else row.appendChild(priceButton(it, rerender));
      body.appendChild(row);
    }
  }

  function renderEarn(body) {
    const rows = [
      [t('earn.first'), `+${REWARD.firstClear}`],
      [t('earn.star'), `+${REWARD.star}`],
      [t('earn.bonus'), `+${REWARD.bonusClear}`],
      [t('earn.world'), `+${REWARD.world}`],
      [t('earn.achievement'), `+${REWARD.achievement}`],
      [t('earn.daily', REWARD.dailyStreak, REWARD.dailyStreakMax), `+${REWARD.daily}`],
      [t('earn.gift'), `+${GIFT[0]}…${GIFT[GIFT.length - 1]}`],
    ];
    body.insertAdjacentHTML(
      'beforeend',
      `<p class="shop-note">${t('earnHelp')}</p><div class="list">${rows.map(([a, b]) => `<div class="row"><span class="grow">${a}</span><b class="gain">${b} ✦</b></div>`).join('')}</div>`,
    );
  }

  function renderLog(body) {
    const w = W.wallet();
    const fr = getLang() === 'fr';
    const when = (ts) => {
      const d = new Date(ts);
      const same = d.toDateString() === new Date().toDateString();
      return same ? d.toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
    };
    const label = (e) => {
      if (e.k === 'buy') {
        const it = findItem(e.id);
        const name = it?.kind === 'hints' ? t('hintPack', it.qty) : tr((it?.kind === 'hat' ? HATS_INFO : TRAILS).find((x) => x.id === e.id)?.name) || e.id;
        return `${t('log.buy')} · ${name}`;
      }
      return t('log.' + e.k) + (e.id && e.k !== 'achievement' ? ` · ${e.id}` : '');
    };
    body.insertAdjacentHTML(
      'beforeend',
      `<p class="shop-note">${t('logTotals', w.earned, w.spent, w.hintsUsed)}</p>
      <div class="list log">${w.log.length ? w.log.map((e) => `<div class="row"><span class="grow">${label(e)}<small>${when(e.t)}</small></span><b class="${e.n >= 0 ? 'gain' : 'loss'}">${e.n >= 0 ? '+' : '−'}${Math.abs(e.n)} ✦</b></div>`).join('') : `<p>${t('logEmpty')}</p>`}</div>`,
    );
  }

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
    box.querySelector('[data-a=shop]').onclick = () => (click(), m.close(), open(enough ? 'hints' : 'earn'));
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
    box.querySelector('[data-a=shop]').onclick = () => (click(), m.close(), open('hats'));
  }

  return { open, pill, quickBuyHint, welcome, coins };
}
