# Générateur d’images (Cloudflare Workers AI · FLUX.1 schnell)

Un outil autonome pour créer les images d’un jeu : logos, icônes, sprites, décors, illustrations.
Un seul fichier, `gen-image.mjs`, sans aucune dépendance (Node 18 ou plus récent). Pour l’utiliser
dans un autre jeu, copie le dossier `tools/imagegen/`, le fichier `.env.example` et les lignes
« Secrets » du `.gitignore`.

## 1. Les clés (une seule fois)

1. Sur Cloudflare : *Mon profil → Jetons d’API → Créer un jeton*, modèle **« Workers AI »**, limité à
   ton compte. Garde aussi ton **Account ID** (page d’accueil de Workers AI, ou barre latérale du
   tableau de bord).
2. À la racine du projet, copie `.env.example` en **`.env`** et remplis :

   ```
   CLOUDFLARE_ACCOUNT_ID=ton_account_id
   CLOUDFLARE_API_TOKEN=ton_jeton
   ```

   `.env` est ignoré par git (voir `.gitignore`) : il ne part jamais sur GitHub. Tu peux aussi
   définir ces deux variables d’environnement dans ton système à la place.
3. Ne colle jamais le jeton dans le code, un message ou une capture. En cas de doute, révoque-le
   sur Cloudflare et crée-en un autre.

Dans une session Claude Code dans le cloud, le jeton est enregistré comme *secret réseau* de
l’environnement (injecté par le proxy pour `api.cloudflare.com`) : la variable
`CLOUDFLARE_API_TOKEN` peut alors valoir `proxy-injected`.

## 2. Générer

```bash
npm run image -- "un renard qui porte une lanterne" --type sprite --name renard
```

```bash
node tools/imagegen/gen-image.mjs "île flottante au crépuscule, lucioles" --type scene --count 3
```

| Option | Rôle | Par défaut |
| --- | --- | --- |
| `--type` | `logo`, `icon`, `sprite`, `scene`, `illustration`, `raw` (sans style ajouté) | `raw` |
| `--name` | nom du fichier, sans extension | tiré de la description |
| `--out` | dossier de destination, **dans** le projet | `assets/<dossier du type>` |
| `--count` | nombre de variantes (1 à 8) | 1 |
| `--steps` | 1 à 8 : plus = plus de détails, plus lent | 4 |
| `--force` | écrase un fichier du même nom (sinon `nom-2`, `nom-3`…) | non |

Dossiers par défaut : `assets/logos`, `assets/icons`, `assets/sprites`, `assets/backgrounds`,
`assets/illustrations`, `assets/generated`. Les images sortent en JPEG, 1024 × 1024.

Depuis un autre script :

```js
import { generateImage, saveImage, loadEnv } from './tools/imagegen/gen-image.mjs';
loadEnv();
const img = await generateImage('un hibou sage', { type: 'sprite' });
saveImage(img, { out: 'assets/sprites', name: 'hibou' });
```

## 3. Bon à savoir

- **Texte** : FLUX.1 schnell écrit mal les mots. Les logos sont donc générés sans texte (emblème,
  mascotte) ; ajoute le nom du jeu ensuite, dans le jeu ou un logiciel de dessin.
- **Transparence** : le modèle ne fait pas de fond transparent. Les sprites sont demandés sur fond
  blanc uni, facile à détourer.
- **Graine** : FLUX.1 schnell n’accepte pas de `seed` : chaque appel donne une nouvelle image. Utilise
  `--count` pour choisir parmi plusieurs variantes.
- **Description** : en anglais, les résultats sont souvent meilleurs. 2 048 caractères au plus.
- **Coût** : Workers AI a un quota gratuit quotidien ; au-delà, Cloudflare répond « HTTP 429 ».
- **Proxy** : derrière un proxy HTTPS (`HTTPS_PROXY`), l’outil se relance tout seul pour l’utiliser.
- **Licence** : vérifie les conditions d’utilisation du modèle et de Cloudflare avant d’utiliser
  les images dans un jeu commercial.
