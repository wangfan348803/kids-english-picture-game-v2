import { describe, expect, it } from 'vitest'
import { readInitialVolume } from './preferences'

describe('user preferences', () => {
  it('defaults sound volume to 100 percent', () => {
    expect(readInitialVolume(null)).toBe(100)
  })

  it('keeps a saved volume when the learner changed it', () => {
    expect(readInitialVolume('60')).toBe(60)
  })

  it('migrates the old 80 percent default to 100 percent', () => {
    expect(readInitialVolume('80')).toBe(100)
  })
})
