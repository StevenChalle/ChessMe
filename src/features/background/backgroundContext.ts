import { createContext, useContext } from 'react'
import type { BackgroundState } from './runner'

export type Background = {
  state: BackgroundState
  pause: () => void
  resume: () => void
}

export const BackgroundContext = createContext<Background | undefined>(undefined)

/** The background analysis, when main accounts are chosen (BackgroundProvider). */
export function useBackground(): Background | undefined {
  return useContext(BackgroundContext)
}
