export type AnswerRevealState = 'hidden' | 'revealed'

export function getAnswerVisibility(state: AnswerRevealState) {
  const revealed = state === 'revealed'
  return {
    cardEnglish: revealed,
    cardMeaning: true,
    nextButton: revealed,
    targetMeaning: revealed,
  }
}
