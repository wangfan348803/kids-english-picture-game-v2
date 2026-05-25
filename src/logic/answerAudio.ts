import type { SoundKind } from './audio'

export type AnswerAudioAction =
  | { type: 'sound'; kind: SoundKind }
  | { type: 'answerSpeech'; word: string; meaning: string }

export function getAnswerAudioPlan(isCorrect: boolean, word: string, meaning: string, correctSound: SoundKind = 'correct'): AnswerAudioAction[] {
  if (!isCorrect) return [{ type: 'sound', kind: 'wrong' }]

  return [
    { type: 'sound', kind: correctSound },
    { type: 'answerSpeech', word, meaning },
  ]
}
