import { describe, expect, it } from 'vitest'
import { getAnswerVisibility } from './reveal'

describe('answer reveal rules', () => {
  it('shows card meanings but hides target meaning and English labels before the learner answers correctly', () => {
    expect(getAnswerVisibility('hidden')).toEqual({
      cardEnglish: false,
      cardMeaning: true,
      nextButton: false,
      targetMeaning: false,
    })
  })

  it('reveals all answers and the next button only after a correct answer', () => {
    expect(getAnswerVisibility('revealed')).toEqual({
      cardEnglish: true,
      cardMeaning: true,
      nextButton: true,
      targetMeaning: true,
    })
  })
})
