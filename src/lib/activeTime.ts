/**
 * Time a job actually ran. A phone freezes a hidden page (screen off, another app) and its
 * workers with it: that pause must count neither in the job's duration nor in its speed. A
 * desktop browser usually keeps a hidden tab working, though: hidden time counts when the job
 * made progress meanwhile (`markProgress`). Two steps at least, so a single result already on
 * its way when the page froze does not turn a pause into work.
 */
const MIN_PROGRESS_WHILE_HIDDEN = 2

export class ActiveTime {
  private totalMs = 0
  /** Shown and counting since then */
  private since: number | undefined
  /** Hidden since then */
  private hiddenSince: number | undefined
  private progressWhileHidden = 0
  /** Frozen duration, once stopped */
  private stoppedMs: number | undefined
  private readonly now: () => number

  constructor(now: () => number = () => performance.now(), shown = true) {
    this.now = now
    if (shown) this.since = now()
    else this.hiddenSince = now()
  }

  /** The page is shown (counting) or hidden (counting only if the job goes on). */
  setShown(shown: boolean): void {
    const now = this.now()
    if (shown && this.since === undefined) {
      this.totalMs += this.hiddenWorkMs(now)
      this.hiddenSince = undefined
      this.since = now
    } else if (!shown && this.since !== undefined) {
      this.totalMs += now - this.since
      this.since = undefined
      this.hiddenSince = now
      this.progressWhileHidden = 0
    }
  }

  /** The job made a step (a position evaluated…). */
  markProgress(): void {
    if (this.hiddenSince !== undefined) this.progressWhileHidden++
  }

  /** Freezes the duration: later changes are ignored. */
  stop(): void {
    this.stoppedMs ??= this.elapsedMs()
  }

  elapsedMs(): number {
    if (this.stoppedMs !== undefined) return this.stoppedMs
    const now = this.now()
    return this.totalMs + (this.since === undefined ? this.hiddenWorkMs(now) : now - this.since)
  }

  private hiddenWorkMs(now: number): number {
    if (this.hiddenSince === undefined) return 0
    return this.progressWhileHidden >= MIN_PROGRESS_WHILE_HIDDEN ? now - this.hiddenSince : 0
  }
}

const pageShown = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

/** An ActiveTime following the page's visibility, until `stop()` (which freezes it). */
export function trackActiveTime(): { time: ActiveTime; stop: () => void } {
  const time = new ActiveTime(undefined, pageShown())
  const onChange = () => time.setShown(pageShown())
  document.addEventListener('visibilitychange', onChange)
  return {
    time,
    stop: () => {
      time.stop()
      document.removeEventListener('visibilitychange', onChange)
    },
  }
}
