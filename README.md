# CraftYourChess

**Learn from your own games.** CraftYourChess brings together your Lichess and Chess.com games, analyzes them with Stockfish and has you replay the mistakes that actually cost you points.

**→ https://craftyourchess.com**

Free, no account, no ads, no tracking. Everything runs in your browser, in English or French, and it installs as an app on desktop and mobile.

## What it does

- **One profile for both platforms.** Search a player on Lichess, Chess.com or both (with different usernames if needed): ratings per time control, a combined overview, and one tab per platform. Ratings are never added up or converted between platforms, since they are not on the same scale.
- **Game history.** Recent games from both sites in a single list, with the rating and its change.
- **Mistake analysis.** Pick games by platform, period, time control, color, result or length. Stockfish then analyzes them on your device, flags the mistakes and groups them by theme.
- **Training on your mistakes.** Replay the positions where you went wrong, in random order, and find the right move. A summary shows how it went.

## Where it is going

The goal is a **personal training plan**: diagnose what really loses you games, back every priority with evidence from your own games, train on it, then measure whether it improved and adjust the plan.

```
you play → import → analysis → diagnosis → plan → training → measure → adjusted plan
```

The product thinking (in French) is in [docs/vision.md](docs/vision.md) and the planned work in [docs/roadmap.md](docs/roadmap.md).

## Privacy

- **No backend, no account.** The site is a set of static files. Your searches and settings stay in your browser's storage, and one button on the legal page clears them.
- The app only calls the **public APIs of Lichess and Chess.com**. The contact form sends your message to Web3Forms, and only when you submit it.
- The full list of what is stored and which services are called is on the [legal page](https://craftyourchess.com/legal).

## Feedback

Ideas, bugs, impressions: use the [contact page](https://craftyourchess.com/contact) or open an issue here.

## Under the hood

| Area          | Choice                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| App           | Vite, React 19, TypeScript (strict)                                                                                             |
| Routing, data | TanStack Router (file-based routes), TanStack Query for the Lichess and Chess.com APIs                                          |
| UI            | Tailwind CSS v4, shadcn/ui (Radix), Lucide icons, Lichess-inspired dark theme                                                   |
| Chess         | [chessground](https://github.com/lichess-org/chessground) (board), [chessops](https://github.com/niklasf/chessops) (rules, PGN) |
| Engine        | [Stockfish 19](https://stockfishchess.org) lite, single-threaded WebAssembly, in a pool of Web Workers                          |
| i18n          | Paraglide JS (English and French)                                                                                               |
| App install   | PWA with vite-plugin-pwa (works offline once loaded)                                                                            |
| Storage       | `localStorage` today, Dexie (IndexedDB) for imported games                                                                      |
| Quality       | Vitest and Testing Library, oxlint, Prettier, GitHub Actions                                                                    |
| Hosting       | Render static site, deployed from `main` once CI is green                                                                       |

A few design rules:

- **Local-first.** Data lives on your device. Remote data is only cached for the session, never copied to a server.
- **Polite with the APIs.** Responses are cached, and nothing is retried after a rate limit.
- **The engine runs on your device.** The single-threaded build avoids the special server headers that multi-threading requires, at the cost of some speed.

The technical decisions and their reasons are logged (in French) in [docs/decisions.md](docs/decisions.md).

## Running it locally

Requires Node 24 or later and pnpm.

```bash
git clone https://github.com/StevenChalle/CraftYourChess.git
cd CraftYourChess
make dev     # dev server on http://localhost:5173 (installs dependencies if needed)
make check   # typecheck, lint, format and tests
make build   # production build in dist/
```

Without a Web3Forms key (see `.env.example`), the contact form only pretends to send in development.

Other docs (in French): [design](docs/design.md), [APIs and rate limits](docs/apis.md).

## License and credits

[GPL-3.0](LICENSE), as required by chessground, chessops and Stockfish.

Built on [chessground](https://github.com/lichess-org/chessground), [chessops](https://github.com/niklasf/chessops) and [Stockfish](https://stockfishchess.org). Piece sets come from Lichess's collection, with their authors and licenses listed in [public/piece/LICENSES.md](public/piece/LICENSES.md).

CraftYourChess is an independent project, not affiliated with Lichess or Chess.com.
