// Notebook entries, hats and achievements.
import { KIND, T } from '../engine/core.js';
import { COSMETICS, COLLECTOR, FREE } from './cosmetics.js';

/** Elements of the world, explained the first time they appear. */
export const NOTEBOOK = [
  {
    id: 'lumi',
    name: { fr: 'Lumignon', en: 'Lumignon' },
    text: {
      fr: 'Une petite lueur têtue : elle avance tout droit, case après case. Si un obstacle lui barre la route, elle tourne à sa droite (sinon à sa gauche, sinon elle fait demi-tour). Les Lumignons se traversent sans se gêner.',
      en: 'A stubborn little light: it walks straight ahead, tile after tile. When something blocks the way it turns to its right (else to its left, else back). Lumignons pass through each other.',
    },
    has: (L) => true,
  },
  {
    id: 'lantern',
    name: { fr: 'Lanterne', en: 'Lantern' },
    text: {
      fr: 'Chaque Lumignon doit rentrer dans la lanterne de sa couleur. Pour les autres, une lanterne est un obstacle comme un rocher.',
      en: 'Each Lumignon must reach the lantern of its colour. To everyone else a lantern is an obstacle, just like a rock.',
    },
    has: (L) => true,
  },
  {
    id: 'arrow',
    name: { fr: 'Flèche', en: 'Arrow' },
    text: {
      fr: 'Ta pièce principale. Pose-la sur l’herbe : tout ce qui marche dessus repart dans sa direction, à chaque passage.',
      en: 'Your main piece. Put it on grass: whoever steps on it leaves in its direction, every single time.',
    },
    has: (L) => L.inventory.arrow > 0,
  },
  {
    id: 'rock',
    name: { fr: 'Obstacle', en: 'Obstacle' },
    text: {
      fr: 'Rochers, buissons, arbres… Impossible de les traverser : en les heurtant, on tourne à droite.',
      en: 'Rocks, bushes, trees… They cannot be crossed: bump into one and you turn right.',
    },
    has: (L) => L.terrain.includes(T.WALL),
  },
  {
    id: 'void',
    name: { fr: 'Le vide', en: 'The void' },
    text: {
      fr: 'Le bord de l’île et ses trous. Les Lumignons ne regardent pas où ils mettent les pieds : gare à la chute !',
      en: 'The edge of the island and its holes. Lumignons never look where they walk: mind the drop!',
    },
    has: (L) => true,
  },
  {
    id: 'firefly',
    name: { fr: 'Luciole', en: 'Firefly' },
    text: {
      fr: 'Facultative. N’importe quel Lumignon peut l’attraper en passant. Attrape-les toutes pour la 2ᵉ étoile, et avec peu de pièces pour la 3ᵉ.',
      en: 'Optional. Any Lumignon catches it by walking through. Catch them all for the 2nd star, with few pieces for the 3rd.',
    },
    has: (L) => L.fireflies.length > 0,
  },
  {
    id: 'engraved',
    name: { fr: 'Flèche gravée', en: 'Engraved arrow' },
    text: {
      fr: 'Comme une flèche, mais scellée dans la pierre : tu ne peux ni la tourner ni la déplacer. Sers-t’en !',
      en: 'Works like an arrow but is sealed in stone: you cannot turn or move it. Make use of it!',
    },
    has: (L) => L.fixedArrow.some((d) => d >= 0),
  },
  {
    id: 'water',
    name: { fr: 'Eau', en: 'Water' },
    text: {
      fr: 'L’eau éteint la flamme des Lumignons. Pose un nénuphar pour traverser.',
      en: 'Water puts out a Lumignon’s flame. Place a lily pad to cross it.',
    },
    has: (L) => L.terrain.includes(T.WATER),
  },
  {
    id: 'lily',
    name: { fr: 'Nénuphar', en: 'Lily pad' },
    text: {
      fr: 'Se pose uniquement sur l’eau et permet de la traverser sans danger.',
      en: 'Can only be placed on water, and makes it safe to cross.',
    },
    has: (L) => L.inventory.lily > 0,
  },
  {
    id: 'spark',
    name: { fr: 'Étincelle', en: 'Spark' },
    text: {
      fr: 'Tant que son Lumignon n’a pas ramassé l’étincelle de sa couleur, la lanterne reste fermée (et bloque comme un rocher).',
      en: 'Until its Lumignon picks up the spark of its colour, the lantern stays closed (and blocks like a rock).',
    },
    has: (L) => L.sparkList.length > 0,
  },
  {
    id: 'mushroom',
    name: { fr: 'Champignon sauteur', en: 'Bounce mushroom' },
    text: {
      fr: 'Depuis un champignon, le pas suivant devient un bond de deux cases, par-dessus n’importe quoi. Si l’atterrissage est bloqué, on tourne à droite et on bondit.',
      en: 'From a mushroom the next step becomes a two-tile leap, over anything. If the landing tile is blocked, turn right and leap.',
    },
    has: (L) => L.inventory.mushroom > 0 || L.fixedMushroom.includes(1),
  },
  {
    id: 'daisy',
    name: { fr: 'Pâquerette', en: 'Daisy' },
    text: {
      fr: 'Qui passe dessus s’arrête pour la sentir : il attend un tour avant de repartir dans la même direction.',
      en: 'Whoever steps on it stops to smell it, waiting one turn before going on in the same direction.',
    },
    has: (L) => L.inventory.daisy > 0 || L.fixedDaisy.includes(1),
  },
  {
    id: 'portal',
    name: { fr: 'Arche de lune', en: 'Moon gate' },
    text: {
      fr: 'Entre dans une arche, ressors par sa jumelle (même couleur), dans la même direction.',
      en: 'Step into a gate, come out of its twin (same colour), still facing the same way.',
    },
    has: (L) => L.portal.some((p) => p >= 0),
  },
  {
    id: 'plate',
    name: { fr: 'Dalle-lune', en: 'Moon switch' },
    text: {
      fr: 'Chaque passage sur la dalle ouvre ou referme les ronces de sa couleur.',
      en: 'Every step on the switch opens or closes the brambles of its colour.',
    },
    has: (L) => L.plate.some((p) => p >= 0),
  },
  {
    id: 'brambles',
    name: { fr: 'Ronces', en: 'Brambles' },
    text: {
      fr: 'Dressées, elles bloquent comme un rocher. Couchées, on passe.',
      en: 'When raised they block like a rock. When lowered you can walk over them.',
    },
    has: (L) => L.gate.some((p) => p >= 0),
  },
  {
    id: 'gloomnib',
    name: { fr: 'Grignombre', en: 'Gloomnib' },
    text: {
      fr: 'Il suit exactement les mêmes règles que les Lumignons (flèches comprises !) mais attrape ceux qu’il croise. Lui aussi tombe dans le vide et se noie.',
      en: 'It follows exactly the same rules as Lumignons (arrows included!) but catches any it meets. It also falls into the void and drowns.',
    },
    has: (L) => L.walkers.some((w) => w.kind === KIND.SHADOW && !w.sleeping),
  },
  {
    id: 'sleeper',
    name: { fr: 'Grignombre endormi', en: 'Sleeping Gloomnib' },
    text: {
      fr: 'Il ne bouge pas, mais attrape quiconque marche sur sa case.',
      en: 'It never moves, but catches anyone stepping onto its tile.',
    },
    has: (L) => L.walkers.some((w) => w.kind === KIND.SHADOW && w.sleeping),
  },
  {
    id: 'vane',
    name: { fr: 'Girouette', en: 'Weathervane' },
    text: {
      fr: 'Une flèche qui tourne d’un quart de tour (sens des aiguilles d’une montre) après chaque passage.',
      en: 'An arrow that turns a quarter clockwise after each visitor.',
    },
    has: (L) => L.vanes.length > 0,
  },
  {
    id: 'cloud',
    name: { fr: 'Nuage', en: 'Cloud' },
    text: {
      fr: 'Un nuage se dissipe dès qu’on le quitte : on ne passe qu’une seule fois !',
      en: 'A cloud vanishes as soon as someone steps off it: one crossing only!',
    },
    has: (L) => L.cloudCells.length > 0,
  },
  {
    id: 'mirror',
    name: { fr: 'Miroir de cristal', en: 'Crystal mirror' },
    text: {
      fr: 'Un Lumignon est une lumière : un miroir le renvoie de côté, comme un rayon. Ce qui arrive de face repart d’un côté, ce qui arrive de l’autre côté repart de l’autre. Touche un miroir posé pour le tourner (/ ou \\).',
      en: 'A Lumignon is light: a mirror sends it sideways, like a ray. Coming from one side it leaves one way, from the other side the other way. Tap a mirror you placed to turn it (/ or \\).',
    },
    has: (L) => L.inventory.mirror > 0 || L.fixedMirror.some((m) => m >= 0),
  },
];

