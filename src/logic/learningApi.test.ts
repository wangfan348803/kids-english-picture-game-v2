import { describe, expect, it, vi } from 'vitest'
import { createLearningSessionId, fetchLearningProgress, getOrCreatePlayerId, saveAnswerRecord } from './learningApi'

function memoryStorage(seed: Record<string, string> = {}) {
  const values = { ...seed }
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value
    },
  }
}

describe('learning api helpers', () => {
  it('reuses an existing player id', () => {
    const storage = memoryStorage({ 'kid-word-v2-player-id': 'player-1' })
    expect(getOrCreatePlayerId(storage, () => 'player-2')).toBe('player-1')
  })

  it('creates and stores a player id when missing', () => {
    const storage = memoryStorage()
    expect(getOrCreatePlayerId(storage, () => 'player-2')).toBe('player-2')
    expect(storage.getItem('kid-word-v2-player-id')).toBe('player-2')
  })

  it('creates a learning session id', () => {
    expect(createLearningSessionId(() => 'session-1')).toBe('session-1')
  })

  it('posts answer records to the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true })
    const result = await saveAnswerRecord(
      {
        playerId: 'player-1',
        sessionId: 'session-1',
        targetWord: 'cat',
        selectedWord: 'cat',
        targetMeaning: '猫',
        selectedMeaning: '猫',
        category: 'Animals',
        isCorrect: true,
        score: 12,
        streak: 1,
        points: 12,
        responseMs: 500,
      },
      fetcher,
    )

    expect(result.ok).toBe(true)
    expect(fetcher).toHaveBeenCalledWith('/api/answer', expect.objectContaining({ method: 'POST' }))
  })

  it('loads and normalizes learning progress', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          summary: {
            seen_words: 8,
            correct_count: 18,
            wrong_count: 2,
          },
          difficultWords: [
            {
              word: 'banana',
              meaning: '香蕉',
              category: 'Food',
              correct_count: 1,
              wrong_count: 3,
            },
          ],
        }),
    })

    const progress = await fetchLearningProgress('player-1', fetcher)

    expect(progress.ok).toBe(true)
    expect(progress.summary.seenWords).toBe(8)
    expect(progress.summary.totalAnswers).toBe(20)
    expect(progress.summary.accuracy).toBe(90)
    expect(progress.difficultWords[0].word).toBe('banana')
    expect(fetcher).toHaveBeenCalledWith('/api/progress?playerId=player-1')
  })

  it('keeps progress loading non-blocking when the backend is unavailable', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'))

    const progress = await fetchLearningProgress('player-1', fetcher)

    expect(progress.ok).toBe(false)
    expect(progress.offline).toBe(true)
    expect(progress.summary.seenWords).toBe(0)
  })
})
