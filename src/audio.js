// All sounds and music are synthesised live with the Web Audio API:
// no audio file is shipped, so there is nothing to license.

const SCALES = {
  title: { root: 60, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], bpm: 66 },
  meadow: { root: 60, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], bpm: 72 },
  pond: { root: 62, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]], bpm: 64 },
  grove: { root: 64, steps: [0, 3, 5, 7, 10], prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-7, -4, 0]], bpm: 60 },
  ruins: { root: 65, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [2, 6, 9], [-1, 2, 7], [-3, 0, 4]], bpm: 58 },
  gloom: { root: 62, steps: [0, 3, 5, 7, 10], prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], bpm: 56 },
  peak: { root: 67, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-3, 0, 4], [-8, -5, -1], [-5, -1, 2]], bpm: 70 },
  dawn: { root: 69, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-7, -3, 0], [-3, 0, 4], [-5, -1, 2]], bpm: 76 },
  shop: { root: 65, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [-5, -1, 2]], bpm: 88 },
};

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Sound {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.soundOn = true;
    this.vibrateOn = true;
    this.theme = null;
    this.timer = null;
    this.nextBeat = 0;
    this.beat = 0;
  }

  /** Must be called from a user gesture (autoplay policies). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(c.destination);
      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = this.soundOn ? 0.55 : 0;
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.22 : 0;
      this.reverb = c.createConvolver();
      this.reverb.buffer = this.impulse(2.4);
      const wet = c.createGain();
      wet.gain.value = 0.32;
      this.reverb.connect(wet).connect(this.master);
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.reverb);
      this.musicBus.connect(this.reverb);
      this.noiseBuf = this.noise(1);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.theme && !this.timer) this.startMusic(this.theme, true);
  }

  impulse(sec) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  noise(sec) {
    const c = this.ctx;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.2);
  }
  setSound(on) {
    this.soundOn = on;
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }
  vibrate(pattern) {
    if (this.vibrateOn && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* unsupported */
      }
    }
  }

  ready() {
    return this.ctx && this.ctx.state === 'running';
  }

  // --- building blocks -----------------------------------------------------

  tone({ freq, type = 'sine', at = 0, attack = 0.005, decay = 0.4, gain = 0.3, bus, glide, detune = 0, filter }) {
    const c = this.ctx;
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.detune.value = detune;
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + attack + decay);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    let node = o;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(filter[0], t0);
      f.frequency.exponentialRampToValueAtTime(filter[1], t0 + attack + decay);
      o.connect(f);
      node = f;
    }
    node.connect(gn).connect(bus || this.sfxBus);
    o.start(t0);
    o.stop(t0 + attack + decay + 0.05);
  }

  hiss({ at = 0, dur = 0.3, gain = 0.2, from = 3000, to = 500, type = 'bandpass', q = 1 }) {
    const c = this.ctx;
    const t0 = c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(gn).connect(this.sfxBus);
    s.start(t0);
    s.stop(t0 + dur + 0.05);
  }

  // --- game sounds ---------------------------------------------------------

  /** A Lumignon's footstep: a note of the world's scale picked from its position. */
  step(color, x, y, h, theme) {
    if (!this.ready() || !this.soundOn) return;
    const sc = SCALES[theme] || SCALES.meadow;
    const idx = x + (h - 1 - y);
    const oct = Math.floor(idx / 5);
    const m = sc.root + 12 * Math.min(2, oct) + sc.steps[((idx % 5) + 5) % 5] - 5;
    const f = midi(m);
    switch (color) {
      case 0:
        this.tone({ freq: f, type: 'sine', decay: 0.55, gain: 0.16 });
        this.tone({ freq: f * 2.01, type: 'sine', decay: 0.25, gain: 0.05 });
        break;
      case 1:
        this.tone({ freq: f, type: 'triangle', decay: 0.32, gain: 0.18 });
        this.tone({ freq: f * 4, type: 'sine', decay: 0.08, gain: 0.04 });
        break;
      case 2:
        this.tone({ freq: f, type: 'sawtooth', decay: 0.35, gain: 0.07, filter: [3200, 500] });
        break;
      default:
        this.tone({ freq: f, type: 'sine', attack: 0.03, decay: 0.45, gain: 0.14 });
        this.tone({ freq: f * 1.5, type: 'sine', attack: 0.03, decay: 0.3, gain: 0.03 });
        break;
    }
  }

  gloomStep() {
    if (!this.ready() || !this.soundOn) return;
    this.tone({ freq: 90, type: 'sine', decay: 0.18, gain: 0.12, glide: 60 });
  }

  sfx(name, arg = 0) {
    if (!this.ready() || !this.soundOn) return;
    switch (name) {
      case 'tap':
        this.tone({ freq: 880, type: 'sine', decay: 0.06, gain: 0.06 });
        break;
      case 'place':
        this.hiss({ dur: 0.06, gain: 0.25, from: 1800, to: 900, q: 2 });
        this.tone({ freq: 523, type: 'triangle', decay: 0.12, gain: 0.12 });
        this.vibrate(8);
        break;
      case 'rotate':
        this.tone({ freq: 660, type: 'triangle', decay: 0.07, gain: 0.08 });
        break;
      case 'remove':
        this.tone({ freq: 400, type: 'triangle', decay: 0.12, gain: 0.1, glide: 250 });
        break;
      case 'invalid':
        this.tone({ freq: 180, type: 'square', decay: 0.1, gain: 0.05, filter: [900, 300] });
        this.vibrate([10, 30, 10]);
        break;
      case 'go':
        [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: midi(72 + s), type: 'triangle', at: i * 0.05, decay: 0.25, gain: 0.08 }));
        this.hiss({ dur: 0.4, gain: 0.05, from: 600, to: 4000 });
        break;
      case 'stop':
        this.tone({ freq: 500, type: 'triangle', decay: 0.15, gain: 0.08, glide: 300 });
        break;
      case 'firefly':
        [0, 7, 12, 19].forEach((s, i) => this.tone({ freq: midi(84 + s), type: 'sine', at: i * 0.045, decay: 0.3, gain: 0.07 }));
        break;
      case 'spark':
        [0, 5, 9, 14, 17].forEach((s, i) => this.tone({ freq: midi(79 + s), type: 'triangle', at: i * 0.04, decay: 0.4, gain: 0.07 }));
        break;
      case 'home':
        [0, 4, 7].forEach((s) => this.tone({ freq: midi(67 + s + arg), type: 'sine', attack: 0.02, decay: 0.9, gain: 0.08 }));
        this.tone({ freq: midi(91 + arg), type: 'sine', at: 0.08, decay: 0.5, gain: 0.04 });
        break;
      case 'fall':
        this.tone({ freq: 700, type: 'sine', decay: 0.7, gain: 0.15, glide: 120 });
        this.vibrate(60);
        break;
      case 'water':
        this.hiss({ dur: 0.5, gain: 0.25, from: 4000, to: 300, type: 'lowpass' });
        this.tone({ freq: 300, type: 'sine', decay: 0.2, gain: 0.1, glide: 900 });
        this.vibrate(60);
        break;
      case 'caught':
        this.tone({ freq: 110, type: 'sawtooth', decay: 0.6, gain: 0.08, filter: [800, 100] });
        this.tone({ freq: 116, type: 'sawtooth', decay: 0.6, gain: 0.08, filter: [800, 100] });
        this.vibrate([40, 40, 80]);
        break;
      case 'loop':
        [0, -2, -4].forEach((s, i) => this.tone({ freq: midi(70 + s), type: 'triangle', at: i * 0.12, decay: 0.2, gain: 0.08 }));
        break;
      case 'turn':
        this.tone({ freq: 1200, type: 'sine', decay: 0.04, gain: 0.03 });
        break;
      case 'mirror': {
        // A glassy ping, a little higher for each new direction.
        const f = midi(88 + [0, 2, 4, 7][arg & 3]);
        this.tone({ freq: f, type: 'sine', decay: 0.22, gain: 0.05 });
        this.tone({ freq: f * 2.01, type: 'sine', at: 0.01, decay: 0.12, gain: 0.02 });
        break;
      }
      case 'shopBell':
        // The little bell over the shop's door.
        [0, 0.13].forEach((at, i) => {
          this.tone({ freq: midi(91 - i * 5), type: 'sine', at, decay: 0.9, gain: 0.05 });
          this.tone({ freq: midi(91 - i * 5) * 2.76, type: 'sine', at, decay: 0.35, gain: 0.015 });
        });
        break;
      case 'select':
        this.tone({ freq: midi(84), type: 'triangle', decay: 0.07, gain: 0.04 });
        this.tone({ freq: midi(91), type: 'sine', at: 0.04, decay: 0.1, gain: 0.03 });
        break;
      case 'equip':
        this.hiss({ dur: 0.18, gain: 0.04, from: 2500, to: 7000 });
        [0, 7].forEach((st, i) => this.tone({ freq: midi(86 + st), type: 'sine', at: 0.05 + i * 0.07, decay: 0.2, gain: 0.05 }));
        break;
      case 'fanfare': {
        // Bigger and brighter with rarity (0 common … 3 legendary).
        const notes = [[0, 4, 7], [0, 4, 7, 12], [0, 4, 7, 11, 14], [0, 4, 7, 12, 16, 19, 24]][arg] || [0, 4, 7];
        notes.forEach((st, i) => this.tone({ freq: midi(79 + st), type: i % 2 ? 'sine' : 'triangle', at: i * 0.075, decay: 0.45 + arg * 0.15, gain: 0.06 }));
        if (arg >= 2) [0, 4, 7].forEach((st) => this.tone({ freq: midi(67 + st), type: 'sine', at: notes.length * 0.075, decay: 1.2, gain: 0.04 }));
        if (arg >= 3) this.hiss({ at: 0.2, dur: 1.2, gain: 0.05, from: 4000, to: 10000 });
        this.vibrate(arg >= 3 ? [30, 50, 30, 50, 80] : [20, 40, 20]);
        break;
      }
      case 'chestShake':
        this.tone({ freq: 90 + arg * 80, type: 'square', decay: 0.06, gain: 0.05, filter: [600, 150] });
        this.hiss({ dur: 0.08, gain: 0.04 + arg * 0.04, from: 900, to: 400 });
        break;
      case 'chestOpen':
        this.tone({ freq: 220, type: 'sine', decay: 0.4, gain: 0.12, glide: 880 });
        this.hiss({ at: 0.02, dur: 0.6, gain: 0.08, from: 3000, to: 9000 });
        break;
      case 'coin':
        this.tone({ freq: midi(96 + Math.floor(Math.random() * 3) * 2), type: 'triangle', decay: 0.05, gain: 0.035 });
        break;
      case 'buy':
        [0, 4, 7, 12].forEach((st, i) => this.tone({ freq: midi(84 + st), type: 'triangle', at: i * 0.06, decay: 0.18, gain: 0.06 }));
        this.hiss({ at: 0.1, dur: 0.3, gain: 0.03, from: 6000, to: 9000 });
        this.vibrate([12, 30, 12]);
        break;
      case 'gift':
        [0, 7, 12, 16, 19, 24].forEach((st, i) => this.tone({ freq: midi(79 + st), type: 'sine', at: i * 0.07, decay: 0.35, gain: 0.06 }));
        this.vibrate([20, 40, 20]);
        break;
      case 'portal':
        this.tone({ freq: 300, type: 'sine', decay: 0.35, gain: 0.1, glide: 1400 });
        this.hiss({ dur: 0.35, gain: 0.06, from: 500, to: 5000 });
        break;
      case 'bounce':
        this.tone({ freq: 200, type: 'sine', decay: 0.3, gain: 0.18, glide: 600 });
        break;
      case 'daisy':
        this.tone({ freq: midi(76), type: 'sine', decay: 0.25, gain: 0.07 });
        this.tone({ freq: midi(79), type: 'sine', at: 0.15, decay: 0.3, gain: 0.07 });
        break;
      case 'plate':
        this.tone({ freq: 140, type: 'square', decay: 0.12, gain: 0.06, filter: [1200, 200] });
        this.hiss({ at: 0.05, dur: 0.35, gain: 0.08, from: 1500, to: 400 });
        break;
      case 'vane':
        this.tone({ freq: 900, type: 'triangle', decay: 0.08, gain: 0.05 });
        this.tone({ freq: 1100, type: 'triangle', at: 0.06, decay: 0.08, gain: 0.05 });
        break;
      case 'cloud':
        this.hiss({ dur: 0.45, gain: 0.12, from: 2500, to: 800 });
        break;
      case 'win':
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone({ freq: midi(67 + s), type: 'triangle', at: i * 0.07, decay: 0.6, gain: 0.07 }));
        this.vibrate([20, 40, 20]);
        break;
      case 'star':
        this.tone({ freq: midi(84 + arg * 4), type: 'sine', decay: 0.5, gain: 0.12 });
        this.tone({ freq: midi(96 + arg * 4), type: 'sine', decay: 0.3, gain: 0.04 });
        break;
      case 'unlock':
        [0, 7, 12, 16, 19].forEach((s, i) => this.tone({ freq: midi(72 + s), type: 'sine', at: i * 0.06, decay: 0.5, gain: 0.07 }));
        break;
      case 'hint':
        this.tone({ freq: midi(88), type: 'sine', decay: 0.4, gain: 0.07 });
        this.tone({ freq: midi(95), type: 'sine', at: 0.1, decay: 0.4, gain: 0.06 });
        break;
      case 'page':
        this.hiss({ dur: 0.12, gain: 0.06, from: 3000, to: 1500 });
        break;
      default:
        break;
    }
  }

  // --- generative music --------------------------------------------------------

  startMusic(theme, force = false) {
    if (this.theme === theme && this.timer && !force) return;
    this.theme = theme;
    if (!this.ctx) return;
    if (this.timer) clearInterval(this.timer);
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.beat = 0;
    this.timer = setInterval(() => this.schedule(), 120);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const sc = SCALES[this.theme] || SCALES.title;
    const spb = 60 / sc.bpm;
    while (this.nextBeat < c.currentTime + 0.5) {
      const t = this.nextBeat;
      const bar = Math.floor(this.beat / 4) % sc.prog.length;
      const chord = sc.prog[bar];
      if (this.beat % 4 === 0) {
        // Pad chord.
        for (const n of chord) this.pad(midi(sc.root - 12 + n), t, spb * 4.2);
        this.pad(midi(sc.root - 24 + chord[0]), t, spb * 4.2, 0.05);
      }
      // Music-box notes, sparse and gentle.
      const seed = Math.sin(this.beat * 12.9898 + sc.root) * 43758.5453;
      const r = seed - Math.floor(seed);
      if (r < 0.55) {
        const n = chord[Math.floor(r * 10) % 3] + (r < 0.2 ? 12 : 0);
        this.box(midi(sc.root + 12 + n), t + (r < 0.3 ? spb / 2 : 0));
      }
      this.ambience(this.theme, t, spb);
      this.nextBeat += spb;
      this.beat++;
    }
  }

  // --- ambience: little sounds of each world, scheduled with the music ------

  ambience(theme, t, spb) {
    const r = Math.random();
    switch (theme) {
      case 'meadow':
      case 'title':
        if (r < 0.35) this.cricket(t + Math.random() * spb);
        break;
      case 'pond':
        if (r < 0.3) this.drip(t + Math.random() * spb);
        else if (r < 0.38) this.frog(t + Math.random() * spb);
        break;
      case 'grove':
        if (r < 0.12) this.hoot(t + Math.random() * spb, 430);
        else if (r < 0.3) this.cricket(t + Math.random() * spb, 3600);
        break;
      case 'ruins':
        if (r < 0.14) this.chime(t + Math.random() * spb);
        break;
      case 'gloom':
        if (r < 0.18) this.wind(t, spb * 3, 260);
        else if (r < 0.24) this.hoot(t + Math.random() * spb, 330);
        break;
      case 'peak':
        if (r < 0.25) this.wind(t, spb * 3.5, 900);
        else if (r < 0.31) this.chime(t + Math.random() * spb);
        break;
      case 'shop':
        if (r < 0.12) this.chime(t + Math.random() * spb);
        break;
      case 'dawn':
        if (r < 0.22) this.bird(t + Math.random() * spb);
        else if (r < 0.3) this.chime(t + Math.random() * spb);
        break;
      default:
        break;
    }
  }

  ambTone(freq, t, { type = 'sine', attack = 0.004, decay = 0.08, gain = 0.02, glide = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + attack + decay);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(gain, t + attack);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(gn).connect(this.musicBus);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  cricket(t, f = 4400) {
    for (let i = 0; i < 3; i++) this.ambTone(f, t + i * 0.055, { decay: 0.035, gain: 0.012 });
  }

  drip(t) {
    this.ambTone(1500 + Math.random() * 600, t, { decay: 0.09, gain: 0.03, glide: 400 });
  }

  frog(t) {
    for (let i = 0; i < 2; i++) this.ambTone(140 + Math.random() * 30, t + i * 0.13, { type: 'square', decay: 0.07, gain: 0.012 });
  }

  hoot(t, f) {
    this.ambTone(f, t, { attack: 0.05, decay: 0.3, gain: 0.025, glide: f * 0.92 });
    this.ambTone(f * 0.95, t + 0.45, { attack: 0.05, decay: 0.45, gain: 0.02, glide: f * 0.85 });
  }

  bird(t) {
    // The first birds of the morning: two or three quick rising chirps.
    const f = 2200 + Math.random() * 900;
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) this.ambTone(f * (1 + i * 0.06), t + i * 0.11, { attack: 0.01, decay: 0.07, gain: 0.014, glide: f * 1.35 });
  }

  chime(t) {
    const base = [1568, 1760, 2093, 2349, 2637][Math.floor(Math.random() * 5)];
    this.ambTone(base, t, { attack: 0.005, decay: 1.6, gain: 0.018 });
    this.ambTone(base * 2.7, t, { attack: 0.005, decay: 0.6, gain: 0.006 });
  }

  wind(t, dur, center) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(center * 0.6, t);
    f.frequency.linearRampToValueAtTime(center * 1.4, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(center * 0.7, t + dur);
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(0.03, t + dur * 0.45);
    gn.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(gn).connect(this.musicBus);
    src.start(t);
    src.stop(t + dur + 0.1);
  }

  pad(freq, t, dur, gain = 0.035) {
    const c = this.ctx;
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    gn.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    f.connect(gn).connect(this.musicBus);
    for (const d of [-6, 6]) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = d;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  box(freq, t) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(gn).connect(this.musicBus);
    o.start(t);
    o.stop(t + 1.5);
  }
}

export const sound = new Sound();
