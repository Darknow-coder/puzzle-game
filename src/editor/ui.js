// "Atelier": the player's own levels — list, editor, verification, sharing.
import * as A from '../game/art.js';
import { parseLevel, KIND, T } from '../engine/core.js';
import { newModel, cloneModel, toDef, fromDef, applyTool, resize, problems, encodeShare, decodeShare, THEMES, MIN_W, MAX_W, MIN_H, MAX_H } from './model.js';
import { verifyAsync } from './verify.js';

const TXT = {
  fr: {
    atelier: 'Atelier',
    newLevel: 'Nouveau niveau',
    import: 'Importer un code',
    empty: 'Dessine ton île, installe les Lumignons et leurs lanternes : le jeu vérifie que ton niveau est faisable et calcule le nombre de pièces parfait. Tu pourras ensuite le partager avec un simple code.',
    play: 'Jouer',
    edit: 'Modifier',
    share: 'Partager',
    remove: 'Supprimer',
    removeConfirm: (n) => `Supprimer « ${n} » ?`,
    verify: 'Vérifier',
    test: 'Tester',
    size: 'Taille',
    theme: 'Décor',
    width: 'Largeur',
    height: 'Hauteur',
    name: 'Nom du niveau',
    undo: 'Annuler',
    tabs: ['Terrain', 'Habitants', 'Objectifs', 'Mécanismes', 'Pièces'],
    helpPaint: 'Touche une case pour la peindre. Touche à nouveau un élément pour le tourner ou le retirer.',
    notVerified: 'Pas encore vérifié : touche « Vérifier ».',
    verifying: 'Vérification en cours…',
    ok: (v) => `✓ Faisable · ★ dès ${v.min} pièce${v.min > 1 ? 's' : ''} · ★★★ avec ${v.par} · ${v.n === 1 ? 'solution parfaite unique' : v.n >= 6 ? 'nombreuses solutions parfaites' : `${v.n} solutions parfaites`}`,
    trivial: '⚠ Se résout sans aucune pièce : ajoute du défi !',
    impossible: '✗ Impossible avec ces pièces.',
    nofireflies: (v) => `✓ Faisable avec ${v.min} pièce${v.min > 1 ? 's' : ''}, mais toutes les lucioles ne peuvent pas être attrapées.`,
    partial: (v) => `✓ Faisable avec ${v.min} pièce${v.min > 1 ? 's' : ''} (le parcours parfait est trop long à calculer).`,
    timeout: '⏱ Trop complexe pour être vérifié en entier.',
    error: 'Ce niveau ne peut pas être lu.',
    unverifiedBadge: 'non vérifié',
    shareTitle: 'Partager ton niveau',
    shareText: 'Envoie ce code (ou le lien) : n’importe qui pourra l’ouvrir dans Lumignons.',
    copy: 'Copier',
    copied: 'Copié !',
    copyFail: 'Sélectionne le texte pour le copier.',
    shareNative: 'Envoyer…',
    importTitle: 'Importer un niveau',
    importText: 'Colle un code « LUMI1… » ou un lien de partage.',
    importBtn: 'Importer',
    importBad: 'Ce code ne correspond à aucun niveau.',
    imported: 'Niveau ajouté à ton atelier.',
    shared: 'Niveau partagé',
    addToAtelier: 'Ajouter à mon atelier',
    back: 'Retour',
    pieces: { arrow: 'Flèches', lily: 'Nénuphars', mushroom: 'Champignons', daisy: 'Pâquerettes' },
    fix: 'À corriger avant de jouer :',
    untitled: 'Mon niveau',
    copyOf: (n) => `${n} (copie)`,
  },
  en: {
    atelier: 'Workshop',
    newLevel: 'New level',
    import: 'Import a code',
    empty: 'Draw your island, place the Lumignons and their lanterns: the game checks that your level can be solved and works out the perfect number of pieces. Then share it with a simple code.',
    play: 'Play',
    edit: 'Edit',
    share: 'Share',
    remove: 'Delete',
    removeConfirm: (n) => `Delete “${n}”?`,
    verify: 'Check',
    test: 'Test',
    size: 'Size',
    theme: 'Scenery',
    width: 'Width',
    height: 'Height',
    name: 'Level name',
    undo: 'Undo',
    tabs: ['Terrain', 'Residents', 'Goals', 'Mechanisms', 'Pieces'],
    helpPaint: 'Tap a tile to paint it. Tap an item again to turn it or remove it.',
    notVerified: 'Not checked yet: tap “Check”.',
    verifying: 'Checking…',
    ok: (v) => `✓ Solvable · ★ from ${v.min} piece${v.min > 1 ? 's' : ''} · ★★★ with ${v.par} · ${v.n === 1 ? 'one perfect solution' : v.n >= 6 ? 'many perfect solutions' : `${v.n} perfect solutions`}`,
    trivial: '⚠ Solved without any piece: add a challenge!',
    impossible: '✗ Impossible with these pieces.',
    nofireflies: (v) => `✓ Solvable with ${v.min} piece${v.min > 1 ? 's' : ''}, but not every firefly can be caught.`,
    partial: (v) => `✓ Solvable with ${v.min} piece${v.min > 1 ? 's' : ''} (the perfect run takes too long to compute).`,
    timeout: '⏱ Too complex to be fully checked.',
    error: 'This level cannot be read.',
    unverifiedBadge: 'not checked',
    shareTitle: 'Share your level',
    shareText: 'Send this code (or the link): anyone can open it in Lumignons.',
    copy: 'Copy',
    copied: 'Copied!',
    copyFail: 'Select the text to copy it.',
    shareNative: 'Send…',
    importTitle: 'Import a level',
    importText: 'Paste a “LUMI1…” code or a share link.',
    importBtn: 'Import',
    importBad: 'This code does not match any level.',
    imported: 'Level added to your workshop.',
    shared: 'Shared level',
    addToAtelier: 'Add to my workshop',
    back: 'Back',
    pieces: { arrow: 'Arrows', lily: 'Lily pads', mushroom: 'Mushrooms', daisy: 'Daisies' },
    fix: 'To fix before playing:',
    untitled: 'My level',
    copyOf: (n) => `${n} (copy)`,
  },
};

