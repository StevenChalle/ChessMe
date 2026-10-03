# Journal des décisions

Chaque décision structurante est notée ici, avec sa raison et les alternatives écartées. On la révise quand le contexte change : ajouter une entrée datée plutôt que réécrire l'historique.

---

## 2026-10-04 : choix fondateurs

### Architecture : local-first, 100 % navigateur, sans backend

L'API Lichess est publique, ne demande pas d'authentification et accepte les appels directs depuis le navigateur (CORS). Le navigateur importe donc tout l'historique une fois, en flux NDJSON, le stocke dans IndexedDB, puis fait une synchro incrémentale (`since`).

- **Pour** : gratuit, pas de serveur à maintenir, pas de données personnelles stockées côté serveur (donc pas de RGPD), tout est instantané une fois l'import fait.
- **Contre** : les données restent dans un seul navigateur (il faut réimporter sur chaque appareil), et le navigateur peut effacer IndexedDB (à limiter avec `navigator.storage.persist()`).
- **On réévaluera** si on ajoute des comptes, une synchro entre appareils, Chess.com à grande échelle ou des analyses lourdes. Piste : Hono + SQLite/Postgres.

### Framework : React (plutôt que Svelte)

Écosystème plus large, shadcn et TanStack pensés d'abord pour React, acquis réutilisable ailleurs. SvelteKit était plus léger mais avec un écosystème plus petit. chessground n'étant lié à aucun framework, ce point n'a pas pesé dans le choix.

### Stack

| Rôle              | Choix                                                  | Alternatives écartées                                                                         |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Build             | Vite                                                   | —                                                                                             |
| Routing           | TanStack Router (routes sous forme de fichiers)        | React Router : moins typé                                                                     |
| Données distantes | TanStack Query                                         | —                                                                                             |
| UI                | Tailwind v4 + shadcn/ui (Radix, preset Nova, Lucide)   | —                                                                                             |
| Échiquier         | `@lichess-org/chessground`                             | `chessground` (ancien nom, abandonné sur npm), react-chessboard                               |
| Règles / PGN      | chessops                                               | chess.js : moins bien intégré à chessground, PGN annoté moins complet                         |
| Stockage local    | Dexie                                                  | idb : plus bas niveau                                                                         |
| Graphiques        | ECharts                                                | Observable Plot : plus statique, alors qu'on veut zoom, infobulles et brush sur la courbe Elo |
| Stats lourdes     | **reporté** (DuckDB-WASM si besoin)                    | Pèse plusieurs Mo, alors que de simples calculs JS suffisent jusqu'à environ 50 000 parties   |
| Moteur            | Stockfish WASM dans un Web Worker (pas encore intégré) | APIs tierces : fragiles et limitées                                                           |
| Tests             | Vitest + Testing Library + fake-indexeddb              | —                                                                                             |
| Qualité           | oxlint (fourni par le template Vite) + Prettier        | ESLint : plus lent, rien de plus pour nos besoins                                             |
| Paquets           | pnpm                                                   | —                                                                                             |

**Licence** : chessground et chessops sont sous GPL-3, le projet doit donc rester open source. Pour un produit commercial au code fermé, il faudrait passer à react-chessboard et chess.js.

### Bureau et mobile : PWA (plutôt qu'Electron)

Le but est de pouvoir épingler l'application sur le bureau du PC ou l'écran d'accueil du téléphone.

- **PWA** (vite-plugin-pwa) : installable depuis Chrome ou Edge sur Windows (fenêtre dédiée, icône dans la barre des tâches et le menu Démarrer), et depuis Android et iOS (écran d'accueil). Une seule base de code, aucun magasin d'applications, mises à jour automatiques. Elle fonctionne hors ligne une fois les parties importées, ce qui va très bien avec le local-first.
- **Electron, écarté** : plus de 100 Mo par installation, aucune version mobile, et aucun gain tant qu'on n'a pas besoin d'API système.
- **Plan B : Tauri v2**, si un jour on a besoin du natif (système de fichiers, Stockfish natif plus rapide que le WASM, distribution dans les magasins d'applications). Tauri enveloppe la même application Vite et cible le bureau et le mobile. La stack actuelle n'aurait rien à changer.

Limite connue : sur iOS, le stockage d'une PWA peut être effacé si l'application n'est pas utilisée pendant plusieurs semaines. Ce n'est pas grave, car les parties se réimportent depuis Lichess.

### Hébergement : Render (site statique), à faire plus tard

Le compte Render existe déjà. C'est un site statique : commande de build `pnpm build`, dossier publié `dist`, et une règle de réécriture `/* → /index.html` pour le routing côté client. Le jour où Stockfish multi-thread arrivera, ajouter les en-têtes `Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: credentialless` (dans les paramètres du site Render et dans `server.headers` de Vite).

### Design : thème sombre de Lichess

Voir [design.md](design.md).
