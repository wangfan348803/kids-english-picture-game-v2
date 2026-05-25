import type { CategoryId } from '../data/vocabulary'

const playerIdKey = 'kid-word-v2-player-id'

export type AnswerRecord = {
  playerId: string
  sessionId: string
  targetWord: string
  selectedWord: string
  targetMeaning: string
  selectedMeaning: string
  category: CategoryId
  isCorrect: boolean
  score: number
  streak: number
  points: number
  responseMs: number
}

export type SaveResult = {
  ok: boolean
  offline?: boolean
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
type FetchLike = typeof fetch

export function createClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `kid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreatePlayerId(storage: StorageLike = localStorage, createId = createClientId) {
  const existing = storage.getItem(playerIdKey)
  if (existing) return existing

  const playerId = createId()
  storage.setItem(playerIdKey, playerId)
  return playerId
}

export function createLearningSessionId(createId = createClientId) {
  return createId()
}

export async function saveAnswerRecord(record: AnswerRecord, fetcher: FetchLike = fetch): Promise<SaveResult> {
  try {
    const response = await fetcher('/api/answer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(record),
    })

    return { ok: response.ok, offline: false }
  } catch {
    return { ok: false, offline: true }
  }
}
