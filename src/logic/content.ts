import type { CategoryId, VocabularyItem } from '../data/vocabulary'
import { shuffle } from './round'

export type LearningMode = 'words' | 'sentences' | 'grammar'

export type ChoiceStyle = 'picture' | 'text'

export type LearningItem = {
  id: string
  sourceWord: string
  prompt: string
  answer: string
  meaning: string
  cardMeaning: string
  picture: string
  category: Exclude<CategoryId, 'All'>
  speechText: string
  speechMeaning: string
  audioSrc?: string
  choiceStyle: ChoiceStyle
}

export const learningModeMeta: Record<LearningMode, { label: string; hint: string }> = {
  words: { label: '单词', hint: '听单词，选图片。' },
  sentences: { label: '句子', hint: '听完整句子，找关键词图片。' },
  grammar: { label: '语法', hint: '看句子，补上正确词。' },
}

const grammarOptions = ['a', 'an', 'the', 'many']
const beVerbOptions = ['am', 'is', 'are', 'be']

export function createLearningItem(item: VocabularyItem, mode: LearningMode): LearningItem {
  if (mode === 'sentences') return createSentenceItem(item)
  if (mode === 'grammar') return createGrammarItem(item)
  return createWordItem(item)
}

export function buildLearningChoices(
  vocabulary: VocabularyItem[],
  target: LearningItem,
  mode: LearningMode,
  count = 4,
  random = Math.random,
) {
  if (mode === 'grammar') return buildGrammarChoices(target, random)

  const source = vocabulary.find((item) => item.word === target.sourceWord) ?? vocabulary[0]
  const distractors = shuffle(vocabulary.filter((item) => item.word !== source.word), random)
    .slice(0, count - 1)
    .map((item) => createLearningItem(item, mode))

  return shuffle([target, ...distractors], random)
}

export function getModeFeedback(mode: LearningMode, isStarted: boolean) {
  if (!isStarted) return '准备好了就点击喇叭。'
  return learningModeMeta[mode].hint
}

function createWordItem(item: VocabularyItem): LearningItem {
  return {
    id: `word:${item.word}`,
    sourceWord: item.word,
    prompt: item.word,
    answer: item.word,
    meaning: item.meaning,
    cardMeaning: item.meaning,
    picture: item.picture,
    category: item.category,
    speechText: item.word,
    speechMeaning: item.meaning,
    audioSrc: item.audioSrc,
    choiceStyle: 'picture',
  }
}

function createSentenceItem(item: VocabularyItem): LearningItem {
  const sentence = item.sentence ?? `I see ${articleFor(item.word)} ${item.word}.`
  const sentenceMeaning = item.sentenceMeaning ?? `我看见${item.meaning}。`

  return {
    id: `sentence:${item.word}`,
    sourceWord: item.word,
    prompt: sentence,
    answer: item.word,
    meaning: sentenceMeaning,
    cardMeaning: item.meaning,
    picture: item.picture,
    category: item.category,
    speechText: sentence,
    speechMeaning: sentenceMeaning,
    audioSrc: item.sentenceAudioSrc,
    choiceStyle: 'picture',
  }
}

function createGrammarItem(item: VocabularyItem): LearningItem {
  if (item.category === 'Feelings') return createBeVerbItem(item, 'I', 'am')
  if (item.category === 'Colors') return createBeVerbItem(item, 'It', 'is')

  const article = articleFor(item.word)
  const prompt = `I see ___ ${item.word}.`
  const sentence = `I see ${article} ${item.word}.`

  return {
    id: `grammar:article:${item.word}`,
    sourceWord: item.word,
    prompt,
    answer: article,
    meaning: `${article} ${item.word}`,
    cardMeaning: '选择正确冠词',
    picture: '🔤',
    category: item.category,
    speechText: sentence,
    speechMeaning: `我看见${item.meaning}。`,
    choiceStyle: 'text',
  }
}

function buildGrammarChoices(target: LearningItem, random: () => number) {
  const options = target.id.startsWith('grammar:be:') ? beVerbOptions : grammarOptions
  const choices = options.map((option) => ({
    ...target,
    id: `${target.id}:${option}`,
    answer: option,
    meaning: option === target.answer ? target.meaning : option,
    cardMeaning: option === target.answer ? '正确答案' : '干扰选项',
    speechText: option === target.answer ? target.speechText : option,
    speechMeaning: option === target.answer ? target.speechMeaning : option,
    choiceStyle: 'text' as const,
  }))

  return shuffle(choices, random)
}

function createBeVerbItem(item: VocabularyItem, subject: 'I' | 'It', answer: 'am' | 'is'): LearningItem {
  const prompt = `${subject} ___ ${item.word}.`
  const sentence = `${subject} ${answer} ${item.word}.`

  return {
    id: `grammar:be:${item.word}`,
    sourceWord: item.word,
    prompt,
    answer,
    meaning: sentence,
    cardMeaning: '选择正确 be 动词',
    picture: '🔤',
    category: item.category,
    speechText: sentence,
    speechMeaning: `${subject === 'I' ? '我' : '它'}${answer === 'am' ? '很' : '是'}${item.meaning}。`,
    choiceStyle: 'text',
  }
}

function articleFor(word: string) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}
