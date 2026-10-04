# Vision : réflexions en cours

> **Document de réflexion, rien n'est définitif.** Il garde la trace de nos discussions sur la direction du produit. Les idées peuvent changer ou être abandonnées. Les choix arrêtés vont dans [decisions.md](decisions.md), le travail planifié dans [roadmap.md](roadmap.md).

_Discussions du 2026-10-04._

## Proposition de valeur

Un outil de **progression aux échecs, simple et rapide**, dont la force est la **personnalisation de l'entraînement** : il analyse tes propres parties, trouve ce qui te coûte réellement des points, et te fait travailler à partir de tes propres erreurs.

Ce n'est ni un Lichess ni un Chessable en moins bien. Ce qui le distingue :

- **tes propres données uniquement**, Lichess et Chess.com réunis ;
- **aucun compte à créer**, tout reste dans le navigateur ;
- des **recommandations accompagnées de preuves** tirées de tes parties, et non des conseils génériques.

## Le plan d'entraînement, au centre

L'idée qui structure tout : un **plan d'entraînement personnel**, proposé chaque semaine ou à une autre cadence. C'est ce qu'on ouvre régulièrement. Le reste sert à l'alimenter ou à l'appliquer :

- les **statistiques**, l'**arbre d'ouvertures** et l'**analyse par le moteur** servent au **diagnostic** ;
- les **exercices** et le **répertoire** servent à **appliquer le plan**.

La boucle :

```
tu joues → import → analyse → diagnostic → plan → entraînement → mesure → plan ajusté
```

Pistes de réflexion :

- **Refermer la boucle.** Le plan suivant mesure le progrès sur les points travaillés (« finales de tours : 4 positions gagnantes gâchées sur 5 avant, 1 sur 4 depuis »). Sans cette mesure, c'est un générateur de conseils. Avec, c'est un coach.
- **Chaque priorité montre ses preuves** : les parties et les positions concernées, pas seulement « travaille tes finales ».
- **Un plan court** : 2 ou 3 priorités, un volume adapté au temps disponible (« 20 min par jour », « 2 h par semaine »), une cadence au choix.
- **Ajustable.** L'outil recommande, l'utilisateur garde la main : retirer une priorité, en ajouter une, voire composer son propre plan à partir des recommandations. Le bilan mesure ce qui a réellement été choisi.
- **Honnête sur la fiabilité.** Il faut assez de parties pour qu'une faiblesse soit réelle et pas due au hasard. Le plan le dit (« pas encore assez de parties sur ce point »).

### Sur quelles parties baser le plan ?

Deux questions distinctes :

1. **Le diagnostic : où en suis-je aujourd'hui ?**
   - Uniquement les parties jouées depuis le dernier plan : l'échantillon est souvent trop petit (une semaine, c'est peut-être 20 parties, dont 2 finales).
   - Toute la carrière : on traîne des faiblesses déjà corrigées, ou des parties jouées à un tout autre niveau.
   - Piste : **pondérer par l'ancienneté**. Toutes les parties comptent, mais les récentes pèsent plus (une partie d'il y a 6 mois compte par exemple deux fois moins qu'une partie d'hier).
2. **L'évaluation : le plan précédent a-t-il marché ?**
   - On regarde **uniquement les parties jouées depuis**, sur les points travaillés.
   - Si l'échantillon est trop petit, la priorité reste ouverte au lieu d'être déclarée réglée.

Un nouveau plan combinerait les deux : un diagnostic à jour, avec le bilan du précédent comme point de départ.

### Autres réflexions

- **Les exercices aussi sont des données.** Réussir ses exercices de finales mais continuer à les rater en partie, ça veut dire quelque chose (le temps à la pendule ? la pression ?).
- **Peu de parties.** Idéalement, l'outil reste utile. Plutôt qu'un seuil global, chaque faiblesse aurait son propre minimum de preuves : 3 pièces laissées en prise suffisent peut-être à proposer des exercices de vigilance, alors que juger un répertoire demande beaucoup plus de parties. Avec très peu de parties (moins d'une dizaine ?), le plan serait court et prudent, et conseillerait de jouer davantage.
- **La cadence.** Les faiblesses en bullet et en partie longue ne sont probablement pas les mêmes. Le plan devra cibler une cadence ou les distinguer.

## Pistes de fonctionnalités

### Ouvertures

- **Arbre des coups joués**, construit à partir de ses parties, avec la fréquence et le score de chaque coup. Pas besoin du moteur.
- Repérer **les lignes qui coûtent des points** (« avec Noirs contre 1.e4 c5 2.Nf3 d6 3.Bb5+, 28 % ») et **l'endroit où l'on sort de la théorie**, en comparant avec l'explorateur d'ouvertures de Lichess.
- **Revoir ses erreurs ligne par ligne**, une fois les parties analysées.
- Lichess propose déjà un explorateur sur les parties d'un joueur. Notre différence : les deux plateformes réunies, et le lien direct avec les erreurs.

### Répertoire

- **Construire son répertoire**, idéalement pré-rempli à partir de ce que l'on joue déjà.
- **S'y entraîner** :
  - par cœur, en **répétition espacée** (une ligne ratée revient vite, une ligne maîtrisée revient de plus en plus rarement) ;
  - avec des **déviations** : l'adversaire sort de la ligne pour voir comment on réagit. Piste : choisir les déviations parmi les coups que les joueurs de son niveau jouent vraiment (statistiques de l'explorateur Lichess filtrées par Elo), plutôt qu'au hasard.

### Erreurs (avec le moteur)

