# Publier Lumignons sur les magasins d’applications

Le jeu est une application web progressive (PWA) : HTML, CSS et JavaScript, sans serveur. Il peut être
publié tel quel sur le web, et empaqueté pour Google Play ou l’App Store. Ce guide liste les étapes ;
aucune n’est payante sauf mention contraire.

## 1. Héberger le jeu sur un domaine stable (gratuit)

GitHub Pages suffit (voir le `README`). Pour Google Play, le domaine doit pouvoir servir un fichier à sa
racine (`/.well-known/assetlinks.json`), ce qui n’est pas possible depuis un sous-dossier
`https://<compte>.github.io/puzzle-game/`. Deux solutions gratuites :

- un dépôt nommé `<compte>.github.io` (site « utilisateur », servi à la racine du domaine) ;
- ou un nom de domaine personnel pointé vers GitHub Pages (le domaine lui-même est payant, ~10 €/an).

Vérifie ensuite que `https://<domaine>/privacy.html` est accessible : c’est l’adresse de la politique de
confidentialité demandée par les magasins.

## 2. Google Play (Trusted Web Activity)

Coût : inscription unique au Google Play Console (25 $).

1. Installer Node.js et Java (JDK 17), puis l’outil gratuit Bubblewrap :
   `npm i -g @bubblewrap/cli`.
2. `bubblewrap init --manifest https://<domaine>/manifest.webmanifest`
   - identifiant d’application suggéré : `com.<toncompte>.lumignons` ;
   - couleur de thème `#231a45`, orientation portrait (déjà dans le manifeste).
3. `bubblewrap build` produit un `.aab` signé (garde précieusement la clé de signature).
4. Copier l’empreinte SHA-256 affichée dans `/.well-known/assetlinks.json` à la racine du domaine
   (Bubblewrap génère le fichier ; il permet d’afficher le jeu en plein écran, sans barre d’adresse).
5. Dans la Play Console : créer l’application, téléverser le `.aab`, remplir la fiche avec
   `store/listing.md`, ajouter les captures de `store/screenshots/`, remplir le formulaire
   *Sécurité des données* avec les réponses de `store/listing.md` (classements en ligne facultatifs),
   répondre au questionnaire de classification (tout public ; signaler que des pseudos choisis par les
   joueurs sont visibles, sans messagerie).
6. Publier d’abord en « test interne » pour l’essayer sur ton téléphone.

Alternative sans ligne de commande : https://www.pwabuilder.com génère aussi le paquet Android.

## 3. App Store (iPhone, iPad)

Coût : programme développeur Apple (99 $/an) et un Mac avec Xcode.

1. Créer un projet Capacitor (gratuit) : `npm init @capacitor/app`, puis copier les fichiers du jeu
   (`index.html`, `manifest.webmanifest`, `src/`, `assets/`) dans le dossier web du projet.
2. `npx cap add ios`, puis `npx cap open ios` pour ouvrir le projet dans Xcode.
3. Le service worker n’est pas nécessaire dans l’application iOS (les fichiers sont déjà embarqués).
4. Renseigner les icônes (`assets/icons/`) et l’écran de lancement, tester sur un iPhone, puis envoyer
   la version via App Store Connect avec les textes de `store/listing.md`.

## 4. Avant de publier

- Configurer les classements en ligne (projet Firebase gratuit) : [`docs/FIREBASE.md`](FIREBASE.md).
  Sans cela, le jeu reste jouable mais les classements annoncent « bientôt ».
- Mettre une adresse de contact dans `privacy.html` (les magasins en demandent une pour la
  confidentialité ; un lien vers le dépôt GitHub ne suffit pas toujours).
- Vérifier la disponibilité du nom « Lumignons » (bases de marques INPI, EUIPO, USPTO).
- Relancer les tests : `npm test`, `npm run verify`, `npm run e2e`, `npm run test:online`.
- Mettre à jour le numéro de version dans `src/main.js` et la note de version dans `CHANGELOG.md`.
- Choisir la licence du code : le dépôt est actuellement « tous droits réservés » (`LICENSE`).
