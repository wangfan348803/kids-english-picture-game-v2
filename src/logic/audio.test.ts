import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameAudio } from './audio'

type SpokenUtterance = SpeechSynthesisUtterance & {
  text: string
  lang: string
  onend: (() => void) | null
}

const spoken: SpokenUtterance[] = []
const cancel = vi.fn()
const audioPlay = vi.fn(() => Promise.resolve())
const audioPause = vi.fn()
const audioAddEventListener = vi.fn()
const vibrate = vi.fn()
const createdAudioSources: string[] = []

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
    createdAudioSources.length = 0
    cancel.mockClear()
    audioPlay.mockClear()
    audioPause.mockClear()
    audioAddEventListener.mockClear()
    vibrate.mockClear()

    vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance)
    vi.stubGlobal(
      'Audio',
      class FakeAudio {
        volume = 1
        currentTime = 0

        constructor(src: string) {
          createdAudioSources.push(src)
        }

        play = audioPlay
        pause = audioPause
        load = vi.fn()
        removeAttribute = vi.fn()
        addEventListener = audioAddEventListener
      },
    )
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 MicroMessenger iPhone',
      vibrate,
    })
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

    expect(spoken).toHaveLength(2)
    expect(spoken[1].text).toBe('猫')
    expect(spoken[1].lang).toBe('zh-CN')

    spoken[1].onend?.()
    await speaking
  })

  it('uses an HTMLAudio fallback for mobile WeChat sound effects', () => {
    const audio = new GameAudio(() => 80, () => false)

    audio.play('wrong')

    expect(createdAudioSources).toHaveLength(1)
    expect(audioPlay).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledWith(60)
  })

  it('speaks immediately on mobile even before voices are ready', () => {
    vi.stubGlobal('speechSynthesis', {
      cancel,
      getVoices: () => [],
      speak: (utterance: SpokenUtterance) => spoken.push(utterance),
    })
    vi.stubGlobal('window', {
      speechSynthesis,
      setTimeout,
    })

    const audio = new GameAudio(() => 80, () => false)

    void audio.speak('colorful')

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(spoken).toHaveLength(1)
    expect(spoken[0].text).toBe('colorful')
    expect(spoken[0].lang).toBe('en-US')
  })

  it('prefers natural-sounding English voices when available', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 Desktop',
      vibrate,
    })
    vi.stubGlobal('speechSynthesis', {
      cancel,
      getVoices: () => [
        { lang: 'en-US', name: 'Basic English' },
        { lang: 'en-US', name: 'Microsoft Aria Natural' },
      ],
      speak: (utterance: SpokenUtterance) => spoken.push(utterance),
    })
    vi.stubGlobal('window', {
      speechSynthesis,
      setTimeout,
    })
    const audio = new GameAudio(() => 80, () => false)

    void audio.speak('apple')
    await vi.runAllTimersAsync()

    expect(spoken[0].voice?.name).toBe('Microsoft Aria Natural')
  })

  it('plays a speech audio file before falling back to browser speech', async () => {
    const audio = new GameAudio(() => 80, () => false)

    await audio.speak('cat', '/audio/words/cat.mp3')

    expect(createdAudioSources.some((source) => source.startsWith('/audio/words/cat.mp3?v='))).toBe(true)
    expect(audioPlay).toHaveBeenCalledTimes(2)
    expect(spoken).toHaveLength(0)
  })

  it('stops the previous speech file before starting a new one', async () => {
    const audio = new GameAudio(() => 80, () => false)

    await audio.speak('cat', '/audio/words/cat.mp3')
    await audio.speak('dog', '/audio/words/dog.mp3')

    expect(audioPause).toHaveBeenCalled()
    expect(createdAudioSources.some((source) => source.startsWith('/audio/words/cat.mp3?v='))).toBe(true)
    expect(createdAudioSources.some((source) => source.startsWith('/audio/words/dog.mp3?v='))).toBe(true)
  })

  it('does not fall back to browser speech for an interrupted answer on desktop', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 Desktop',
      vibrate,
    })

    const audio = new GameAudio(() => 80, () => false)

    const interrupted = audio.speakAnswer('cat', '猫', '/audio/words/cat.mp3', '/audio/meanings/cat.mp3')
    await audio.speak('dog', '/audio/words/dog.mp3')
    await vi.runAllTimersAsync()
    await interrupted

    expect(audioPause).toHaveBeenCalled()
    expect(spoken).toHaveLength(0)
    expect(createdAudioSources.some((source) => source.startsWith('/audio/words/dog.mp3?v='))).toBe(true)
  })

  it('uses local English and Chinese audio files for revealed answers', async () => {
    const audio = new GameAudio(() => 80, () => false)

    const speaking = audio.speakAnswer('cat', '猫', '/audio/words/cat.mp3', '/audio/meanings/cat.mp3')
    await vi.runAllTimersAsync()
    await speaking

    expect(createdAudioSources.some((source) => source.startsWith('/audio/words/cat.mp3?v='))).toBe(true)
    expect(createdAudioSources.some((source) => source.startsWith('/audio/meanings/cat.mp3?v='))).toBe(true)
    expect(audioPlay).toHaveBeenCalledTimes(2)
    expect(spoken).toHaveLength(0)
  })
})
