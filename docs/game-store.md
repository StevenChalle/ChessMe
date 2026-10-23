# Parties des comptes dans le navigateur : conception

Garder dans le navigateur les parties déjà récupérées sur Lichess et Chess.com, et ne plus demander aux plateformes que ce qui manque. Aujourd'hui, réanalyser 500 parties est instantané côté moteur (voir [analysis-cache.md](analysis-cache.md)) mais demande encore environ 20 s de téléchargement : Lichess envoie environ 20 parties par seconde sans token. Décision résumée dans [decisions.md](decisions.md) (2026-10-23).

État : conception, pas encore implémentée.

## Principes

1. **Un magasin qui grandit au fil des recherches**, pas un import complet imposé. Une carrière de 10 000 parties prendrait environ 8 minutes sur Lichess : on ne télécharge que ce que les recherches demandent, et on le garde.
2. **On sait exactement ce qu'on a.** Pour chaque compte, on note les périodes couvertes (Lichess) ou les mois lus (Chess.com). Une recherche entièrement couverte ne fait aucune requête, sauf la mise à jour des parties récentes.
3. **On garde les parties brutes**, telles que les API les donnent. La normalisation (`fromLichessGame`, `fromChessComGame`) reste dans le code et peut évoluer sans tout retélécharger.
4. **Rien ne se perd sur un arrêt.** Ce qui est arrivé est écrit au fil de l'eau, et la période couverte avance avec.
5. **C'est un cache.** Le navigateur peut l'effacer ; la recherche retombe alors sur les plateformes, comme aujourd'hui.

## Ce que ça change pour l'utilisateur

- Première recherche de 500 parties : même durée qu'aujourd'hui.
- Recherches suivantes : seulement les nouvelles parties depuis la dernière fois (souvent une requête presque vide), puis lecture locale. Une analyse de 500 parties déjà vues passe d'environ 20 s à environ 1 s.
- La barre de progression reste : elle compte les parties trouvées sur place puis celles qui arrivent.

## Schéma Dexie

Dans la base `craftyourchess` existante (`lib/db.ts`), une `db.version(2)` qui ajoute deux tables. Le code dans `features/games/store.ts` (il servira aussi à l'onglet Parties plus tard).

```ts
/** A game of an account, as the platform's API gives it. Key: [account+id] */
type StoredGame = {
  source: 'lichess' | 'chesscom'
  /** Lichess id, or Chess.com uuid */
  id: string
  /** 'lichess:alice': platform and lowercase username */
  account: string
  /** End of the game (ms): the order of the lists, as ReviewGame.playedAt */
  playedAt: number
  /** Lichess only: start of the game (ms), the date the API filters on */
  createdAt?: number
  /** Precomputed to filter before normalizing (see "Lecture") */
  category: GameCategory
  rated: boolean
  /** The account's color in this game */
  color: Color
  raw: LichessGame | ChessComGame
}

/** What is known of an account's games. Key: account */
type AccountSync = {
  account: string
  /** Lichess: per perf (bullet, blitz…), the periods whose games are all stored (createdAt, ms) */
  lichess?: Record<LichessPerf, { from: number; to: number }[]>
  /** Lichess: perfs whose first game was reached (nothing before the oldest period) */
  lichessStart?: LichessPerf[]
  /** Chess.com: when each month ('2026/10') was read (ms) */
  chesscomMonths?: Record<string, number>
  /** Last search on this account, for eviction */
  usedAt: number
}
```

```ts
db.version(2).stores({
  accountGames: '[account+id], [account+playedAt]',
  accountSync: 'account, usedAt',
})
```

- `accountGames` : une ligne par compte et par partie. Quand deux comptes cherchés se sont affrontés, leur partie est enregistrée deux fois : c'est rare, sans gravité, et bien plus simple qu'une liste de comptes par partie (chaque compte garde ses propres périodes et s'évince seul).

- `category`, `rated` et `color` sont calculés à l'écriture : filtrer 10 000 parties sur ces champs ne demande pas de les normaliser (lire le PGN d'une partie Chess.com coûte cher).
- `[account+playedAt]` sert aussi à tout supprimer pour un compte (éviction), et à lire les parties d'un compte de la plus récente à la plus ancienne, ou sur une période.

## Lichess : périodes couvertes, par cadence

L'API filtre par cadence (`perfType`), par couleur et par classée/amicale. Ne télécharger que les cadences demandées compte vraiment (un joueur qui veut ses 100 dernières parties de blitz alors qu'il joue surtout en bullet). La couverture se tient donc **par cadence**. La couleur et classée/amicale restent filtrées sur place : on télécharge les deux, pour ne pas multiplier les périodes (au pire deux fois plus de parties).

