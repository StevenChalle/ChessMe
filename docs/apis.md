# APIs externes

## Lichess : https://lichess.org/api

- Données **publiques, sans authentification** : profil, stats, historique Elo, parties. Un joueur ne peut pas cacher ses parties.
- **Toute la carrière** est accessible.
- CORS autorisé : l'API est appelable directement depuis le navigateur.

| Endpoint                                  | Usage                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/user/{username}`                | profil et classements par cadence                                                                                                                                         |
| `GET /api/user/{username}/perf/{perf}`    | stats détaillées d'une cadence                                                                                                                                            |
| `GET /api/user/{username}/rating-history` | historique Elo complet                                                                                                                                                    |
| `GET /api/games/user/{username}`          | export des parties en flux (`Accept: application/x-ndjson`). Paramètres : `since`, `until`, `max`, `perfType`, `color`, `moves`, `evals`, `opening`, `clocks`, `accuracy` |
| `GET /api/cloud-eval?fen=...&multiPv=3`   | évaluations en cache uniquement (404 si la position est inconnue)                                                                                                         |
| `explorer.lichess.ovh`                    | opening explorer                                                                                                                                                          |
| `tablebase.lichess.ovh`                   | tablebases jusqu'à 7 pièces                                                                                                                                               |
| https://database.lichess.org              | exports mensuels de toutes les parties, sous licence CC0                                                                                                                  |

**Débit** : environ 20 parties/s sans token. **Une seule requête à la fois.** En cas de 429, attendre 60 s avant de réessayer.

**Synchro** : un import complet au départ, puis `since = createdAt de la dernière partie + 1`.

**Comptes fermés ou bannis** : `disabled: true` ou `tosViolation: true`, avec des données parfois absentes.

## Chess.com : Published-Data API (plus tard)

- Lecture seule, sans authentification, données publiques.
- `GET https://api.chess.com/pub/player/{username}` (profil), `/stats` (état **actuel** seulement, pas d'historique), `/games/archives` (liste des mois), `/games/{YYYY}/{MM}` (ou `/pgn`).
- Toute la carrière est accessible, mois par mois. La courbe d'Elo doit être reconstruite à partir des parties.
- Données en cache, donc avec quelques heures de retard. **Faire les requêtes en série** (le parallèle provoque des 429).
- Synchro : ne récupérer à nouveau que le mois en cours.

## Moteur

Stockfish WASM dans un Web Worker : gratuit, sans limite, sans serveur. La version mono-thread suffit pour commencer. La version multi-thread exige les en-têtes COOP/COEP (voir [decisions.md](decisions.md)).
