# Feuille de route

## Fait

- [x] Squelette : Vite, React, TanStack, Tailwind/shadcn, thème sombre Lichess, PWA, CI
- [x] Recherche de joueur et page profil (classements par cadence)

## V1 : à cadrer

- [ ] Définir les pages et les stats à afficher
- [ ] Import complet des parties (flux NDJSON vers Dexie), avec la progression affichée
- [ ] Synchro incrémentale (`since`) et gestion du 429
- [ ] Courbe Elo (ECharts)
- [ ] Liste des parties filtrable, et visionneuse de partie (chessground + chessops)
- [ ] Bouton « supprimer mes données locales »

## Plus tard

- Analyse des parties avec Stockfish WASM
- Entraînement sur ses propres erreurs (rejouer les positions perdues ou les gaffes)
- Support de Chess.com
- Déploiement sur Render
- Backend, si comptes ou synchro entre appareils
