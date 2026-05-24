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

export function shuffle<T>(items: T[], random = Math.random) {
  return shuffleWithRandom(items, random)
}

export function shuffleWithRandom<T>(items: T[], random: () => number) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export function buildChoices(vocabulary: VocabularyItem[], target: VocabularyItem, count = 4, random = Math.random) {
  const distractors = shuffle(vocabulary.filter((item) => item.word !== target.word), random).slice(0, count - 1)
  return shuffle([target, ...distractors], random)
}

export function scoreCorrectAnswer(currentStreak: number) {
  return 10 + Math.min(20, (currentStreak + 1) * 2)
}

export function createRoundEngine(vocabulary: VocabularyItem[], initialCategory: CategoryId, random = Math.random): RoundEngine {
  let categoryId = initialCategory
  const recentWords: string[] = []

  function next() {
    const pool = wordsForCategory(vocabulary, categoryId)
    const blocked = new Set(recentWords)
    let candidates = pool.filter((item) => !blocked.has(item.word))
    if (candidates.length === 0) candidates = pool.filter((item) => item.word !== recentWords.at(-1))
    if (candidates.length === 0) candidates = pool

    const selected = shuffle(candidates, random)[0] ?? vocabulary[0]
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
