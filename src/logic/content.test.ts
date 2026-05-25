import { describe, expect, it } from 'vitest'
import type { VocabularyItem } from '../data/vocabulary'
import { buildLearningChoices, createLearningItem, learningModeMeta, type LearningMode } from './content'

const apple: VocabularyItem = {
  word: 'apple',
  meaning: '苹果',
  picture: '🍎',
  category: 'Food',
  sentence: 'I like apples.',
  sentenceMeaning: '我喜欢苹果。',
}

const cat: VocabularyItem = {
  word: 'cat',
  meaning: '猫',
  picture: '🐱',
  category: 'Animals',
  sentence: 'I see a cat.',
  sentenceMeaning: '我看见一只猫。',
}

const happy: VocabularyItem = {
  word: 'happy',
  meaning: '开心',
  picture: '😊',
  category: 'Feelings',
}

const red: VocabularyItem = {
  word: 'red',
  meaning: '红色',
  picture: '🔴',
  category: 'Colors',
}

describe('learning content modes', () => {
  it('keeps word mode focused on the vocabulary word', () => {
    const item = createLearningItem(apple, 'words')

    expect(item.id).toBe('word:apple')
    expect(item.prompt).toBe('apple')
    expect(item.answer).toBe('apple')
    expect(item.speechText).toBe('apple')
    expect(item.meaning).toBe('苹果')
  })

  it('uses complete sentences in sentence mode', () => {
    const item = createLearningItem(cat, 'sentences')

    expect(item.id).toBe('sentence:cat')
    expect(item.prompt).toBe('I see a cat.')
    expect(item.answer).toBe('cat')
    expect(item.speechText).toBe('I see a cat.')
    expect(item.meaning).toBe('我看见一只猫。')
    expect(item.cardMeaning).toBe('猫')
  })

  it('creates grammar fill-in-the-blank items', () => {
    const item = createLearningItem(cat, 'grammar')

    expect(item.id).toBe('grammar:article:cat')
    expect(item.prompt).toBe('I see ___ cat.')
    expect(item.answer).toBe('a')
    expect(item.speechText).toBe('I see a cat.')
    expect(item.choiceStyle).toBe('text')
  })

  it('creates be-verb grammar for feelings', () => {
    const item = createLearningItem(happy, 'grammar')

    expect(item.id).toBe('grammar:be:happy')
    expect(item.prompt).toBe('I ___ happy.')
    expect(item.answer).toBe('am')
  })

  it('creates be-verb grammar for colors', () => {
    const item = createLearningItem(red, 'grammar')

    expect(item.id).toBe('grammar:be:red')
    expect(item.prompt).toBe('It ___ red.')
    expect(item.answer).toBe('is')
  })

  it('builds text choices for grammar mode', () => {
    const item = createLearningItem(cat, 'grammar')
    const choices = buildLearningChoices([apple, cat], item, 'grammar', 4, () => 0.4)

    expect(choices.map((choice) => choice.answer)).toContain('a')
    expect(choices.every((choice) => choice.choiceStyle === 'text')).toBe(true)
  })

  it('names every learning mode for UI controls', () => {
    const modes: LearningMode[] = ['words', 'sentences', 'grammar']

    expect(modes.map((mode) => learningModeMeta[mode].label)).toEqual(['单词', '句子', '语法'])
  })
})
