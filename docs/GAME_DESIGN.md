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
   - **Miroir** (posé ou gravé, `/` ou `\`) : renvoie le marcheur d’un quart de tour, comme un rayon
     de lumière ; le sens dépend du côté par lequel on arrive (`/` : nord ⇄ est, sud ⇄ ouest).
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
| 7. L’Aube de Cristal | Miroirs (posés et gravés) | Un même miroir sert à plusieurs Lumignons venant de côtés différents, renvoie une ombre, ramène un Lumignon qui revient sur ses pas |

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
- **Garde-robe** : 12 chapeaux à débloquer (étoiles, mondes terminés, étoile filante, 3 étoiles
  partout) portés par tous les Lumignons.
- **Succès** : 16 objectifs secondaires (persévérance, perfectionnisme, sans indice…).
- **Carnet** : chaque élément rencontré y est expliqué avec son illustration.
- **Rejouabilité** : les records (étoiles, pièces) sont conservés ; revenir chercher la 3ᵉ étoile.
- **Indices** : ils révèlent pas à pas une solution parfaite et signalent les pièces mal placées.
  Depuis la version 3.1, chaque nouvel indice utilise un jeton (voir *Économie* plus bas). Le jeu
  reste non punitif : pas de vies, pas d’attente, un niveau peut être sauté, et l’option « Ouvrir tous
  les niveaux » existe pour qui reste bloqué.

## 7 bis. Version 2

- **Atelier** : le joueur devient concepteur. L’éditeur reprend exactement le rendu du jeu ; chaque case
  se peint d’un toucher (un deuxième toucher tourne ou retire l’élément). Le solveur du jeu, exécuté
  dans un Web Worker, répond en quelques secondes : faisable ou non, minimum de pièces pour ★ et ★★★,
  nombre de solutions parfaites, et refuse les niveaux qui se gagnent sans pièce. Les niveaux se
  partagent par un code compact (`LUMI1.…`, ~150 caractères) ou un lien qui ouvre directement le niveau.
- **Défi du jour** : chaque date correspond à un puzzle, tiré d’une réserve de 366 niveaux générés puis
  filtrés (formes cohérentes, solution parfaite unique, ni trop faciles ni trop longs). Le monde du jour
  tourne parmi ceux que le joueur a déjà ouverts, pour ne jamais présenter une mécanique inconnue.
- **Lisibilité** : pause, pas à pas, ralenti des échecs ; une main animée enseigne les gestes.

## 7 ter. Version 3

- **Miroirs de cristal** et un **septième monde**, *L’Aube de Cristal* : la nuit s’achève, le ciel rosit,
  le soleil se lève derrière les collines. Un miroir ne choisit pas une direction comme une flèche : il
  *dévie*, et différemment selon le côté d’arrivée. D’où des idées nouvelles : un miroir pour deux
  Lumignons perpendiculaires (7-2), le chemin du retour par le même miroir (7-3), un miroir qui jette
  le Grignombre dans le vide puis guide Pip (7-4), une ombre qui suit Pip pas à pas (7-6).
- Les quatre premiers niveaux sont dessinés à la main ; les suivants sont choisis parmi des milliers de
  candidats du générateur, pour leur « histoire » (le trajet de chaque Lumignon est relu), puis prouvés.
- 61 **défis du jour** avec miroirs rejoignent la réserve (427 puzzles), sans changer ceux des autres mondes.
- **Image souvenir** à partager, **codes de sauvegarde**, option **Ouvrir tous les niveaux**.
- Robustesse mobile : quand le système libère la mémoire graphique (application en arrière-plan),
  tout ce qui était dessiné une fois pour toutes est redessiné.

## 7 quater. Version 3.1 : l’économie des éclats

Les **éclats** (✦) sont la monnaie du jeu. Ils se gagnent **uniquement en jouant**, jamais avec de
l’argent réel, et se dépensent dans la **boutique**. Tous les montants sont réunis dans
`src/economy.js`, pour pouvoir lire et ajuster l’équilibre d’un coup d’œil.

| Gagner | Éclats |
|---|---|
| Finir un niveau pour la première fois | +10 |
| Chaque étoile obtenue pour la première fois sur un niveau | +5 |
| Finir une étoile filante | +40 |
| Terminer un monde (ses 10 niveaux) | +60 |
| Chaque succès | +30 |
| Défi du jour (une fois par jour) | +15, puis +5 par jour d’affilée (jusqu’à +25) |
| Cadeau du jour | 10, 15, 20, 25, 30, 40, 60 sur 7 jours d’affilée, + 1 indice le 7ᵉ jour |

| Dépenser | Prix |
|---|---|
| 1 indice (aussi acheté sur place quand il n’en reste plus) | 20 |
| 5 indices / 12 indices | 85 (−15 %) / 180 (−25 %) |
| 6 chapeaux (nœud, béret, bonnet à pompon, toque, casque audio, haut-de-forme) | 100 à 260 |
| 5 traînées de lumière (poussière d’étoiles, pétales, mélodie, comète, arc-en-ciel) | 150 à 280 |

Principes :

- **Seules les premières fois paient** : rejouer un niveau avec le même résultat ne rapporte rien,
  améliorer ses étoiles rapporte les étoiles nouvelles. Impossible de « farmer ».
- **Équilibre** : toute la campagne bien jouée rapporte environ 3 000 éclats (sans compter le défi et
  le cadeau du jour) ; les cosmétiques valent 2 150 en tout ; un indice 15 à 20. Les indices restent à
  portée, les cosmétiques sont un objectif.
- **Un indice n’est payé qu’une fois** : revoir un indice déjà affiché (ou constater qu’il n’y a plus
  rien à révéler) est gratuit. Plus de jeton : achat sur place en un geste, ou le montant manquant.
- **Départ** : 60 éclats et 3 indices. Les joueurs d’avant la boutique reçoivent ce que leur progression
  aurait rapporté (mêmes règles, appliquées au passé), annoncé une fois.
- **Achats en deux touchers** (« Confirmer ? ») pour éviter les achats accidentels ; journal des
  60 derniers mouvements ; la sauvegarde et les codes de sauvegarde incluent la bourse.

## 7 quinquies. Version 3.2 : chez Madame Phalène

La boutique est un **lieu**, pas un menu : un marché de nuit (auvent rayé, guirlandes, bocaux de
lucioles, enseigne qui se balance) tenu par **Madame Phalène**, une phalène marchande, attirée par la
lumière comme tous les papillons de nuit, avec lunettes rondes, antennes plumeuses et tablier. Elle
accueille, commente ce qu’on essaie, félicite les achats, encourage quand la bourse est trop légère.

- **Essayer avant d’acheter** : toucher un objet le fait porter aussitôt aux Lumignons sur l’estrade
  (aux quatre, ou à celui qu’on habille). Une traînée se montre en courant, une fête se joue.
- **Emplacements** : chapeau, lunettes, flamme (par Lumignon), traînée et fête de victoire (partagées).
  Une flamme change de **forme**, jamais de couleur : la couleur dit quelle lanterne rejoindre.
- **Raretés** commun, rare, épique, légendaire : prix croissants, cadres de couleur, reflet animé pour
  les légendaires, fanfare plus riche à l’achat.
- **Boucles qui donnent envie de revenir**, sans rien de punitif :
  - la *vitrine du jour* (−30 %, un objet différent chaque jour) ;
  - le *cadeau du jour* (de 15 à 80 ✦ sur une semaine, un indice le 7ᵉ jour) ;
  - le *coffre à surprises* : la surprise, sans la frustration. **Jamais de doublon**, **chances
    affichées** (50 / 32 / 14 / 4 %), un épique ou mieux **garanti** au moins tous les 6 coffres ;
  - la *collection* : silhouettes de ce qui manque, paliers récompensés et une couronne exclusive
    à 100 %.
- **Récompense visible** : les pièces volent de la bourse vers l’estrade, la bourse décompte, les
  Lumignons sautent de joie, confettis. Les fêtes achetées ont 2,4 s de scène après chaque victoire.
- **Éthique** : tout se gagne en jouant, il n’y a pas d’argent réel, pas de publicité, pas de
  doublon, et les chances sont affichées. Rien n’est retiré ni perdu : une offre manquée reviendra.

## 7 sexies. Version 3.3 : les classements

- **Un pseudo avant le tutoriel** : au tout premier lancement, avant même l’écran titre, une pancarte en
  bois attend un nom, tenue par le Lumignon préféré du joueur (Pip, Nim, Lou ou Bo, avec ce qu’il porte).
  Un pseudo est proposé au hasard (« Comète Rusée », « Grillon Farceur »…) : un toucher suffit pour
  partir. Puis le tutoriel commence et accueille le joueur par son nom. « Plus tard » reste possible :
  les classements sont un plaisir, pas une obligation.
- **Ce qui classe** un niveau, dans l’ordre : les étoiles, les pièces, sans indice, le nombre d’essais
  (tous les « Go ! » jusqu’à ce résultat, toutes sessions confondues), puis le temps passé sur le niveau
  jusqu’à ce résultat (fenêtres ouvertes et écran de victoire exclus). Rejouer un niveau déjà résolu ne
  fait pas tricher : essais et temps s’additionnent, seul un résultat meilleur remplace l’ancien.
  C’est l’esprit du jeu : réfléchir avant d’agir est récompensé.
- **Trois classements** : chaque niveau (étoiles filantes comprises), le défi du jour (le même puzzle
  pour tous ceux qui ont les mêmes mondes ouverts, seulement autour de sa date), et le classement
  général (total d’étoiles ; à égalité, le premier arrivé).
- **Sur la carte de victoire** : « Nouveau record ! 3ᵉ sur 128 », avec les essais et le temps du
  parcours ; la première place brille, le podium sonne la fanfare.
- **Les autres joueurs** apparaissent avec leur Lumignon habillé : les achats de la boutique se voient
  enfin. Toucher un joueur montre sa carte (étoiles, place au général) et permet de signaler un pseudo.
- **Pseudos** : 3 à 18 caractères (lettres accentuées, chiffres, espace, - _ ' .), uniques quelle que
  soit l’écriture (« Lune-Rêveuse » = « lune reveuse »), mots grossiers refusés.
- **Hors ligne d’abord** : sans réseau, tout est gardé et part plus tard ; sans projet Firebase, les
  classements annoncent qu’ils ouvrent bientôt. Les résultats d’avant la 3.3 sont envoyés une fois,
  temps inconnu.
- **Vie privée** : connexion anonyme (ni e-mail ni mot de passe), envoi désactivable, suppression de
  toutes ses données en ligne depuis le profil.
- **Serveur** : Firebase (offre gratuite Spark) en REST, sans SDK. Les règles de sécurité vérifient
  chaque écriture ; voir [`FIREBASE.md`](FIREBASE.md).

## 8. Conception et vérification des niveaux

La campagne compte **77 niveaux** (7 mondes × 10 + 7 étoiles filantes). La liste complète, avec
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

- HTML + CSS + JavaScript (modules ES), Canvas 2D, Web Audio. **Aucune dépendance**, aucune étape de
  compilation. Poids total ≈ 0,4 Mo. Seul service en ligne : Firebase pour les classements (facultatif,
  appelé en REST).
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
archipel nocturne), les règles détaillées, les 77 niveaux, les graphismes et la musique sont originaux.
Les seules ressources tierces sont listées dans [`THIRD_PARTY.md`](../THIRD_PARTY.md).

Avant une publication commerciale, il reste recommandé de vérifier la disponibilité du nom
« Lumignons » (marques déposées) dans les pays visés.
