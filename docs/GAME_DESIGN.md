# Lumignons — Le chemin des lanternes

*Document de conception (game design document).*

## 1. Pitch

> Les Lumignons sont de petites lueurs têtues : ils marchent tout droit sans jamais regarder où ils vont.
> Pose des flèches, des nénuphars, des champignons… pour les ramener jusqu’à leur lanterne,
> puis appuie sur **Go !** et regarde ton plan se dérouler — en musique.

Un jeu de réflexion et d’anticipation, jouable d’une main sur smartphone : on **prépare** une disposition
de pièces sur un plateau, puis on **lance** la simulation. Aucune réaction rapide, aucun hasard : tout se
joue dans la tête du joueur, et chaque échec s’explique visuellement.

## 2. Univers et histoire

Au-dessus des nuages flottent les **Jardins de la Nuit**, un archipel de petites îles. Chaque soir,
les **Lumignons** — des créatures faites de cire et de lumière, une flamme sur la tête — sortent
attraper des lucioles. Mais ce sont de grands distraits : sans aide, ils tombent dans le vide, se
noient dans les étangs ou se font grignoter par les **Grignombres**, des ombres gourmandes.

Le joueur est le **gardien des chemins**. En ramenant les Lumignons chez eux, il rallume une à une
les lanternes de l’archipel, jusqu’à la grande lanterne de la Cime des Vents. Chaque niveau réussi
dessine dans le ciel la **constellation** du chemin parcouru.

Personnages : **Pip** (ambre), **Nim** (bleu ciel), **Lou** (rose) et **Bo** (menthe) — chacun sa
couleur, sa lanterne et son timbre musical.

## 3. Identité visuelle et sonore

- **Îles-dioramas** vues de dessus en légère perspective : dessus herbeux en damier doux, tranche de
  terre avec racines pendantes, ombre portée dans le ciel. Chaque monde a sa palette (crépuscule
  orangé, heure bleue, bois violet bioluminescent, ruines argentées, forêt sombre, cime enneigée
  sous aurore boréale).
- **Personnages ronds et expressifs** (corps de cire, flamme vacillante, yeux qui regardent dans la
  direction de marche, clignements, joie, peur, tristesse quand la flamme s’éteint).
- **Lumière** : halos additifs, traînées lumineuses derrière les Lumignons, constellation finale.
- **Tout est procédural** : aucune image ni aucun son externe. Les visuels sont dessinés en Canvas 2D,
  la musique et les bruitages sont synthétisés en Web Audio.
- **Signature sonore** : chaque pas d’un Lumignon joue une note de la gamme pentatonique du monde,
  choisie selon sa position. **Une solution devient une petite mélodie** ; chaque couleur a son timbre
  (cloche, marimba, pincé, flûte).
- Police : Fredoka (SIL Open Font License).

## 4. Règles (exactes et prévisibles)

Le jeu se déroule en tours. À chaque tour, tous les marcheurs (Lumignons et Grignombres) bougent
**en même temps** :

1. **Avancer** d’une case dans sa direction.
2. Si la case visée est **bloquée** (rocher, buisson, ronces dressées, lanterne qui n’est pas la
   sienne ou encore fermée), le marcheur **tourne à droite** ; si c’est encore bloqué, **à gauche** ;
   sinon il fait **demi-tour**. Le vide et l’eau ne bloquent pas : on y tombe.
3. En arrivant sur une case :
   - **Flèche** (posée ou gravée) : nouvelle direction, à chaque passage, pour tout le monde.
   - **Vide** / bord de l’île : chute. **Eau** sans nénuphar : flamme éteinte.
   - **Lanterne de sa couleur** (ouverte) : le Lumignon est rentré.
   - **Luciole** : attrapée par le premier Lumignon qui passe (objectif facultatif).
   - **Étincelle** de sa couleur : ouvre la lanterne correspondante.
   - **Champignon** : le pas suivant devient un bond de deux cases par-dessus n’importe quoi
     (si l’atterrissage est bloqué, la règle de rotation s’applique au bond).
   - **Pâquerette** : on attend un tour.
   - **Arche de lune** : on ressort par l’arche jumelle, dans la même direction.
   - **Dalle-lune** : chaque passage bascule les ronces de sa couleur (dressées ⇄ couchées).
   - **Girouette** : donne sa direction puis tourne d’un quart de tour dans le sens horaire.
   - **Nuage** : il se dissipe dès qu’on le quitte ; qui se tient encore dessus tombe.
4. Les Lumignons **se traversent** sans se gêner. Un Grignombre **attrape** un Lumignon s’ils
   partagent une case ou se croisent. Les Grignombres suivent exactement les mêmes règles
   (flèches, chutes, noyade…).
5. **Victoire** : tous les Lumignons sont rentrés. **Défaite** : un Lumignon tombe, s’éteint, est
   attrapé, ou la situation se répète à l’identique (« il tourne en rond »).

Ces règles tiennent dans un moteur déterministe (`src/engine/core.js`) : même disposition ⇒ même
résultat, toujours.

## 5. Pièces et éléments

