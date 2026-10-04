import { Stockfish } from './stockfish'

/** One engine per spare core (keeping one for the UI), at most 4: each loads its own network. */
export function defaultPoolSize(): number {
  const cores = typeof navigator === 'undefined' ? 1 : navigator.hardwareConcurrency || 1
  return Math.min(Math.max(cores - 1, 1), 4)
}

/**
 * Several single-threaded engines working in parallel on independent jobs.
 * Faster than one multi-threaded engine for batch analysis, without COOP/COEP.
 */
export class EnginePool {
  private readonly engines: Stockfish[]

  private constructor(engines: Stockfish[]) {
    this.engines = engines
  }

  static async start(size: number, signal?: AbortSignal): Promise<EnginePool> {
    signal?.throwIfAborted()
    const started = await Promise.allSettled(Array.from({ length: size }, () => Stockfish.start()))
    const engines = started.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    )
    const pool = new EnginePool(engines)
    const failure = started.find((result) => result.status === 'rejected')
    if (failure || signal?.aborted) {
      pool.terminate()
      signal?.throwIfAborted()
      throw (failure as PromiseRejectedResult).reason
    }
    signal?.addEventListener('abort', () => pool.terminate(), { once: true })
    return pool
  }

  get size(): number {
    return this.engines.length
  }

  /** Runs one task per job, each on the first free engine. Results keep the jobs' order. */
  async run<Job, Result>(
    jobs: Job[],
    task: (engine: Stockfish, job: Job) => Promise<Result>,
  ): Promise<Result[]> {
    const results: Result[] = []
    let next = 0
    await Promise.all(
      this.engines.map(async (engine) => {
        while (next < jobs.length) {
          const index = next++
          results[index] = await task(engine, jobs[index]!)
        }
      }),
    )
    return results
  }

  terminate(): void {
    for (const engine of this.engines) engine.terminate()
  }
}
