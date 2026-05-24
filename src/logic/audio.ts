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
    this.start()
    if (!this.context) return

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

  async speak(word: string) {
    if (this.isMuted() || !window.speechSynthesis) return
    this.start()
    this.play('tap')

    await this.speakSequence([{ text: word, lang: 'en-US', voice: this.pickEnglishVoice.bind(this) }])
  }

  async speakAnswer(word: string, meaning: string) {
    if (this.isMuted() || !window.speechSynthesis) return
    this.start()

    await this.speakSequence([
      { text: word, lang: 'en-US', voice: this.pickEnglishVoice.bind(this) },
      { text: meaning, lang: 'zh-CN', voice: this.pickChineseVoice.bind(this) },
    ])
  }

  private async speakSequence(parts: Array<{ text: string; lang: string; voice: () => SpeechSynthesisVoice | undefined }>) {
    const attempt = ++this.speechAttempt
    await this.waitForVoices()
    if (attempt !== this.speechAttempt || this.isMuted()) return

    speechSynthesis.cancel()
    window.setTimeout(() => {
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
    }, 70)
  }

  private pickEnglishVoice() {
    const voices = speechSynthesis.getVoices()
    return voices.find((voice) => /^en[-_](US|GB|AU|CA)/i.test(voice.lang)) ?? voices.find((voice) => /^en/i.test(voice.lang))
  }

  private pickChineseVoice() {
    const voices = speechSynthesis.getVoices()
    return voices.find((voice) => /^zh[-_](CN|Hans)/i.test(voice.lang)) ?? voices.find((voice) => /^zh/i.test(voice.lang))
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
}
