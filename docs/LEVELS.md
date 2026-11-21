# Les 66 niveaux

Généré par `node tools/levels-doc.mjs` à partir de `src/data/levels.js` et des résultats du solveur.
« ★ » = nombre minimal de pièces pour terminer, « ★★★ » = nombre minimal pour un parcours parfait
(toutes les lucioles), « sol. » = nombre de dispositions parfaites distinctes (plafonné à 6).

## Monde 1 — Le Pré des Murmures

Au crépuscule, les Lumignons sortent jouer dans l’herbe haute. Guide-les jusqu’à leurs lanternes avant la nuit noire.

| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |
|---|---|---|---|---|---|---|---|
| 1-1 | Premiers pas | 6×4 | 1 flèche | 1 | 1 | 1 | Place a single arrow and choose its direction. |
| 1-2 | Le rocher | 6×5 | 1 flèche | 1 | 1 | 1 | A rock turns the Lumignon to its right: one arrow onto the right row lets the rock do the rest. |
| 1-3 | Lucioles | 7×5 | 3 flèches | 1 | 2 | 1 | The short way home misses the fireflies: take the long way round the island for the extra stars. |
| 1-4 | Demi-tour | 7×3 | 2 flèches | 1 | 2 | 1 | The lantern is behind Pip: an arrow can send him back, a rock can turn him, both are needed for the firefly. |
| 1-5 | Flèches gravées | 7×6 | 3 flèches | 1 | 3 | 1 | Engraved arrows cannot move: ride both of them, then fix the path with your own. |
| 1-6 | Nim | 5×7 | 4 flèches | 2 | 3 | 3 | Two colours, two lanterns. A lantern of another colour is a wall that turns you. |
| 1-7 | Une flèche pour deux | 7×6 | 3 flèches | 1 | 3 | 1 | A single arrow can serve both Lumignons; the amber lantern turns Nim into his own. |
| 1-8 | Le tourniquet | 6×7 | 3 flèches | 1 | 3 | 1 | Four rocks make Pip circle forever. Break the loop at the right moment, and cross your own path. |
| 1-9 | Les haies | 7×6 | 4 flèches | 2 | 4 | 3 | Scattered bushes do most of the steering; find the few arrows that thread the maze. |
| 1-10 | La grande boucle | 7×7 | 6 flèches | 2 | 5 | 1 | Both Lumignons share one long loop around the island: every arrow is used by both. |
| 1-B | Étoile filante du pré | 7×8 | 5 flèches | 3 | 5 | 1 | Shared arrows and lantern-walls: three of five arrows serve both Lumignons. |

## Monde 2 — L’Étang Miroir

L’eau éteint les flammes. Heureusement, les nénuphars flottent… et les étincelles rallument les lanternes.

| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |
|---|---|---|---|---|---|---|---|
| 2-1 | Nénuphar | 7×5 | 2 nénuphars | 2 | 2 | 1 | Water puts the flame out: two lily pads make a safe crossing. |
| 2-2 | Le gué | 7×6 | 2 flèches, 1 nénuphar | 3 | 3 | 1 | A single lily pad: steer Pip to the only spot where the river is one tile wide. |
| 2-3 | Étincelle | 7×5 | 3 flèches | 2 | 3 | 1 | The lantern stays shut until Pip grabs his spark; the closed lantern itself turns him towards it. |
| 2-4 | Le détour | 7×6 | 4 flèches, 1 nénuphar | 2 | 4 | 1 | Cross at the narrow neck, sweep the bank for fireflies, and let the rock turn Pip back home. |
| 2-5 | Les deux berges | 7×6 | 4 flèches, 2 nénuphars | 1 | 5 | 1 | Go down to the far bank for a firefly, then come back up over the very same lily pads. |
| 2-6 | Clair de lune | 6×7 | 6 flèches, 1 nénuphar | 3 | 6 | 1 | Nim's lantern doubles as a wall that turns Pip north to his spark; one lily pad then lets him cut straight back across the pond. |
| 2-7 | Trois nénuphars | 6×8 | 4 flèches, 3 nénuphars | 1 | 6 | 1 | A long crossing of the lake, then a sharp turn back: plan the whole loop before laying pads. |
| 2-8 | Chacun sa rive | 6×9 | 6 flèches, 2 nénuphars | 3 | 7 | 1 | Both Lumignons ride the same loop over two lily pads; only the end of the loop tells them apart. |
| 2-9 | Double étincelle | 6×8 | 7 flèches | 5 | 6 | 1 | Both lanterns are locked. Nim follows Pip's circuit twice before his spark lets him in: every arrow serves both. |
| 2-10 | Le grand étang | 7×9 | 6 flèches, 2 nénuphars | 4 | 7 | 1 | One river splits the island: both Lumignons share a single crossing and six of the seven pieces. |
| 2-B | Étoile filante de l’étang | 6×7 | 7 flèches, 1 nénuphar | 7 | 7 | 1 | Pip and Nim walk the very same winding route through the ford; only Pip's spark and Nim's lantern part them at the end. |