const TOOLS = [
  ['.', ' ', '#', '~', 'o'],
  ['a', 'b', 'c', 'd', 'G', 'Z'],
  ['A', 'B', 'C', 'D', '1', '2', '3', '4', '*'],
  ['arrow', 'm', 'f', '@', '%', 'P', 'H', 'Q', 'K', 'R'],
];
const TOOL_NAMES = {
  fr: { '.': 'Herbe', ' ': 'Vide', '#': 'Obstacle', '~': 'Eau', o: 'Nuage', a: 'Pip', b: 'Nim', c: 'Lou', d: 'Bo', G: 'Grignombre', Z: 'Dormeur', A: 'Lanterne de Pip', B: 'Lanterne de Nim', C: 'Lanterne de Lou', D: 'Lanterne de Bo', 1: 'Étincelle de Pip', 2: 'Étincelle de Nim', 3: 'Étincelle de Lou', 4: 'Étincelle de Bo', '*': 'Luciole', arrow: 'Flèche gravée', m: 'Champignon', f: 'Pâquerette', '@': 'Arche cyan', '%': 'Arche violette', P: 'Dalle cyan', H: 'Ronces cyan', Q: 'Dalle orange', K: 'Ronces orange', R: 'Girouette' },
  en: { '.': 'Grass', ' ': 'Void', '#': 'Obstacle', '~': 'Water', o: 'Cloud', a: 'Pip', b: 'Nim', c: 'Lou', d: 'Bo', G: 'Gloomnib', Z: 'Sleeper', A: 'Pip’s lantern', B: 'Nim’s lantern', C: 'Lou’s lantern', D: 'Bo’s lantern', 1: 'Pip’s spark', 2: 'Nim’s spark', 3: 'Lou’s spark', 4: 'Bo’s spark', '*': 'Firefly', arrow: 'Engraved arrow', m: 'Mushroom', f: 'Daisy', '@': 'Cyan gate', '%': 'Violet gate', P: 'Cyan switch', H: 'Cyan brambles', Q: 'Orange switch', K: 'Orange brambles', R: 'Weathervane' },
};

