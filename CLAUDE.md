# ChessMe

Application web (PWA installable) pour explorer les stats et les parties d'un joueur sur Lichess et Chess.com. Projet perso, prototype qui évolue vite. 100 % navigateur, local-first, sans backend.

- Décisions et justifications : [docs/decisions.md](docs/decisions.md). **À mettre à jour à chaque nouveau choix structurant.**
- Design (thème sombre Lichess) : [docs/design.md](docs/design.md)
- APIs Lichess / Chess.com, limites de débit : [docs/apis.md](docs/apis.md)
- Feuille de route : [docs/roadmap.md](docs/roadmap.md)

## Commandes

Raccourcis : `make dev`, `make build`, `make preview`, `make check`, `make clean` (`make` seul affiche la liste). Ils appellent les scripts pnpm ci-dessous et lancent `pnpm install` automatiquement si besoin.

```bash
pnpm dev                  # serveur de dev (http://localhost:5173)
pnpm check                # typecheck + lint + format:check + tests : à lancer avant chaque commit
pnpm test                 # vitest en mode watch
pnpm build                # build de prod + service worker PWA, dans dist/
pnpm format               # prettier --write
pnpm dlx shadcn@latest add <composant>   # ajouter un composant shadcn/ui
pnpm generate-pwa-assets  # régénérer les icônes après une modification de public/favicon.svg
```

pnpm uniquement (pas npm ni yarn). Node ≥ 24.

## Stack

Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`) · TanStack Router (routes sous forme de fichiers) + TanStack Query · Tailwind v4 + shadcn/ui (Radix, icônes Lucide) · `@lichess-org/chessground` (plateau) + chessops (règles, PGN) · Dexie (IndexedDB) · ECharts · vite-plugin-pwa · Vitest + Testing Library · oxlint + Prettier.

## Organisation du code

```
src/
  routes/             # une route par fichier (TanStack Router), routeTree.gen.ts est généré automatiquement
  components/ui/      # composants shadcn, générés par la CLI, modifiables
  components/         # composants applicatifs partagés (board/, PlayerSearch…)
  features/<nom>/     # code propre à une fonctionnalité (import, stats, training…), à créer au besoin
  features/player/    # profil croisé : summary.ts (normalisation), search.ts (paramètres ?lichess=&chesscom=), hook, composants
  lib/lichess/        # client HTTP, types, queryOptions de l'API Lichess
  lib/chesscom/       # idem pour l'API Chess.com
  lib/http.ts         # fetchJson, ApiError, null sur 404, politique de retry
  lib/format.ts       # formats fr-FR (nombres, dates, pays…)
  lib/                # utilitaires transverses
  test/setup.ts       # setup Vitest (jest-dom, fake-indexeddb)
```

## Conventions

- **Code, identifiants et commentaires en anglais. Interface utilisateur en français.**
- Imports avec l'alias `@/` (correspond à `src/`).
- Prettier : pas de point-virgule, guillemets simples, 100 colonnes. Les classes Tailwind sont triées automatiquement.
- Tests à côté du code (`foo.test.ts`). Tester en priorité la logique pure : parsing, calculs de stats, synchro.
- Appels réseau : une fonction dans `lib/<source>/client.ts` (via `fetchJson`), puis un `queryOptions` dans `queries.ts`. « Compte inexistant » vaut `null`, pas une erreur. Les loaders font un `prefetchQuery` (qui ne lève jamais d'erreur) et les composants un `useQuery`, en gérant les états chargement / absent / erreur source par source.
- **Ne jamais additionner ni convertir des Elo entre plateformes.** Seuls les compteurs et les dates se combinent (voir `summary.ts`).
- Données persistantes (parties importées) : Dexie. Données distantes éphémères : TanStack Query. Ne pas dupliquer l'une dans l'autre.
- **Couleurs : uniquement via les tokens** (`bg-card`, `text-muted-foreground`, `text-good`, `text-brag`…) définis dans `src/index.css`. Jamais de code hexadécimal dans un composant.
- chessground gère lui-même son DOM : passer par le wrapper `components/board/Board.tsx`, sans le manipuler depuis React.

## Règles à respecter

- **API Lichess : une seule requête à la fois**. Sur un 429, attendre 60 s. Ne jamais paralléliser les exports de parties.
- Licence : chessground et chessops sont sous GPL-3, le projet doit donc rester open source (GPL-compatible).
- Stockfish multi-thread exige les en-têtes COOP/COEP : à configurer à la fois dans Vite et chez l'hébergeur le jour où on l'ajoute (voir docs/decisions.md).
- pnpm 11 refuse par défaut les versions publiées très récemment : c'est voulu, ne pas forcer.
