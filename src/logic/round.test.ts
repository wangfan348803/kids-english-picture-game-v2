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

  it('keeps reviewed meanings, pictures, and speech-friendly words for confusing entries', () => {
    const entries = new Map(vocabulary.map((item) => [item.word, item]))

    expect(entries.get('desk')).toMatchObject({ meaning: '书桌', picture: '📚' })
    expect(entries.get('globe')).toMatchObject({ meaning: '地球仪', picture: '🌐' })
    expect(entries.get('hungry')).toMatchObject({ meaning: '饿了', picture: '🤤' })
    expect(entries.get('love')).toMatchObject({ meaning: '爱', picture: '🥰' })
    expect(entries.get('jump')).toMatchObject({ meaning: '跳跃', picture: '🤸' })
    expect(entries.get('eraser')).toMatchObject({ meaning: '橡皮', picture: '🧽✏️' })
    expect(entries.get('fire truck')).toMatchObject({ meaning: '消防车', picture: '🚒' })
    expect(entries.get('grass')).toMatchObject({ meaning: '草', picture: '🌱' })
    expect(entries.get('table')).toMatchObject({ meaning: '餐桌', picture: '🍽️' })
    expect(entries.get('fridge')).toMatchObject({ meaning: '冰箱', picture: '🧊🥛' })
    expect(entries.get('pillow')).toMatchObject({ meaning: '枕头', picture: '🛏️☁️' })
    expect(entries.get('belt')).toMatchObject({ meaning: '腰带', picture: '👖🟫' })
    expect(entries.get('proud')).toMatchObject({ meaning: '自豪', picture: '😎' })
    expect(entries.get('silly')).toMatchObject({ meaning: '滑稽', picture: '😜' })
    expect(entries.get('gold')).toMatchObject({ meaning: '金色', picture: '🏆' })
    expect(entries.get('silver')).toMatchObject({ meaning: '银色', picture: '🥈' })
    expect(entries.get('light')).toMatchObject({ meaning: '浅色', picture: '🤍' })
    expect(entries.get('colorful')).toMatchObject({ meaning: '五颜六色', picture: '🌈' })
    expect(entries.get('police officer')).toMatchObject({ meaning: '警察', picture: '👮' })
    expect(entries.has('firetruck')).toBe(false)
    expect(entries.has('police')).toBe(false)
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
