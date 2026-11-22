// A guided visit of the title screen, right after the first level: a spotlight
// moves from button to button while the player's Lumignon explains, then a few
// things worth knowing, and on to level 1-2.
const STEPS = [
  {
    title: { fr: 'Bravo, premier chemin trouvé !', en: 'Well done, first path found!' },
    text: {
      fr: 'Avant la suite, petit tour du menu principal. Ça prend une minute, promis.',
      en: 'Before going on, a quick tour of the main menu. It takes a minute, promise.',
    },
  },
  {
    sel: '[data-act=play]',
    title: { fr: 'Jouer', en: 'Play' },
    text: {
      fr: 'La carte des 7 mondes. Chaque monde ouvre le suivant, avec assez d’étoiles. Un niveau trop dur ? Tu peux en sauter un et y revenir plus tard.',
      en: 'The map of the 7 worlds. Each world opens the next one, with enough stars. A level too hard? You may skip one and come back later.',
    },
  },
  {
    sel: '[data-act=daily]',
    title: { fr: 'Défi du jour', en: 'Daily puzzle' },
    text: {
      fr: 'Un nouveau puzzle chaque jour (dès le niveau 1-5). Reviens jour après jour pour faire grandir ta série 🔥.',
      en: 'A new puzzle every day (from level 1-5). Come back day after day to grow your streak 🔥.',
    },
  },
  {
    sel: '[data-act=atelier]',
    title: { fr: 'Atelier', en: 'Workshop' },
    text: {
      fr: 'Invente tes propres niveaux. Le jeu vérifie qu’ils sont faisables, puis tu les partages avec un code.',
      en: 'Make your own levels. The game checks they can be solved, then you share them with a code.',
    },
  },
  {
    sel: '.title-top [data-act=shop]',
    title: { fr: 'Tes éclats ✦', en: 'Your glimmers ✦' },
    text: {
      fr: 'La monnaie du jeu, gagnée en jouant : premier passage d’un niveau, nouvelles étoiles, succès, défi du jour. Un point rouge ? Un cadeau t’attend.',
      en: 'The game’s currency, earned by playing: first clears, new stars, achievements, daily puzzles. A red dot? A gift is waiting.',
    },
  },
  {
    sel: '.shop-tile',
    title: { fr: 'La boutique', en: 'The shop' },
    text: {
      fr: 'Chez Madame Phalène : des indices, et des chapeaux, lunettes, flammes et fêtes pour habiller tes Lumignons.',
      en: 'Madame Phalène’s: hints, plus hats, glasses, flames and parties to dress up your Lumignons.',
    },
  },
  {
    sel: '[data-act=ranks]',
    title: { fr: 'Podium', en: 'Podium' },
    text: {
      fr: 'Les classements : chaque niveau, le défi du jour et le général. Classés par étoiles, pièces, sans indice, puis essais et temps : réfléchir avant d’appuyer sur Go paie !',
      en: 'The rankings: each level, the daily puzzle and overall. Ranked by stars, pieces, no hint, then tries and time: thinking before pressing Go pays off!',
    },
  },
  {
    sel: '.me-chip',
    title: { fr: 'Ton profil', en: 'Your profile' },
    text: {
      fr: 'Ton pseudo et ta place au classement général. Tu peux changer de pseudo ici.',
      en: 'Your nickname and your overall place. You can change nickname here.',
    },
  },
  {
    sel: ['[data-act=achievements]', '[data-act=notebook]'],
    title: { fr: 'Succès et carnet', en: 'Achievements and notebook' },
    text: {
      fr: 'Les succès rapportent des éclats. Le carnet explique chaque élément rencontré sur les îles.',
      en: 'Achievements pay glimmers. The notebook explains every element met on the islands.',
    },
  },
  {
    sel: '[data-act=settings]',
    title: { fr: 'Réglages', en: 'Settings' },
    text: {
      fr: 'Son, langue, vitesse… et un code de sauvegarde pour garder ta progression ou la passer sur un autre appareil.',
      en: 'Sound, language, speed… and a backup code to keep your progress or move it to another device.',
    },
  },
  {
    title: { fr: 'Bon à savoir', en: 'Good to know' },
    text: {
      fr: '• Rien ne presse : aucune vie, aucun chrono imposé.<br>• Raté ? <b>Revoir</b> rejoue la fin au ralenti.<br>• <b>Appui long</b> sur une case : ce qu’elle contient.<br>• Bloqué ? L’<b>indice</b> montre une pièce de la solution.',
      en: '• No rush: no lives, no imposed timer.<br>• Failed? <b>Replay</b> shows the end in slow motion.<br>• <b>Long press</b> a tile: what it holds.<br>• Stuck? A <b>hint</b> shows one piece of the solution.',
    },
    last: true,
  },
];

