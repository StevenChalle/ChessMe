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
      interleaveGames: true,
      shuffleWithinGame: true,
      limitGames: true,
      gamesLimit: 3,
      minDrop: 15,
    }
    expect(parseTrainingSettings(saved(settings))).toEqual(settings)
    expect(
      parseTrainingSettings(saved({ interleaveGames: 'yes', gamesLimit: 0, minDrop: 99 })),
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

  it('never goes below the analysis threshold', () => {
    expect(toTrainingOptions(DEFAULT_TRAINING_SETTINGS, 10).minDrop).toBe(10)
    expect(toTrainingOptions({ ...DEFAULT_TRAINING_SETTINGS, minDrop: 6 }, 10).minDrop).toBe(10)
    expect(toTrainingOptions({ ...DEFAULT_TRAINING_SETTINGS, minDrop: 15 }, 10).minDrop).toBe(15)
  })
})