/** Cosmetic hats. `need` is evaluated by the progress module. */
export const HATS_INFO = [
  { id: 'none', name: { fr: 'Tête nue', en: 'Bare head' }, need: { stars: 0 } },
  { id: 'leaf', name: { fr: 'Feuille', en: 'Leaf' }, need: { stars: 6 } },
  { id: 'acorn', name: { fr: 'Gland', en: 'Acorn cap' }, need: { stars: 18 } },
  { id: 'flowers', name: { fr: 'Couronne de fleurs', en: 'Flower crown' }, need: { world: 0 } },
  { id: 'lily', name: { fr: 'Nénuphar', en: 'Lily' }, need: { world: 1 } },
  { id: 'mushroom', name: { fr: 'Chapeau champignon', en: 'Mushroom cap' }, need: { world: 2 } },
  { id: 'moon', name: { fr: 'Casque de lune', en: 'Moon helmet' }, need: { world: 3 } },
  { id: 'nightcap', name: { fr: 'Bonnet de nuit', en: 'Nightcap' }, need: { world: 4 } },
  { id: 'feather', name: { fr: 'Plume', en: 'Feather' }, need: { bonus: 1 } },
  { id: 'wizard', name: { fr: 'Chapeau d’astronome', en: 'Stargazer hat' }, need: { stars: 100 } },
  { id: 'crown', name: { fr: 'Couronne', en: 'Crown' }, need: { world: 5 } },
  { id: 'prism', name: { fr: 'Diadème de cristal', en: 'Crystal tiara' }, need: { world: 6 } },
  { id: 'halo', name: { fr: 'Auréole d’étoiles', en: 'Star halo' }, need: { perfect: true } },
  // Sold in the shop (data/cosmetics.js), and the crown of a full collection.
  ...COSMETICS.filter((c) => c.slot === 'hat').map((c) => ({ id: c.id, name: c.name, need: { shop: true } })),
  { id: COLLECTOR.id, name: COLLECTOR.name, need: { collector: true } },
];

