import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TRAINING_SETTINGS,
  parseTrainingSettings,
  toTrainingOptions,
  type TrainingSettings,
} from './settings'

const saved = (data: object) => JSON.stringify({ version: 1, ...data })

describe('parseTrainingSettings', () => {
  it('falls back to the defaults without valid storage', () => {
    expect(parseTrainingSettings(null)).toEqual(DEFAULT_TRAINING_SETTINGS)
    expect(parseTrainingSettings('{')).toEqual(DEFAULT_TRAINING_SETTINGS)
    expect(parseTrainingSettings(JSON.stringify({ version: 9 }))).toEqual(DEFAULT_TRAINING_SETTINGS)
  })

  it('restores saved settings, replacing invalid fields one by one', () => {
    const settings: TrainingSettings = {
      exercises: ['evaluate', 'replay'],
      interleaveGames: true,
      shuffleWithinGame: true,
      onePerGame: true,
      firstOfGame: true,
      limitGames: true,
      gamesLimit: 3,
      limitPositions: true,
      positionsLimit: 12,
      minDrop: 15,
      themes: ['endgame', 'findMate'],
      openingMoves: 8,
    }
    expect(parseTrainingSettings(saved(settings))).toEqual(settings)
    expect(
      parseTrainingSettings(
        saved({
          exercises: [],
          interleaveGames: 'yes',
          gamesLimit: 0,
          positionsLimit: 2.5,
          minDrop: 99,
          themes: 'endgame',
          openingMoves: 40,
        }),
      ),
    ).toEqual(DEFAULT_TRAINING_SETTINGS)
  })
})

describe('toTrainingOptions', () => {
  it('applies the games limit only when checked', () => {
    expect(toTrainingOptions(DEFAULT_TRAINING_SETTINGS, 10).maxGames).toBeUndefined()
    expect(
      toTrainingOptions({ ...DEFAULT_TRAINING_SETTINGS, limitGames: true, gamesLimit: 4 }, 10)
        .maxGames,
    ).toBe(4)
  })

  it('applies the positions limit only when checked', () => {
    expect(toTrainingOptions(DEFAULT_TRAINING_SETTINGS, 10).maxPositions).toBeUndefined()
    expect(
      toTrainingOptions(
        { ...DEFAULT_TRAINING_SETTINGS, limitPositions: true, positionsLimit: 7 },
        10,
      ).maxPositions,
    ).toBe(7)
  })

  it('keeps one position per game, and then never shuffles within a game', () => {
    const one = { ...DEFAULT_TRAINING_SETTINGS, onePerGame: true, shuffleWithinGame: true }
    expect(toTrainingOptions(one, 10)).toMatchObject({
      onePerGame: 'random',
      shuffleWithinGame: false,
    })
    expect(toTrainingOptions({ ...one, firstOfGame: true }, 10).onePerGame).toBe('first')
    // "first" alone means nothing
    expect(
      toTrainingOptions({ ...DEFAULT_TRAINING_SETTINGS, firstOfGame: true }, 10).onePerGame,
    ).toBeUndefined()
  })

  it('never goes below the analysis threshold', () => {
    expect(toTrainingOptions(DEFAULT_TRAINING_SETTINGS, 10).minDrop).toBe(10)
    expect(toTrainingOptions({ ...DEFAULT_TRAINING_SETTINGS, minDrop: 6 }, 10).minDrop).toBe(10)
    expect(toTrainingOptions({ ...DEFAULT_TRAINING_SETTINGS, minDrop: 15 }, 10).minDrop).toBe(15)
  })
})
