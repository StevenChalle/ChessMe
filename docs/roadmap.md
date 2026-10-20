# Feuille de route

## Fait

- [x] Squelette : Vite, React, TanStack, Tailwind/shadcn, thème sombre Lichess, PWA, CI
- [x] Recherche de joueur et page profil (classements par cadence)
- [x] Profil croisé Lichess + Chess.com : vue d'ensemble combinée, plus un onglet par plateforme
- [x] Configuration du déploiement Render (`render.yaml`)
- [x] Un pseudo par plateforme (comptes aux noms différents), avec recopie rapide
- [x] Interface bilingue anglais / français (langue du navigateur par défaut), choix mémorisé
- [x] Recherches récentes sur l'accueil (3 dernières, cliquables)
- [x] Page d'analyse à onglets (filtres, analyse, entraînement) à la place de la modale
- [x] Analyse approfondie : filtres (plateformes, N dernières ou période, cadences, couleur, résultat, longueur), seuils réglables, récapitulatif avec estimation, pagination, rejeu par partie
- [x] Analyse des 10 dernières parties avec Stockfish WASM : nombre d'erreurs par partie (sans cache)
- [x] Rejouer ses erreurs sur un échiquier, dans un ordre aléatoire, avec bilan
- [x] Onglet Parties : historique toutes plateformes, paginé, avec l'Elo et sa variation (sans stockage)
- [x] Mises à jour de la PWA installée, licence GPL-3.0, page `/legal` avec effacement des données locales
- [x] Entraînements en onglets, avec un écran d'options
- [x] Thèmes des erreurs : filtre d'entraînement et barres dans les résultats
- [x] Menu des paramètres : langue et apparence des échiquiers
- [x] Page de contact avec un formulaire de retours (Web3Forms)
- [x] Renommage ChessMe → CraftYourChess, domaine https://craftyourchess.com

## V1 : à cadrer

- [ ] Définir les pages et les stats à afficher
- [ ] Import complet des parties (flux NDJSON vers Dexie), avec la progression affichée
- [ ] Synchro incrémentale (`since`) et gestion du 429
- [ ] Courbe Elo (ECharts)
- [ ] Liste des parties filtrable, et visionneuse de partie (chessground + chessops)
- [ ] Étendre l'effacement des données locales (page `/legal`) aux parties importées

## Plus tard

- Mesurer l'analyse sur un vrai téléphone et ajuster l'estimation
- Mettre en cache les évaluations dans Dexie (une analyse interrompue ou relancée ne repart pas de zéro)
- Analyse des parties : détailler les erreurs (positions, meilleur coup)
- Entraînement : mémoriser les résultats, revoir en priorité les positions ratées, sélecteur de promotion
- Import des parties Chess.com (archives mensuelles)
- Mémoriser les comptes liés (profil « moi »), à distinguer des recherches récentes
- Backend, si comptes ou synchro entre appareils
- Environnement de staging sur `staging.craftyourchess.com`, déployé depuis `develop` : second service dans `render.yaml`, CI aussi sur `develop`, en-tête `noindex`, nom de PWA distinct, pas de clé Web3Forms
