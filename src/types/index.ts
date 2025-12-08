// 字幕条目接口
export interface SubtitleEntry {
  index: number          // 字幕序号
  startTime: string      // 开始时间 (如 "00:00:01,000")
  endTime: string        // 结束时间
  text: string           // 字幕文本
  translatedText?: string // 翻译后的文本
  isMissing?: boolean    // 标记翻译是否缺失
}

export interface ProperNoun {
  [original: string]: string
}

export interface TranslationSettings {
  apiKey: string
  model: 'deepseek-chat' | 'deepseek-coder'
  batchSize: 30 | 50 | 100
}

export interface TranslationProgress {
  current: number
  total: number
  percentage: number
}

export interface TranslationState {
  isTranslating: boolean
  shouldStop: boolean
  progress: TranslationProgress
  currentMessage: string
}
