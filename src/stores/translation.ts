import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Sentence, ProperNoun, TranslationSettings, TranslationState } from '@/types'

export const useTranslationStore = defineStore('translation', () => {
  // 状态
  const sourceSentences = ref<Sentence[]>([])
  const targetSentences = ref<Sentence[]>([])
  const properNouns = ref<ProperNoun>({})
  const settings = ref<TranslationSettings>({
    apiKey: localStorage.getItem('deepseek_api_key') || '',
    model: 'deepseek-chat',
    batchSize: 10
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
  const hasSourceText = computed(() => sourceSentences.value.length > 0)
  const hasTranslation = computed(() => targetSentences.value.length > 0)
  const missingTranslationsCount = computed(() => 
    targetSentences.value.filter(s => s.isMissing).length
  )
  const isTranslationComplete = computed(() => 
    hasTranslation.value && missingTranslationsCount.value === 0
  )

  // 方法
  function setSourceSentences(sentences: Sentence[]) {
    sourceSentences.value = sentences
    targetSentences.value = []
    permanentHighlightIndex.value = -1
  }

  function setTargetSentences(sentences: Sentence[]) {
    targetSentences.value = sentences
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

  function updateProperNoun(original: string, translation: string) {
    properNouns.value[original] = translation
    saveProperNouns()
  }

  function removeProperNoun(original: string) {
    delete properNouns.value[original]
    saveProperNouns()
  }

  function clearProperNouns() {
    properNouns.value = {}
    localStorage.removeItem('properNounIndex')
  }

  function retryMissingTranslations() {
    const missingIndices = targetSentences.value
      .map((sentence, index) => sentence.isMissing ? index : -1)
      .filter(index => index !== -1)
    
    return missingIndices.map(index => sourceSentences.value[index]).filter(Boolean)
  }

  // 初始化
  loadProperNouns()

  return {
    // 状态
    sourceSentences,
    targetSentences,
    properNouns,
    settings,
    translationState,
    highlightedIndex,
    permanentHighlightIndex,
    
    // 计算属性
    hasSourceText,
    hasTranslation,
    missingTranslationsCount,
    isTranslationComplete,
    
    // 方法
    setSourceSentences,
    setTargetSentences,
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
    retryMissingTranslations
  }
})
