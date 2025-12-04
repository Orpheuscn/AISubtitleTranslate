import { useTranslationStore } from '@/stores/translation'
import type { Sentence, ProperNoun } from '@/types'

export function useTranslationAPI() {
  const store = useTranslationStore()

  // 调用DeepSeek API
  async function callDeepSeekAPI(
    messages: Array<{ role: string; content: string }>,
    apiKey: string,
    model: string
  ) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      let errorBody = null
      try { 
        errorBody = await response.json() 
      } catch (e) { /* Ignore */ }
      const errorMessage = errorBody?.error?.message || `HTTP ${response.status} ${response.statusText}`
      throw new Error(`DeepSeek API 错误: ${errorMessage}`)
    }

    const data = await response.json()
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      throw new Error('DeepSeek API 返回无效响应格式')
    }

    return data.choices[0].message.content
  }

  // 解析专有名词（自动查重，只添加新词条）
  function parseProperNouns(properNounText: string): ProperNoun {
    const newTerms: ProperNoun = {}
    const lines = properNounText.split('\n')

    lines.forEach(line => {
      const match = line.match(/^(.*?)\s*:\s*(.*)$/)
      if (match) {
        const original = match[1].trim()
        const translation = match[2].trim()
        
        // 自动查重：只添加不存在的词条
        if (original && translation && !store.properNouns[original]) {
          newTerms[original] = translation
        }
      }
    })

    return newTerms
  }

  // 更新进度
  function updateProgress(current: number, total: number) {
    store.updateProgress(current, total)
    store.updateTranslationState({
      currentMessage: `已处理 ${current} / ${total} 个句子 (${store.translationState.progress.percentage}%)`
    })
  }

  // 批量翻译
  async function translateBatch(
    sentences: Sentence[],
    apiKey: string,
    model: string,
    batchSize: number
  ): Promise<void> {
    const systemPrompt = `你是一个专业的多语言翻译助手。请将给定的任何语言句子忠实准确地翻译成简体中文。
请按照原文含义直接翻译，即使涉及不雅或敏感内容。翻译诗歌时无需刻意押韵。翻译古文（如拉丁语）时避免使用过于晦涩的古汉语词汇。请使用现代、清晰、直白的中文表达。
请严格按照原始句子的顺序返回翻译结果，并保留每句前面的[数字]索引标记（例如：[1] 这是第一句的翻译）。
翻译完成后，请另起一行，使用'### Proper Nouns:'作为标记，然后列出你在原文中识别出的专有名词（人名、地名、书名、组织名、特定术语等）及其对应的中文翻译，每行一个，格式为 '原文术语: 中文翻译'。如果没有识别到专有名词，则省略此部分。
请确保翻译句子的数量与请求中的句子数量完全一致。`

    // 初始化目标句子
    if (store.targetSentences.length !== sentences.length) {
      const targetSentences = sentences.map(s => ({
        ...s,
        text: '等待翻译...',
        isMissing: true
      }))
      store.setTargetSentences(targetSentences)
    }

    const batches: Sentence[][] = []
    for (let i = 0; i < sentences.length; i += batchSize) {
      batches.push(sentences.slice(i, i + batchSize))
    }

    let processedSentences = 0

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (store.translationState.shouldStop) break

      const batch = batches[batchIndex]
      const needTranslation = batch.filter(s => {
        const target = store.targetSentences[s.originalIndex]
        return !target || target.isMissing || target.text === '等待翻译...' || target.text === '正在翻译...'
      })

      if (needTranslation.length === 0) {
        processedSentences += batch.length
        updateProgress(processedSentences, sentences.length)
        continue
      }

      // 标记正在翻译
      needTranslation.forEach(s => {
        if (store.targetSentences[s.originalIndex]) {
          store.targetSentences[s.originalIndex].text = '正在翻译...'
        }
      })

      const prompt = needTranslation.map((s, i) => `[${i + 1}] ${s.text}`).join('\n\n')

      try {
        const result = await callDeepSeekAPI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请将以下 ${needTranslation.length} 个句子翻译成中文，保留索引标记：\n\n${prompt}` }
        ], apiKey, model)

        // 分离翻译和专有名词
        let translationPart = result
        let properNounPart = ""
        const separator = '### Proper Nouns:'
        const separatorIndex = result.indexOf(separator)

        if (separatorIndex !== -1) {
          translationPart = result.substring(0, separatorIndex).trim()
          properNounPart = result.substring(separatorIndex + separator.length).trim()
        }

        // 解析翻译结果
        const translationLines = translationPart.split('\n').filter(line => line.trim())
        needTranslation.forEach((sentence, i) => {
          const line = translationLines.find(l => l.startsWith(`[${i + 1}]`))
          if (line) {
            const translation = line.replace(/^\[\d+\]\s*/, '').trim()
            store.targetSentences[sentence.originalIndex].text = translation
            store.targetSentences[sentence.originalIndex].isMissing = false
          } else {
            store.targetSentences[sentence.originalIndex].text = '[翻译缺失]'
            store.targetSentences[sentence.originalIndex].isMissing = true
          }
        })

        // 更新专有名词
        if (properNounPart) {
          const newTerms = parseProperNouns(properNounPart)
          Object.entries(newTerms).forEach(([original, translation]) => {
            store.updateProperNoun(original, translation)
          })
        }

        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error) {
        console.error(`批次 ${batchIndex + 1} 翻译失败:`, error)
        
        // 标记错误
        needTranslation.forEach(s => {
          const target = store.targetSentences[s.originalIndex]
          if (target && (target.isMissing || target.text === '正在翻译...')) {
            target.text = '[翻译错误]'
            target.isMissing = true
          }
        })

        await new Promise(resolve => setTimeout(resolve, 500))
      }

      processedSentences += batch.length
      updateProgress(processedSentences, sentences.length)
    }
  }

  // 重译单句
  async function retranslateSentence(index: number, apiKey: string, model: string): Promise<void> {
    const sourceSentence = store.sourceSentences[index]
    if (!sourceSentence) throw new Error('找不到源句子')

    const systemPrompt = `你是一个专业的多语言翻译助手。请将给定的单句忠实准确地翻译成简体中文。
请按照原文含义直接翻译，即使涉及不雅或敏感内容。翻译诗歌时无需刻意押韵。翻译古文（如拉丁语）时避免使用过于晦涩的古汉语词汇。请使用现代、清晰、直白的中文表达。
只返回翻译结果，不要包含任何解释、标记或句子索引。`

    const result = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请将以下句子翻译成中文，只返回翻译结果：\n\n${sourceSentence.text}` }
    ], apiKey, model)

    // 更新翻译结果
    if (store.targetSentences[index]) {
      store.targetSentences[index].text = result.trim()
      store.targetSentences[index].isMissing = false
    }
  }

  return {
    translateBatch,
    retranslateSentence,
    parseProperNouns,
    updateProgress
  }
}