## Monde 3 — Le Bois des Champignons

Ici, tout rebondit. Les champignons font bondir, les pâquerettes font flâner.

| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |
|---|---|---|---|---|---|---|---|
| 3-1 | Boing ! | 8×3 | 1 champignon | 1 | 1 | 1 | A bounce mushroom turns the next step into a leap over the hole. |
| 3-2 | Saute-ruisseau | 7×5 | 2 flèches, 1 champignon | 2 | 3 | 1 | No lily pad this time: leap over the brook, but where? |
| 3-3 | Le champignon têtu | 7×6 | 3 flèches | 1 | 2 | 1 | When the landing tile is blocked, the leap turns right: the rock sends Pip south over the water. |
| 3-4 | Ricochets | 6×6 | 4 flèches, 1 champignon | 1 | 4 | 1 | A fixed mushroom, a rock turn, and one mushroom of your own used in both directions. |
| 3-5 | Saute-mouton | 7×7 | 4 flèches, 2 champignons | 1 | 5 | 1 | Leap the river northwards, then bounce back across the same mushroom on the way home. |
| 3-6 | Le trampoline | 7×6 | 4 flèches, 2 champignons | 1 | 5 | 1 | Three mushrooms, five leaps: Pip pinballs across the gap and back before landing at home. |
| 3-7 | La rivière et le ravin | 7×8 | 5 flèches, 2 champignons | 1 | 6 | 1 | A ravine and a river side by side: two mushrooms carry Pip across both, there and back. |
| 3-8 | Clairière en miettes | 7×8 | 5 flèches, 2 champignons | 1 | 6 | 1 | The glade is full of holes: chain two leaps and four arrows into one clean loop. |
| 3-9 | Bonds croisés | 6×8 | 6 flèches, 1 nénuphar, 1 champignon | 5 | 7 | 1 | One mushroom serves both: Nim leaps west over the brook, Pip leaps north over the lily pad. |
| 3-10 | Le cœur du bois | 7×7 | 6 flèches, 1 nénuphar, 1 champignon | 4 | 7 | 1 | A spark, a lily pad and one mushroom: Pip and Nim share six pieces of one long route. |
| 3-B | Étoile filante du bois | 7×7 | 6 flèches, 2 champignons | 5 | 7 | 1 | Pip fetches his spark, then rides two mushrooms in a row up the west edge while Nim slips home. |

## Monde 4 — Les Ruines de Lune

D’anciennes arches relient les ruines, et des dalles-lunes commandent les ronces.

| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |
|---|---|---|---|---|---|---|---|
| 4-1 | Arche de lune | 6×7 | 4 flèches | 1 | 4 | 1 | Step into the arch, come out of its twin still facing the same way. |
| 4-2 | Passe-muraille | 7×6 | 6 flèches | 1 | 5 | 1 | Pip crosses the ruins through the arches and must come back the same way; Nim simply walks home. |
| 4-3 | Dalle-lune | 7×5 | 3 flèches | 2 | 2 | 1 | Closed brambles turn Pip onto the switch that opens them; his own arrow then sends him through. |
| 4-4 | Deux paires | 7×8 | 6 flèches | 1 | 5 | 1 | Two pairs of arches for Nim alone: one of them must be crossed twice, in both directions, to reach the fireflies. |
| 4-5 | Le jardin de ronces | 7×8 | 7 flèches | 1 | 6 | 1 | Three bramble gates and one switch: Pip must press it before threading all three, and never twice. |
| 4-6 | Le cloître | 7×9 | 7 flèches | 5 | 6 | 1 | Nim presses the switch twice: the brambles close, then reopen just in time for Pip to walk through. |
| 4-7 | Le labyrinthe d’arches | 7×7 | 7 flèches | 5 | 6 | 1 | Four trips through the arches, four shared arrows: the ruins fold back on themselves. |
| 4-8 | Le gardien | 7×9 | 7 flèches | 1 | 6 | 1 | The switch lies beyond the arches: go through, open the brambles, come back and slip through them. |
| 4-9 | Pas de deux | 7×7 | 7 flèches | 4 | 6 | 1 | Nim shadows Pip around the whole ruin; their two presses on the switch cancel out and keep the way open. |
| 4-10 | La grande arche | 7×7 | 7 flèches | 3 | 6 | 1 | Six trips through one arch pair: both Lumignons share every single arrow. |
| 4-B | Étoile filante des ruines | 7×7 | 7 flèches | 3 | 6 | 1 | One switch pressed four times and an arch pair: the brambles must be open at exactly the right moments. |