- **Exercices tirés de ses propres gaffes** et gains manqués, en répétition espacée : la promesse centrale de l'outil.
- Les classer par phase (ouverture, milieu, finale) et par type (pièce laissée en prise, mat raté, avantage gâché).
- **Finales** : quels types de finales on atteint, et combien de positions gagnantes on ne convertit pas. Les tables de finales de Lichess le vérifient sans moteur. On pourrait ensuite rejouer contre Stockfish depuis la position critique.
- Évolution de la **précision** dans le temps, par phase et par cadence.

### Statistiques sans moteur

- **Gestion du temps** : gaffes commises en zeitnot, parties perdues au temps, part de la pendule utilisée dans chaque phase.
- **Tilt et habitudes de jeu** : résultats selon l'heure, la durée de la session, après une défaite (« après 2 défaites d'affilée, 38 % : arrête-toi »).

### Plus tard

- **Préparer un match contre un adversaire** : son répertoire et ses points faibles, puisque le profil marche déjà pour n'importe quel pseudo.

## Points d'attention

- **Le coût de l'analyse par le moteur** dans le navigateur, pour des centaines ou des milliers de parties. Pistes : réutiliser les évaluations déjà faites par Lichess, analyser progressivement en arrière-plan en commençant par les parties récentes, faire une passe rapide puis approfondir à la demande. Voir aussi la section technique plus bas.
- **Rester simple et rapide** : peu de fonctionnalités, toutes branchées sur les données personnelles.
- **Les données au centre** : chaque position de ses parties, avec ce qu'on y a joué et ce que ça a donné. L'arbre d'ouvertures, les erreurs, le répertoire et les exercices en sont différentes vues. À prévoir dans le modèle de données, avec trois autres notions : une **faiblesse** (avec ses preuves et sa mesure), un **exercice** (avec son historique) et un **plan** (avec sa période et ses résultats).

## Ordre envisagé (à rediscuter)

1. Import des parties et stockage par position, arbre d'ouvertures, statistiques de temps et de tilt.
2. Analyse progressive par le moteur, pour constituer la base de ses erreurs.
3. Exercices sur ses erreurs, en répétition espacée.
4. Répertoire et entraînement.
5. Plan d'entraînement personnalisé et ajustable, puis préparation contre un adversaire.

## Technique : performances du moteur (réflexion)

État actuel (`src/lib/engine`, `src/features/review`) : Stockfish 19 **lite mono-thread** en WASM, un **pool de workers indépendants** (un moteur par cœur libre, 4 au maximum, sans COOP/COEP), et une analyse en **deux passes à budget de nœuds** (100 000 nœuds par position, puis 1 000 000 sur les coups suspects). Une table de hachage est gardée par partie. **Rien n'est mis en cache** : chaque revue repart de zéro.

### Tauri ?

- **Tauri ne change rien aux performances tant qu'on reste en WASM.** Une app Tauri affiche la même page dans la vue web du système (WebView2, WKWebView, WebKitGTK), donc le même Stockfish WASM, à la même vitesse. Sous Linux, ce peut même être un peu plus lent.
- **Le gain viendrait d'un Stockfish natif**, que Tauri peut lancer à côté de l'app sur ordinateur. Il est sensiblement plus rapide que le WASM lite : instructions AVX2 et BMI2, réseau NNUE complet donc plus fort à budget égal, multi-thread natif.
- **Sur mobile, c'est bien plus compliqué** : il faudrait compiler Stockfish en bibliothèque appelée depuis Rust, et iOS interdit de lancer un exécutable séparé.
- **Le coût** : installeurs à signer, mises à jour à gérer, deux builds, et on perd le « rien à installer ».
- **Piste** : rester en PWA. Le moteur passe déjà par une classe `Stockfish` et un `EnginePool`. Le jour où l'analyse en masse devient le goulot d'étranglement, une version Tauri pour ordinateur pourrait brancher un Stockfish natif derrière la même interface.

### Optimisations restantes, sans multi-thread

Ce qui est déjà en place : plusieurs workers indépendants, deux passes, budget en nœuds, build lite, table de hachage gardée dans une partie. Pistes restantes, de la plus rentable à la moins rentable :

- **Ne jamais analyser deux fois la même position** : un cache des évaluations par position (FEN normalisée et budget de nœuds) dans IndexedDB. Les positions d'ouverture reviennent dans des centaines de parties, et relancer une revue deviendrait instantané. C'est cohérent avec un modèle de données centré sur les positions.
- **Réutiliser le travail déjà fait ailleurs** :
  - évaluations Lichess déjà calculées : l'export avec `evals=true` les fournit pour les parties analysées sur Lichess ;
  - cache d'évaluations Lichess (`cloud-eval`) pour les positions d'ouverture fréquentes ;
  - positions théoriques sautées : un coup présent dans l'explorateur Lichess avec beaucoup de parties n'est pas une erreur à chercher ;
  - tables de finales de Lichess pour 7 pièces ou moins : un résultat exact, sans moteur.
- **Analyse progressive en arrière-plan**, avec une file d'attente reprenable et les résultats sauvegardés au fur et à mesure, les parties récentes en premier. Mise en pause quand l'onglet est masqué, pool réduit sur mobile (batterie, chauffe).
- **Mettre les fichiers du moteur en cache** (service worker, ou cache HTTP long sur `/engine/*` chez Render) pour ne pas les retélécharger.
- **Mesurer** : nœuds par seconde réels sur ordinateur et sur téléphone, et durée d'une revue, pour régler la taille du pool et les budgets.