export function createAtelier(api) {
  const { $, el, getLang, ICONS, click, sound, openModal, toast, showScreen, save, persist, scene } = api;
  const L = () => TXT[getLang()] || TXT.fr;
  const toolName = (k) => (TOOL_NAMES[getLang()] || TOOL_NAMES.fr)[k] || k;

  let model = null;
  let entry = null;
  let history = [];
  let tab = 0;
  let tool = '.';
  let verifyToken = 0;

  const list = () => {
    if (!Array.isArray(save.data.custom)) save.data.custom = [];
    return save.data.custom;
  };

  function store(e) {
    const all = list();
    const i = all.findIndex((x) => x.id === e.id);
    if (i >= 0) all[i] = e;
    else all.unshift(e);
    persist();
  }

  function entryFromModel(m, prev) {
    const def = toDef(m);
    const same = prev && JSON.stringify(prev.def) === JSON.stringify(def) && prev.theme === m.theme;
    return {
      id: prev?.id || 'u' + Date.now().toString(36),
      name: m.name || L().untitled,
      theme: m.theme,
      def,
      verified: same ? prev.verified : null,
      updated: Date.now(),
    };
  }

  // ------------------------------------------------------------------- list

  function drawPreview(cv, e) {
    A.paint(cv, (g) => previewInto(g, cv, e));
  }

  function previewInto(g, cv, e) {
    let Lv;
    try {
      Lv = parseLevel(e.def);
    } catch {
      return;
    }
    const W = cv.width;
    const H = cv.height;
    const S = Math.floor(Math.min((W - 8) / Lv.w, (H - 10) / (Lv.h + 0.4)));
    const isl = A.renderIsland(Lv, e.theme, S, 1);
    const ox = Math.round((W - Lv.w * S) / 2);
    const oy = Math.round((H - Lv.h * S) / 2) - 2;
    g.drawImage(isl.canvas, ox - isl.pad, oy - isl.pad, isl.width, isl.height);
    for (let i = 0; i < Lv.w * Lv.h; i++) {
      const x = ox + ((i % Lv.w) + 0.5) * S;
      const y = oy + (((i / Lv.w) | 0) + 0.5) * S;
      if (Lv.terrain[i] === T.WALL) {
        g.fillStyle = 'rgba(40,60,40,0.55)';
        g.beginPath();
        g.arc(x, y, S * 0.32, 0, A.TAU);
        g.fill();
      }
      if (Lv.lantern[i] >= 0) {
        g.fillStyle = A.LUMI[Lv.lantern[i]].ui;
        g.fillRect(x - S * 0.22, y - S * 0.3, S * 0.44, S * 0.6);
      }
    }
    for (const w of Lv.walkers) {
      const x = ox + (w.x + 0.5) * S;
      const y = oy + (w.y + 0.5) * S;
      g.fillStyle = w.kind === KIND.LUMI ? A.LUMI[w.color].flame : '#3b2a6a';
      g.beginPath();
      g.arc(x, y, S * 0.34, 0, A.TAU);
      g.fill();
    }
  }

  function statusText(v) {
    const t = L();
    if (!v) return t.unverifiedBadge;
    if (v.status === 'ok') return `✓ ★★★ ≤ ${v.par}`;
    if (v.status === 'trivial') return '⚠';
    if (v.status === 'impossible') return '✗';
    return `✓ ★ ${v.min ?? ''}`;
  }

  function openList() {
    const t = L();
    const root = $('#screen-atelier');
    root.innerHTML = `
      <div class="map-head">
        <button class="icon-btn" data-a="back" aria-label="${t.back}">${ICONS.back}</button>
        <h2>${t.atelier}</h2>
      </div>
      <div class="map-scroll atelier-scroll">
        <div class="atelier-actions">
          <button class="btn btn-primary" data-a="new">${ICONS.plus}${t.newLevel}</button>
          <button class="btn btn-ghost" data-a="import">${ICONS.download}${t.import}</button>
        </div>
        <div class="atelier-list"></div>
      </div>`;
    root.querySelector('[data-a=back]').onclick = () => {
      click();
      api.back();
    };
    root.querySelector('[data-a=new]').onclick = () => {
      click();
      openEditor(null);
    };
    root.querySelector('[data-a=import]').onclick = () => {
      click();
      importDialog();
    };
    const box = root.querySelector('.atelier-list');
    const all = list();
    if (!all.length) box.appendChild(el('p', 'atelier-empty', t.empty));
    for (const e of all) {
      const card = el('div', 'atelier-card');
      const cv = document.createElement('canvas');
      cv.width = 132;
      cv.height = 104;
      cv.className = 'atelier-thumb';
      card.appendChild(cv);
      const info = el('div', 'atelier-info');
      info.innerHTML = `<b>${escapeHtml(e.name)}</b><span class="badge ${e.verified?.status === 'ok' ? 'ok' : ''}">${statusText(e.verified)}</span>
        <div class="atelier-btns">
          <button class="btn btn-primary btn-small" data-a="play">${ICONS.play}${t.play}</button>
          <button class="btn btn-ghost btn-small" data-a="edit">${t.edit}</button>
          <button class="btn btn-ghost btn-small icon-only" data-a="share" aria-label="${t.share}">${ICONS.share}</button>
        </div>
        <button class="card-del" data-a="del" aria-label="${t.remove}">${ICONS.trash}</button>`;
      card.appendChild(info);
      info.querySelector('[data-a=play]').onclick = () => {
        click();
        api.startCustom(e, { from: 'atelier' });
      };
      info.querySelector('[data-a=edit]').onclick = () => {
        click();
        openEditor(e);
      };
      info.querySelector('[data-a=share]').onclick = () => {
        click();
        shareDialog(fromDef(e.def, e.theme));
      };
      info.querySelector('[data-a=del]').onclick = () => {
        click();
        api.confirmBox(t.removeConfirm(escapeHtml(e.name)), () => {
          const i = list().indexOf(e);
          if (i >= 0) list().splice(i, 1);
          persist();
          openList();
        });
      };
      box.appendChild(card);
      requestAnimationFrame(() => drawPreview(cv, e));
    }
    showScreen('atelier');
  }

  // ----------------------------------------------------------------- editor

  function openEditor(e) {
    entry = e;
    model = e ? fromDef(e.def, e.theme) : newModel(L().untitled, 'meadow');
    if (e) model.name = e.name;
    history = [];
    tab = 0;
    tool = '.';
    buildEditor();
    showScreen('editor');
    scene.setModel(model);
    api.layoutEditor();
    updateStatus();
    if (!save.data.tips.editor) {
      save.data.tips.editor = 1;
      persist();
      setTimeout(() => toast(L().helpPaint, 6000, true), 400);
    }
  }

  function buildEditor() {
    const t = L();
    const root = $('#screen-editor');
    root.innerHTML = `
      <header class="hud-top">
        <button class="icon-btn" data-a="back" aria-label="${t.back}">${ICONS.back}</button>
        <input class="ed-name" id="ed-name" maxlength="40" aria-label="${t.name}" value="${escapeHtml(model.name)}">
        <button class="icon-btn" data-a="undo" aria-label="${t.undo}">${ICONS.undo}</button>
      </header>
      <div class="hud-bottom ed-panel">
        <div class="ed-status" role="status"></div>
        <div class="ed-tabs" role="tablist">${t.tabs.map((n, i) => `<button role="tab" data-tab="${i}" class="${i === tab ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="ed-tools"></div>
        <div class="controls">
          <button class="ctl" data-a="theme" aria-label="${t.theme}">${ICONS.palette}<span class="lbl">${t.theme}</span></button>
          <button class="ctl" data-a="size" aria-label="${t.size}">${ICONS.resize}<span class="lbl">${t.size}</span></button>
          <button class="ctl" data-a="share" aria-label="${t.share}">${ICONS.share}<span class="lbl">${t.share}</span></button>
          <button class="ctl" data-a="verify" aria-label="${t.verify}">${ICONS.check}<span class="lbl">${t.verify}</span></button>
          <button class="go-btn" data-a="test">${ICONS.play}<span>${t.test}</span></button>
        </div>
      </div>`;
    root.querySelector('[data-a=back]').onclick = () => {
      click();
      saveNow();
      openList();
    };
    root.querySelector('[data-a=undo]').onclick = () => undo();
    root.querySelector('#ed-name').addEventListener('input', (ev) => {
      model.name = ev.target.value.slice(0, 40);
      saveNow();
    });
    root.querySelectorAll('[data-tab]').forEach((b) => {
      b.onclick = () => {
        click();
        tab = Number(b.dataset.tab);
        root.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
        if (tab < TOOLS.length && !TOOLS[tab].includes(tool)) tool = TOOLS[tab][0];
        buildTools();
      };
    });
    root.querySelector('[data-a=theme]').onclick = () => {
      click();
      snapshot();
      model.theme = THEMES[(THEMES.indexOf(model.theme) + 1) % THEMES.length];
      changed();
      buildTools();
      sound.startMusic(model.theme);
    };
    root.querySelector('[data-a=size]').onclick = () => (click(), sizeDialog());
    root.querySelector('[data-a=share]').onclick = () => {
      click();
      if (!ready()) return;
      saveNow();
      shareDialog(model);
    };
    root.querySelector('[data-a=verify]').onclick = () => (click(), verify());
    root.querySelector('[data-a=test]').onclick = () => {
      click();
      if (!ready()) return;
      saveNow();
      api.startCustom(entry, { from: 'editor' });
    };
    buildTools();
  }

  function buildTools() {
    const t = L();
    const box = $('#screen-editor .ed-tools');
    box.innerHTML = '';
    if (tab === TOOLS.length) {
      // Pieces given to the player.
      for (const k of ['arrow', 'lily', 'mushroom', 'daisy']) {
        const row = el('div', 'ed-stepper');
        const cv = icon(k === 'arrow' ? 'piece-arrow' : 'piece-' + k);
        row.appendChild(cv);
        row.insertAdjacentHTML('beforeend', `<span class="ed-step-name">${t.pieces[k]}</span><button class="ed-pm" data-d="-1" aria-label="-">−</button><b class="ed-count">${model.inv[k]}</b><button class="ed-pm" data-d="1" aria-label="+">+</button>`);
        row.querySelectorAll('.ed-pm').forEach((b) => {
          b.onclick = () => {
            const v = Math.max(0, Math.min(9, model.inv[k] + Number(b.dataset.d)));
            if (v === model.inv[k]) return;
            snapshot();
            model.inv[k] = v;
            sound.sfx('tap');
            row.querySelector('.ed-count').textContent = v;
            changed();
          };
        });
        box.appendChild(row);
      }
      return;
    }
    for (const k of TOOLS[tab]) {
      const b = el('button', 'ed-tool' + (k === tool ? ' sel' : ''));
      b.setAttribute('aria-label', toolName(k));
      b.title = toolName(k);
      b.appendChild(icon(k));
      b.appendChild(el('span', 'ed-tool-name', toolName(k)));
      b.onclick = () => {
        sound.unlock();
        sound.sfx('tap');
        tool = k;
        box.querySelectorAll('.ed-tool').forEach((x) => x.classList.toggle('sel', x === b));
      };
      box.appendChild(b);
    }
  }

  function icon(k) {
    const cv = document.createElement('canvas');
    cv.width = 88;
    cv.height = 88;
    return A.paint(cv, (g) => {
      g.scale(2, 2);
      const S = 30;
      const st = A.WORLD_STYLES[model.theme];
      const tile = (col) => {
        g.fillStyle = col;
        g.beginPath();
        A.roundRect(g, 7, 7, 30, 30, 7);
        g.fill();
      };
      switch (k) {
        case '.':
          tile(st.grass[0]);
          break;
        case ' ':
          g.strokeStyle = 'rgba(255,255,255,0.6)';
          g.setLineDash([3, 3]);
          g.lineWidth = 1.5;
          g.beginPath();
          A.roundRect(g, 8, 8, 28, 28, 7);
          g.stroke();
          break;
        case '#': {
          const spr = A.propSprite(st.props[0], 26, model.theme, 1, 2);
          g.drawImage(spr.canvas, 22 - spr.ax, 36 - spr.ay, spr.w, spr.h);
          break;
        }
        case '~':
          tile(st.water[0]);
          break;
        case 'o':
          A.drawCloud(g, 22, 20, 30, 1);
          break;
        case 'a':
        case 'b':
        case 'c':
        case 'd':
          A.drawLumi(g, 22, 38, 30, { color: k.charCodeAt(0) - 97, dir: 2, t: 1, noShadow: true });
          break;
        case 'G':
          A.drawGloomnib(g, 22, 38, 30, { t: 1 });
          break;
        case 'Z':
          A.drawGloomnib(g, 22, 38, 30, { t: 1, sleeping: true });
          break;
        case 'A':
        case 'B':
        case 'C':
        case 'D':
          A.drawLantern(g, 22, 39, 30, k.charCodeAt(0) - 65, { lit: 0.8, t: 1 });
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          A.drawSpark(g, 22, 34, 30, k.charCodeAt(0) - 49, 1);
          break;
        case '*':
          A.drawFirefly(g, 22, 34, 30, 1);
          break;
        case 'arrow':
          A.drawArrowStone(g, 22, 22, 30, 1, { fixed: true });
          break;
        case 'm':
          A.drawMushroom(g, 22, 36, 30, { fixed: true });
          break;
        case 'f':
          A.drawDaisy(g, 22, 38, 30, { fixed: true, t: 1 });
          break;
        case '@':
          A.drawPortal(g, 22, 22, 30, 0, 1);
          break;
        case '%':
          A.drawPortal(g, 22, 22, 30, 1, 1);
          break;
        case 'P':
          A.drawPlate(g, 22, 23, 30, 0, { lit: true });
          break;
        case 'Q':
          A.drawPlate(g, 22, 23, 30, 1, { lit: true });
          break;
        case 'H':
          A.drawBrambles(g, 22, 22, 30, 0, model.gateOpen[0] ? 1 : 0, 1);
          break;
        case 'K':
          A.drawBrambles(g, 22, 22, 30, 1, model.gateOpen[1] ? 1 : 0, 1);
          break;
        case 'R':
          A.drawVane(g, 22, 23, 30, 0.6, 1);
          break;
        default:
          if (k.startsWith('piece-')) A.drawPieceIcon(g, k.slice(6), 22, 22, 30, 0);
          break;
      }
    });
  }

  function snapshot() {
    history.push(cloneModel(model));
    if (history.length > 100) history.shift();
  }

  function undo() {
    const prev = history.pop();
    if (!prev) return;
    sound.sfx('remove');
    model = prev;
    const input = $('#ed-name');
    if (input) input.value = model.name;
    scene.setModel(model);
    changed();
    buildTools();
  }

  /** Called by the editor scene when a tile is touched (repeat = dragging). */
  function paint(idx, repeat) {
    if (!model) return;
    const before = cloneModel(model);
    if (!applyTool(model, idx, tool, { repeat })) return;
    history.push(before);
    if (history.length > 100) history.shift();
    sound.sfx(tool === ' ' ? 'remove' : repeat ? 'rotate' : 'place');
    changed();
    if (tool === 'H' || tool === 'K') buildTools();
  }

  function changed() {
    scene.setModel(model);
    verifyToken++;
    saveNow();
    updateStatus();
  }

  function saveNow() {
    if (!model) return;
    entry = entryFromModel(model, entry);
    store(entry);
  }

  function ready() {
    const pb = problems(model);
    if (pb.length) {
      const lang = getLang();
      toast(`${L().fix} ${pb.map((p) => p[lang] || p.fr).join(' ')}`, 4200, true);
      sound.sfx('invalid');
      return false;
    }
    return true;
  }

  function updateStatus(text) {
    const box = $('#screen-editor .ed-status');
    if (!box) return;
    if (text) {
      box.textContent = text;
      return;
    }
    const pb = problems(model);
    const lang = getLang();
    if (pb.length) {
      box.textContent = '⚠ ' + (pb[0][lang] || pb[0].fr);
      box.className = 'ed-status warn';
      return;
    }
    box.className = 'ed-status';
    box.textContent = describe(entry?.verified);
  }

  function describe(v) {
    const t = L();
    if (!v) return t.notVerified;
    switch (v.status) {
      case 'ok':
        return t.ok(v);
      case 'trivial':
        return t.trivial;
      case 'impossible':
        return t.impossible;
      case 'nofireflies':
        return t.nofireflies(v);
      case 'partial':
        return t.partial(v);
      case 'timeout':
        return t.timeout;
      default:
        return t.error;
    }
  }

  async function verify() {
    if (!ready()) return;
    saveNow();
    const token = ++verifyToken;
    const box = $('#screen-editor .ed-status');
    box.className = 'ed-status busy';
    box.textContent = L().verifying;
    const v = await verifyAsync(toDef(model), 15000);
    if (token !== verifyToken) return; // edited meanwhile
    entry.verified = v;
    store(entry);
    sound.sfx(v.status === 'ok' ? 'star' : 'invalid', 2);
    updateStatus();
  }

  function sizeDialog() {
    const t = L();
    const box = el('div');
    const render = () => {
      box.innerHTML = `<h2>${t.size}</h2>
        <div class="list">
          <div class="row"><span class="grow">${t.width}</span><button class="ed-pm" data-k="w" data-d="-1">−</button><b class="ed-count">${model.w}</b><button class="ed-pm" data-k="w" data-d="1">+</button></div>
          <div class="row"><span class="grow">${t.height}</span><button class="ed-pm" data-k="h" data-d="-1">−</button><b class="ed-count">${model.h}</b><button class="ed-pm" data-k="h" data-d="1">+</button></div>
        </div>
        <div class="actions"><button class="btn btn-primary" data-ok>OK</button></div>`;
      box.querySelectorAll('.ed-pm').forEach((b) => {
        b.onclick = () => {
          const w = model.w + (b.dataset.k === 'w' ? Number(b.dataset.d) : 0);
          const h = model.h + (b.dataset.k === 'h' ? Number(b.dataset.d) : 0);
          if (w < MIN_W || w > MAX_W || h < MIN_H || h > MAX_H) {
            sound.sfx('invalid');
            return;
          }
          snapshot();
          model = resize(model, w, h);
          sound.sfx('tap');
          changed();
          render();
        };
      });
      box.querySelector('[data-ok]').onclick = () => (click(), m.close());
    };
    const m = openModal(box);
    render();
  }

  function shareDialog(m) {
    const t = L();
    const code = encodeShare(m);
    const link = `${location.origin}${location.pathname}#play=${code}`;
    const box = el('div');
    box.innerHTML = `<h2>${t.shareTitle}</h2><p>${t.shareText}</p>
      <textarea class="share-code" id="share-code" readonly rows="4">${code}</textarea>
      <div class="actions">
        <button class="btn btn-primary" data-a="copy">${t.copy}</button>
        ${navigator.share ? `<button class="btn btn-ghost" data-a="native">${t.shareNative}</button>` : ''}
        <button class="btn btn-ghost" data-a="close">OK</button>
      </div>`;
    const md = openModal(box);
    const ta = box.querySelector('textarea');
    box.querySelector('[data-a=copy]').onclick = async () => {
      try {
        await navigator.clipboard.writeText(link.startsWith('http') ? `${m.name} — ${link}` : code);
        toast(t.copied);
      } catch {
        ta.focus();
        ta.select();
        toast(t.copyFail);
      }
    };
    const nb = box.querySelector('[data-a=native]');
    if (nb) {
      nb.onclick = async () => {
        try {
          await navigator.share({ title: 'Lumignons', text: `${m.name} — ${code}`, url: link.startsWith('http') ? link : undefined });
        } catch {
          /* cancelled */
        }
      };
    }
    box.querySelector('[data-a=close]').onclick = () => (click(), md.close());
  }

  function importDialog() {
    const t = L();
    const box = el('div');
    box.innerHTML = `<h2>${t.importTitle}</h2><p>${t.importText}</p>
      <textarea class="share-code" id="import-code" rows="4" placeholder="LUMI1.…"></textarea>
      <div class="actions"><button class="btn btn-ghost" data-a="close">${t.back}</button><button class="btn btn-primary" data-a="ok">${t.importBtn}</button></div>`;
    const md = openModal(box);
    box.querySelector('[data-a=close]').onclick = () => (click(), md.close());
    box.querySelector('[data-a=ok]').onclick = () => {
      try {
        const m = decodeShare(box.querySelector('textarea').value);
        const e = entryFromModel(m, null);
        store(e);
        md.close();
        toast(t.imported);
        sound.sfx('unlock');
        openList();
      } catch {
        sound.sfx('invalid');
        toast(t.importBad, 2600);
      }
    };
  }

  /** A level received through a "#play=" link: play it right away. */
  function playShared(text) {
    try {
      const m = decodeShare(text);
      const e = entryFromModel(m, null);
      api.startCustom(e, { from: 'link' });
      return true;
    } catch {
      toast(L().importBad, 3000);
      return false;
    }
  }

  function addShared(e) {
    store({ ...e, id: 'u' + Date.now().toString(36) });
    toast(L().imported);
  }

  return { openList, openEditor, playShared, addShared, paint, store, text: L, refresh: () => model && updateStatus() };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
