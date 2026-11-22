// Pseudonyms for the online rankings: what is allowed, how two spellings of the
// same name are recognised (the "key" that makes a pseudo unique), a filter for
// rude words, and friendly suggestions. firestore.rules checks the same shape
// and computes the same key, so keep both in step.

export const NAME_MIN = 3;
export const NAME_MAX = 18;

// Letters (with French and other Western European accents), digits, and a few
// separators inside the name. First and last characters are letters or digits.
const CH = 'A-Za-z0-9À-ÖØ-öø-ÿŒœ';
export const NAME_RE = new RegExp(`^[${CH}][${CH} '._-]{${NAME_MIN - 2},${NAME_MAX - 2}}[${CH}]$`, 'u');

const FOLD = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', æ: 'ae', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i', ð: 'd', ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y', þ: 'th', ß: 'ss', œ: 'oe',
};

/** Tidies what was typed: curly apostrophes, spaces at the ends and in a row. */
export function cleanName(s) {
  return String(s || '')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Lune-Rêveuse" and "lune rêveuse" are the same pseudo: "lunereveuse". */
export function nameKey(name) {
  return cleanName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, (c) => FOLD[c] ?? '');
}

// Words that may not be part of a pseudo. Short or ambiguous ones only count as
// whole words ("con" must not block "Constance"); the others anywhere in the name.
const WHOLE = [
  'con', 'cons', 'conne', 'connes', 'pd', 'pde', 'cul', 'bite', 'bites', 'pute', 'putes', 'chier', 'merde',
  'nazi', 'nazis', 'ss', 'kkk', 'sex', 'sexe', 'sexy', 'porn', 'porno', 'viol', 'violeur', 'fdp', 'ntm', 'tg', 'nique',
  'chatte', 'suce', 'sucer', 'negre', 'negro', 'pedo', 'ass', 'fag', 'fags', 'cum', 'tit', 'tits', 'dick',
  'cock', 'rape', 'nude', 'nudes', 'hoe', 'hoes', 'wtf', 'stfu',
];
const ANYWHERE = [
  'connard', 'connasse', 'encul', 'salope', 'salaud', 'batard', 'enfoire', 'petasse', 'pouffiasse',
  'poufiasse', 'niquer', 'niktamer', 'niquetamere', 'tamere', 'couille', 'branleu', 'branlette', 'bougnoul',
  'youpin', 'negresse', 'pedophil', 'pedophile', 'hitler', 'fuck', 'shit', 'bitch', 'cunt', 'whore',
  'slut', 'pussy', 'nigger', 'nigga', 'faggot', 'retard', 'rapist', 'motherf', 'asshole', 'bastard',
  'penis', 'vagin', 'nichon', 'zgeg', 'chibre', 'enculer', 'ptn',
];
// Names that would look official, or confuse the rankings.
const RESERVED = [
  'admin', 'administrateur', 'administrator', 'moderateur', 'moderatrice', 'moderator', 'modo', 'support',
  'officiel', 'official', 'lumignon', 'lumignons', 'madamephalene', 'system', 'systeme', 'anonyme',
  'anonymous', 'joueur', 'joueuse', 'player', 'toi', 'moi', 'you', 'nobody', 'personne', 'staff',
];

// Digits standing for letters ("c0nn4rd"), accents folded, repeated letters squashed.
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' };
const squash = (s) => s.replace(/(.)\1+/g, '$1');
const plain = (s) => s.toLowerCase().replace(/[^a-z]/g, (c) => LEET[c] ?? FOLD[c] ?? '');
const WHOLE_SET = new Set(WHOLE);

/** True when the name contains a word we do not want on a public ranking. */
export function isRude(name) {
  const s = cleanName(name);
  const words = s
    .split(/[^A-Za-z0-9À-ÖØ-öø-ÿŒœ]+/u)
    .filter((w) => w && !/^\d+$/.test(w)) // "Lou 55" is a number, not "ss"
    .map(plain);
  if (words.some((w) => WHOLE_SET.has(w) || WHOLE_SET.has(squash(w)))) return true;
  const whole = plain(s.replace(/(^|[^A-Za-z0-9])\d+(?=$|[^A-Za-z0-9])/g, '$1'));
  const sq = squash(whole);
  return ANYWHERE.some((w) => whole.includes(w) || sq.includes(w));
}

/**
 * Checks a pseudo. Returns null when it can be used, or the reason it cannot:
 * 'short', 'long', 'chars', 'edge', 'letters', 'spaces', 'rude' or 'reserved'.
 */
