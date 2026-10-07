import type { Color } from 'chessops'
import { trackActiveTime } from '@/lib/activeTime'
import { defaultPoolSize, EnginePool } from '@/lib/engine/pool'
import type { Stockfish } from '@/lib/engine/stockfish'
import type { ApiSource } from '@/lib/http'
import { deepCheckMinDrop, type ReviewCriteria } from './criteria'
import { fromSideToMove, isError, playerMoves, toCp, winChanceDrop } from './errors'
import type { ReviewGame } from './games'
import { replay, type GamePosition } from './positions'
import { remainingSeconds, type AnalysisPass, type ReviewProgress } from './progress'

/**
 * Two passes: a quick search on every position, then a deeper one only around the player's
 * suspicious moves. Budgets are in nodes, not time, so results do not depend on the device.
 */
export const QUICK_NODES = 100_000
export const DEEP_NODES = 1_000_000

/** One error of the reviewed player (see errors.ts), with what is needed to replay it. */
export type Mistake = {
  /** Unique across games: `${source}-${gameId}-${ply}` */
  id: string
  /** Half-move number of the position before the error, in the game: its order among the others */
  ply: number
  game: Pick<ReviewGame, 'source' | 'url' | 'playedAt' | 'opponent'>
  color: Color
  /** Position before the error */
  fen: string
  /** The opponent's move that led to it (UCI), to highlight on the board */
  lastMove?: string
  played: { uci: string; san: string }
  /** From the player's side */
  beforeCp: number
  afterCp: number
}

export type ReviewedGame = ReviewGame & { mistakes: Mistake[] }

export type ReviewOutcome = {
  /** Newest first */
  games: ReviewedGame[]
  /** Platforms whose games could not be fetched: the others are still reviewed. */
  failures: { source: ApiSource; error: Error }[]
  /** The rules the games were judged with */
  criteria: ReviewCriteria
}

/** A game being analysed: its positions and their evaluations (White's side, centipawns). */
type Work = {
  game: ReviewGame
  positions: GamePosition[]
  cps: (number | undefined)[]
  /** Positions the engine evaluated (as opposed to final positions or Lichess evaluations) */
  byEngine: Set<number>
}

/** Positions of one game to evaluate in a pass. */
type Job = { work: Work; indexes: number[] }

function prepare(game: ReviewGame): Work {
  const positions = replay(game.sanMoves, game.initialFen)
  const cps = positions.map(
    // Lichess evaluations are those of the position after each move: shifted by one.
    (position, index) => position.finalCp ?? (index > 0 ? game.serverCps?.[index - 1] : undefined),
  )
  return { game, positions, cps, byEngine: new Set() }
}

/** Positions still without an evaluation. A game without moves needs none. */
function missing(work: Work): number[] {
  if (work.positions.length < 2) return []
  return work.cps.flatMap((cp, index) => (cp === undefined ? [index] : []))
}

/** Engine-evaluated positions around the player's moves that look like errors. */
function deepCheckPositions(work: Work, criteria: ReviewCriteria): number[] {
  const turns = work.positions.map((position) => position.turn)
  const indexes = new Set<number>()
  const minDrop = deepCheckMinDrop(criteria)
  for (const move of playerMoves(work.cps as number[], turns, work.game.color)) {
    if (winChanceDrop(move.beforeCp, move.afterCp) < minDrop) continue
    for (const index of [move.ply, move.ply + 1]) {
      if (work.byEngine.has(index)) indexes.add(index)
    }
  }
  return [...indexes].toSorted((a, b) => a - b)
}

function finish(works: Work[], criteria: ReviewCriteria): ReviewedGame[] {
  return works.map(({ game, positions, cps }) => {
    const turns = positions.map((position) => position.turn)
    const mistakes = playerMoves(cps as number[], turns, game.color)
      .filter((move) => isError(move.beforeCp, move.afterCp, criteria.errorMinDrop))
      .map(({ ply, beforeCp, afterCp }) => ({
        id: `${game.source}-${game.id}-${ply}`,
        ply,
        game: {
          source: game.source,
          url: game.url,
          playedAt: game.playedAt,
          opponent: game.opponent,
        },
        color: game.color,
        fen: positions[ply]!.fen,
        lastMove: positions[ply]!.move?.uci,
        played: positions[ply + 1]!.move!,
        beforeCp,
        afterCp,
      }))
    return { ...game, mistakes }
  })
}

async function evaluate(engine: Stockfish, position: GamePosition, nodes: number) {
  const { score } = await engine.evaluate(position.fen, nodes)
  return toCp(fromSideToMove(score, position.turn))
}

/**
 * Fills the missing evaluations of `games` with Stockfish and finds the player's errors in each
 * one, judged with `criteria` (see errors.ts). Aborting the signal terminates the engines.
 */
export async function analyzeGames(
  games: ReviewGame[],
  criteria: ReviewCriteria,
  {
    signal,
    onProgress,
    poolSize = defaultPoolSize(),
  }: {
    signal: AbortSignal
    onProgress: (progress: ReviewProgress) => void
    poolSize?: number
  },
): Promise<ReviewedGame[]> {
  const works = games.map(prepare)
  const quickJobs = works.filter((work) => missing(work).length > 0)
  if (quickJobs.length === 0) return finish(works, criteria)

  onProgress({ phase: 'starting-engine', games: games.length })
  const pool = await EnginePool.start(Math.min(poolSize, quickJobs.length), signal)
  // The speed is measured over the whole analysis, so the deep pass gets a time estimate right
  // away from the quick pass; only while the page is shown (a phone freezes a hidden page).
  const active = trackActiveTime()
  try {
    let doneNodes = 0
    const quick = quickJobs.map((work) => ({ work, indexes: missing(work) }))
    const quickTotal = quick.reduce((sum, job) => sum + job.indexes.length, 0)

    const runPass = async (pass: AnalysisPass, jobs: Job[], nodes: number) => {
      const total = jobs.reduce((sum, job) => sum + job.indexes.length, 0)
      let done = 0
      const report = () =>
        onProgress({
          phase: 'analysing',
          games: games.length,
          quickTotal,
          pass,
          done,
          total,
          remainingSeconds: remainingSeconds({
            doneNodes,
            elapsedMs: active.time.elapsedMs(),
            remainingNodes: (total - done) * nodes,
          }),
        })
      report()
      await pool.run(jobs, async (engine, { work, indexes }) => {
        if (pass === 'quick') await engine.newGame()
        for (const index of indexes) {
          work.cps[index] = await evaluate(engine, work.positions[index]!, nodes)
          work.byEngine.add(index)
          done++
          doneNodes += nodes
          active.time.markProgress()
          report()
        }
      })
    }

    await runPass('quick', quick, QUICK_NODES)
    const deepJobs = works
      .map((work) => ({ work, indexes: deepCheckPositions(work, criteria) }))
      .filter((job) => job.indexes.length > 0)
    if (deepJobs.length > 0) await runPass('deep', deepJobs, DEEP_NODES)
  } finally {
    active.stop()
    pool.terminate()
  }

  return finish(works, criteria)
}
