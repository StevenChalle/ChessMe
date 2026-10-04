import type { Mistake } from '@/features/review/analyze'
import {
  forColor,
  fromSideToMove,
  isValidMove,
  toCp,
  VALID_MAX_DROP,
} from '@/features/review/errors'
import { Stockfish } from '@/lib/engine/stockfish'
import type { EngineScore } from '@/lib/engine/uci'
import { play, positionFromFen, sameMove } from './moves'

/** A move and the evaluation after it (centipawns, player's side), with the engine's reply. */
export type ScoredMove = { uci: string; cp: number; reply?: string }

/** Best play in a position, from the player's side, with the engine's top moves. */
export type Reference = { bestMove: string; bestCp: number; lines: ScoredMove[] }

/**
 * How many moves the reference search ranks. The valid moves are almost always among them;
 * the node budget is shared between the lines, hence a larger one than for a single search.
 */
export const REFERENCE_LINES = 5
export const REFERENCE_NODES = 1_500_000

/**
 * The valid moves among the engine's top lines (see isValidMove), best first. The game's move is
 * never valid. `capped`: every ranked line is valid, so there may be more beyond them.
 */
export function validMovesOf(
  reference: Reference,
  mistake: Pick<Mistake, 'fen' | 'played'>,
  validMaxDrop = VALID_MAX_DROP,
): { moves: ScoredMove[]; capped: boolean } {
  const moves = reference.lines.filter(
    (line) =>
      isValidMove(reference.bestCp, line.cp, validMaxDrop) &&
      !sameMove(mistake.fen, line.uci, mistake.played.uci),
  )
  return {
    moves,
    capped: reference.lines.length >= REFERENCE_LINES && moves.length === reference.lines.length,
  }
}

/**
 * A tried move: valid or not, its evaluation (centipawns, player's side), and the engine's
 * expected reply (UCI), which shows how a bad move gets punished.
 */
export type Verdict = { valid: boolean; afterCp: number; reply?: string }

/**
 * The single engine used while replaying errors. Searches run one at a time, in order:
 * the reference of a position is computed while the player thinks, then their move is checked.
 * The engine starts on first use. terminate() stops it and forgets everything; activate() allows
 * a fresh start (React may unmount and remount the same component).
 */
export class Coach {
  private engine: Promise<Stockfish> | undefined
  private queue: Promise<unknown> = Promise.resolve()
  private readonly references = new Map<string, Promise<Reference>>()
  private readonly moveEvaluations = new Map<string, Promise<ScoredMove>>()
  private terminated = false
  /** Bumped by terminate(): searches queued before it must not run on the next engine. */
  private generation = 0
  /** Valid-move threshold (see isValidMove): the review's criteria */
  private readonly validMaxDrop: number

  constructor(validMaxDrop = VALID_MAX_DROP) {
    this.validMaxDrop = validMaxDrop
  }

  /** Best move and evaluation of the position before the error. Cached per position. */
  reference(mistake: Mistake): Promise<Reference> {
    let reference = this.references.get(mistake.id)
    if (!reference) {
      reference = this.search(mistake.fen, mistake.color, REFERENCE_NODES, REFERENCE_LINES).then(
        ({ bestMove, cp, lines }) => ({ bestMove, bestCp: cp, lines }),
      )
      this.references.set(mistake.id, reference)
    }
    return reference
  }

  /**
   * Is this move valid (see isValidMove), and how good is it (player's side)?
   * The move played in the game never is valid.
   */
  async check(mistake: Mistake, uci: string): Promise<Verdict> {
    const { bestMove, bestCp, lines } = await this.reference(mistake)
    if (sameMove(mistake.fen, uci, bestMove)) {
      return { valid: true, afterCp: bestCp, reply: lines[0]?.reply }
    }
    // One of the engine's top moves: already evaluated, instant answer.
    const ranked = lines.find((line) => sameMove(mistake.fen, uci, line.uci))
    const { cp: afterCp, reply } = ranked ?? (await this.evaluateMove(mistake, uci))
    const valid =
      !sameMove(mistake.fen, uci, mistake.played.uci) &&
      isValidMove(bestCp, afterCp, this.validMaxDrop)
    return { valid, afterCp, reply }
  }

  /**
   * Evaluation after a move outside the engine's top lines, kept until the training ends: trying
   * it again costs nothing. Searched from the same position as the reference, restricted to this
   * move, with the budget of one reference line: both evaluations are comparable.
   */
  private evaluateMove(mistake: Mistake, uci: string): Promise<ScoredMove> {
    const after = play(mistake.fen, uci)
    const key = `${mistake.id}:${after.move!.uci}`
    let evaluation = this.moveEvaluations.get(key)
    if (!evaluation) {
      evaluation =
        after.finalCp !== undefined
          ? Promise.resolve({ uci: after.move!.uci, cp: forColor(after.finalCp, mistake.color) })
          : this.search(mistake.fen, mistake.color, REFERENCE_NODES / REFERENCE_LINES, 1, [
              after.move!.uci,
            ]).then(({ cp, lines }) => ({ uci: after.move!.uci, cp, reply: lines[0]?.reply }))
      this.moveEvaluations.set(key, evaluation)
      // A failed search is not worth remembering.
      evaluation.catch(() => this.moveEvaluations.delete(key))
    }
    return evaluation
  }

  activate(): void {
    this.terminated = false
  }

  terminate(): void {
    this.terminated = true
    this.generation++
    void this.engine?.then(
      (engine) => engine.terminate(),
      () => {},
    )
    this.engine = undefined
    this.references.clear()
    this.moveEvaluations.clear()
    this.queue = Promise.resolve()
  }

  /**
   * Evaluation (centipawns, `color`'s side) and best move of a position, plus its `multiPv` best
   * moves with the evaluation after each. `searchMoves` restricts the search to these moves.
   */
  private search(
    fen: string,
    color: Mistake['color'],
    nodes: number,
    multiPv = 1,
    searchMoves: string[] = [],
  ) {
    const generation = this.generation
    const task = this.queue.then(async () => {
      if (generation !== this.generation) throw new Error('Coach terminated')
      const engine = await this.start()
      if (generation !== this.generation) throw new Error('Coach terminated')
      const { score, bestMove, lines } = await engine.evaluate(fen, nodes, multiPv, searchMoves)
      const turn = positionFromFen(fen).turn
      const toPlayer = (engineScore: EngineScore) =>
        forColor(toCp(fromSideToMove(engineScore, turn)), color)
      return {
        bestMove,
        cp: toPlayer(score),
        lines: lines.map((line) => ({
          uci: line.move,
          cp: toPlayer(line.score),
          reply: line.reply,
        })),
      }
    })
    // A failed search must not block the next ones.
    this.queue = task.catch(() => {})
    return task
  }

  private start(): Promise<Stockfish> {
    if (this.terminated) return Promise.reject(new Error('Coach terminated'))
    if (!this.engine) {
      const engine: Promise<Stockfish> = Stockfish.start().then((started) => {
        // Terminated while starting: do not leave a worker behind.
        if (this.engine !== engine) started.terminate()
        return started
      })
      this.engine = engine
    }
    return this.engine
  }
}
