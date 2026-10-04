import { parseBestMove, parseInfo, type EngineScore } from './uci'

/**
 * Lite single-threaded Stockfish (WASM, ~1.8 MB): no SharedArrayBuffer, so no COOP/COEP headers.
 * vite.config.ts serves node_modules/stockfish/bin/ under /engine/; the script finds its .wasm
 * next to itself.
 */
export const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`

export type Evaluation = { score: EngineScore; nodes: number }

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

  /** Searches a position for a fixed number of nodes: same result on every device. */
  async evaluate(fen: string, nodes: number): Promise<Evaluation> {
    let last: Evaluation | undefined
    this.worker.postMessage(`position fen ${fen}`)
    await this.request(`go nodes ${nodes}`, (line) => {
      const info = parseInfo(line)
      if (info?.score && !info.bound && (info.multipv ?? 1) === 1) {
        last = { score: info.score, nodes: info.nodes ?? 0 }
      }
      return parseBestMove(line) !== undefined
    })
    if (!last) throw new Error(`No evaluation for ${fen}`)
    return last
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
