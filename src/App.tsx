import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { categories, type CategoryId, vocabulary, type VocabularyItem } from './data/vocabulary'
import { GameAudio } from './logic/audio'
import { type AnswerRevealState, getAnswerVisibility } from './logic/reveal'
import { buildChoices, createRoundEngine, scoreCorrectAnswer, wordsForCategory } from './logic/round'

type Feedback = {
  tone: 'idle' | 'good' | 'try'
  text: string
}

const firstCategory: CategoryId = 'All'

function App() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>(firstCategory)
  const [target, setTarget] = useState<VocabularyItem>(() => vocabulary[0])
  const [choices, setChoices] = useState<VocabularyItem[]>(() => buildChoices(vocabulary, vocabulary[0]))
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [round, setRound] = useState(1)
  const [best, setBest] = useState(() => Number(localStorage.getItem('kid-word-v2-best') || 0))
  const [muted, setMuted] = useState(() => localStorage.getItem('kid-word-v2-muted') === 'true')
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('kid-word-v2-volume') || 80))
  const [started, setStarted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [answerReveal, setAnswerReveal] = useState<AnswerRevealState>('hidden')
  const [feedback, setFeedback] = useState<Feedback>({ tone: 'idle', text: '点击开始学习，听单词，选图片。' })

  const categoryWords = useMemo(() => wordsForCategory(vocabulary, activeCategory), [activeCategory])
  const engineRef = useRef(createRoundEngine(vocabulary, firstCategory))
  const mutedRef = useRef(muted)
  const volumeRef = useRef(volume)
  const audioRef = useRef<GameAudio | null>(null)

  useEffect(() => {
    mutedRef.current = muted
    localStorage.setItem('kid-word-v2-muted', String(muted))
  }, [muted])

  useEffect(() => {
    volumeRef.current = volume
    localStorage.setItem('kid-word-v2-volume', String(volume))
    audioRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => {
    localStorage.setItem('kid-word-v2-best', String(best))
  }, [best])

  function audio() {
    audioRef.current ??= new GameAudio(() => volumeRef.current, () => mutedRef.current)
    return audioRef.current
  }

  function startAudio() {
    setStarted(true)
    audio().start()
  }

  function newRound(nextCategory = activeCategory, shouldSpeak = started) {
    engineRef.current.reset(nextCategory)
    const nextTarget = engineRef.current.next()
    setLocked(false)
    setAnswerReveal('hidden')
    setTarget(nextTarget)
    setChoices(buildChoices(vocabulary, nextTarget))
    setFeedback({ tone: 'idle', text: shouldSpeak ? '听读音，选择正确图片。' : '准备好了就点击喇叭。' })
    if (shouldSpeak) void audio().speak(nextTarget.word)
  }

  function handleStart() {
    startAudio()
    setFeedback({ tone: 'idle', text: '听读音，选择正确图片。' })
    void audio().speak(target.word)
  }

  function chooseCard(item: VocabularyItem) {
    if (locked) return
    startAudio()

    if (item.word === target.word) {
      const nextStreak = streak + 1
      const gained = scoreCorrectAnswer(streak)
      const nextScore = score + gained
      setLocked(true)
      setAnswerReveal('revealed')
      setStreak(nextStreak)
      setScore(nextScore)
      setBest(Math.max(best, nextScore))
      setFeedback({ tone: 'good', text: `Great! ${item.word} 是「${item.meaning}」。+${gained}，点击下一题继续。` })
      audio().play(nextStreak > 0 && nextStreak % 5 === 0 ? 'bonus' : 'correct')
      window.setTimeout(() => void audio().speakAnswer(item.word, item.meaning), 360)
    } else {
      void audio().speak(item.word)
      setStreak(0)
      setScore((value) => Math.max(0, value - 2))
      setAnswerReveal('hidden')
      setFeedback({ tone: 'try', text: '还不是这张图。再听一次，只看图片再选。' })
      audio().play('wrong')
      window.setTimeout(() => void audio().speak(target.word), 360)
    }
  }

  function changeCategory(categoryId: CategoryId) {
    startAudio()
    setActiveCategory(categoryId)
    setRound(1)
    engineRef.current.reset(categoryId)
    audio().play('next')
    window.setTimeout(() => newRound(categoryId, true), 0)
  }

  function replayTarget() {
    startAudio()
    void audio().speak(target.word)
  }

  function goToNextRound() {
    startAudio()
    setRound((value) => value + 1)
    const nextTarget = engineRef.current.next()
    setAnswerReveal('hidden')
    setTarget(nextTarget)
    setChoices(buildChoices(vocabulary, nextTarget))
    setLocked(false)
    setFeedback({ tone: 'idle', text: '听读音，选择正确图片。' })
    void audio().speak(nextTarget.word)
  }

  const progress = Math.min(100, Math.round((new Set([target.word, ...choices.map((item) => item.word)]).size / vocabulary.length) * 100))
  const answerVisibility = getAnswerVisibility(answerReveal)

  return (
    <main className="app-shell" aria-label="儿童看图学英语升级版">
      <section className="hero-panel">
        <div className="brand-row">
          <div className="bear-mark" aria-hidden="true">
            🐻
          </div>
          <div>
            <h1>看图学英语 V2</h1>
            <p>先听发音，再选图片。默认从全部词库开始。</p>
          </div>
        </div>
        <button className="start-button" type="button" onClick={handleStart}>
          {started ? '再听一遍' : '开始学习'}
        </button>
      </section>

      <section className="game-panel" aria-label="当前题目">
        <div className="game-topline">
          <div>
            <span className="section-label">{categories.find((category) => category.id === activeCategory)?.label}</span>
            <h2>{target.word}</h2>
            <p className={answerVisibility.targetMeaning ? 'target-meaning revealed' : 'target-meaning'} aria-live="polite">
              {answerVisibility.targetMeaning ? target.meaning : '答对后显示中文意思'}
            </p>
          </div>
          <button className="speaker-button" type="button" onClick={replayTarget} aria-label="播放当前单词">
            🔊
          </button>
        </div>

        <div className={`feedback ${feedback.tone}`}>{feedback.text}</div>

        {answerVisibility.nextButton ? (
          <button className="next-button" type="button" onClick={goToNextRound}>
            下一题
          </button>
        ) : null}

        <div className="choice-grid" aria-label="图片选项">
          {choices.map((item, index) => (
            <button
              className={answerVisibility.cardEnglish ? 'word-card revealed' : 'word-card'}
              type="button"
              key={item.word}
              onClick={() => chooseCard(item)}
              disabled={locked}
              aria-label={answerVisibility.cardEnglish ? `${item.word}, ${item.meaning}` : `${item.meaning}, 图片选项 ${index + 1}`}
            >
              <span className="picture" role="img" aria-label={item.meaning}>
                {item.picture}
              </span>
              {answerVisibility.cardEnglish ? <strong>{item.word}</strong> : null}
              <span className={answerVisibility.cardEnglish ? 'card-meaning revealed' : 'card-meaning'}>{item.meaning}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="side-panel" aria-label="学习控制">
        <div className="score-grid">
          <Metric label="得分" value={score} />
          <Metric label="连对" value={streak} />
          <Metric label="回合" value={round} />
          <Metric label="最佳" value={best} />
          <Metric label="词汇" value={vocabulary.length} />
          <Metric label="本类" value={categoryWords.length} />
        </div>

        <div className="category-grid" aria-label="词汇分类">
          {categories.map((category) => (
            <button
              className={category.id === activeCategory ? 'category active' : 'category'}
              type="button"
              key={category.id}
              onClick={() => changeCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="sound-panel">
          <button className="soft-button" type="button" onClick={() => newRound(activeCategory, started)}>
            换一组单词
          </button>
          <button className="soft-button alt" type="button" onClick={() => setMuted((value) => !value)}>
            {muted ? '🔇 声音关' : '🔊 声音开'}
          </button>
          <label className="volume-row">
            <span>音量</span>
            <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
            <strong>{volume}%</strong>
          </label>
        </div>

        <div className="progress-box">
          <span>本轮识别度</span>
          <div className="progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </aside>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
