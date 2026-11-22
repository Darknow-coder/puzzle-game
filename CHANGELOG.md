# Journal des versions

## 3.0.0

**Nouveautés**

- **L’Aube de Cristal**, un septième monde : la nuit s’achève, le ciel rosit et le soleil se lève sur
  une île de cristal. 10 niveaux et une étoile filante, chacun prouvé par le solveur (une seule
  disposition parfaite), un diadème de cristal à gagner et un nouveau succès. La fin de la Cime des
  Vents annonce désormais l’aube.
- **Miroirs de cristal** : une nouvelle pièce, posée `/` ou `\` (deux pétales au toucher, une
  pichenette la retourne), et des miroirs gravés dans le sol. Un Lumignon est une lumière : le miroir le
  renvoie d’un quart de tour, et dans un sens différent selon le côté d’arrivée. Les Grignombres y
  obéissent aussi. Musique, oiseaux du matin et petit carillon à chaque reflet.
- **Défi du jour** : 61 puzzles avec miroirs rejoignent la réserve (427 au total) ; les puzzles des
  autres mondes ne changent pas.
- **Image souvenir** : depuis l’écran de victoire, partage une image du plateau réussi avec la
  constellation du parcours (ou enregistre-la).
- **Sauvegarde** : *Réglages → Sauvegarde* donne toute ta progression sous forme d’un code
  (~400 caractères) à garder ou à coller sur un autre appareil.
- **Ouvrir tous les niveaux** (réglages) : tous les mondes deviennent jouables, les étoiles restent à gagner.
- **Atelier** : miroirs gravés, miroirs à donner au joueur, décor de l’aube.

**Corrections**

- Sur téléphone, après être revenu dans le jeu (changement d’application, capture d’écran…), l’île,
  le ciel, les rochers ou les icônes pouvaient disparaître, et la carte gardait des traînées du niveau
  précédent. Android libère parfois la mémoire graphique des applications en arrière-plan : le jeu
  redessine maintenant tout ce qui a été perdu, et efface l’écran à chaque image. Un test reproduit le
  problème en faisant réellement planter le processus graphique du navigateur.

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
- **Mises à jour** : quand une nouvelle version est publiée, le jeu installé affiche « Nouvelle version
  prête — Recharger » (sans jamais interrompre une partie) ; les fichiers sont toujours précachés frais.
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
