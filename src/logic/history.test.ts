import { describe, expect, it } from 'vitest'
import { appendRound, canGoPrevious, createRoundHistory, moveNext, movePrevious, replaceCurrentRound } from './history'

const cat = { word: 'cat' }
const milk = { word: 'milk' }
const eye = { word: 'eye' }

describe('round history', () => {
  it('moves back to the previous round and forward to the existing next round', () => {
    let history = createRoundHistory({ target: cat, choices: [cat], answerReveal: 'revealed' })
    history = appendRound(history, { target: milk, choices: [milk], answerReveal: 'hidden' })

    expect(canGoPrevious(history)).toBe(true)
    expect(movePrevious(history).current.target).toBe(cat)
    expect(moveNext(movePrevious(history)).current.target).toBe(milk)
  })

  it('drops abandoned future rounds when a new round is appended after going back', () => {
    let history = createRoundHistory({ target: cat, choices: [cat], answerReveal: 'revealed' })
    history = appendRound(history, { target: milk, choices: [milk], answerReveal: 'revealed' })
    history = movePrevious(history)
    history = appendRound(history, { target: eye, choices: [eye], answerReveal: 'hidden' })

    expect(history.current.target).toBe(eye)
    expect(movePrevious(history).current.target).toBe(cat)
    expect(moveNext(movePrevious(history)).current.target).toBe(eye)
  })

  it('replaces the current round reveal state without changing position', () => {
    const history = replaceCurrentRound(createRoundHistory({ target: cat, choices: [cat], answerReveal: 'hidden' }), {
      target: cat,
      choices: [cat],
      answerReveal: 'revealed',
    })

    expect(history.current.answerReveal).toBe('revealed')
    expect(history.index).toBe(0)
  })
})
