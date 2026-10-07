import type { Mistake } from '@/features/review/analyze'
import { winChanceDrop } from '@/features/review/errors'
import { shuffle } from './session'

/** How a training picks and orders the errors of an analysis (the training's options). */
export type TrainingOptions = {
  /** Positions of different games mixed together; each game keeps its own order unless shuffled */
  interleaveGames: boolean
  /** Positions of a game in any order, not the order they came in the game */
  shuffleWithinGame: boolean
  /** Only the first games, in the order they are played; undefined: all of them */
  maxGames?: number
  /** Errors losing less than this (% of winning chances) are left out */
  minDrop: number
}

/** The defaults: game after game (games in a random order), each in the order of its moves. */
export function defaultTrainingOptions(errorMinDrop: number): TrainingOptions {
  return { interleaveGames: false, shuffleWithinGame: false, minDrop: errorMinDrop }
}

/** How much winning chance an error gave away (% points). */
export function mistakeDrop(mistake: Mistake): number {
  return winChanceDrop(mistake.beforeCp, mistake.afterCp)
}

/** The errors kept by the severity filter, grouped by game, each game in the order of its moves. */
export function mistakesByGame(mistakes: Mistake[], minDrop: number): Mistake[][] {
  const games = new Map<string, Mistake[]>()
  for (const mistake of mistakes) {
    if (mistakeDrop(mistake) < minDrop) continue
    const game = games.get(mistake.game.url)
    if (game) game.push(mistake)
    else games.set(mistake.game.url, [mistake])
  }
  return [...games.values()].map((game) => game.toSorted((a, b) => a.ply - b.ply))
}

/**
 * Merges the games at random, each keeping its own order: at each step, a game drawn in proportion
 * to the positions it has left, so that every interleaving is equally likely.
 */
function interleave(games: Mistake[][], random: () => number): Mistake[] {
  const queues = games.map((game) => [...game])
  let left = queues.reduce((sum, queue) => sum + queue.length, 0)
  const merged: Mistake[] = []
  while (left > 0) {
    let pick = Math.floor(random() * left)
    const queue = queues.find((candidate) => {
      if (pick < candidate.length) return true
      pick -= candidate.length
      return false
    })!
    merged.push(queue.shift()!)
    left--
  }
  return merged
}

/** The positions of a training, in the order they are played. */
export function trainingPuzzles(
  mistakes: Mistake[],
  options: TrainingOptions,
  random: () => number = Math.random,
): Mistake[] {
  let games = shuffle(mistakesByGame(mistakes, options.minDrop), random)
  if (options.maxGames !== undefined) games = games.slice(0, options.maxGames)
  if (options.shuffleWithinGame) games = games.map((game) => shuffle(game, random))
  return options.interleaveGames ? interleave(games, random) : games.flat()
}
