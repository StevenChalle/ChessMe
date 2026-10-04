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

## V1 : à cadrer

- [ ] Définir les pages et les stats à afficher
- [ ] Import complet des parties (flux NDJSON vers Dexie), avec la progression affichée
- [ ] Synchro incrémentale (`since`) et gestion du 429
- [ ] Courbe Elo (ECharts)
- [ ] Liste des parties filtrable, et visionneuse de partie (chessground + chessops)
- [ ] Bouton « supprimer mes données locales »

## Plus tard

- Mesurer l'analyse sur un vrai téléphone et ajuster l'estimation
- Mettre en cache les évaluations (une analyse interrompue ou relancée ne repart pas de zéro)

- Analyse des parties : mettre en cache les évaluations (Dexie), détailler les erreurs (positions, meilleur coup), filtrer par cadence
- Entraînement : mémoriser les résultats, revoir en priorité les positions ratées, sélecteur de promotion
- Import des parties Chess.com (archives mensuelles)
- Mémoriser les comptes liés (profil « moi »), à distinguer des recherches récentes
- Backend, si comptes ou synchro entre appareils
