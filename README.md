# Lumignons — Le chemin des lanternes

Un jeu de réflexion mobile, original et entièrement gratuit à faire tourner :
place des flèches (et bien plus) pour guider de petites lueurs têtues jusqu’à leurs lanternes,
puis appuie sur **Go !** et regarde ton plan se dérouler… en musique.

- **66 niveaux** répartis en 6 mondes + 6 « étoiles filantes », tous **prouvés solvables** par un solveur.
- 3 étoiles par niveau : rentrer, attraper toutes les lucioles, le faire avec le minimum de pièces.
- Carte des constellations, chapeaux à collectionner, succès, carnet des éléments, indices illimités.
- Pensé pour le tactile (toucher, glisser, appui long), jouable à la souris et au clavier.
- Installable comme une application (PWA) et jouable **hors ligne**. Français / anglais.
- Zéro dépendance : HTML, CSS, JavaScript, Canvas 2D et Web Audio. Aucune image ni aucun son externe.

📖 Conception : [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) · Liste des niveaux : [`docs/LEVELS.md`](docs/LEVELS.md)

## Jouer

Version en ligne (GitHub Pages) : **https://darknow-coder.github.io/puzzle-game/**

Sur smartphone, ouvrir le lien puis « Ajouter à l’écran d’accueil » (ou le bouton *Installer le jeu*
sur l’écran titre) : le jeu se lance alors en plein écran et fonctionne sans connexion.

### Comment jouer

1. Les Lumignons avancent **tout droit**. Contre un obstacle, ils tournent **à droite**.
2. Touche une case d’herbe pour y poser une flèche, puis choisis sa direction
   (ou glisse le doigt sur la case pour poser la flèche d’un geste).
3. Touche une pièce posée pour la tourner ou la retirer ; fais-la glisser pour la déplacer.
4. Appui long sur une case : explication de ce qu’elle contient.
5. **Go !** lance la simulation ; **Stop** revient à la préparation sans rien perdre.

## Développement

Aucune installation n’est nécessaire pour jouer en local : il suffit d’un serveur de fichiers statiques.

```bash
npm start            # serveur local sur http://localhost:8080
npm test             # tests du moteur et du solveur (Node ≥ 18)
npm run verify       # prouve que chaque niveau est solvable et régénère src/data/solutions.js
npm run e2e          # tests de bout en bout dans Chromium (Playwright requis, serveur lancé)
```

Outils de conception (Node) :

```bash
node tools/solve.mjs 2-4              # analyse d'un niveau (minimum de pièces, solutions)
node tools/explore-fireflies.mjs ...  # où placer les lucioles pour un bon défi ★★★
node tools/generate.mjs pond 2000     # candidats de niveaux pour un thème (à trier et retoucher)
node tools/build-sw.mjs               # régénère la liste des fichiers mis en cache hors ligne
node tools/levels-doc.mjs             # régénère docs/LEVELS.md
```

### Structure

```
index.html, manifest.webmanifest, sw.js   coquille de l'application, PWA
src/engine/core.js       règles du jeu (moteur déterministe, sans DOM)
src/engine/solver.js     solveur exhaustif (preuve de solvabilité, par, indices)
src/data/levels.js       les 6 mondes et 66 niveaux (cartes en texte)
src/data/solutions.js    généré : par et solution parfaite de chaque niveau
src/data/meta.js         carnet, chapeaux, succès
src/game/art.js          tout le dessin procédural (îles, personnages, pièces, décors)
src/game/scene.js        écran de jeu : saisie tactile, préparation, animation des parcours
src/audio.js             sons et musique synthétisés
src/main.js              écrans, menus, sauvegarde, navigation
tests/                   tests unitaires (node:test) et de bout en bout (Playwright)
tools/                   solveur en ligne de commande, générateur, vérification, icônes
```

## Publication

- **GitHub Pages** : le workflow `.github/workflows/pages.yml` teste puis publie le jeu à chaque push.
  Dans *Settings → Pages*, choisir la source **GitHub Actions** ; si l’environnement
  `github-pages` restreint les branches, y autoriser la branche publiée
  (*Settings → Environments → github-pages → Deployment branches*).
  Alternative sans workflow : *Settings → Pages → Deploy from a branch* (racine du dépôt).
- **Google Play** : le jeu est une PWA conforme ; il peut être empaqueté en *Trusted Web Activity*
  (par exemple avec Bubblewrap ou PWABuilder, gratuits).
- **App Store** : empaquetage possible avec Capacitor (gratuit ; un compte développeur Apple reste payant).

## Licences

- Code, niveaux, illustrations procédurales, musique et sons : © les auteurs du projet Lumignons,
  tous droits réservés (voir [`LICENSE`](LICENSE)).
- Ressources tierces : voir [`THIRD_PARTY.md`](THIRD_PARTY.md) (uniquement la police Fredoka, SIL OFL 1.1).