/** Light trails behind the Lumignons (the shop sells all but the first). */
export const TRAILS = [FREE.find((f) => f.slot === 'trail'), ...COSMETICS.filter((c) => c.slot === 'trail')];

/** Achievements; `check(p)` receives the progress summary. */
export const ACHIEVEMENTS = [
  { id: 'first', icon: '✦', name: { fr: 'Premiers pas', en: 'First steps' }, desc: { fr: 'Terminer un premier niveau.', en: 'Finish your first level.' }, check: (p) => p.completed >= 1 },
  { id: 'perfect1', icon: '★', name: { fr: 'Du premier coup d’œil', en: 'At first glance' }, desc: { fr: 'Obtenir 3 étoiles sur un niveau.', en: 'Get 3 stars on a level.' }, check: (p) => p.perfectLevels >= 1 },
  { id: 'fireflies50', icon: '✧', name: { fr: 'Chasseur de lucioles', en: 'Firefly catcher' }, desc: { fr: 'Attraper 50 lucioles.', en: 'Catch 50 fireflies.' }, check: (p) => p.firefliesCaught >= 50, progress: (p) => [p.firefliesCaught, 50] },
  { id: 'world1', icon: '🌿', name: { fr: 'Le pré apaisé', en: 'Meadow at peace' }, desc: { fr: 'Terminer le Pré des Murmures.', en: 'Finish the Whispering Meadow.' }, check: (p) => p.worldsDone >= 1 },
  { id: 'stars50', icon: '✶', name: { fr: 'Constellation', en: 'Constellation' }, desc: { fr: 'Réunir 50 étoiles.', en: 'Gather 50 stars.' }, check: (p) => p.stars >= 50, progress: (p) => [p.stars, 50] },
  { id: 'bonus', icon: '☄', name: { fr: 'Vœu exaucé', en: 'Wish granted' }, desc: { fr: 'Réussir une étoile filante.', en: 'Clear a shooting star level.' }, check: (p) => p.bonusDone >= 1 },
  { id: 'stubborn', icon: '↻', name: { fr: 'Têtu comme un Lumignon', en: 'Stubborn as a Lumignon' }, desc: { fr: 'Réussir un niveau après 10 essais.', en: 'Clear a level after 10 tries.' }, check: (p) => p.stubborn },
  { id: 'nohint', icon: '◎', name: { fr: 'Esprit clair', en: 'Clear mind' }, desc: { fr: 'Finir un monde entier sans indice.', en: 'Finish a whole world without hints.' }, check: (p) => p.worldNoHint },
  { id: 'perfect20', icon: '✪', name: { fr: 'Perfectionniste', en: 'Perfectionist' }, desc: { fr: 'Obtenir 3 étoiles sur 20 niveaux.', en: 'Get 3 stars on 20 levels.' }, check: (p) => p.perfectLevels >= 20, progress: (p) => [p.perfectLevels, 20] },
  { id: 'world6', icon: '🏮', name: { fr: 'La grande lanterne', en: 'The great lantern' }, desc: { fr: 'Terminer la Cime des Vents.', en: 'Finish the Windy Peak.' }, check: (p) => p.worldsDone >= 6 },
  { id: 'world7', icon: '🌅', name: { fr: 'Lever du jour', en: 'Daybreak' }, desc: { fr: 'Terminer l’Aube de Cristal.', en: 'Finish the Crystal Dawn.' }, check: (p) => p.worldsDone >= 7 },
  { id: 'allbonus', icon: '🌠', name: { fr: 'Pluie d’étoiles', en: 'Meteor shower' }, desc: { fr: 'Réussir les sept étoiles filantes.', en: 'Clear all seven shooting stars.' }, check: (p) => p.bonusDone >= 7, progress: (p) => [p.bonusDone, 7] },
  { id: 'daily7', icon: '☀', name: { fr: 'Fidèle au rendez-vous', en: 'Regular visitor' }, desc: { fr: 'Réussir 7 défis du jour.', en: 'Clear 7 daily puzzles.' }, check: (p) => p.dailyDone >= 7, progress: (p) => [p.dailyDone, 7] },
  { id: 'streak5', icon: '🔥', name: { fr: 'Flamme vive', en: 'Burning bright' }, desc: { fr: 'Une série de 5 défis du jour.', en: 'A 5-day daily streak.' }, check: (p) => p.dailyBest >= 5, progress: (p) => [p.dailyBest, 5] },
  { id: 'maker', icon: '✎', name: { fr: 'Architecte', en: 'Architect' }, desc: { fr: 'Créer un niveau vérifié dans l’atelier.', en: 'Make a checked level in the workshop.' }, check: (p) => p.customMade >= 1 },
  { id: 'master', icon: '👑', name: { fr: 'Gardien des chemins', en: 'Keeper of the paths' }, desc: { fr: '3 étoiles partout.', en: '3 stars everywhere.' }, check: (p) => p.allPerfect },
];
