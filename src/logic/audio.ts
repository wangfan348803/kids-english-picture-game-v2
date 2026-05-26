export type SoundKind = 'tap' | 'correct' | 'wrong' | 'next' | 'bonus'

type Tone = [frequency: number, delay: number, duration: number, type: OscillatorType, gain: number]

const patterns: Record<SoundKind, Tone[]> = {
  tap: [[520, 0, 0.06, 'sine', 0.045]],
  correct: [
    [660, 0, 0.08, 'triangle', 0.08],
    [880, 0.08, 0.1, 'triangle', 0.075],
    [1175, 0.18, 0.12, 'sine', 0.07],
  ],
  wrong: [
    [220, 0, 0.1, 'sawtooth', 0.035],
    [170, 0.1, 0.12, 'sawtooth', 0.028],
  ],
  next: [
    [392, 0, 0.07, 'triangle', 0.045],
    [523, 0.08, 0.08, 'triangle', 0.045],
  ],
  bonus: [
    [784, 0, 0.08, 'sine', 0.07],
    [988, 0.08, 0.08, 'sine', 0.065],
    [1319, 0.16, 0.16, 'sine', 0.06],
  ],
}

export class GameAudio {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private htmlAudioSources = new Map<SoundKind, string>()
  private speechAttempt = 0
  private voicesReady: Promise<SpeechSynthesisVoice[]> | null = null
  private getVolume: () => number
  private isMuted: () => boolean

  constructor(getVolume: () => number, isMuted: () => boolean) {
    this.getVolume = getVolume
    this.isMuted = isMuted
  }

  start() {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    if (!this.context) {
      this.context = new AudioContextClass()
      this.gain = this.context.createGain()
      this.gain.connect(this.context.destination)
      this.setVolume(this.getVolume())
    }

    if (this.context.state === 'suspended') void this.context.resume()
  }

  setVolume(volume: number) {
    if (!this.context || !this.gain) return
    this.gain.gain.setTargetAtTime(Math.max(0, Math.min(100, volume)) / 100, this.context.currentTime, 0.015)
  }

