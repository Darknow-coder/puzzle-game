# Lumignons — Le chemin des lanternes

Un jeu de réflexion mobile, original et entièrement gratuit à faire tourner :
place des flèches (et bien plus) pour guider de petites lueurs têtues jusqu’à leurs lanternes,
puis appuie sur **Go !** et regarde ton plan se dérouler… en musique.

- **66 niveaux** répartis en 6 mondes + 6 « étoiles filantes », tous **prouvés solvables** par un solveur.
- 3 étoiles par niveau : rentrer, attraper toutes les lucioles, le faire avec le minimum de pièces.
- **Atelier** : crée tes niveaux, le jeu vérifie qu’ils sont faisables et calcule le nombre de pièces
  parfait, puis partage-les avec un code ou un lien.
- **Défi du jour** : un puzzle vérifié chaque jour (366 en réserve) et une série de jours d’affilée.
- Pause, pas à pas et ralenti des échecs pour comprendre chaque parcours ; tutoriel animé.
- Carte des constellations, chapeaux à collectionner, succès, carnet des éléments, indices illimités.
- Pensé pour le tactile (toucher, glisser, appui long), jouable à la souris et au clavier.
- Installable comme une application (PWA) et jouable **hors ligne**. Français / anglais.
- Zéro dépendance : HTML, CSS, JavaScript, Canvas 2D et Web Audio. Aucune image ni aucun son externe.

📖 Conception : [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) · Liste des niveaux : [`docs/LEVELS.md`](docs/LEVELS.md) ·
Nouveautés : [`CHANGELOG.md`](CHANGELOG.md) · Publication : [`docs/PUBLISHING.md`](docs/PUBLISHING.md)

## Jouer

Version en ligne (GitHub Pages) : **https://darknow-coder.github.io/puzzle-game/**
(publiée automatiquement à chaque push par `.github/workflows/pages.yml` — voir *Publication* ci-dessous
pour l’unique réglage à faire dans GitHub).

Sur smartphone, ouvrir le lien puis « Ajouter à l’écran d’accueil » (ou le bouton *Installer le jeu*
sur l’écran titre) : le jeu se lance alors en plein écran et fonctionne sans connexion.

Aperçu immédiat sans réglage, servi depuis un commit précis du dépôt :
`https://raw.githack.com/Darknow-coder/puzzle-game/<commit>/index.html`
(remplacer `<commit>` par l’identifiant du dernier commit).

### Comment jouer

1. Les Lumignons avancent **tout droit**. Contre un obstacle, ils tournent **à droite**.
2. Touche une case d’herbe pour y poser une flèche, puis choisis sa direction
   (ou glisse le doigt sur la case pour poser la flèche d’un geste).
3. Touche une pièce posée pour la tourner ou la retirer ; fais-la glisser pour la déplacer.
4. Appui long sur une case : explication de ce qu’elle contient.
5. **Go !** lance la simulation ; **Stop** revient à la préparation sans rien perdre.
6. Pendant la simulation, touche le plateau pour mettre en pause, puis **Pas** pour avancer d’un tour.
   Après un échec, **Revoir** rejoue les derniers tours au ralenti.

## Développement

Aucune installation n’est nécessaire pour jouer en local : il suffit d’un serveur de fichiers statiques.

```bash
npm start            # serveur local sur http://localhost:8080
npm test             # tests du moteur et du solveur (Node ≥ 18)
npm run verify       # prouve que chaque niveau est solvable et régénère src/data/solutions.js
npm run e2e          # tous les tests de bout en bout dans Chromium (Playwright requis, serveur lancé)
npm run e2e:canvas   # dessins perdus (plantage réel du GPU) : tout est redessiné
npm run e2e:update   # mise à jour de l’app hors ligne : bandeau « Nouvelle version », nouveau cache
```

Outils de conception (Node) :

```bash
node tools/solve.mjs 2-4              # analyse d'un niveau (minimum de pièces, solutions)
node tools/explore-fireflies.mjs ...  # où placer les lucioles pour un bon défi ★★★
node tools/generate.mjs pond 2000     # candidats de niveaux pour un thème (à trier et retoucher)
node tools/build-sw.mjs               # régénère la liste des fichiers mis en cache hors ligne
node tools/levels-doc.mjs             # régénère docs/LEVELS.md
node tools/build-artifact.mjs         # page autonome (CSS et police intégrées) pour un aperçu hébergé
node tools/build-daily.mjs <dossiers> # réserve du défi du jour (candidats issus de generate.mjs)
node tools/store-shots.cjs            # captures 1080×1920 et image de présentation (store/screenshots)
```

### Structure

```
index.html, manifest.webmanifest, sw.js   coquille de l'application, PWA
src/engine/core.js       règles du jeu (moteur déterministe, sans DOM)
src/engine/solver.js     solveur exhaustif (preuve de solvabilité, par, indices)
src/data/levels.js       les 6 mondes et 66 niveaux (cartes en texte)
src/data/solutions.js    généré : par et solution parfaite de chaque niveau
src/data/meta.js         carnet, chapeaux, succès
src/data/daily.js        généré : les 366 puzzles du défi du jour (solution parfaite unique prouvée)
src/daily.js             choix du puzzle du jour et série de jours
src/editor/              atelier : modèle, codes de partage, vérification (Web Worker), interface
src/game/art.js          tout le dessin procédural (îles, personnages, pièces, décors)
src/game/scene.js        écran de jeu : saisie tactile, préparation, animation des parcours
src/audio.js             sons et musique synthétisés
src/main.js              écrans, menus, sauvegarde, navigation
tests/                   tests unitaires (node:test) et de bout en bout (Playwright)
tools/                   solveur en ligne de commande, générateur, vérification, icônes
```

## Publication

- **GitHub Pages** : le workflow `.github/workflows/pages.yml` lance les tests, vérifie les 66 niveaux,
  puis publie le jeu à chaque push sur `main` ou sur la branche de développement.
  1. *Settings → Pages → Build and deployment → Source* : **GitHub Actions**.
  2. *Settings → Environments → github-pages → Deployment branches and tags* : autoriser la branche
     publiée (ou fusionner la branche dans `main`, déjà autorisée par défaut).
  3. Relancer le dernier workflow (*Actions → Deploy to GitHub Pages → Re-run jobs*).

  Alternative sans workflow : *Settings → Pages → Deploy from a branch*, choisir la branche et `/ (root)`.
- **Google Play** : le jeu est une PWA conforme ; il peut être empaqueté en *Trusted Web Activity*
  (par exemple avec Bubblewrap ou PWABuilder, gratuits).
- **App Store** : empaquetage possible avec Capacitor (gratuit ; un compte développeur Apple reste payant).
- Tout le nécessaire pour les magasins est dans `store/` (textes FR/EN, captures, image de présentation),
  `privacy.html` (politique de confidentialité) et le pas-à-pas dans `docs/PUBLISHING.md`.

## Licences

- Code, niveaux, illustrations procédurales, musique et sons : © les auteurs du projet Lumignons,
  tous droits réservés (voir [`LICENSE`](LICENSE)).
- Ressources tierces : voir [`THIRD_PARTY.md`](THIRD_PARTY.md) (uniquement la police Fredoka, SIL OFL 1.1).
