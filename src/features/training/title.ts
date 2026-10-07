import type { TrainingTab } from '@/features/review/sessionContext'
import { m } from '@/paraglide/messages'

/** "Training" while it is the only one ever opened, else "Training 1", "Training 2"… */
export function trainingTitle(tab: TrainingTab, trainings: TrainingTab[]): string {
  return trainings.length === 1 && tab.number === 1
    ? m.tab_training()
    : m.tab_training_numbered({ number: String(tab.number) })
}
