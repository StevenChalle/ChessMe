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

---

## 2026-10-04 : profil croisé Lichess + Chess.com

- **Même pseudo sur les deux plateformes**, recherché en parallèle (Lichess et Chess.com sont deux hôtes différents, la règle « une requête à la fois » s'applique par API). Chaque source est indépendante : un compte absent (404), fermé ou en erreur d'un côté ne casse pas l'autre. Les fonctions de requête renvoient `null` pour « pas de compte », ce n'est pas une erreur.
- **Limite connue** : un même pseudo peut appartenir à deux personnes différentes. Exemple : `alireza2003` est le GM sur Lichess, mais sur Chess.com c'est un compte avec 1 partie jouée en 2012. **Piste** : permettre de saisir un pseudo différent par plateforme et associer manuellement les comptes.
- **Couche de normalisation** (`src/features/player/summary.ts`) : chaque source est convertie en un `AccountSummary` commun, testé unitairement. Les vues combinées ne lisent que ce format.
- **Ce qu'on additionne** : uniquement les données de même nature, c'est-à-dire les compteurs de parties, le bilan victoires/nulles/défaites et les dates (ancienneté, dernière activité). **Ce qu'on n'additionne jamais** : les Elo. Les deux systèmes de classement ne sont pas comparables, on affiche donc l'Elo courant des deux sites côte à côte, sans conversion.
- Les comptes fermés sont affichés (« Compte fermé ») mais exclus des totaux.
- **Navigation** : trois onglets, sous forme de routes imbriquées, donc chaque onglet a sa propre URL partageable (remplacé le même jour, voir ci-dessous).
- Couleurs d'identité : bleu pour Lichess, vert pour Chess.com (tokens `bg-lichess` et `bg-chesscom`).

---

## 2026-10-04 : un pseudo par plateforme

Remplace l'hypothèse du « même pseudo partout ».

- **URL** : `/player?lichess=<pseudo>&chesscom=<pseudo>`, avec les onglets `/player/lichess` et `/player/chesscom`. Chaque paramètre est facultatif, il en faut au moins un. Les liens des onglets conservent les paramètres (`search: true`).
- **Pourquoi des paramètres d'URL plutôt que des segments de chemin** : un compte peut manquer d'un côté, et l'ordre des comptes n'a pas de sens. L'URL reste partageable et se met en favori.
- **Formulaire** : un champ par plateforme, avec un raccourci « Même pseudo » **dans les deux sens**. Sur l'accueil, chaque champ a son bouton, qui recopie le pseudo de l'autre champ. Dans l'en-tête, un seul bouton placé entre les champs recopie depuis le dernier champ modifié, et sa flèche (→ ou ←) indique le sens (`copySource` dans `search.ts`). La version complète est sur l'accueil ; une version compacte dans l'en-tête, pré-remplie avec les comptes affichés, permet de modifier le lien depuis le profil.
- Une plateforme sans pseudo est « non liée » : pas de requête (`skipToken`), pas d'onglet, une carte « Aucun compte lié » sur la vue d'ensemble, pas de colonne dans le tableau des Elo.
- Les paramètres d'URL sont validés dans `features/player/search.ts`. TanStack Router lit les valeurs comme du JSON, donc un pseudo numérique arrive sous forme de nombre : on le reconvertit en texte.
- L'ancienne route `/player/$username` est supprimée, sans redirection, puisque rien n'a encore été déployé.