- Une **période** `{ from, to }` (sur `createdAt`, la date que filtre l'API) veut dire : toutes les parties standard de cette cadence commencées dans cet intervalle sont enregistrées. Plusieurs périodes par cadence, fusionnées dès qu'elles se touchent.
- **Ce qui manque** pour une recherche = la période demandée moins les périodes couvertes, cadence par cadence. Les cadences qui ont les mêmes manques partagent une requête (le cas courant : elles ont toujours été cherchées ensemble). Sinon, une requête par groupe, l'une après l'autre.
- **Parties terminées seulement** : l'API n'exporte pas une partie en cours. Une partie commencée avant `to` mais finie après serait manquée : chaque mise à jour repart de `to − chevauchement`, soit 3 h pour les cadences en direct et 60 jours pour la correspondance (la marge qu'utilise déjà `fetch.ts`). Les doublons sont écrasés par leur identifiant.
- **Ordre des requêtes** : vers le présent, `sort=dateAsc` à partir de `since`. Sur un arrêt, `to` avance jusqu'à la dernière partie reçue. Vers le passé, ordre normal à partir de `until` : `from` recule jusqu'à la dernière partie reçue. Une page incomplète (moins de parties que `max`) veut dire qu'on a atteint la première partie de ces cadences (`lichessStart`). **À vérifier** : le paramètre `sort` de l'export, à noter dans [apis.md](apis.md).
- **Une seule requête Lichess à la fois**, dans toute l'app : le magasin passe par une file unique, que l'onglet Parties et la revue rapide doivent aussi utiliser.

### « Les N dernières parties »

1. Mettre à jour le présent pour les cadences demandées (depuis le `to` de leur période la plus récente, ou toute première requête si rien n'est couvert).
2. Lire sur place, de la plus récente à la plus ancienne, les parties qui passent les filtres, dans la période continue qui part d'aujourd'hui.
3. S'il en manque, reculer par pages (`max(100, manquantes)`, comme aujourd'hui) jusqu'à en avoir assez ou atteindre la première partie.

### Une période

Mettre à jour le présent si la période atteint aujourd'hui, puis télécharger seulement les trous de la période demandée (avec la marge actuelle de `fetch.ts` : 1 jour, 60 jours avec la correspondance). Une période déjà couverte ne fait aucune requête, à part le présent.

## Chess.com : mois lus

Chess.com ne sert que des mois entiers, toutes cadences confondues : la couverture est naturellement par mois.

- La liste des mois (`/games/archives`) est redemandée à chaque recherche (une requête).
- **Un mois passé est définitif** une fois lu plus de 24 h après sa fin (le délai de cache de Chess.com, jusqu'à 12 h) : on ne le redemande jamais.
- Le mois en cours, et le précédent tant qu'il n'est pas définitif, sont redemandés à chaque recherche, comme aujourd'hui.
- Toujours en série, du plus récent au plus ancien, en s'arrêtant dès qu'on a assez de parties.

## Lecture

- Lire `accountGames` par `[account+playedAt]` de la plus récente à la plus ancienne, par lots, filtrer sur `category`, `rated` et `color`, puis normaliser seulement ce qui reste (`fromLichessGame` / `fromChessComGame`) et appliquer `matchesSelection` (dates exactes, résultats, Elo adverse).
- La normalisation dépend du pseudo (la couleur du joueur) : on la refait à chaque lecture, elle n'est pas stockée.
- Si les règles qui calculent `category`, `rated` ou `color` changent, une nouvelle `db.version(n).upgrade(...)` les recalcule à partir de `raw`.

## Ce qui reste comme aujourd'hui (et pourquoi)

- **Les évaluations Lichess ajoutées après coup** (analyse serveur demandée plus tard) ne sont pas rafraîchies. C'est sans gravité : notre propre moteur évalue ce qui manque, et le cache d'analyses le garde.
- **Le profil et les statistiques** (Aperçu) restent dans TanStack Query : ce sont des données courtes, toujours redemandées.
- **Une partie supprimée** ou un compte fermé sur la plateforme reste dans le magasin jusqu'à son éviction. On l'accepte.

## Place et éviction

- Environ **3 Ko par partie** (Lichess avec horloges et évaluations, Chess.com avec son PGN et ses horloges) : 10 000 parties ≈ 30 Mo.
- **Plafond** : `MAX_STORED_GAMES` (environ 150 000 parties, ≈ 450 Mo). Au-delà, ou sur une `QuotaExceededError`, on supprime **des comptes entiers**, les moins récemment cherchés (`accountSync.usedAt`), jamais celui en cours. Supprimer un compte entier garde les périodes justes : on ne peut pas retirer des parties au milieu d'une période couverte.
- Même règle que le cache d'analyses : une écriture refusée ne fait jamais échouer la recherche.

## Vie privée et effacement

- Les parties sont publiques, mais elles sont maintenant stockées : à déclarer sur `/legal` (« les parties des comptes que vous avez cherchés, telles que Lichess et Chess.com les publient, pour ne pas les retélécharger »).
- `clearLocalData()` supprime déjà toute la base.
- Réglages : la section « Analyses enregistrées » devient « Données enregistrées », avec une ligne pour les parties (nombre de comptes, nombre de parties, bouton pour les vider) et une pour les analyses.
- La règle de CLAUDE.md « Données distantes éphémères : TanStack Query, ne pas dupliquer » change : les parties des comptes passent dans Dexie, le reste des données distantes reste dans TanStack Query.

## Tests

- Périodes : fusion, manques d'une recherche, regroupement des cadences aux manques identiques.
- Lichess : mise à jour du présent avec chevauchement, recul par pages, première partie atteinte, arrêt en cours (la période avance jusqu'à la dernière partie reçue).
- Chess.com : mois définitifs jamais redemandés, mois en cours toujours redemandé.
- Recherche entièrement couverte : aucune requête en dehors du présent.
- Résultats identiques à aujourd'hui pour une même sélection (même jeu de parties, même ordre).
- Éviction par compte, et recherche qui continue sans magasin si IndexedDB échoue.

## Plus tard

- L'onglet **Parties** (`features/history`) lit le magasin au lieu de paginer l'API.
- Proposer un **import complet** d'un compte, en arrière-plan, pour les joueurs qui le veulent.
- Rafraîchir les évaluations Lichess des parties récentes sans analyse serveur.
