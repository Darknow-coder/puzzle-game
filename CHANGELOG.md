# Journal des versions

## 2.0.0

**Nouveautés**

- **Atelier** : un éditeur de niveaux complet. On dessine l’île (herbe, vide, obstacles, eau, nuages),
  on place les Lumignons, lanternes, étincelles, lucioles et tous les mécanismes, on choisit le décor,
  la taille et les pièces données au joueur. Le solveur, lancé dans un fil séparé du navigateur, vérifie
  que le niveau est faisable, calcule le minimum de pièces pour ★ et pour ★★★ et compte les solutions
  parfaites. On peut tester son niveau, puis le **partager** par un code ou un lien `#play=…` ; un code
  reçu s’importe en un geste.
- **Défi du jour** : un puzzle par jour, puisé dans une réserve de 366 niveaux (61 par monde) dont la
  solution parfaite unique a été prouvée par le solveur. Il ne propose que les mondes déjà ouverts et
  compte les jours d’affilée.
- **Comprendre ses erreurs** : pause (bouton ou toucher du plateau), avance pas à pas, et ralenti des
  derniers tours après un échec.
- **Tutoriel animé** : une main montre les gestes au premier niveau (toucher la case, choisir la
  direction, lancer) et le glissement au deuxième.
- **Fin de monde** : la constellation du monde s’allume étoile par étoile.
- **Ambiances sonores** propres à chaque monde (grillons, gouttes et grenouilles, chouettes, carillons,
  vent), toujours synthétisées.
- 3 nouveaux succès (défis du jour, série de 5 jours, premier niveau vérifié dans l’atelier).
- Kit de publication : politique de confidentialité (`privacy.html`), fiche magasin FR/EN, captures
  1080×1920 et image de présentation (`store/`), guide `docs/PUBLISHING.md`.

**Corrections**

- Les lignes lumineuses de la victoire précédente restaient affichées sur le niveau suivant : tout ce
  qu’un parcours laisse à l’écran est maintenant effacé en changeant de niveau, en arrêtant ou en
  réessayant (test de non-régression ajouté).
- Accord de « + 1 autre récompense » sur l’écran de victoire.

## 1.0.0

Première version : 6 mondes, 66 niveaux vérifiés, notation en étoiles, carte des constellations,
garde-robe, succès, carnet, indices, PWA hors ligne, français et anglais.
