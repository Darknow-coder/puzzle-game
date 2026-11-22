// Every cosmetic of the game: the slot it goes in, how rare it is, its price.
// Hats earned by playing (stars, worlds…) live in data/meta.js; the ones below
// are sold in the shop. Prices follow the rarity; the colour of a Lumignon is
// never changed by a skin, so the game stays readable.

export const SLOTS = ['hat', 'glasses', 'flame', 'trail', 'party'];

/** What everyone owns from the start, per slot. */
export const DEFAULTS = { hat: 'none', glasses: 'none', flame: 'classic', trail: 'classic', party: 'classic' };

export const RARITIES = ['common', 'rare', 'epic', 'legendary'];
/** Chances in the surprise chest, out of 100. */
export const ODDS = { common: 50, rare: 32, epic: 14, legendary: 4 };

const c = (id, slot, rarity, price, fr, en) => ({ id, slot, rarity, price, name: { fr, en } });

export const COSMETICS = [
  c('bow', 'hat', 'common', 90, 'Nœud', 'Bow'),
  c('beret', 'hat', 'common', 110, 'Béret', 'Beret'),
  c('pompom', 'hat', 'common', 120, 'Bonnet à pompon', 'Bobble hat'),
  c('straw', 'hat', 'rare', 180, 'Chapeau de paille', 'Straw hat'),
  c('partyhat', 'hat', 'rare', 190, 'Chapeau de fête', 'Party hat'),
  c('chef', 'hat', 'rare', 200, 'Toque', 'Chef’s hat'),
  c('headphones', 'hat', 'rare', 220, 'Casque audio', 'Headphones'),
  c('tophat', 'hat', 'epic', 320, 'Haut-de-forme', 'Top hat'),
  c('antlers', 'hat', 'epic', 340, 'Bois de lumière', 'Glowing antlers'),
  c('raincloud', 'hat', 'epic', 360, 'Petit nuage', 'Little cloud'),
  c('aurora', 'hat', 'legendary', 750, 'Couronne d’aurore', 'Aurora crown'),
  c('phoenix', 'hat', 'legendary', 800, 'Plumes de phénix', 'Phoenix plumes'),

  c('round', 'glasses', 'common', 80, 'Lunettes rondes', 'Round glasses'),
  c('shades', 'glasses', 'common', 100, 'Lunettes de soleil', 'Sunglasses'),
  c('lovely', 'glasses', 'rare', 170, 'Lunettes cœur', 'Heart glasses'),
  c('starry', 'glasses', 'rare', 190, 'Lunettes étoiles', 'Star glasses'),
  c('monocle', 'glasses', 'epic', 280, 'Monocle', 'Monocle'),
  c('mask', 'glasses', 'epic', 300, 'Masque de héros', 'Hero mask'),
  c('visor', 'glasses', 'legendary', 650, 'Visière arc-en-ciel', 'Rainbow visor'),

  c('flame-heart', 'flame', 'rare', 200, 'Flamme cœur', 'Heart flame'),
  c('flame-star', 'flame', 'rare', 220, 'Flamme étoile', 'Star flame'),
  c('flame-twin', 'flame', 'epic', 320, 'Flamme jumelle', 'Twin flame'),
  c('flame-swirl', 'flame', 'epic', 340, 'Flamme tourbillon', 'Swirl flame'),
  c('flame-sparkler', 'flame', 'legendary', 700, 'Flamme cierge magique', 'Sparkler flame'),

  c('bubbles', 'trail', 'common', 110, 'Bulles', 'Bubbles'),
  c('sparkle', 'trail', 'common', 130, 'Poussière d’étoiles', 'Stardust'),
  c('petals', 'trail', 'rare', 190, 'Pétales', 'Petals'),
  c('hearts', 'trail', 'rare', 190, 'Petits cœurs', 'Little hearts'),
  c('snow', 'trail', 'rare', 200, 'Flocons', 'Snowflakes'),
  c('notes', 'trail', 'rare', 210, 'Mélodie', 'Melody'),
  c('comet', 'trail', 'epic', 300, 'Comète', 'Comet'),
  c('rainbow', 'trail', 'legendary', 650, 'Arc-en-ciel', 'Rainbow'),

  c('confetti', 'party', 'common', 120, 'Confettis', 'Confetti'),
  c('balloons', 'party', 'rare', 200, 'Ballons', 'Balloons'),
  c('butterflies', 'party', 'rare', 220, 'Papillons', 'Butterflies'),
  c('fireworks', 'party', 'epic', 360, 'Feu d’artifice', 'Fireworks'),
  c('starfall', 'party', 'legendary', 700, 'Pluie d’étoiles filantes', 'Starfall'),
];

/** Free items (one per slot) and the exclusive crown of a full collection. */
export const FREE = [
  c('classic', 'flame', 'common', 0, 'Flamme', 'Flame'),
  c('classic', 'trail', 'common', 0, 'Lueur', 'Glow'),
  c('classic', 'party', 'common', 0, 'Étincelles', 'Sparkles'),
];
export const COLLECTOR = c('collector', 'hat', 'legendary', 0, 'Couronne du collectionneur', 'Collector’s crown');

/** Rewards for owning a share of the shop's cosmetics (the last one also gives the crown). */
export const MILESTONES = [
  { pct: 25, coins: 100 },
  { pct: 50, coins: 200 },
  { pct: 75, coins: 300 },
  { pct: 100, coins: 500 },
];

export const findCosmetic = (id) => COSMETICS.find((x) => x.id === id) || (id === COLLECTOR.id ? COLLECTOR : null);