export function createTour(api) {
  const { tr, getLang, click, sound, avatar } = api;
  const T = (fr, en) => (getLang() === 'fr' ? fr : en);

  /** Runs the tour on the title screen; `onEnd(next)` with next = true when the player chose to go on. */
  function start(onEnd) {
    const root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = `<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite"></div>`;
    document.body.appendChild(root);
    const hole = root.querySelector('.tour-hole');
    const card = root.querySelector('.tour-card');
    let i = 0;
    let done = false;

    const rectOf = (sel) => {
      const list = (Array.isArray(sel) ? sel : [sel]).map((s) => document.querySelector('#screen-title ' + s)).filter(Boolean);
      if (!list.length) return null;
      const rs = list.map((e) => e.getBoundingClientRect());
      const l = Math.min(...rs.map((r) => r.left));
      const t = Math.min(...rs.map((r) => r.top));
      return { left: l, top: t, width: Math.max(...rs.map((r) => r.right)) - l, height: Math.max(...rs.map((r) => r.bottom)) - t };
    };

    function place() {
      const s = STEPS[i];
      const r = s.sel ? rectOf(s.sel) : null;
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (r) {
        const pad = 8;
        Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', borderRadius: '22px', opacity: 1 });
      } else {
        Object.assign(hole.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px', opacity: 1 });
      }
      const cw = Math.min(360, W - 32);
      card.style.width = cw + 'px';
      const ch = card.offsetHeight;
      let top;
      if (!r) top = (H - ch) / 2;
      else if (r.top + r.height / 2 > H / 2) top = Math.max(12, r.top - ch - 22);
      else top = Math.min(H - ch - 12, r.top + r.height + 22);
      let left = r ? r.left + r.width / 2 - cw / 2 : (W - cw) / 2;
      left = Math.max(16, Math.min(W - cw - 16, left));
      card.style.left = left + 'px';
      card.style.top = top + 'px';
    }

    function render() {
      const s = STEPS[i];
      card.innerHTML = `
        <div class="tour-head"><span class="tour-ava"></span><b>${tr(s.title)}</b></div>
        <p>${tr(s.text)}</p>
        <div class="tour-foot">
          <span class="tour-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('')}</span>
          ${s.last ? '' : `<button class="tour-skip" type="button">${T('Passer', 'Skip')}</button>`}
          <button class="btn btn-primary btn-small tour-next" type="button">${s.last ? T('Niveau suivant !', 'Next level!') : i === 0 ? T('C’est parti', 'Let’s go') : T('Suivant', 'Next')}</button>
        </div>`;
      card.querySelector('.tour-ava').appendChild(avatar());
      card.querySelector('.tour-next').onclick = () => {
        click();
        if (s.last) finish(true);
        else go(i + 1);
      };
      const skip = card.querySelector('.tour-skip');
      if (skip) skip.onclick = () => (click(), go(STEPS.length - 1));
      card.classList.remove('pop');
      void card.offsetWidth;
      card.classList.add('pop');
      place();
    }

    function go(k) {
      // Steps whose button is not on screen (no pseudo chip…) are left out.
      while (k < STEPS.length - 1 && STEPS[k].sel && !rectOf(STEPS[k].sel)) k++;
      i = k;
      sound.sfx('page');
      render();
    }

    function finish(next) {
      if (done) return;
      done = true;
      window.removeEventListener('resize', place);
      window.removeEventListener('keydown', onKey, true);
      root.classList.add('out');
      setTimeout(() => root.remove(), 250);
      onEnd?.(next);
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        finish(false);
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        card.querySelector('.tour-next')?.click();
      }
    };
    window.addEventListener('resize', place);
    window.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => root.classList.add('show'));
    go(0);
    return { finish };
  }

  return { start };
}
