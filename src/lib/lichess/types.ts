/** Subset of Lichess API payloads we use. Extend as needed: https://lichess.org/api */

export type PerfKey =
  | 'ultraBullet'
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'classical'
  | 'correspondence'
  | 'chess960'
  | 'crazyhouse'
  | 'antichess'
  | 'atomic'
  | 'horde'
  | 'kingOfTheHill'
  | 'racingKings'
  | 'threeCheck'
  | 'puzzle'
  | 'storm'
  | 'racer'
  | 'streak'

export type Perf = {
  games?: number
  rating?: number
  rd?: number
  prog?: number
  prov?: boolean
  /** Puzzle storm / racer / streak use runs + score instead of rating */
  runs?: number
  score?: number
}

export type LichessUser = {
  id: string
  username: string
  title?: string
  patron?: boolean
  /** Closed account */
  disabled?: boolean
  /** Account marked for terms of service violation */
  tosViolation?: boolean
  createdAt?: number
  seenAt?: number
  perfs?: Partial<Record<PerfKey, Perf>>
  count?: {
    all: number
    rated: number
    win: number
    loss: number
    draw: number
  }
  profile?: {
    flag?: string
    location?: string
    bio?: string
    realName?: string
  }
  url?: string
}
