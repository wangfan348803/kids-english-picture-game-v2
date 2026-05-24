import { describe, expect, it } from 'vitest'
import { getAnswerVisibility } from './reveal'

describe('answer reveal rules', () => {
  it('hides target meaning and card labels before the learner answers correctly', () => {
    expect(getAnswerVisibility('hidden')).toEqual({
      cardLabels: false,
      targetMeaning: false,
    })
  })

  it('reveals target meaning and card labels only after a correct answer', () => {
    expect(getAnswerVisibility('revealed')).toEqual({
      cardLabels: true,
      targetMeaning: true,
    })
  })
})
