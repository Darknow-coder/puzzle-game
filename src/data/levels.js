// The campaign. Map legend: see src/engine/core.js (parseLevel).
// Every level carries the designer's intent; `npm run verify` proves that
// each one is solvable and computes its par (stored in solutions.js).

const ALL_WORLDS = [
  {
    id: 'meadow',
    name: { fr: 'Le Pré des Murmures', en: 'Whispering Meadow' },
    blurb: {
      fr: 'Au crépuscule, les Lumignons sortent jouer dans l’herbe haute. Guide-les jusqu’à leurs lanternes avant la nuit noire.',
      en: 'At dusk the Lumignons come out to play in the tall grass. Guide them home before nightfall.',
    },
    unlock: 0,
    levels: [
      {
        id: '1-1',
        name: { fr: 'Premiers pas', en: 'First steps' },
        intent: 'Place a single arrow and choose its direction.',
        tip: 'place',
        map: [
          ' .... ',
          'a.....',
          '...*..',
          ' ..A. ',
        ],
        dirs: { a: 'E' },
        inv: { arrow: 1 },
      },
      {
        id: '1-2',
        name: { fr: 'Le rocher', en: 'The rock' },
        intent: 'A rock turns the Lumignon to its right: one arrow onto the right row lets the rock do the rest.',
        tip: 'rock',
        map: [
          '.a....',
          '......',
          '...*.#',
          '......',
          '  ..A ',
        ],
        dirs: { a: 'S' },
        inv: { arrow: 1 },
      },
      {
        id: '1-3',
        name: { fr: 'Lucioles', en: 'Fireflies' },
        intent: 'The short way home misses the fireflies: take the long way round the island for the extra stars.',
        tip: 'stars',
        map: [
          ' ......',
          'a......',
          ' ......',
          ' .....*',
          '  ..A*.',
        ],
        dirs: { a: 'E' },
        inv: { arrow: 3 },
      },
      {
        id: '1-4',
        name: { fr: 'Demi-tour', en: 'About turn' },
        intent: 'The lantern is behind Pip: an arrow can send him back, a rock can turn him, both are needed for the firefly.',
        map: [
          ' ..... ',
          'A..a..#',
          '.....* ',
        ],
        dirs: { a: 'E' },
        inv: { arrow: 2 },
      },
      {
        id: '1-5',
        name: { fr: 'Flèches gravées', en: 'Engraved arrows' },
        intent: 'Engraved arrows cannot move: ride both of them, then fix the path with your own.',
        map: [
          ' a..v.. ',
          ' *..... ',
          ' ....*. ',
          ' ...>..#',
          ' ...... ',
          ' A..... ',
        ],
        dirs: { a: 'E' },
        inv: { arrow: 3 },
      },
      {
        id: '1-6',
        name: { fr: 'Nim', en: 'Nim' },
        intent: 'Two colours, two lanterns. A lantern of another colour is a wall that turns you.',
        tip: 'two',
        map: [
          'a.... ',
          '.*... ',
          '..... ',
          'A.... ',
          '....B ',
          '..... ',
          '..*.b ',
        ],
        dirs: { a: 'E', b: 'W' },
        inv: { arrow: 4 },
      },
      {
        id: '1-7',
        name: { fr: 'Une flèche pour deux', en: 'One arrow for two' },
        intent: 'A single arrow can serve both Lumignons; the amber lantern turns Nim into his own.',
        map: [
          ' .*..  ',
          ' B*..  ',
          'Aa.....',
          ' ..... ',
          '  ...  ',
          '  ..b  ',
        ],
        dirs: { a: 'E', b: 'N' },
        inv: { arrow: 3 },
      },
      {
        id: '1-8',
        name: { fr: 'Le tourniquet', en: 'Merry-go-round' },
        intent: 'Four rocks make Pip circle forever. Break the loop at the right moment, and cross your own path.',
        tip: 'loop',
        map: [
          ' .*... ',
          ' #.... ',
          ' .a..# ',
          ' ...*. ',
          '#....  ',
          ' ...#  ',
          ' ..A.  ',
        ],
        dirs: { a: 'E' },
        inv: { arrow: 3 },
      },
      {
        id: '1-9',
        name: { fr: 'Les haies', en: 'Hedgerows' },
        intent: 'Scattered bushes do most of the steering; find the few arrows that thread the maze.',
        map: [
          ' ......',
          'a..#...',
          '.#...#.',
          '...#.*.',
          '.#*..#.',
          '...#..A',
        ],
        dirs: { a: 'E' },
        inv: { arrow: 4 },
      },
      {
        id: '1-10',
        name: { fr: 'La grande boucle', en: 'The grand loop' },
        intent: 'Both Lumignons share one long loop around the island: every arrow is used by both.',
        map: [
          '...... ',
          '#..#..a',
          '.##b.#.',
          '*....B.',
          '... ...',
          '.......',
          '...*A  ',
        ],
        dirs: { a: 'S', b: 'E' },
        inv: { arrow: 6 },
      },
    ],
    bonus: {
      id: '1-B',
      name: { fr: 'Étoile filante du pré', en: 'Meadow shooting star' },
      intent: 'Shared arrows and lantern-walls: three of five arrows serve both Lumignons.',
      map: [
        ' .b... ',
        '.....* ',
        '......#',
        '.^A....',
        '...Ba.#',
        '....#.*',
        '#.....<',
        ' ..... ',
      ],
      dirs: { a: 'E', b: 'S' },
      inv: { arrow: 5 },
    },
  },
  {
    id: 'pond',
    name: { fr: 'L’Étang Miroir', en: 'Mirror Pond' },
    blurb: {
      fr: 'L’eau éteint les flammes. Heureusement, les nénuphars flottent… et les étincelles rallument les lanternes.',
      en: 'Water puts flames out. Luckily lily pads float… and sparks relight the lanterns.',
    },
    unlock: 12,
    levels: [],
    bonus: null,
  },
  {
    id: 'grove',
    name: { fr: 'Le Bois des Champignons', en: 'Mushroom Grove' },
    blurb: {
      fr: 'Ici, tout rebondit. Les champignons font bondir, les pâquerettes font flâner.',
      en: 'Everything bounces here. Mushrooms make you leap, daisies make you linger.',
    },
    unlock: 25,
    levels: [],
    bonus: null,
  },
  {
    id: 'ruins',
    name: { fr: 'Les Ruines de Lune', en: 'Moon Ruins' },
    blurb: {
      fr: 'D’anciennes arches relient les ruines, et des dalles-lunes commandent les ronces.',
      en: 'Ancient gates link the ruins, and moon switches command the brambles.',
    },
    unlock: 40,
    levels: [],
    bonus: null,
  },
  {
    id: 'gloom',
    name: { fr: 'La Forêt des Grignombres', en: 'Gloomnib Forest' },
    blurb: {
      fr: 'Les Grignombres rôdent. Ils suivent les mêmes règles que nous… à toi de les égarer.',
      en: 'Gloomnibs prowl here. They follow the same rules we do… lead them astray.',
    },
    unlock: 55,
    levels: [],
    bonus: null,
  },
  {
    id: 'peak',
    name: { fr: 'La Cime des Vents', en: 'Windy Peak' },
    blurb: {
      fr: 'Tout en haut, les girouettes tournent et les nuages ne portent qu’une fois.',
      en: 'At the top, weathervanes spin and clouds only carry you once.',
    },
    unlock: 70,
    levels: [],
    bonus: null,
  },
];

/** Worlds that already have their levels (all of them in the released game). */
export const WORLDS = ALL_WORLDS.filter((w) => w.levels.length && w.bonus);

/** Flat list of every level definition (campaign order, bonus after each world). */
export function allLevels() {
  const out = [];
  for (const w of WORLDS) {
    out.push(...w.levels);
    if (w.bonus) out.push(w.bonus);
  }
  return out;
}
