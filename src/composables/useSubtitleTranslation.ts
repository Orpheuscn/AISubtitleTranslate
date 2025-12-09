import { useTranslationStore } from '@/stores/translation'
import { useProperNounParsing } from './useProperNounParsing'
import type { SubtitleEntry, ProperNoun } from '@/types'

export function useSubtitleTranslation() {
  const store = useTranslationStore()
  const { parseProperNouns } = useProperNounParsing()

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

  // 更新进度
  function updateProgress(current: number, total: number) {
    store.updateProgress(current, total)
    store.updateTranslationState({
      currentMessage: `已处理 ${current} / ${total} 条字幕 (${store.translationState.progress.percentage}%)`
    })
  }

  // 筛选当前批次相关的术语
  function filterRelevantTerms(batchTexts: string[], allTerms: ProperNoun): ProperNoun {
    const relevantTerms: ProperNoun = {}
    const batchContent = batchTexts.join(' ').toLowerCase()
    
    Object.entries(allTerms).forEach(([original, translation]) => {
      // 检查术语是否在当前批次中出现
      if (batchContent.includes(original.toLowerCase())) {
        relevantTerms[original] = translation
      }
    })
    
    return relevantTerms
  }

  // 批量翻译字幕
  async function translateSubtitleBatch(
    entries: SubtitleEntry[],
    apiKey: string,
    model: string,
    batchSize: number
  ): Promise<void> {
    // 累积的术语索引（跨批次）
    let accumulatedTerms: ProperNoun = { ...store.properNouns }
    
    console.log('=== 🚀 开始字幕翻译 ===')
    console.log(`📊 总字幕数: ${entries.length}，批次大小: ${batchSize}`)
    console.log(`📚 初始术语库数量: ${Object.keys(accumulatedTerms).length}`)
    console.log('📖 初始术语索引:', JSON.stringify(accumulatedTerms, null, 2))
    
    // 针对字幕翻译优化的系统提示词
    const getSystemPrompt = (terms: ProperNoun) => {
      const hasTerms = Object.keys(terms).length > 0
      return `你是一个专业的电影字幕翻译助手。请将给定的英文字幕翻译成简体中文。

翻译要求：
1. 保持原文的语气和情感表达
2. 使用口语化、自然流畅的中文
3. 考虑字幕的上下文关联性，保持剧情连贯
4. 适当意译，确保符合中文表达习惯
5. 保留原文中的专有名词（人名、地名等），并在翻译后的专有名词列表中标注

${hasTerms ? `**已知术语参考**（请在翻译时保持一致）：
${JSON.stringify(terms, null, 2)}

翻译时如果遇到已知术语，请使用提供的译文保持一致性。` : ''}

请严格按照原始字幕的序号返回翻译结果，每条翻译前面保留[数字]索引标记。
格式示例：
[1] 这是第一条字幕的翻译
[2] 这是第二条字幕的翻译

翻译完成后，请另起一行，使用'### Proper Nouns:'作为标记，然后列出你在原文中识别出的**新的**专有名词（人名、地名、组织名等）及其对应的中文翻译，每行一个，格式为 '原文术语: 中文翻译'。如果没有识别到新的专有名词，则省略此部分。

确保翻译的字幕数量与请求中的字幕数量完全一致。`
    }

    // 初始化翻译状态
    store.updateTranslationState({
      isTranslating: true,
      shouldStop: false,
      progress: { current: 0, total: entries.length, percentage: 0 },
      currentMessage: '开始翻译...'
    })

    const batches: SubtitleEntry[][] = []
    for (let i = 0; i < entries.length; i += batchSize) {
      batches.push(entries.slice(i, i + batchSize))
    }

    let processedCount = 0

    try {
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (store.translationState.shouldStop) break

        const batch = batches[batchIndex]
        
        console.log(`\n=== 📦 批次 ${batchIndex + 1}/${batches.length} ===`)
        console.log(`📝 处理字幕: ${batch[0].index} - ${batch[batch.length - 1].index}`)
        
        // 构建翻译请求文本（带序号）
        const prompt = batch.map(entry => `[${entry.index}] ${entry.text}`).join('\n\n')
        const batchTexts = batch.map(entry => entry.text)
        
        // 筛选当前批次相关的术语
        const relevantTerms = filterRelevantTerms(batchTexts, accumulatedTerms)
        
        console.log(`🔍 术语筛选结果:`)
        console.log(`   累积术语总数: ${Object.keys(accumulatedTerms).length}`)
        console.log(`   当前批次相关术语: ${Object.keys(relevantTerms).length}`)
        console.log(`   相关术语列表:`, JSON.stringify(relevantTerms, null, 2))
        
        // 获取包含术语的系统提示词
        const systemPrompt = getSystemPrompt(relevantTerms)

        try {
          console.log(`📤 发送请求到 DeepSeek API...`)
          const result = await callDeepSeekAPI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请将以下 ${batch.length} 条电影字幕翻译成中文，注意上下文关联，保留索引标记：\n\n${prompt}` }
          ], apiKey, model)
          
          console.log(`📥 收到 API 响应`)

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
          const translationLines = translationPart.split('\n').filter((line: string) => line.trim())
          
          batch.forEach(entry => {
            // 查找对应序号的翻译
            const line = translationLines.find((l: string) => {
              const match = l.match(/^\[(\d+)\]/)
              return match && parseInt(match[1]) === entry.index
            })
            
            if (line) {
              const translation = line.replace(/^\[\d+\]\s*/, '').trim()
              entry.translatedText = translation
              entry.isMissing = false
            } else {
              entry.translatedText = '[翻译缺失]'
              entry.isMissing = true
            }
          })

          // 更新和累积专有名词
          if (properNounPart) {
            const newTerms = parseProperNouns(properNounPart)
            const newTermsCount = Object.keys(newTerms).length
            
            console.log(`✨ 新识别的术语 (${newTermsCount}个):`, JSON.stringify(newTerms, null, 2))
            
            // 合并新术语到累积索引
            Object.entries(newTerms).forEach(([original, translation]) => {
              if (!accumulatedTerms[original]) {
                accumulatedTerms[original] = translation
                store.updateProperNoun(original, translation, false)
              }
            })
            
            console.log(`📚 累积术语索引已更新，总数: ${Object.keys(accumulatedTerms).length}`)
            console.log(`📖 完整术语索引:`, JSON.stringify(accumulatedTerms, null, 2))
          } else {
            console.log(`ℹ️  本批次未识别到新术语`)
          }

          // 延迟以避免API限流
          await new Promise(resolve => setTimeout(resolve, 500))

        } catch (error) {
          console.error(`❌ 批次 ${batchIndex + 1} 翻译失败:`, error)
          
          // 标记错误
          batch.forEach(entry => {
            if (!entry.translatedText || entry.isMissing) {
              entry.translatedText = '[翻译错误]'
              entry.isMissing = true
            }
          })

          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        processedCount += batch.length
        updateProgress(processedCount, entries.length)
      }
      
      console.log('\n=== ✅ 翻译完成 ===')
      console.log(`📊 最终统计:`)
      console.log(`   处理字幕数: ${processedCount}`)
      console.log(`   累积术语总数: ${Object.keys(accumulatedTerms).length}`)
      console.log(`   最终术语索引:`, JSON.stringify(accumulatedTerms, null, 2))
      
    } finally {
      store.updateTranslationState({
        isTranslating: false,
        currentMessage: '翻译完成'
      })
    }
  }

  // 重译单条字幕
  async function retranslateSingleSubtitle(
    entry: SubtitleEntry,
    apiKey: string,
    model: string,
    context?: { previous?: SubtitleEntry; next?: SubtitleEntry }
  ): Promise<void> {
    let systemPrompt = `你是一个专业的电影字幕翻译助手。请将给定的英文字幕翻译成简体中文。
保持口语化、自然流畅的表达。只返回翻译结果，不要包含任何解释、标记或索引。`

    let userPrompt = entry.text

    // 如果提供了上下文，包含在请求中以提高翻译质量
    if (context && (context.previous || context.next)) {
      userPrompt = '请翻译以下字幕，考虑上下文：\n\n'
      
      if (context.previous) {
        userPrompt += `[上一条] ${context.previous.text}\n`
        if (context.previous.translatedText) {
          userPrompt += `[译文] ${context.previous.translatedText}\n\n`
        }
      }
      
      userPrompt += `[当前] ${entry.text}\n\n`
      
      if (context.next) {
        userPrompt += `[下一条] ${context.next.text}\n`
      }
      
      userPrompt += '\n只返回[当前]字幕的翻译结果。'
    } else {
      userPrompt = `请将以下电影字幕翻译成中文：\n\n${entry.text}`
    }

    const result = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], apiKey, model)

    // 更新翻译结果
    entry.translatedText = result.trim()
    entry.isMissing = false
  }

  return {
    translateSubtitleBatch,
    retranslateSingleSubtitle,
    updateProgress
  }
}

