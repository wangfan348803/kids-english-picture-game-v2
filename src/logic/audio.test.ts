import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameAudio } from './audio'

type SpokenUtterance = SpeechSynthesisUtterance & {
  text: string
  lang: string
  onend: (() => void) | null
}

const spoken: SpokenUtterance[] = []
const cancel = vi.fn()

class FakeSpeechSynthesisUtterance {
  text: string
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

describe('GameAudio speech', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    spoken.length = 0
    cancel.mockClear()

    vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance)
    vi.stubGlobal('speechSynthesis', {
      cancel,
      getVoices: () => [
        { lang: 'en-US', name: 'English' },
        { lang: 'zh-CN', name: 'Chinese' },
      ],
      speak: (utterance: SpokenUtterance) => spoken.push(utterance),
    })
    vi.stubGlobal('window', {
      speechSynthesis,
      setTimeout,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reads the English word and then the Chinese meaning after a correct answer', async () => {
    const audio = new GameAudio(() => 80, () => false)

    const speaking = audio.speakAnswer('cat', '猫')
    await vi.runAllTimersAsync()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(spoken).toHaveLength(1)
    expect(spoken[0].text).toBe('cat')
    expect(spoken[0].lang).toBe('en-US')

    spoken[0].onend?.()
    await speaking

    expect(spoken).toHaveLength(2)
    expect(spoken[1].text).toBe('猫')
    expect(spoken[1].lang).toBe('zh-CN')
  })
})
