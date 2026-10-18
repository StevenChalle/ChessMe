import { m } from '@/paraglide/messages'
import type { Theme } from './themes'

/** A theme's name and what it covers (rule and limits), for the training options and results. */
export const THEME_LABELS: Record<Theme, { label: () => string; info: () => string }> = {
  opening: { label: m.theme_opening, info: m.theme_opening_info },
  advantage: { label: m.theme_advantage, info: m.theme_advantage_info },
  resilience: { label: m.theme_resilience, info: m.theme_resilience_info },
  endgame: { label: m.theme_endgame, info: m.theme_endgame_info },
  pawnEndgame: { label: m.theme_pawnEndgame, info: m.theme_pawnEndgame_info },
  rookEndgame: { label: m.theme_rookEndgame, info: m.theme_rookEndgame_info },
  minorEndgame: { label: m.theme_minorEndgame, info: m.theme_minorEndgame_info },
  queenEndgame: { label: m.theme_queenEndgame, info: m.theme_queenEndgame_info },
  findMate: { label: m.theme_findMate, info: m.theme_findMate_info },
  avoidMate: { label: m.theme_avoidMate, info: m.theme_avoidMate_info },
  timeTrouble: { label: m.theme_timeTrouble, info: m.theme_timeTrouble_info },
}
