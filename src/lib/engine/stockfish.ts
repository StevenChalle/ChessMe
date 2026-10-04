import { parseBestMove, parseInfo, type EngineScore } from './uci'

/**
 * Lite single-threaded Stockfish (WASM, ~1.8 MB): no SharedArrayBuffer, so no COOP/COEP headers.
 * vite.config.ts serves node_modules/stockfish/bin/ under /engine/; the script finds its .wasm
 * next to itself.
 */
export const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`

export type Evaluation = {
  score: EngineScore
  nodes: number
  /** UCI, castling as the king move (e1g1) */
  bestMove: string
  /** With MultiPV: the best lines, best first, each with its first move and score */
  lines: { move: string; score: EngineScore }[]
}

export class EngineTerminatedError extends Error {
  constructor() {
    super('Engine terminated')
    this.name = 'EngineTerminatedError'
  }
}

/**
 * One Stockfish instance in its own Web Worker, driven over UCI.
 * Searches run one at a time: callers await each evaluate() before the next.
 */
export class Stockfish {
  private readonly worker: Worker
  private onLine: ((line: string) => void) | undefined
  private onFailure: ((error: Error) => void) | undefined
  private terminated = false
  /** Current MultiPV option: only sent to the engine when it changes */
  private multiPv = 1

  private constructor(url: string) {
    this.worker = new Worker(url)
    this.worker.onmessage = (event: MessageEvent) => {
      // The engine may also post download progress objects: only UCI lines matter here.
      if (typeof event.data === 'string') this.onLine?.(event.data)
    }
    this.worker.onerror = (event) => {
      this.onFailure?.(new Error(event.message || 'Engine failed to load'))
    }
  }

  static async start(url = ENGINE_URL): Promise<Stockfish> {
    const engine = new Stockfish(url)
    try {
      await engine.request('uci', (line) => line === 'uciok')
      await engine.ready()
    } catch (error) {
      engine.terminate()
      throw error
    }
    return engine
  }

  /** Forget the previous game (clears the hash table). */
  async newGame(): Promise<void> {
    this.worker.postMessage('ucinewgame')
    await this.ready()
  }

  /**
   * Searches a position for a fixed number of nodes: same result on every device.
   * With `multiPv` > 1, also returns the best `multiPv` moves with their scores (the node budget
   * is shared between them). `searchMoves` restricts the search to these moves (UCI).
   */
  async evaluate(
    fen: string,
    nodes: number,
    multiPv = 1,
    searchMoves: string[] = [],
  ): Promise<Evaluation> {
    // Sending a position during a search crashes the WASM engine ("unreachable").
    if (this.onLine) throw new Error('Engine busy: one search at a time')
    if (multiPv !== this.multiPv) {
      this.worker.postMessage(`setoption name MultiPV value ${multiPv}`)
      this.multiPv = multiPv
    }
    // Lines by depth, then by rank: a search stopped mid-iteration mixes two depths, where the
    // same move can show up at two ranks. Only a complete iteration is consistent.
    type Line = { move: string; score: EngineScore; nodes: number }
    const byDepth = new Map<number, Map<number, Line>>()
    let bestMove: string | undefined
    this.worker.postMessage(`position fen ${fen}`)
    const restrict = searchMoves.length > 0 ? ` searchmoves ${searchMoves.join(' ')}` : ''
    await this.request(`go nodes ${nodes}${restrict}`, (line) => {
      const info = parseInfo(line)
      if (info?.score && info.pv && !info.bound) {
        const depth = info.depth ?? 0
        const lines = byDepth.get(depth) ?? new Map<number, Line>()
        lines.set(info.multipv ?? 1, { move: info.pv, score: info.score, nodes: info.nodes ?? 0 })
        byDepth.set(depth, lines)
      }
      bestMove = parseBestMove(line)
      return bestMove !== undefined
    })
    const lines = completeLines(byDepth)
    const best = lines[0]
    if (!best || !bestMove) throw new Error(`No evaluation for ${fen}`)
    return {
      score: best.score,
      nodes: best.nodes,
      // From the same iteration as the score (the final "bestmove" may come from a partial one).
      bestMove: best.move,
      lines: lines.map(({ move, score }) => ({ move, score })),
    }
  }

  /** Stops the worker at once, rejecting the pending request. */
  terminate(): void {
    if (this.terminated) return
    this.terminated = true
    this.worker.terminate()
    this.onFailure?.(new EngineTerminatedError())
  }

  private ready(): Promise<void> {
    return this.request('isready', (line) => line === 'readyok')
  }

  /** Sends a command and resolves once a line satisfies `isDone`. */
  private request(command: string, isDone: (line: string) => boolean): Promise<void> {
    if (this.terminated) return Promise.reject(new EngineTerminatedError())
    if (this.onLine) return Promise.reject(new Error('Engine busy: one request at a time'))
    return new Promise((resolve, reject) => {
      const settle = () => {
        this.onLine = undefined
        this.onFailure = undefined
      }
      this.onLine = (line) => {
        if (isDone(line)) {
          settle()
          resolve()
        }
      }
      this.onFailure = (error) => {
        settle()
        reject(error)
      }
      this.worker.postMessage(command)
    })
  }
}

/**
 * The lines of the deepest iteration that reported as many lines as any other (fewer legal moves
 * than MultiPV means fewer lines at every depth), best first.
 */
export function completeLines<Line>(byDepth: Map<number, Map<number, Line>>): Line[] {
  const width = Math.max(0, ...[...byDepth.values()].map((lines) => lines.size))
  const depths = [...byDepth.keys()].toSorted((a, b) => b - a)
  const depth = depths.find((d) => byDepth.get(d)!.size === width)
  if (depth === undefined) return []
  return [...byDepth.get(depth)!.entries()].toSorted(([a], [b]) => a - b).map(([, line]) => line)
}