  play(kind: SoundKind) {
    if (this.isMuted()) return
    if (this.shouldUseHtmlAudio()) {
      this.playHtmlAudio(kind)
      this.vibrate(kind)
      return
    }

    this.start()
    if (!this.context || this.context.state !== 'running') {
      this.playHtmlAudio(kind)
      this.vibrate(kind)
      return
    }

    const now = this.context.currentTime
    for (const [frequency, delay, duration, type, gain] of patterns[kind]) {
      const oscillator = this.context.createOscillator()
      const envelope = this.context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, now + delay)
      envelope.gain.setValueAtTime(0.0001, now + delay)
      envelope.gain.exponentialRampToValueAtTime(gain, now + delay + 0.012)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration)
      oscillator.connect(envelope).connect(this.gain ?? this.context.destination)
      oscillator.start(now + delay)
      oscillator.stop(now + delay + duration + 0.02)
    }
  }

  private shouldUseHtmlAudio() {
    if (typeof navigator === 'undefined') return false
    return /MicroMessenger|iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }

  private playHtmlAudio(kind: SoundKind) {
    if (typeof Audio === 'undefined') return

    const source = this.getHtmlAudioSource(kind)
    if (!source) return

    const player = new Audio(source)
    player.volume = Math.max(0, Math.min(100, this.getVolume())) / 100
    player.currentTime = 0
    void player.play().catch(() => undefined)
  }

  private getHtmlAudioSource(kind: SoundKind) {
    const cached = this.htmlAudioSources.get(kind)
    if (cached) return cached
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null

    const source = URL.createObjectURL(new Blob([createWavBytes(patterns[kind])], { type: 'audio/wav' }))
    this.htmlAudioSources.set(kind, source)
    return source
  }

  private vibrate(kind: SoundKind) {
    if (kind !== 'wrong' || typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate(60)
  }

  async speak(word: string, audioSrc?: string) {
    if (this.isMuted()) return
    this.start()
    this.play('tap')

    if (audioSrc && (await this.playSpeechFile(audioSrc))) return
    if (!window.speechSynthesis) return

    this.speakSequence([{ text: word, lang: 'en-US', voice: this.pickEnglishVoice.bind(this) }])
  }

  async speakAnswer(word: string, meaning: string, audioSrc?: string) {
    if (this.isMuted()) return
    this.start()

    if (audioSrc && (await this.playSpeechFile(audioSrc, true))) {
      if (!window.speechSynthesis) return
      this.speakSequence([{ text: meaning, lang: 'zh-CN', voice: this.pickChineseVoice.bind(this) }])
      return
    }

    if (!window.speechSynthesis) return

    this.speakSequence([
      { text: word, lang: 'en-US', voice: this.pickEnglishVoice.bind(this) },
      { text: meaning, lang: 'zh-CN', voice: this.pickChineseVoice.bind(this) },
    ])
  }

  private async playSpeechFile(source: string, waitForEnd = false) {
    if (typeof Audio === 'undefined') return false

    try {
      const player = new Audio(source)
      player.volume = Math.max(0, Math.min(100, this.getVolume())) / 100
      player.currentTime = 0

      if (!waitForEnd) {
        await player.play()
        return true
      }

      await new Promise<void>((resolve, reject) => {
        const finish = () => resolve()
        const fail = () => reject(new Error('speech file failed'))
        player.addEventListener('ended', finish, { once: true })
        player.addEventListener('error', fail, { once: true })
        void player.play().catch(reject)
        window.setTimeout(resolve, 3500)
      })
      return true
    } catch {
      return false
    }
  }

  private speakSequence(parts: Array<{ text: string; lang: string; voice: () => SpeechSynthesisVoice | undefined }>) {
    const attempt = ++this.speechAttempt
    this.waitForVoices()

    speechSynthesis.resume?.()
    speechSynthesis.cancel()

    const run = () => {
      if (attempt !== this.speechAttempt || this.isMuted()) return
      const speakPart = (index: number) => {
        const part = parts[index]
        if (!part || attempt !== this.speechAttempt || this.isMuted()) return

        const utterance = new SpeechSynthesisUtterance(part.text)
        const voice = part.voice()
        if (voice) utterance.voice = voice
        utterance.lang = voice?.lang || part.lang
        utterance.rate = part.lang.startsWith('zh') ? 0.9 : 0.78
        utterance.pitch = part.lang.startsWith('zh') ? 1.02 : 1.12
        utterance.volume = this.getVolume() / 100
        utterance.onend = () => speakPart(index + 1)
        speechSynthesis.speak(utterance)
      }

      speakPart(0)
    }

    if (this.isMobileBrowser()) {
      run()
      return
    }

    window.setTimeout(run, 70)
  }

  private pickEnglishVoice() {
    const voices = speechSynthesis.getVoices()
    return bestVoice(
      voices.filter((voice) => /^en/i.test(voice.lang)),
      (voice) => (/^en[-_](US|GB|AU|CA)/i.test(voice.lang) ? 8 : 0) + voiceQualityScore(voice),
    )
  }

  private pickChineseVoice() {
    const voices = speechSynthesis.getVoices()
    return bestVoice(
      voices.filter((voice) => /^zh/i.test(voice.lang)),
      (voice) => (/^zh[-_](CN|Hans)/i.test(voice.lang) ? 8 : 0) + voiceQualityScore(voice),
    )
  }

  private waitForVoices() {
    if (!window.speechSynthesis) return Promise.resolve([])
    const voices = speechSynthesis.getVoices()
    if (voices.length > 0) return Promise.resolve(voices)
    if (this.voicesReady) return this.voicesReady

    this.voicesReady = new Promise((resolve) => {
      const finish = () => {
        const loaded = speechSynthesis.getVoices()
        if (loaded.length > 0) {
          speechSynthesis.onvoiceschanged = null
          resolve(loaded)
        }
      }
      speechSynthesis.onvoiceschanged = finish
      window.setTimeout(() => resolve(speechSynthesis.getVoices()), 700)
    })

    return this.voicesReady
  }

  private isMobileBrowser() {
    if (typeof navigator === 'undefined') return false
    return /MicroMessenger|iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }
}

function createWavBytes(tones: Tone[]) {
  const sampleRate = 22050
  const totalSeconds = Math.max(...tones.map(([, delay, duration]) => delay + duration), 0.08) + 0.04
  const sampleCount = Math.ceil(sampleRate * totalSeconds)
  const dataSize = sampleCount * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    const sample = tones.reduce((sum, [frequency, delay, duration, type, gain]) => {
      const localTime = time - delay
      if (localTime < 0 || localTime > duration) return sum

      const phase = (localTime * frequency) % 1
      const wave = waveSample(phase, type)
      const fadeIn = Math.min(1, localTime / 0.012)
      const fadeOut = Math.min(1, (duration - localTime) / 0.035)
      return sum + wave * gain * fadeIn * fadeOut
    }, 0)

    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true)
  }

  return buffer
}

function waveSample(phase: number, type: OscillatorType) {
  if (type === 'triangle') return 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))
  if (type === 'sawtooth') return 2 * phase - 1
  return Math.sin(phase * Math.PI * 2)
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}

function bestVoice(voices: SpeechSynthesisVoice[], score: (voice: SpeechSynthesisVoice) => number) {
  return voices
    .map((voice, index) => ({ voice, index, score: score(voice) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.voice
}

function voiceQualityScore(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  let score = 0
  if (/natural|neural|premium|enhanced/.test(name)) score += 10
  if (/aria|jenny|guy|samantha|google|microsoft|tingting|xiaoxiao|xiaoyi/.test(name)) score += 5
  if (/compact|basic/.test(name)) score -= 4
  return score
}
