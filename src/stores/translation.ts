import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleEntry, ProperNoun, TranslationSettings, TranslationState } from '@/types'
import { storage, STORAGE_KEYS } from '@/utils/storage'

export const useTranslationStore = defineStore('translation', () => {
  // 状态
  const subtitleEntries = ref<SubtitleEntry[]>([])
  const originalFileName = ref<string>('')
  const properNouns = ref<ProperNoun>({})
  const settings = ref<TranslationSettings>({
    apiKey: storage.get(STORAGE_KEYS.API_KEY) || '',
    model: 'deepseek-chat',
    batchSize: 100,
    customPrompt: storage.get(STORAGE_KEYS.CUSTOM_PROMPT) || ''
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
    // 自动按起始时间排序并重新编号
    reindexSubtitles()
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
    if (newSettings.apiKey !== undefined) {
      if (newSettings.apiKey) {
        storage.set(STORAGE_KEYS.API_KEY, newSettings.apiKey)
      } else {
        storage.remove(STORAGE_KEYS.API_KEY)
      }
    }
    if (newSettings.customPrompt !== undefined) {
      if (newSettings.customPrompt) {
        storage.set(STORAGE_KEYS.CUSTOM_PROMPT, newSettings.customPrompt)
        console.log('💾 保存自定义提示词到 localStorage:', newSettings.customPrompt)
      } else {
        storage.remove(STORAGE_KEYS.CUSTOM_PROMPT)
        console.log('🗑️ 删除自定义提示词')
      }
    }
    console.log('⚙️ 当前 settings.customPrompt:', settings.value.customPrompt)
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
      const stored = storage.get(STORAGE_KEYS.PROPER_NOUNS)
      properNouns.value = stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to load proper nouns:', error)
      properNouns.value = {}
    }
  }

  function saveProperNouns() {
    try {
      storage.set(STORAGE_KEYS.PROPER_NOUNS, JSON.stringify(properNouns.value))
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
    storage.remove(STORAGE_KEYS.PROPER_NOUNS)
  }

  function retryMissingTranslations() {
    return subtitleEntries.value.filter(entry => entry.isMissing)
  }

  // 删除字幕条目并重新排序
  function deleteSubtitleEntry(index: number) {
    const entryIndex = subtitleEntries.value.findIndex(e => e.index === index)
    if (entryIndex !== -1) {
      subtitleEntries.value.splice(entryIndex, 1)
      // 重新排序并更新序号
      reindexSubtitles()
    }
  }

  // 重新排序字幕并更新序号
  function reindexSubtitles() {
    // 按起始时间排序
    subtitleEntries.value.sort((a, b) => {
      return a.startTime.localeCompare(b.startTime)
    })
    // 重新编号
    subtitleEntries.value.forEach((entry, idx) => {
      entry.index = idx + 1
    })
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
    replaceTermInAllTranslations,
    deleteSubtitleEntry,
    reindexSubtitles
  }
})
