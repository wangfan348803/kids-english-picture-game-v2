import { describe, expect, it } from 'vitest'
import { categories, vocabulary } from '../data/vocabulary'
import { buildChoices, createRoundEngine, scoreCorrectAnswer, shuffle } from './round'

describe('v2 learning data', () => {
  it('starts from All and keeps a large vocabulary with Jobs', () => {
    expect(categories[0].id).toBe('All')
    expect(categories.some((category) => category.id === 'Jobs')).toBe(true)
    expect(vocabulary.length).toBeGreaterThanOrEqual(207)
    expect(new Set(vocabulary.map((item) => item.word)).size).toBe(vocabulary.length)
  })
})

describe('round engine', () => {
  it('does not repeat any of the latest three target words when there are enough words', () => {
    const engine = createRoundEngine(vocabulary, 'All')
    const seen: string[] = []

    for (let index = 0; index < 120; index += 1) {
      const next = engine.next()
      expect(seen.slice(-3)).not.toContain(next.word)
      seen.push(next.word)
    }
  })

  it('uses a Fisher-Yates shuffle with injectable randomness', () => {
    const shuffled = shuffle(['cat', 'dog', 'bird', 'fish'], () => 0)

    expect(shuffled).toEqual(['dog', 'bird', 'fish', 'cat'])
  })

  it('builds four choices that include the target exactly once', () => {
    const target = vocabulary[0]
    const choices = buildChoices(vocabulary, target)

    expect(choices).toHaveLength(4)
    expect(choices.filter((choice) => choice.word === target.word)).toHaveLength(1)
  })

  it('keeps v1 scoring rhythm for a correct streak', () => {
    expect(scoreCorrectAnswer(0)).toBe(12)
    expect(scoreCorrectAnswer(1)).toBe(14)
    expect(scoreCorrectAnswer(10)).toBe(30)
  })
})
