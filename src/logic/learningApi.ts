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

export type ProgressSummary = {
  seenWords: number
  correctCount: number
  wrongCount: number
  totalAnswers: number
  accuracy: number
}

export type DifficultWord = {
  word: string
  meaning: string
  category: CategoryId
  correctCount: number
  wrongCount: number
}

export type LearningProgress = {
  ok: boolean
  offline?: boolean
  summary: ProgressSummary
  difficultWords: DifficultWord[]
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
type FetchLike = typeof fetch

const emptyProgress: LearningProgress = {
  ok: false,
  offline: false,
  summary: {
    seenWords: 0,
    correctCount: 0,
    wrongCount: 0,
    totalAnswers: 0,
    accuracy: 0,
  },
  difficultWords: [],
}

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

export async function fetchLearningProgress(playerId: string, fetcher: FetchLike = fetch): Promise<LearningProgress> {
  try {
    const response = await fetcher(`/api/progress?playerId=${encodeURIComponent(playerId)}`)
    if (!response.ok) return { ...emptyProgress, ok: false, offline: false }

    const payload = await response.json()
    const summary = normalizeSummary(payload.summary)
    return {
      ok: Boolean(payload.ok),
      summary,
      difficultWords: Array.isArray(payload.difficultWords) ? payload.difficultWords.map(normalizeDifficultWord) : [],
    }
  } catch {
    return { ...emptyProgress, ok: false, offline: true }
  }
}

function normalizeSummary(summary: unknown): ProgressSummary {
  const record = isRecord(summary) ? summary : {}
  const correctCount = readNumber(record.correct_count)
  const wrongCount = readNumber(record.wrong_count)
  const totalAnswers = correctCount + wrongCount

  return {
    seenWords: readNumber(record.seen_words),
    correctCount,
    wrongCount,
    totalAnswers,
    accuracy: totalAnswers === 0 ? 0 : Math.round((correctCount / totalAnswers) * 100),
  }
}

function normalizeDifficultWord(word: unknown): DifficultWord {
  const record = isRecord(word) ? word : {}
  return {
    word: readString(record.word),
    meaning: readString(record.meaning),
    category: readString(record.category) as CategoryId,
    correctCount: readNumber(record.correct_count),
    wrongCount: readNumber(record.wrong_count),
  }
}

function readNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}
