import type { CategoryId, VocabularyItem } from '../data/vocabulary'
import { buildChoices, createRoundEngine, type RoundEngine } from './round'
import { createRoundHistory, type RoundHistory } from './history'

export type LearningSession = {
  engine: RoundEngine
  history: RoundHistory<VocabularyItem>
}

export function createLearningSession(vocabulary: VocabularyItem[], categoryId: CategoryId, random = Math.random): LearningSession {
  const engine = createRoundEngine(vocabulary, categoryId, random)
  const target = engine.next()
  return {
    engine,
    history: createRoundHistory({ target, choices: buildChoices(vocabulary, target, 4, random), answerReveal: 'hidden' }),
  }
}
