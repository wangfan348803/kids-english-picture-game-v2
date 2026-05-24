import type { CategoryId, VocabularyItem } from '../data/vocabulary'

export type RoundEngine = {
  next: () => VocabularyItem
  reset: (categoryId?: CategoryId) => void
}

const recentLimit = 3

export function wordsForCategory(vocabulary: VocabularyItem[], categoryId: CategoryId) {
  if (categoryId === 'All') return vocabulary
  return vocabulary.filter((item) => item.category === categoryId)
}

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

export function buildChoices(vocabulary: VocabularyItem[], target: VocabularyItem, count = 4) {
  const distractors = shuffle(vocabulary.filter((item) => item.word !== target.word)).slice(0, count - 1)
  return shuffle([target, ...distractors])
}

export function scoreCorrectAnswer(currentStreak: number) {
  return 10 + Math.min(20, (currentStreak + 1) * 2)
}

export function createRoundEngine(vocabulary: VocabularyItem[], initialCategory: CategoryId): RoundEngine {
  let categoryId = initialCategory
  const recentWords: string[] = []

  function next() {
    const pool = wordsForCategory(vocabulary, categoryId)
    const blocked = new Set(recentWords)
    let candidates = pool.filter((item) => !blocked.has(item.word))
    if (candidates.length === 0) candidates = pool.filter((item) => item.word !== recentWords.at(-1))
    if (candidates.length === 0) candidates = pool

    const selected = shuffle(candidates)[0] ?? vocabulary[0]
    recentWords.push(selected.word)

    while (recentWords.length > Math.min(recentLimit, Math.max(1, pool.length - 1))) {
      recentWords.shift()
    }

    return selected
  }

  function reset(nextCategoryId = categoryId) {
    categoryId = nextCategoryId
    recentWords.length = 0
  }

  return { next, reset }
}
