import type { AnswerRevealState } from './reveal'

export type RoundSnapshot<T> = {
  target: T
  choices: T[]
  answerReveal: AnswerRevealState
}

export type RoundHistory<T> = {
  entries: RoundSnapshot<T>[]
  index: number
  current: RoundSnapshot<T>
}

export function createRoundHistory<T>(initial: RoundSnapshot<T>): RoundHistory<T> {
  return {
    entries: [initial],
    index: 0,
    current: initial,
  }
}

export function replaceCurrentRound<T>(history: RoundHistory<T>, snapshot: RoundSnapshot<T>): RoundHistory<T> {
  const entries = [...history.entries]
  entries[history.index] = snapshot
  return {
    entries,
    index: history.index,
    current: snapshot,
  }
}

export function appendRound<T>(history: RoundHistory<T>, snapshot: RoundSnapshot<T>): RoundHistory<T> {
  const entries = [...history.entries.slice(0, history.index + 1), snapshot]
  return {
    entries,
    index: entries.length - 1,
    current: snapshot,
  }
}

export function canGoPrevious<T>(history: RoundHistory<T>) {
  return history.index > 0
}

export function canGoNext<T>(history: RoundHistory<T>) {
  return history.index < history.entries.length - 1
}

export function movePrevious<T>(history: RoundHistory<T>): RoundHistory<T> {
  const index = Math.max(0, history.index - 1)
  return {
    entries: history.entries,
    index,
    current: history.entries[index],
  }
}

export function moveNext<T>(history: RoundHistory<T>): RoundHistory<T> {
  const index = Math.min(history.entries.length - 1, history.index + 1)
  return {
    entries: history.entries,
    index,
    current: history.entries[index],
  }
}
