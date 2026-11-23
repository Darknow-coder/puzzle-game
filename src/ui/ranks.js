// The rankings, on screen: the pseudo chosen at first launch (and changed
// later), the player's profile, the rankings window (each level, the daily
// puzzle, everyone), and the player's place on the victory card.
import * as A from '../game/art.js';
import { LUMI_NAMES } from '../engine/core.js';
import { checkName, cleanName, suggestName, variantOf, NAME_MAX } from '../online/names.js';
import { formatTime, ordinal, isDailyBoard, UNKNOWN } from '../online/score.js';

export const PODIUM_SVG =
  '<svg viewBox="0 0 24 24"><path d="M9 21v-9h6v9M3 21v-6h6M15 21v-4h6v4M2 21h20"/><path d="m12 3 .95 1.9 2.05.3-1.5 1.45.35 2.05L12 7.75l-1.85.95.35-2.05L9 5.2l2.05-.3z"/></svg>';
const DICE_SVG =
  '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><g fill="currentColor" stroke="none"><circle cx="9" cy="9" r="1.4"/><circle cx="15" cy="15" r="1.4"/><circle cx="15" cy="9" r="1.4"/><circle cx="9" cy="15" r="1.4"/></g></svg>';
const BULB_SVG = '<svg viewBox="0 0 24 24" class="rk-bulb"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z"/></svg>';
const FLAG_SVG = '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
export const FRIEND_SVG = '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18 8v6M15 11h6"/></svg>';
const SWORDS_SVG = '<svg viewBox="0 0 24 24"><path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M8 15l-3 3 1 1 3-3M16 15l3 3-1 1-3-3"/></svg>';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createRanks(api) {
  const { el, t, getLang, click, sound, openModal, toast, confirmBox, ICONS, online } = api;
  const lang = () => getLang();

  // ------------------------------------------------------------- avatars

  /** A small portrait of a player's Lumignon, wearing what they wear. */
  function avatar(o, size = 40, cls = 'rk-ava') {
    const cv = document.createElement('canvas');
    cv.className = cls;
    cv.width = size * 2;
    cv.height = size * 2;
    cv.style.width = cv.style.height = size + 'px';
    A.paint(cv, (g) => {
      g.scale(2, 2);
      A.drawLumi(g, size / 2, size * 0.95, size * 0.68, { color: o.color | 0, dir: 2, t: 1.2, mood: 'happy', hat: o.hat, glasses: o.glasses, flameStyle: o.flame, noShadow: true });
    });
    return cv;
  }
  const myLook = () => {
    const me = online.me();
    const d = api.dress(me.color);
    return { color: me.color, hat: d.hat, glasses: d.glasses, flame: d.flameStyle };
  };

  // ----------------------------------------------------------- the pseudo

  /** The sign the player's Lumignon stands on, with the pseudo painted on it. */
  function signPainter(cv, getState) {
    let hopT = -1;
    let raf = 0;
    const t0 = performance.now();
    const draw = (now) => {
      if (!cv.isConnected) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = cv.clientWidth || 300;
      const H = cv.clientHeight || 140;
      if (cv.width !== Math.round(W * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const time = (now - t0) / 1000;
      const st = getState();
      // Fireflies drifting around.
      for (let i = 0; i < 4; i++) {
        const fx = W * (0.12 + 0.25 * i) + Math.sin(time * 0.7 + i * 2) * 14;
        const fy = H * (0.22 + 0.12 * (i % 2)) + Math.cos(time * 0.9 + i) * 8;
        A.drawFirefly(g, fx, fy, 26, time, i * 1.7, 0.85);
      }
      // The plank and its posts.
      const name = st.name || '';
      const shown = name || '· · ·';
      let fs = 27;
      g.font = `600 ${fs}px Fredoka, sans-serif`;
      const maxW = W - 70;
      while (fs > 14 && g.measureText(shown).width > maxW - 34) {
        fs -= 1;
        g.font = `600 ${fs}px Fredoka, sans-serif`;
      }
      const tw = g.measureText(shown).width;
      const pw = Math.min(maxW, Math.max(150, tw + 40));
      const ph = 48;
      const cx = W / 2 - 10;
      const top = H - 26 - ph;
      g.fillStyle = 'rgba(20,10,40,0.3)';
      A.ellipse(g, cx, H - 8, pw * 0.48, 6);
      g.fill();
      g.fillStyle = '#6b4325';
      for (const px of [cx - pw * 0.3, cx + pw * 0.3]) {
        g.beginPath();
        A.roundRect(g, px - 5, top + ph - 6, 10, H - 8 - (top + ph - 6), 3);
        g.fill();
      }
      const sway = Math.sin(time * 1.4) * 0.012;
      g.save();
      g.translate(cx, top + ph / 2);
      g.rotate(sway);
      const wood = g.createLinearGradient(0, -ph / 2, 0, ph / 2);
      wood.addColorStop(0, '#c48a55');
      wood.addColorStop(1, '#8f5c33');
      g.fillStyle = wood;
      g.strokeStyle = '#5a361b';
      g.lineWidth = 3;
      g.beginPath();
      A.roundRect(g, -pw / 2, -ph / 2, pw, ph, 12);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(90,54,27,0.35)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-pw / 2 + 10, -4);
      g.lineTo(pw / 2 - 10, -6);
      g.moveTo(-pw / 2 + 14, 9);
      g.lineTo(pw / 2 - 18, 11);
      g.stroke();
      g.fillStyle = '#5a361b';
      for (const nx of [-pw / 2 + 9, pw / 2 - 9]) {
        g.beginPath();
        g.arc(nx, -ph / 2 + 9, 2.2, 0, A.TAU);
        g.fill();
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(60,30,10,0.55)';
      g.fillText(shown, 0, 3);
      g.fillStyle = name ? '#fff4d6' : 'rgba(255,244,214,0.45)';
      g.fillText(shown, 0, 1);
      g.restore();
      // The Lumignon on the sign, hopping when the name changes.
      let hop = 0;
      let squash = 0;
      if (hopT >= 0) {
        const k = (now - hopT) / 420;
        if (k >= 1) hopT = -1;
        else {
          hop = Math.sin(k * Math.PI) * 16;
          squash = k < 0.15 ? 0.3 * (1 - k / 0.15) : k > 0.85 ? 0.25 * ((k - 0.85) / 0.15) : -0.12;
        }
      }
      const d = api.dress(st.color);
      A.drawLumi(g, cx + pw / 2 - 22, top + 2 - hop, 44, {
        color: st.color,
        dir: 3,
        t: time,
        mood: st.mood || 'happy',
        squash,
        hat: d.hat,
        glasses: d.glasses,
        flameStyle: d.flameStyle,
        noShadow: true,
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return {
      hop: () => (hopT = performance.now()),
      stop: () => cancelAnimationFrame(raf),
    };
  }

  /**
   * The pseudo form, used at first launch and to change pseudo later.
   * opts: { title, text, initial, submitLabel, laterLabel, onDone(name), onLater() }
   */
  function nameForm(root, opts) {
    const me = online.me();
    const state = { name: '', color: me.color | 0, mood: 'happy' };
    root.innerHTML = `
      <canvas class="nm-sign" aria-hidden="true"></canvas>
      ${opts.title ? `<h2>${opts.title}</h2>` : ''}
      ${opts.text ? `<p class="nm-text">${opts.text}</p>` : ''}
      <div class="nm-field">
        <input class="nm-input" type="text" maxlength="${NAME_MAX + 6}" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="go" placeholder="${t('ranks.placeholder')}" aria-label="${t('ranks.placeholder')}">
        <button class="nm-dice" type="button" aria-label="${t('ranks.dice')}" title="${t('ranks.dice')}">${DICE_SVG}</button>
      </div>
      <div class="nm-status" aria-live="polite"></div>
      <div class="nm-colors-label">${t('ranks.pickColor')}</div>
      <div class="nm-colors" role="radiogroup" aria-label="${t('ranks.pickColor')}">
        ${[0, 1, 2, 3].map((c) => `<button type="button" role="radio" data-c="${c}" aria-label="${LUMI_NAMES[c]}"><span>${LUMI_NAMES[c]}</span></button>`).join('')}
      </div>
      <button class="btn btn-primary nm-go" type="button">${opts.submitLabel}</button>
      ${opts.laterLabel ? `<button class="nm-later" type="button">${opts.laterLabel}</button>` : ''}
      <p class="nm-note">${t('ranks.note')} <a href="privacy.html" target="_blank" rel="noopener">${t('ranks.privacy')}</a></p>`;
    const input = root.querySelector('.nm-input');
    const status = root.querySelector('.nm-status');
    const go = root.querySelector('.nm-go');
    const sign = signPainter(root.querySelector('.nm-sign'), () => state);
    const colorBtns = [...root.querySelectorAll('.nm-colors button')];
    colorBtns.forEach((b) => {
      const c = +b.dataset.c;
      const d = api.dress(c);
      b.prepend(avatar({ color: c, hat: d.hat, glasses: d.glasses, flame: d.flameStyle }, 50, 'nm-ava'));
      b.onclick = () => {
        click();
        state.color = c;
        paintColors();
        sign.hop();
        sound.sfx('select');
      };
    });
    const paintColors = () => colorBtns.forEach((b) => {
      const on = +b.dataset.c === state.color;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    paintColors();

    let checkTimer = 0;
    let seq = 0;
    let typed = false;
    const say = (html, cls = '') => {
      status.className = 'nm-status ' + cls;
      status.innerHTML = html;
    };
    function refresh() {
      const name = cleanName(input.value);
      const changed = name !== state.name;
      state.name = name;
      if (changed) sign.hop();
      const bad = name ? checkName(name) : 'short';
      clearTimeout(checkTimer);
      seq++;
      go.disabled = !!bad;
      state.mood = bad && typed && name ? 'scared' : 'happy';
      if (bad) {
        say(typed && name ? t('ranks.why.' + bad) : '', 'soft');
        return;
      }
      say('', '');
      if (!online.configured) return;
      const mine = ++seq;
      checkTimer = setTimeout(async () => {
        say(t('ranks.checking'), 'soft');
        const a = await online.availability(name);
        if (mine !== seq) return;
        if (a === 'taken') showTaken(name);
        else if (a === 'free' || a === 'mine') say('✓ ' + t('ranks.free'), 'ok');
        else say('', '');
      }, 650);
    }
    function showTaken(name) {
      const alt = variantOf(name);
      say(`${t('ranks.why.taken')} <button type="button" class="nm-try">${t('ranks.tryThis', esc(alt))}</button>`, 'bad');
      state.mood = 'scared';
      status.querySelector('.nm-try').onclick = () => {
        click();
        input.value = alt;
        refresh();
      };
    }
    input.addEventListener('input', () => {
      typed = true;
      refresh();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    input.addEventListener('blur', () => {
      const c = cleanName(input.value);
      if (c !== input.value) input.value = c;
    });
    root.querySelector('.nm-dice').onclick = () => {
      click();
      input.value = suggestName(lang());
      typed = false;
      refresh();
    };
    let busy = false;
    async function submit() {
      if (busy) return;
      const name = cleanName(input.value);
      const bad = checkName(name);
      if (bad) {
        typed = true;
        refresh();
        sound.sfx('invalid');
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        return;
      }
      busy = true;
      go.disabled = true;
      const label = go.innerHTML;
      go.innerHTML = t('ranks.checking');
      const r = await online.choose(name, { color: state.color });
      busy = false;
      go.innerHTML = label;
      go.disabled = false;
      if (!r.ok) {
        sound.sfx('invalid');
        if (r.reason === 'taken') showTaken(name);
        else say(t('ranks.why.' + r.reason), 'bad');
        return;
      }
      sound.sfx('unlock');
      sign.stop();
      opts.onDone(name);
    }
    go.onclick = () => {
      sound.unlock();
      submit();
    };
    const later = root.querySelector('.nm-later');
    if (later) {
      later.onclick = () => {
        click();
        sign.stop();
        opts.onLater();
      };
    }
    input.value = opts.initial ?? suggestName(lang());
    refresh();
    return { stop: () => sign.stop(), input };
  }

  /** First launch (or first launch since the rankings exist): choose a pseudo. */
  function hello({ returning = false, onDone }) {
    const root = document.querySelector('#screen-hello');
    root.innerHTML = `<div class="hello-wrap"><div class="logo small"><h1>Lumignons</h1></div><div class="hello-card"></div></div>`;
    const card = root.querySelector('.hello-card');
    nameForm(card, {
      title: returning ? t('ranks.helloBack') : t('ranks.helloTitle'),
      text: returning ? t('ranks.helloBackText') : t('ranks.helloText'),
      submitLabel: `${t('ranks.start')}`,
      laterLabel: t('ranks.later'),
      onDone: (name) => onDone({ name }),
      onLater: () => {
        online.markAsked();
        onDone({ name: null });
      },
    });
    api.showScreen('hello');
  }

  /** Changing the pseudo (or choosing one later), in a window. */
  function pseudoDialog(after) {
    const box = el('div', 'nm-dialog');
    const me = online.me();
    const m = openModal(box, { cls: 'nm-modal' });
    nameForm(box, {
      title: me.name ? t('ranks.changeName') : t('ranks.join'),
      text: me.taken ? t('ranks.takenBanner') : '',
      initial: me.name || undefined,
      submitLabel: `${ICONS.check}${t('ranks.save')}`,
      laterLabel: t('back'),
      onDone: (name) => {
        m.close();
        toast(t('ranks.welcomeBack', esc(name)), 2400);
        api.onProfileChange();
        after?.();
      },
      onLater: () => m.close(),
    });
  }

  // ------------------------------------------------------------- profile

  function openProfile() {
    const box = el('div', 'profile');
    const m = openModal(box);
    const render = () => {
      const me = online.me();
      box.innerHTML = `
        <button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
        <div class="pf-ava-slot"></div>
        <h2>${me.name ? esc(me.name) : t('ranks.noName')}</h2>
        <div class="pf-rank">${online.configured && me.active ? '<span class="rk-dots"><i></i><i></i><i></i></span>' : ''}</div>
        ${me.taken ? `<p class="pf-warn">${t('ranks.takenBanner')}</p>` : ''}
        <div class="actions col">
          <button class="btn btn-primary" data-a="ranks">${PODIUM_SVG}${t('ranks.title')}</button>
          <button class="btn btn-ghost btn-small" data-a="name">${ICONS.pencil}${me.name ? t('ranks.changeName') : t('ranks.join')}</button>
        </div>
        <div class="list">
          <div class="row"><span class="grow">${t('ranks.online')}<small>${t('ranks.onlineHelp')}</small></span><button class="toggle ${me.optOut ? '' : 'on'}" data-a="toggle" aria-label="${t('ranks.online')}"></button></div>
          ${me.optOut ? '' : `<div class="row"><span class="grow">${t('ranks.presence')}<small>${t('ranks.presenceHelp')}</small></span><button class="toggle ${online.showsPresence() ? 'on' : ''}" data-a="presence" aria-label="${t('ranks.presence')}"></button></div>`}
        </div>
        ${online.configured ? '' : `<p class="pf-soon">${t('ranks.soon')}</p>`}
        ${online.pendingCount() && online.configured && me.active ? `<p class="pf-soon">${t('ranks.pendingN', online.pendingCount())}</p>` : ''}
        <div class="actions col"><button class="btn btn-ghost btn-small pf-del" data-a="delete">${ICONS.trash}${t('ranks.deleteData')}</button></div>`;
      box.querySelector('.pf-ava-slot').appendChild(avatar(myLook(), 96, 'pf-ava'));
      box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
      box.querySelector('[data-a=ranks]').onclick = () => (click(), openRanks());
      box.querySelector('[data-a=name]').onclick = () => (click(), pseudoDialog(render));
      box.querySelector('[data-a=toggle]').onclick = () => {
        click();
        online.setOptOut(!online.me().optOut);
        api.onProfileChange();
        render();
      };
      const pb = box.querySelector('[data-a=presence]');
      if (pb) {
        pb.onclick = () => {
          click();
          online.setShowPresence(!online.showsPresence());
          render();
        };
      }
      box.querySelector('[data-a=delete]').onclick = () => {
        click();
        confirmBox(t('ranks.deleteConfirm'), async () => {
          try {
            await online.deleteAll();
            toast(t('ranks.deleted'), 2600);
          } catch {
            toast(t('ranks.offline'), 2600);
          }
          api.onProfileChange();
          if (box.isConnected) render();
        });
      };
      const pr = box.querySelector('.pf-rank');
      if (online.configured && me.active && me.uid) {
        online
          .playerCard(me.uid)
          .then((c) => {
            if (!pr.isConnected) return;
            pr.innerHTML = c ? `<span class="pf-stars">★ ${c.total}</span> · ${t('ranks.globalRank', ordinal(c.rank, lang()))}` : '';
          })
          .catch(() => pr.isConnected && (pr.innerHTML = ''));
      } else pr.innerHTML = '';
    };
    render();
  }

  // ------------------------------------------------------------ rankings

  const statLine = (r) => {
    const parts = [t('ranks.tries', r.tries)];
    parts.push(r.ms === UNKNOWN || r.ms == null ? t('ranks.unknownTime') : formatTime(r.ms, lang()));
    if (r.stars < 3) parts.push(t('ranks.pieces', r.pieces));
    return parts.join(' · ') + (r.helped ? ` ${BULB_SVG}` : '');
  };
  const starsHtml = (n) => `<span class="rk-stars">${[1, 2, 3].map((k) => `<i class="${n >= k ? 'on' : ''}">★</i>`).join('')}</span>`;

  function rowEl(r, { global = false, pinned = false } = {}) {
    const b = el('button', `rk-row${r.me ? ' me' : ''}${r.rank <= 3 ? ' top' + r.rank : ''}${pinned ? ' pinned' : ''}`);
    b.type = 'button';
    b.innerHTML = `<span class="rk-rank">${r.rank ?? '–'}</span><span class="rk-ava-slot"></span>
      <span class="rk-who"><b>${esc(r.name)}${r.me ? ` <em>${t('ranks.you')}</em>` : ''}</b>${global ? '' : `<small>${r.waiting ? t('ranks.waitingShort') : statLine(r)}</small>`}</span>
      ${global ? `<span class="rk-total">★ ${r.stars}</span>` : starsHtml(r.stars)}`;
    b.querySelector('.rk-ava-slot').replaceWith(avatar(r, 40));
    if (!r.me && r.uid) b.onclick = () => (click(), openCard(r));
    return b;
  }

  function skeleton() {
    return `<div class="rk-list loading">${'<div class="rk-row ghost"><span class="rk-rank"></span><i></i><span class="rk-who"><b></b><small></small></span></div>'.repeat(6)}</div>`;
  }

  function messageView(text, { retry, icon = PODIUM_SVG } = {}) {
    const d = el('div', 'rk-msg', `<div class="rk-msg-ico">${icon}</div><p>${text}</p>`);
    if (retry) {
      const b = el('button', 'btn btn-ghost btn-small', `${ICONS.retry}${t('ranks.retry')}`);
      b.onclick = () => (click(), retry());
      d.appendChild(b);
    }
    return d;
  }

  /** The player's own row, from what this device knows. */
  function myRow(rank, best, waiting) {
    const me = online.me();
    return { ...myLook(), name: me.name || t('ranks.you'), me: true, rank, ...(best || {}), waiting };
  }

  function listView(data, bid) {
    const global = bid === 'global';
    const wrap = el('div', 'rk-board');
    const list = el('div', 'rk-list');
    data.rows.forEach((r, i) => {
      const row = rowEl(r, { global });
      row.style.animationDelay = `${Math.min(i, 12) * 30}ms`;
      list.appendChild(row);
    });
    wrap.appendChild(list);
    if (!data.rows.length) {
      wrap.appendChild(messageView(data.friends ? t('ranks.friendsEmptyBoard') : global ? t('ranks.emptyGlobal') : t('ranks.empty')));
    }
    const inTop = data.rows.some((r) => r.me);
    if (!inTop && online.me().name && !online.me().optOut) {
      if (global && data.me) wrap.appendChild(rowEl(myRow(data.me.rank, { stars: data.me.stars ?? 0 }, false), { global, pinned: true }));
      else if (!global && data.mine) wrap.appendChild(rowEl(myRow(data.me?.rank ?? null, data.mine, data.waiting), { pinned: true }));
    }
    const foot = el('div', 'rk-foot', data.friends ? `<b>${t('ranks.tabFriends')}</b> · ${global ? t('ranks.globalCriteria') : t('ranks.criteria')}` : `<b>${t('ranks.players', data.total)}</b> · ${global ? t('ranks.globalCriteria') : t('ranks.criteria')}`);
    wrap.appendChild(foot);
    return wrap;
  }

  /** "5 min", "3 h", "hier"… since a time in ms, by the server's clock. */
  function seenAgo(ms) {
    const now = online.now ? online.now() : Date.now();
    const min = Math.max(1, Math.round((now - ms) / 60000));
    const fr = lang() === 'fr';
    if (min < 60) return fr ? `il y a ${min} min` : `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return fr ? `il y a ${h} h` : `${h} h ago`;
    const d = Math.round(h / 24);
    if (d === 1) return fr ? 'hier' : 'yesterday';
    if (d < 31) return fr ? `il y a ${d} jours` : `${d} days ago`;
    return fr ? 'il y a longtemps' : 'a long time ago';
  }

  function openCard(r) {
    const box = el('div', 'rk-card');
    box.innerHTML = `<button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
      <div class="pf-ava-slot"></div><h2>${esc(r.name)}</h2><div class="pf-seen"></div><div class="pf-rank"><span class="rk-dots"><i></i><i></i><i></i></span></div>
      <div class="actions col">
        <button class="btn btn-primary btn-small" data-a="friend"></button>
        <button class="btn btn-ghost btn-small" data-a="report">${FLAG_SVG}${t('ranks.report')}</button>
      </div>`;
    box.querySelector('.pf-ava-slot').appendChild(avatar(r, 96, 'pf-ava'));
    const m = openModal(box);
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
    const fb = box.querySelector('[data-a=friend]');
    const paintFriend = () => {
      const is = online.isFriend(r.uid);
      fb.className = 'btn btn-small ' + (is ? 'btn-ghost' : 'btn-primary');
      fb.innerHTML = is ? `${ICONS.close}${t('ranks.remove')}` : `${FRIEND_SVG}${t('ranks.addFriend')}`;
    };
    paintFriend();
    fb.onclick = () => {
      click();
      if (online.isFriend(r.uid)) {
        online.removeFriend(r.uid);
        toast(t('ranks.removed', esc(r.name)), 2000);
      } else {
        online.addFriend(r.uid, r.name);
        sound.sfx('unlock');
        toast(t('ranks.added', esc(r.name)), 2000);
      }
      paintFriend();
    };
    box.querySelector('[data-a=report]').onclick = () => {
      click();
      confirmBox(t('ranks.reportConfirm', esc(r.name)), async () => {
        try {
          await online.report(r.uid, r.board || '');
          toast(t('ranks.reported'), 2400);
        } catch {
          toast(t('ranks.error'), 2400);
        }
        m.close();
      });
    };
    // Online now, or when last seen (nothing for a player who hides it).
    online
      .presenceOf(r.uid)
      .then((p) => {
        const ps = box.querySelector('.pf-seen');
        if (!ps || !p) return;
        ps.className = 'pf-seen' + (p.online ? ' on' : '');
        ps.innerHTML = p.online ? `<i></i>${t('ranks.onlineNow')}` : t('ranks.seen', seenAgo(p.seen));
      })
      .catch(() => {});
    online
      .playerCard(r.uid)
      .then((c) => {
        const pr = box.querySelector('.pf-rank');
        if (pr) pr.innerHTML = c ? `<span class="pf-stars">★ ${c.total}</span> · ${t('ranks.globalRank', ordinal(c.rank, lang()))}` : '';
      })
      .catch(() => {
        const pr = box.querySelector('.pf-rank');
        if (pr) pr.innerHTML = '';
      });
  }

  /**
   * The rankings window. opts: { tab: 'levels'|'daily'|'global', board }
   */
  function openRanks(opts = {}) {
    const box = el('div', 'ranks');
    let tab = opts.tab || (opts.board && isDailyBoard(opts.board) ? 'daily' : 'levels');
    let level = opts.board && !isDailyBoard(opts.board) ? opts.board : api.lastLevel();
    let scope = opts.scope || 'all';
    let token = 0;
    box.innerHTML = `
      <button class="close-x" data-a="close" aria-label="${t('close')}">${ICONS.close}</button>
      <h2>${PODIUM_SVG}${t('ranks.title')}</h2>
      <div class="rk-tabs" role="tablist">
        ${['levels', 'daily', 'global', 'friends'].map((k) => `<button role="tab" data-tab="${k}">${t('ranks.tab.' + k)}</button>`).join('')}
      </div>
      <div class="rk-pick"></div>
      <div class="rk-body"></div>`;
    const m = openModal(box, { cls: 'rk-modal' });
    box.querySelector('[data-a=close]').onclick = () => (click(), m.close());
    const pick = box.querySelector('.rk-pick');
    const body = box.querySelector('.rk-body');
    box.querySelectorAll('[data-tab]').forEach((b) => {
      b.onclick = () => {
        click();
        tab = b.dataset.tab;
        render();
      };
    });

    async function show(bid, force = false) {
      const mine = ++token;
      if (!online.configured) {
        body.innerHTML = '';
        const rec = bid !== 'global' ? online.record(bid) : null;
        if (rec?.best && online.me().name) body.appendChild(rowEl(myRow(null, rec.best, true), { pinned: true }));
        body.appendChild(messageView(t('ranks.soon')));
        return;
      }
      body.innerHTML = skeleton();
      try {
        const friends = scope === 'friends';
        const data = friends ? (bid === 'global' ? await online.friendsGlobal() : await online.friendsBoard(bid)) : bid === 'global' ? await online.globalBoard({ force }) : await online.board(bid, { force });
        if (mine !== token || !body.isConnected) return;
        body.innerHTML = '';
        data.rows.forEach((r) => (r.board = bid));
        body.appendChild(listView(data, bid));
      } catch (e) {
        if (mine !== token || !body.isConnected) return;
        body.innerHTML = '';
        body.appendChild(messageView(e.code === 'offline' ? t('ranks.offline') : t('ranks.error'), { retry: () => show(bid, true) }));
      }
    }

    function renderLevels() {
      const worlds = api.worlds();
      const wi = Math.max(0, worlds.findIndex((w) => w.levels.some((l) => l.id === level) || w.bonus.id === level));
      const w = worlds[wi];
      pick.innerHTML = `${scopeSwitch()}
        <div class="rk-worlds">${worlds.map((x, i) => `<button data-w="${i}" class="${i === wi ? 'on' : ''}" style="--wc:${A.WORLD_STYLES[x.id]?.grass?.[0] || '#8fd18a'}" aria-label="${t('world')} ${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="rk-levels">${[...w.levels, w.bonus].map((lv, i) => `<button data-l="${lv.id}" class="${lv.id === level ? 'on' : ''}${api.isDone(lv.id) ? ' done' : ''}">${i < w.levels.length ? i + 1 : '★'}</button>`).join('')}</div>
        <div class="rk-sub">${api.levelTitle(level)}</div>`;
      bindScope();
      pick.querySelectorAll('[data-w]').forEach((b) => {
        b.onclick = () => {
          click();
          const nw = worlds[+b.dataset.w];
          level = nw.levels[0].id;
          renderLevels();
        };
      });
      pick.querySelectorAll('[data-l]').forEach((b) => {
        b.onclick = () => {
          click();
          level = b.dataset.l;
          renderLevels();
        };
      });
      show(level);
    }

    /** "Everyone / Friends" switch above a ranking. */
    function scopeSwitch() {
      if (!online.configured) return '';
      return `<div class="rk-scope"><button data-scope="all" class="${scope === 'all' ? 'on' : ''}">${t('ranks.everyone')}</button><button data-scope="friends" class="${scope === 'friends' ? 'on' : ''}">${FRIEND_SVG}${t('ranks.friendsOnly')}</button></div>`;
    }
    function bindScope() {
      pick.querySelectorAll('[data-scope]').forEach((b) => {
        b.onclick = () => {
          click();
          scope = b.dataset.scope;
          render();
        };
      });
    }

    function renderFriends() {
      token++;
      pick.innerHTML = '';
      body.innerHTML = '';
      body.appendChild(friendsView(() => render()));
    }

    function render() {
      box.querySelectorAll('[data-tab]').forEach((b) => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (tab === 'friends') return renderFriends();
      if (tab === 'levels') renderLevels();
      else if (tab === 'daily') {
        const d = api.dailyToday();
        if (!d) {
          pick.innerHTML = '';
          body.innerHTML = '';
          body.appendChild(messageView(t('ranks.dailyLocked'), { icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>' }));
          return;
        }
        pick.innerHTML = `${scopeSwitch()}<div class="rk-sub">${d.label}</div>`;
        bindScope();
        show(d.bid);
      } else {
        pick.innerHTML = scopeSwitch();
        bindScope();
        show('global');
      }
    }
    render();
  }

  // ------------------------------------------------------------ friends

  const shareLink = (hash) => {
    const base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : 'https://darknow-coder.github.io/puzzle-game/';
    return base + '#' + hash;
  };

  /** Shares a link (system sheet, else clipboard). */
  async function share(text, url) {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Lumignons', text, url });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast(t('ranks.linkCopied'), 2400);
    } catch {
      toast(url, 6000);
    }
  }

  function invite() {
    const me = online.me();
    if (!me.uid || !me.name) return toast(t('ranks.needName'), 2400);
    share(t('ranks.inviteText', me.name), shareLink('ami=' + me.uid));
  }

  /** The friends tab: add by pseudo, invite link, the list. */
  function friendsView(refresh) {
    const wrap = el('div', 'rk-friends');
    const me = online.me();
    if (!online.configured) {
      wrap.appendChild(messageView(t('ranks.soon')));
      return wrap;
    }
    wrap.innerHTML = `
      <form class="fr-add">
        <input class="fr-input" type="text" maxlength="24" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${t('ranks.addPlaceholder')}" aria-label="${t('ranks.addPlaceholder')}">
        <button class="btn btn-primary btn-small" type="submit">${FRIEND_SVG}${t('ranks.add')}</button>
      </form>
      <div class="fr-msg" aria-live="polite"></div>
      <button class="btn btn-ghost btn-small fr-invite" type="button">${ICONS.share || ''}${t('ranks.invite')}</button>
      <div class="rk-list fr-list"></div>`;
    const msg = wrap.querySelector('.fr-msg');
    const input = wrap.querySelector('.fr-input');
    wrap.querySelector('.fr-invite').onclick = () => (click(), invite());
    wrap.querySelector('.fr-add').onsubmit = async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      click();
      msg.className = 'fr-msg';
      msg.textContent = t('ranks.checking');
      try {
        const p = await online.findPlayer(name);
        if (!p) {
          msg.className = 'fr-msg bad';
          msg.textContent = t('ranks.notFound');
          return;
        }
        const r = online.addFriend(p.uid, p.name);
        if (r === 'self') {
          msg.className = 'fr-msg bad';
          msg.textContent = t('ranks.itsYou');
          return;
        }
        msg.className = 'fr-msg ok';
        msg.textContent = r === 'already' ? t('ranks.already') : t('ranks.added', p.name);
        if (r === 'added') sound.sfx('unlock');
        input.value = '';
        fill();
      } catch {
        msg.className = 'fr-msg bad';
        msg.textContent = t('ranks.offline');
      }
    };
    const list = wrap.querySelector('.fr-list');
    async function fill() {
      const friends = online.friends();
      list.innerHTML = '';
      if (!friends.length) {
        list.appendChild(messageView(t('ranks.noFriends'), { icon: FRIEND_SVG }));
        return;
      }
      let data = null;
      try {
        data = await online.friendsGlobal();
      } catch {
        data = null;
      }
      const byUid = new Map((data?.rows || []).map((r) => [r.uid, r]));
      for (const f of friends) {
        const r = byUid.get(f.uid) || { uid: f.uid, name: f.name, color: 0, stars: '–' };
        const row = el('div', 'rk-row fr-row');
        row.innerHTML = `<span class="rk-ava-slot"></span><span class="rk-who"><b>${esc(r.name)}</b></span><span class="rk-total">★ ${r.stars}</span><button class="fr-del" type="button" aria-label="${t('ranks.remove')}">${ICONS.close}</button>`;
        row.querySelector('.rk-ava-slot').replaceWith(avatar(r, 40));
        row.querySelector('.rk-who').onclick = () => (click(), openCard({ ...r, uid: f.uid }));
        row.querySelector('.fr-del').onclick = () => {
          click();
          online.removeFriend(f.uid);
          toast(t('ranks.removed', esc(r.name)), 2000);
          fill();
        };
        list.appendChild(row);
      }
    }
    if (!me.name) msg.textContent = t('ranks.needName');
    fill();
    return wrap;
  }

  /** A link opened the game: "#ami=uid" (add a friend) or "#defi=uid.board" (a duel). */
  async function openLink(hash) {
    if (!online.configured) return false;
    const ami = hash.match(/ami=([A-Za-z0-9]{6,40})/);
    const duel = hash.match(/defi=([A-Za-z0-9]{6,40})\.([\w-]{3,40})/);
    const uid = ami?.[1] || duel?.[1];
    if (!uid) return false;
    let p;
    try {
      p = await online.profile(uid);
    } catch {
      toast(t('ranks.offline'), 2600);
      return true;
    }
    if (!p) return true;
    if (uid === online.me().uid) return true;
    if (ami) {
      const box = el('div', 'rk-card');
      box.innerHTML = `<div class="pf-ava-slot"></div><h2>${esc(p.name)}</h2><p>${t('ranks.addFromLink', esc(p.name))}</p>
        <div class="actions"><button class="btn btn-ghost" data-a="no">${t('no')}</button><button class="btn btn-primary" data-a="yes">${FRIEND_SVG}${t('ranks.add')}</button></div>`;
      box.querySelector('.pf-ava-slot').appendChild(avatar({ ...p, flame: p.flame }, 96, 'pf-ava'));
      const m = openModal(box);
      box.querySelector('[data-a=no]').onclick = () => (click(), m.close());
      box.querySelector('[data-a=yes]').onclick = () => {
        click();
        online.addFriend(uid, p.name);
        sound.sfx('unlock');
        toast(t('ranks.added', esc(p.name)), 2400);
        m.close();
      };
      return true;
    }
    const bid = duel[2];
    let e = null;
    try {
      e = await online.entryOf(uid, bid);
    } catch {
      e = null;
    }
    online.addFriend(uid, p.name);
    const label = api.boardLabel(bid);
    const box = el('div', 'rk-card duel');
    box.innerHTML = `<div class="pf-ava-slot"></div><div class="eyebrow">${SWORDS_SVG} ${t('ranks.friendAdded')}</div><h2>${t('ranks.duelTitle', esc(p.name))}</h2>
      <p>${t('ranks.duelText', label, e ? statLine(e) : t('ranks.duelNoResult'))}</p>
      <div class="actions"><button class="btn btn-ghost" data-a="no">${t('back')}</button><button class="btn btn-primary" data-a="go">${t('ranks.duelGo')}</button></div>`;
    box.querySelector('.pf-ava-slot').appendChild(avatar(p, 96, 'pf-ava'));
    const m = openModal(box);
    box.querySelector('[data-a=no]').onclick = () => (click(), m.close());
    box.querySelector('[data-a=go]').onclick = () => {
      click();
      m.close();
      api.playBoard(bid);
    };
    return true;
  }

  /** Sends a duel on a board, with my result. */
  function challenge(bid, entry) {
    const me = online.me();
    if (!me.uid || !me.name) return toast(t('ranks.needName'), 2400);
    share(t('ranks.challengeText', me.name, api.boardLabel(bid), entry ? statLine(entry).replace(/<[^>]+>/g, '').trim() : ''), shareLink(`defi=${me.uid}.${bid}`));
  }

  // ------------------------------------------------------ victory card

  /** Fills the victory card's ranking line for board `bid` after a win. */
  function victory(slot, bid, win) {
    const me = online.me();
    const runLine = win?.run ? `<small class="rk-run">${t('ranks.tries', win.run.tries)}${win.run.ms !== UNKNOWN ? ' · ' + formatTime(win.run.ms, lang()) : ''}</small>` : '';
    const see = `<button class="rk-see" type="button">${t('ranks.see')}</button>`;
    const set = (html, cls = '') => {
      slot.className = 'rank-line ' + cls;
      slot.innerHTML = `<span class="rank-ico">${PODIUM_SVG}</span><span class="rank-txt">${html}${runLine}</span>${online.configured ? see : ''}`;
      const b = slot.querySelector('.rk-see');
      if (b) b.onclick = () => (click(), openRanks({ board: bid }));
    };
    if (!bid) {
      slot.remove();
      return;
    }
    if (!online.configured || me.optOut) {
      if (win?.run) set(win.improved && win.prev ? t('ranks.newBest') : t('ranks.yourRun'));
      else slot.remove();
      return;
    }
    if (!me.name) {
      set(t('ranks.joinInvite'));
      const b = slot.querySelector('.rk-see');
      b.textContent = t('ranks.join');
      b.onclick = () => (click(), pseudoDialog(() => victory(slot, bid, win)));
      return;
    }
    set(`<span class="rk-dots"><i></i><i></i><i></i></span> ${t('ranks.sending')}`, 'busy');
    online
      .sync(bid)
      .then(async (r) => {
        if (!slot.isConnected) return;
        if (r === 'sent') {
          const s = await online.standing(bid);
          if (!slot.isConnected || !s) return;
          const place = `<b>${ordinal(s.rank, lang())}</b> ${t('ranks.outOf', s.total)}`;
          const head = win.improved ? `${t('ranks.newBest')} ${place}` : `${t('ranks.yourBest')} : ${place}`;
          const cls = s.rank === 1 ? 'gold' : s.rank <= 3 ? 'podium' : '';
          set(head, cls);
          if (win.improved && s.rank <= 3) setTimeout(() => sound.sfx('fanfare', s.rank === 1 ? 3 : 2), 250);
          duelButton(slot, bid, win.entry);
          // Among friends: place, and who was overtaken.
          if (online.friends().length) {
            const f = await online.friendsBoard(bid).catch(() => null);
            if (!slot.isConnected || !f?.me) return;
            const mineKey = f.rows.find((x) => x.me)?.key;
            const behind = f.rows.filter((x) => !x.me && x.key > mineKey);
            const extra = `<small class="rk-run rk-fr">${FRIEND_SVG}${t('ranks.friendsRank', ordinal(f.me.rank, lang()), f.total)}${behind.length ? ' · ' + t('ranks.ahead', esc(behind[0].name)) : ''}</small>`;
            set(head + extra, cls);
            duelButton(slot, bid, win.entry);
            if (win.improved && behind.length) api.onFriendAhead?.(bid);
          }
        } else if (r === 'offline') set(t('ranks.waiting'), 'soft');
        else if (r === 'taken') {
          set(t('ranks.takenBanner'), 'soft');
          const b = slot.querySelector('.rk-see');
          b.textContent = t('ranks.changeName');
          b.onclick = () => (click(), pseudoDialog(() => victory(slot, bid, win)));
        } else if (r === 'expired') slot.remove();
        else set(t('ranks.error'), 'soft');
      })
      .catch(() => slot.isConnected && set(t('ranks.error'), 'soft'));
  }

  // -------------------------------------------------------- title chip

  /** The player's portrait and pseudo, top left of the title screen. */
  function chip() {
    const me = online.me();
    const b = el('button', 'me-chip');
    b.type = 'button';
    b.setAttribute('aria-label', t('ranks.profile'));
    b.innerHTML = `<span class="me-ava-slot"></span><span class="me-name">${me.name ? esc(me.name) : t('ranks.join')}</span>${me.taken ? '<i class="gift-dot"></i>' : ''}`;
    b.querySelector('.me-ava-slot').replaceWith(avatar(myLook(), 34, 'me-ava'));
    b.onclick = () => {
      click();
      if (!me.name && !me.optOut) pseudoDialog(() => api.onProfileChange());
      else openProfile();
    };
    return b;
  }

  /** "Challenge a friend" under the victory card's ranking line. */
  function duelButton(slot, bid, entry) {
    if (slot.nextElementSibling?.classList.contains('duel-row')) return;
    const b = el('button', 'btn btn-ghost btn-small duel-row', `${SWORDS_SVG}${t('ranks.challenge')}`);
    b.type = 'button';
    b.onclick = () => (click(), challenge(bid, entry));
    slot.after(b);
  }

  return { hello, pseudoDialog, openProfile, openRanks, victory, chip, avatar, openLink, invite };
}