export function checkName(raw) {
  const s = cleanName(raw);
  if ([...s].length < NAME_MIN) return 'short';
  if ([...s].length > NAME_MAX) return 'long';
  if (!new RegExp(`^[${CH} '._-]+$`, 'u').test(s)) return 'chars';
  if (!NAME_RE.test(s)) return 'edge';
  if (/[ '._-]{2}/.test(s)) return 'spaces';
  if (!/[A-Za-zÀ-ÖØ-öø-ÿŒœ]/u.test(s)) return 'letters';
  const key = nameKey(s);
  if (key.length < NAME_MIN) return 'short';
  if (isRude(s)) return 'rude';
  if (RESERVED.includes(key)) return 'reserved';
  return null;
}

// ------------------------------------------------------------- suggestions

const WORDS = {
  fr: {
    // [noun, gender]
    nouns: [
      ['Luciole', 'f'], ['Lanterne', 'f'], ['Comète', 'f'], ['Lueur', 'f'], ['Étoile', 'f'], ['Aurore', 'f'],
      ['Plume', 'f'], ['Brume', 'f'], ['Lune', 'f'], ['Flamme', 'f'], ['Bougie', 'f'], ['Fée', 'f'],
      ['Chouette', 'f'], ['Rainette', 'f'], ['Étincelle', 'f'], ['Hibou', 'm'], ['Renard', 'm'], ['Nuage', 'm'],
      ['Lutin', 'm'], ['Phare', 'm'], ['Grillon', 'm'], ['Rayon', 'm'], ['Météore', 'm'], ['Nénuphar', 'm'],
      ['Feu follet', 'm'], ['Cerf-volant', 'm'], ['Galet', 'm'], ['Écureuil', 'm'], ['Colibri', 'm'], ['Lampion', 'm'],
    ],
    // [masculine, feminine]
    adjectives: [
      ['Têtu', 'Têtue'], ['Rêveur', 'Rêveuse'], ['Malin', 'Maligne'], ['Filant', 'Filante'], ['Doré', 'Dorée'],
      ['Curieux', 'Curieuse'], ['Joyeux', 'Joyeuse'], ['Rusé', 'Rusée'], ['Brillant', 'Brillante'], ['Câlin', 'Câline'],
      ['Discret', 'Discrète'], ['Agile', 'Agile'], ['Sage', 'Sage'], ['Rapide', 'Rapide'], ['Timide', 'Timide'],
      ['Vif', 'Vive'], ['Lumineux', 'Lumineuse'], ['Farceur', 'Farceuse'], ['Songeur', 'Songeuse'], ['Gourmand', 'Gourmande'],
      ['Étoilé', 'Étoilée'], ['Pétillant', 'Pétillante'], ['Mystérieux', 'Mystérieuse'], ['Intrépide', 'Intrépide'],
    ],
  },
  en: {
    nouns: [
      'Firefly', 'Lantern', 'Comet', 'Glow', 'Star', 'Moth', 'Owl', 'Fox', 'Cloud', 'Sprite', 'Beacon', 'Cricket',
      'Meteor', 'Lily', 'Pebble', 'Spark', 'Candle', 'Feather', 'Moon', 'Kite', 'Wisp', 'Squirrel', 'Robin',
    ],
    adjectives: [
      'Stubborn', 'Dreamy', 'Clever', 'Golden', 'Curious', 'Jolly', 'Sly', 'Shiny', 'Cosy', 'Quiet', 'Nimble',
      'Wise', 'Swift', 'Shy', 'Bright', 'Cheeky', 'Starry', 'Sparkly', 'Brave', 'Sleepy', 'Lucky', 'Fuzzy',
    ],
  },
};

/** A random pseudo such as "Comète Rusée" (or "Comète Rusée 27" with `number`). */
export function suggestName(lang = 'fr', rng = Math.random, number = false) {
  for (let tries = 0; tries < 50; tries++) {
    let s;
    if (lang === 'fr') {
      const [noun, g] = WORDS.fr.nouns[Math.floor(rng() * WORDS.fr.nouns.length)];
      const adj = WORDS.fr.adjectives[Math.floor(rng() * WORDS.fr.adjectives.length)][g === 'f' ? 1 : 0];
      s = `${noun} ${adj}`;
    } else {
      const adj = WORDS.en.adjectives[Math.floor(rng() * WORDS.en.adjectives.length)];
      const noun = WORDS.en.nouns[Math.floor(rng() * WORDS.en.nouns.length)];
      s = `${adj} ${noun}`;
    }
    if (number) s += ' ' + (10 + Math.floor(rng() * 90));
    if (!checkName(s)) return s;
  }
  return lang === 'fr' ? 'Luciole Têtue' : 'Stubborn Firefly';
}

/** Another spelling to offer when a pseudo is taken: "Lune" → "Lune 42". */
export function variantOf(name, rng = Math.random) {
  const base = cleanName(name).replace(/ \d{1,3}$/, '');
  for (let tries = 0; tries < 20; tries++) {
    const s = `${base.slice(0, NAME_MAX - 3).trim()} ${10 + Math.floor(rng() * 90)}`;
    if (!checkName(s)) return s;
  }
  return suggestName('fr', rng, true);
}