| Monde | Nouveautés | Rôle dans les puzzles |
|---|---|---|
| 1. Le Pré des Murmures | Flèche, rochers, vide, lucioles, flèches gravées, 2ᵉ Lumignon | Lire les trajectoires, utiliser les virages « gratuits » des obstacles, partager une flèche |
| 2. L’Étang Miroir | Eau, nénuphar, étincelle | Choisir où traverser, ordre des visites (étincelle avant lanterne) |
| 3. Le Bois des Champignons | Champignon sauteur (posé ou fixe) | Sauter par-dessus trous, eau et obstacles ; rebonds déviés |
| 4. Les Ruines de Lune | Arches de lune, dalles et ronces | Téléportation, interrupteurs à bascule, ordre et parité des passages |
| 5. La Forêt des Grignombres | Grignombres (rôdeurs, endormis), pâquerette | Timing ; dévier les ombres avec ses propres flèches pour les faire tomber |
| 6. La Cime des Vents | Girouettes, nuages | Directions qui changent à chaque passage, chemins à usage unique |

## 6. Notation

- ★ : tous les Lumignons sont rentrés.
- ★★ : … et toutes les lucioles sont attrapées.
- ★★★ : … avec au plus **N** pièces, N étant le minimum absolu calculé par le solveur.

Le compteur de pièces et l’objectif N sont affichés en permanence. Le niveau est toujours
réussissable avec moins d’étoiles : les lucioles sont un défi facultatif.

## 7. Progression et récompenses

- **Carte des constellations** : chaque monde est une constellation de 10 étoiles-niveaux. Un niveau
  ouvre le suivant (un niveau peut être sauté). Un monde s’ouvre en terminant le précédent et en
  réunissant quelques étoiles (12, 25, 40, 55, 70) — des seuils volontairement bas.
- **Étoiles filantes** : un 11ᵉ niveau-défi par monde, révélé quand toutes ses lucioles sont
  attrapées (2 étoiles partout).
- **Garde-robe** : 11 chapeaux à débloquer (étoiles, mondes terminés, étoile filante, 3 étoiles
  partout) portés par tous les Lumignons.
- **Succès** : 12 objectifs secondaires (persévérance, perfectionnisme, sans indice…).
- **Carnet** : chaque élément rencontré y est expliqué avec son illustration.
- **Rejouabilité** : les records (étoiles, pièces) sont conservés ; revenir chercher la 3ᵉ étoile.
- **Indices** illimités et gratuits : ils révèlent pas à pas une solution parfaite et signalent les
  pièces mal placées. Le jeu n’est jamais bloquant ni punitif (pas de vies, pas d’attente).

## 8. Conception et vérification des niveaux

La campagne compte **66 niveaux** (6 mondes × 10 + 6 étoiles filantes). La liste complète, avec
l’intention de chaque niveau, est dans [`LEVELS.md`](LEVELS.md).

- Les niveaux d’introduction de chaque mécanique sont **dessinés à la main** pour enseigner une idée
  à la fois (exemple : en 4-3, le Lumignon est dévié par les ronces fermées *vers* la dalle qui les
  ouvre, puis repasse sur sa propre flèche pour les franchir).
- Les niveaux suivants sont choisis parmi des candidats produits par un **générateur de terrains
  structurés** (rivières, étangs, ponts de nuages, ruines symétriques), puis triés selon des critères
  de qualité (solution parfaite **unique**, pièces partagées entre Lumignons, virages exploitant les
  obstacles, usage réel de la mécanique du monde), retouchés et nommés.
- **Chaque niveau est prouvé solvable** par un solveur exhaustif (`src/engine/solver.js`) qui calcule
  le minimum de pièces pour ★ et pour ★★★, et stocke une solution parfaite (utilisée par les indices).
  Le solveur est lui-même validé contre une recherche par force brute sur des centaines de niveaux
  aléatoires (`tests/solver.test.mjs`).
- Aucun niveau n’est gagnable sans poser de pièce.

## 9. Technique

- HTML + CSS + JavaScript (modules ES), Canvas 2D, Web Audio. **Aucune dépendance**, aucun serveur,
  aucune étape de compilation. Poids total ≈ 0,4 Mo.
- **PWA** : manifeste, icônes, service worker (jeu complet hors ligne, installable sur l’écran
  d’accueil).
- Sauvegarde locale (`localStorage`), robuste aux données corrompues.
- Tactile d’abord (toucher, glisser, appui long, glisser-déposer), souris et clavier ensuite
  (Espace = Go, Z = annuler, H = indice, flèches = direction, Échap = pause).
- FR / EN.

## 10. Originalité et propriété intellectuelle

Le principe général « préparer des pièces puis observer des personnages qui avancent seuls » est un
genre ancien et répandu. Lumignons n’en reprend **aucun élément protégé** : pas de personnages, noms,
niveaux, interface, sons ou visuels issus d’autres jeux. L’univers (Lumignons, Grignombres, lanternes,
archipel nocturne), les règles détaillées, les 66 niveaux, les graphismes et la musique sont originaux.
Les seules ressources tierces sont listées dans [`THIRD_PARTY.md`](../THIRD_PARTY.md).

Avant une publication commerciale, il reste recommandé de vérifier la disponibilité du nom
« Lumignons » (marques déposées) dans les pays visés.