## Monde 5 — La Forêt des Grignombres

Les Grignombres rôdent. Ils suivent les mêmes règles que nous… à toi de les égarer.

| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |
|---|---|---|---|---|---|---|---|
| 5-1 | Grignombre | 6×4 | 2 flèches | 1 | 1 | 3 | The Gloomnib obeys arrows too: send it over the edge before it crosses Pip’s path. |
| 5-2 | Ne pas réveiller | 6×3 | 4 flèches | 3 | 3 | 1 | A sleeping Gloomnib bars the way: go round it, using the rock to turn back down. |
| 5-3 | Pâquerette | 6×5 | 1 pâquerette | 1 | 1 | 2 | Arrows cannot help here: stop to smell a daisy and let the Gloomnib pass. |
| 5-4 | L’ombre et le dormeur | 6×8 | 6 flèches | 1 | 5 | 1 | Lead Pip around a sleeper while the arrows you lay for him walk the prowler off the cliff. |
| 5-5 | Chassé-croisé | 6×8 | 6 flèches | 2 | 5 | 1 | The prowler and Pip share three arrows: one leads Pip home, the same ones lead the shadow away. |
| 5-6 | La ronde | 7×7 | 2 flèches, 1 pâquerette | 3 | 3 | 1 | A Gloomnib circles the rocks forever: time Pip’s crossing with a single daisy. |
| 5-7 | Le même chemin | 6×7 | 7 flèches | 1 | 6 | 1 | Every one of Pip’s six arrows is also walked by the Gloomnib, which they finally drop into the void. |
| 5-8 | Deux ombres | 6×7 | 7 flèches | 1 | 6 | 1 | Two Gloomnibs prowl around the pond: both must fall before Pip can cross. |
| 5-9 | La clairière sombre | 6×9 | 7 flèches | 4 | 6 | 1 | A long detour around the clearing: the Gloomnib follows the very same arrows a few steps behind. |
| 5-10 | Veillée | 7×7 | 7 flèches, 1 nénuphar | 4 | 7 | 1 | Pip slips home at once; Nim makes the grand tour of the pond around a sleeping Gloomnib, on a single lily pad. |
| 5-B | Étoile filante de la forêt | 7×9 | 7 flèches, 1 nénuphar | 1 | 7 | 1 | Two Gloomnibs at Pip’s heels: every arrow and the lily pad are walked by all three. |

## Monde 6 — La Cime des Vents

Tout en haut, les girouettes tournent et les nuages ne portent qu’une fois.

| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |
|---|---|---|---|---|---|---|---|
| 6-1 | Girouette | 5×4 | 3 flèches | 2 | 2 | 3 | The weathervane turns a quarter after each visit: Pip comes back to it three times. |
| 6-2 | Pont de nuages | 7×4 | 4 flèches | 3 | 4 | 1 | Clouds carry you only once: cross by one bridge to the spark, come back by the other. |
| 6-3 | Vent tournant | 6×6 | 6 flèches | 2 | 5 | 1 | Three visits to one weathervane, each one sending Pip somewhere new. |
| 6-4 | Les deux girouettes | 6×7 | 7 flèches | 1 | 6 | 1 | Two weathervanes and two clouds: the order of the visits decides everything. |
| 6-5 | Col venteux | 6×7 | 7 flèches | 2 | 6 | 1 | Cross the clouds once, then let the two vanes turn Pip around the summit. |
| 6-6 | Saut de l’ange | 6×7 | 7 flèches, 1 champignon | 1 | 7 | 1 | A mushroom on the summit: one leap and four turns of the vane before the lantern. |
| 6-7 | Cordée | 7×8 | 7 flèches | 2 | 6 | 1 | Pip and Nim cross the same clouds: whoever goes first decides where the vane points next. |
| 6-8 | Pause au sommet | 7×7 | 6 flèches, 1 pâquerette | 4 | 6 | 1 | Pip stops twice at the same daisy so that each vane is pointing the right way when a Lumignon arrives. |
| 6-9 | La rose des vents | 6×8 | 7 flèches | 4 | 6 | 1 | Two vanes, two clouds, two Lumignons: four visits to the vanes must happen in the right order. |
| 6-10 | Le dernier pont | 6×7 | 6 flèches, 1 champignon | 5 | 6 | 1 | Pip and Nim walk the same road and leap from the same mushroom; Nim alone comes back to leap a second time. |
| 6-B | La Grande Lanterne | 7×7 | 8 flèches, 1 nénuphar | 5 | 8 | 1 | Lou joins Pip and Nim for the finale: Nim crosses a cloud, Lou slips home, and Pip must visit the same weathervane three times. |

