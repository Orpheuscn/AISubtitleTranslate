import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleEntry, ProperNoun, TranslationSettings, TranslationState } from '@/types'

export const useTranslationStore = defineStore('translation', () => {
  // 状态
  const subtitleEntries = ref<SubtitleEntry[]>([])
  const originalFileName = ref<string>('')
  const properNouns = ref<ProperNoun>({})
  const settings = ref<TranslationSettings>({
    apiKey: localStorage.getItem('deepseek_api_key') || '',
    model: 'deepseek-chat',
    batchSize: 100
  })
  
  const translationState = ref<TranslationState>({
    isTranslating: false,
    shouldStop: false,
    progress: { current: 0, total: 0, percentage: 0 },
    currentMessage: ''
  })

  const highlightedIndex = ref(-1)
  const permanentHighlightIndex = ref(-1)

  // 计算属性
  const hasSubtitles = computed(() => subtitleEntries.value.length > 0)
  const hasTranslation = computed(() => 
    subtitleEntries.value.some(entry => entry.translatedText && !entry.isMissing)
  )
  const missingTranslationsCount = computed(() => 
    subtitleEntries.value.filter(s => s.isMissing).length
  )
  const isTranslationComplete = computed(() => 
    hasTranslation.value && missingTranslationsCount.value === 0
  )

  // 方法
  function setSubtitleEntries(entries: SubtitleEntry[], filename: string = '') {
    subtitleEntries.value = entries
    originalFileName.value = filename
    permanentHighlightIndex.value = -1
  }

  function updateSubtitleTranslation(index: number, translatedText: string) {
    const entry = subtitleEntries.value.find(e => e.index === index)
    if (entry) {
      entry.translatedText = translatedText
      entry.isMissing = false
    }
  }

  function updateSettings(newSettings: Partial<TranslationSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    if (newSettings.apiKey) {
      localStorage.setItem('deepseek_api_key', newSettings.apiKey)
    }
  }

  function updateTranslationState(updates: Partial<TranslationState>) {
    translationState.value = { ...translationState.value, ...updates }
  }

  function updateProgress(current: number, total: number) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    translationState.value.progress = { current, total, percentage }
  }

  function setHighlight(index: number, permanent = false) {
    if (permanent) {
      permanentHighlightIndex.value = permanentHighlightIndex.value === index ? -1 : index
    } else {
      highlightedIndex.value = index
    }
  }

  function clearHighlight() {
    highlightedIndex.value = -1
  }

  function loadProperNouns() {
    try {
      const stored = localStorage.getItem('properNounIndex')
      properNouns.value = stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to load proper nouns:', error)
      properNouns.value = {}
    }
  }

  function saveProperNouns() {
    try {
      localStorage.setItem('properNounIndex', JSON.stringify(properNouns.value))
    } catch (error) {
      console.error('Failed to save proper nouns:', error)
    }
  }

  function updateProperNoun(original: string, translation: string, replaceInTranslations: boolean = true) {
    const oldTranslation = properNouns.value[original]
    properNouns.value[original] = translation
    saveProperNouns()
    
    // 如果是修改现有术语，在所有译文中进行全局替换
    if (replaceInTranslations && oldTranslation && oldTranslation !== translation) {
      replaceTermInAllTranslations(oldTranslation, translation)
    }
  }

  function removeProperNoun(original: string) {
    delete properNouns.value[original]
    saveProperNouns()
  }

  // 在所有译文中全局替换术语
  function replaceTermInAllTranslations(oldTerm: string, newTerm: string) {
    let replacedCount = 0
    // 转义正则表达式特殊字符
    const escapedOldTerm = oldTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedOldTerm, 'g')
    
    subtitleEntries.value.forEach(entry => {
      if (entry.translatedText && entry.translatedText.includes(oldTerm)) {
        entry.translatedText = entry.translatedText.replace(regex, newTerm)
        replacedCount++
      }
    })
    return replacedCount
  }

  function clearProperNouns() {
    properNouns.value = {}
    localStorage.removeItem('properNounIndex')
  }

  function retryMissingTranslations() {
    return subtitleEntries.value.filter(entry => entry.isMissing)
  }

  // 初始化
  loadProperNouns()

  return {
    // 状态
    subtitleEntries,
    originalFileName,
    properNouns,
    settings,
    translationState,
    highlightedIndex,
    permanentHighlightIndex,
    
    // 计算属性
    hasSubtitles,
    hasTranslation,
    missingTranslationsCount,
    isTranslationComplete,
    
    // 方法
    setSubtitleEntries,
    updateSubtitleTranslation,
    updateSettings,
    updateTranslationState,
    updateProgress,
    setHighlight,
    clearHighlight,
    loadProperNouns,
    saveProperNouns,
    updateProperNoun,
    removeProperNoun,
    clearProperNouns,
    retryMissingTranslations,
    replaceTermInAllTranslations
  }
})
