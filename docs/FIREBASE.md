# Classements en ligne : mise en place de Firebase

Les classements (par niveau, défi du jour, classement général) s’appuient sur **Firebase**, de Google,
avec l’offre gratuite **Spark** : aucune carte bancaire n’est demandée et rien n’est jamais facturé.
Tant que le projet n’est pas configuré, le jeu fonctionne normalement : le pseudo est gardé sur
l’appareil, les résultats attendent, et l’écran *Podium* annonce que les classements ouvrent bientôt.
Dès que la configuration est publiée, les résultats en attente partent tout seuls.

Le jeu n’utilise pas le SDK Firebase : il parle directement aux API REST publiques
(`src/online/firebase.js`), sans aucune bibliothèque à charger.

## 1. Créer le projet (5 minutes)

1. Ouvrir <https://console.firebase.google.com> avec un compte Google, puis **Créer un projet**.
   Nom : `lumignons` (ou autre). **Google Analytics : désactivé** (inutile, et la politique de
   confidentialité du jeu dit qu’il n’y a aucune mesure d’audience).
2. Dans la page du projet, cliquer sur l’icône **Web** (`</>`) pour ajouter une application Web.
   Surnom : `Lumignons`. Ne pas cocher Firebase Hosting. Firebase affiche alors un bloc
   `firebaseConfig` : garder sous la main **`apiKey`** et **`projectId`**.
3. Menu **Créer → Authentication → Commencer**, onglet **Mode de connexion** :
   activer **Anonyme**, puis **Enregistrer**. (Les joueurs n’ont ni e-mail ni mot de passe : chaque
   appareil reçoit un identifiant anonyme.)
4. Menu **Créer → Firestore Database → Créer une base de données** :
   - emplacement : **`eur3 (europe-west)`** ou une région européenne (`europe-west1`, `europe-west9`…).
     La politique de confidentialité (`privacy.html`) dit que les données sont en Europe : si tu choisis
     une autre région, modifie-la ;
   - démarrer en **mode production**.
5. Dans Firestore, onglet **Règles** : remplacer tout le texte par le contenu du fichier
   [`firestore.rules`](../firestore.rules) de ce dépôt, puis **Publier**.
6. Dans le dépôt, ouvrir `src/online/config.js` et remplir :

   ```js
   export const FIREBASE = {
     apiKey: 'AIza…',        // la valeur "apiKey" de l’étape 2
     projectId: 'lumignons-…', // la valeur "projectId"
   };
   ```

   Ces deux valeurs ne sont pas secrètes (elles désignent seulement le projet ; ce sont les règles de
   l’étape 5 qui protègent les données). On peut donc les publier sur GitHub. Pousser le commit :
   GitHub Pages publie la nouvelle version et les classements s’ouvrent.

Aucun index à créer : toutes les requêtes du jeu utilisent les index automatiques de Firestore.

### Conseillé : limiter la clé à ton site

Dans <https://console.cloud.google.com/apis/credentials> (même compte, même projet), ouvrir la clé
**Browser key (auto created by Firebase)** → *Restrictions relatives aux applications* → **Sites Web** →
ajouter `https://darknow-coder.github.io/*` (et `http://localhost:8080/*` pour tester sur ton
ordinateur) → Enregistrer. La clé ne fonctionnera plus depuis d’autres sites.

## 2. Ce qui est stocké

| Collection | Contenu | Qui peut écrire |
| --- | --- | --- |
| `names/{pseudo plié}` | à qui appartient un pseudo (« Lune-Rêveuse » et « lune reveuse » sont le même) | son propriétaire |
| `players/{uid}` | pseudo, Lumignon préféré et ce qu’il porte, total d’étoiles | le joueur |
| `boards/{niveau}/entries/{uid}` | meilleur résultat : étoiles, pièces, indice, essais, temps | le joueur |
| `reports/{id}` | pseudos signalés par les joueurs (illisibles par le jeu) | tout joueur |
| `banned/{uid}` | joueurs bannis | personne (console seulement) |

Les règles (`firestore.rules`) vérifient tout ce qui est écrit : un pseudo unique et correct
(mêmes règles que `src/online/names.js`), un seul résultat par joueur et par niveau, remplacé
seulement par un meilleur, des résultats possibles (le nombre de pièces des ★★★ est celui du solveur,
la clé de classement est recalculée), un total d’étoiles qui suit exactement les résultats, des défis
du jour acceptés seulement autour de leur date. Elles sont testées contre l’émulateur Firebase :
`npm run test:online`.

**Limite assumée** : sans serveur à soi (les Cloud Functions demandent l’offre payante), le temps et le
nombre d’essais sont déclarés par l’appareil. Les règles en vérifient la vraisemblance, pas l’exactitude :
un tricheur déterminé peut afficher un temps irréaliste. D’où la modération ci-dessous.

## 3. Modération

- **Signalements** : Firestore → collection `reports`. Chaque document indique l’identifiant du joueur
  signalé (`target`), le niveau (`board`) et la date.
- **Retirer un pseudo** : supprimer `players/{uid}` (le joueur disparaît de tous les classements) et
  le document de `names` qui porte son `uid`.
- **Bannir** : créer un document `banned/{uid}` (n’importe quel champ, par exemple `raison`). Le
  joueur ne peut plus rien écrire.
- Le jeu refuse déjà les pseudos grossiers les plus courants (liste dans `src/online/names.js`).

## 4. Quotas gratuits

L’offre Spark permet chaque jour 50 000 lectures et 20 000 écritures (1 Gio de stockage). Afficher un
classement coûte environ 20 à 40 lectures, envoyer un résultat 3 lectures et 1 ou 2 écritures. Au-delà,
les classements font une pause jusqu’au lendemain : le jeu continue, les résultats attendent.

## 5. Tester sur son ordinateur

Les émulateurs Firebase (Java 11 ou plus récent) rejouent tout en local, avec les vraies règles :

```bash
npm run test:online   # règles + client contre les émulateurs (lance firebase-tools)
npm start             # dans un autre terminal, puis :
npm run e2e:online    # le jeu dans Chromium contre les émulateurs (premier lancement, classements…)
```

Pour jouer soi-même contre les émulateurs : lancer
`npx firebase-tools@13 emulators:start --only auth,firestore --project demo-lumignons` et `npm start`,
puis ouvrir <http://localhost:8080/?emulator> (plusieurs fenêtres de navigation privée = plusieurs
joueurs). Le paramètre `?emulator` n’a d’effet que sur `localhost`.

## 6. Après avoir changé des niveaux

Les règles contiennent, pour chaque niveau et chaque défi du jour, le nombre de pièces minimal. Après une
modification de niveaux : `npm run rules`, puis republier `firestore.rules` (étape 5). La CI vérifie
que le fichier est à jour.
