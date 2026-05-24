import { describe, expect, it } from 'vitest'
import { vocabulary } from '../data/vocabulary'
import { createLearningSession } from './session'

describe('learning session setup', () => {
  it('creates the first round through the round engine instead of hard-coding the first vocabulary item', () => {
    const session = createLearningSession(vocabulary, 'All', () => 0)

    expect(session.history.current.target.word).not.toBe(vocabulary[0].word)
    expect(session.history.current.choices.map((choice) => choice.word)).toContain(session.history.current.target.word)
  })
})
