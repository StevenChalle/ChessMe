import { createContext, useContext } from 'react'
import { VALID_MAX_DROP } from '@/features/review/errors'

/**
 * The valid-move threshold of the current training (see isValidMove): the review's criteria,
 * provided by TrainingView, read where moves are judged or colored.
 */
export const ValidMaxDropContext = createContext(VALID_MAX_DROP)

export function useValidMaxDrop(): number {
  return useContext(ValidMaxDropContext)
}
