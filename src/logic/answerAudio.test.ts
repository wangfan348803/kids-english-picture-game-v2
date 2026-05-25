import { describe, expect, it } from 'vitest'
import { getAnswerAudioPlan } from './answerAudio'

describe('answer audio plan', () => {
  it('plays only the wrong sound when the learner chooses a wrong picture', () => {
    expect(getAnswerAudioPlan(false, 'dog', '狗')).toEqual([{ type: 'sound', kind: 'wrong' }])
  })

  it('plays the success sound and reads English then Chinese for a correct picture', () => {
    expect(getAnswerAudioPlan(true, 'cat', '猫')).toEqual([
      { type: 'sound', kind: 'correct' },
      { type: 'answerSpeech', word: 'cat', meaning: '猫' },
    ])
  })
})
