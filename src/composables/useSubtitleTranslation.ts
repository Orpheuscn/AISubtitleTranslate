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
    batchSize: number,
    contextSize: number = 5  // 上下文字幕数量
  ): Promise<void> {
    // 累积的术语索引（跨批次）
    let accumulatedTerms: ProperNoun = { ...store.properNouns }

    console.log('=== 🚀 开始字幕翻译 ===')
    console.log(`📊 总字幕数: ${entries.length}，批次大小: ${batchSize}，上下文大小: ${contextSize}`)
    console.log(`📚 初始术语库数量: ${Object.keys(accumulatedTerms).length}`)
    console.log('📖 初始术语索引:', JSON.stringify(accumulatedTerms, null, 2))
    console.log('🎯 当前 store.settings.customPrompt:', store.settings.customPrompt)
    
    // 针对字幕翻译优化的系统提示词
    const getSystemPrompt = (terms: ProperNoun) => {
      const hasTerms = Object.keys(terms).length > 0
      const customPrompt = store.settings.customPrompt?.trim()

      console.log('🔍 检查自定义提示词:', {
        rawValue: store.settings.customPrompt,
        trimmedValue: customPrompt,
        hasCustomPrompt: !!customPrompt,
        customPromptLength: customPrompt?.length || 0,
        customPromptPreview: customPrompt?.substring(0, 100) || '无'
      })

      // 第一部分：翻译指令（可被自定义提示词替换）
      let translationInstruction = ''
      if (customPrompt) {
        console.log('✅ 使用自定义提示词')
        translationInstruction = customPrompt
      } else {
        console.log('ℹ️ 使用默认提示词')
        translationInstruction = '你是一个专业的电影字幕翻译助手。请将给定的字幕翻译成简体中文。'
      }

      // 第二部分：固定的翻译要求（始终保留，不可替换）
      const translationRequirements = `

翻译要求：
1. 保持原文的语气和情感表达
2. 使用口语化、自然流畅的语言
3. 考虑字幕的上下文关联性，保持剧情连贯
4. 有些句子在跨行处可能有断开，要根据上下文进行合适的衔接
5. 适当意译，确保符合目标语言的表达习惯
6. 保留原文中的专有名词（人名、地名、术语等），并在翻译后的专有名词列表中标注`

      // 第三部分：术语参考（始终保留）
      const termsSection = hasTerms ? `

**已知术语参考**（请在翻译时保持一致）：
${JSON.stringify(terms, null, 2)}

翻译时如果遇到已知术语，请使用提供的译文保持一致性。` : ''

      // 第四部分：返回格式要求（始终保留，语言无关）
      const formatSection = `

**返回格式要求（必须严格遵守）：**

⚠️ **核心规则：输入多少条，必须输出多少条！宁可翻译不流畅，也不能少一个序号！**

1. **一对一翻译原则（最重要，绝对优先级）：**
   - **每个序号必须对应一条翻译，绝对不允许合并或跳过**
   - **序号数量的准确性 > 语序的流畅性 > 翻译的优雅性**
   - 即使多条字幕在语义上是连贯的完整句子，也必须按照原始序号分别翻译
   - 即使调整语序会让翻译更流畅，也绝对不允许因此合并或跳过序号
   - 如果原文某条字幕只是句子的一部分，翻译时也要保持这种分割
   - 不允许将 [101] [102] [103] 合并成一条翻译

   **关键规则：宁可翻译不流畅，也不能少一个序号！**

   ✅ 正确示例（保持原始分割，同时体现句子延续）：
   原文（假设前面有上下文 [100] and prepared to live in Florence,）：
   [101] honored and comforted by the friendship of many.
   [102] Nothing gives me more serenity as I approach death
   [103] than the knowledge of never having offended anyone,

   翻译（注意 [101] 是前面句子的延续，使用"并"或"也"等连接）：
   [101] 并因众多友人的情谊而感到荣幸与慰藉。
   [102] 在我面对死亡之际，没有什么比
   [103] 从未冒犯过任何人这一事实更让我感到平静，

   ❌ 错误示例 1（合并翻译，跳过序号）：
   [101] 并因众多友人的情谊而感到荣幸与慰藉。在我面对死亡之际，没有什么比从未冒犯过任何人这一事实更让我感到平静，
   [104] ...（跳过了 102 和 103）

   ❌ 错误示例 2（忽略上下文，翻译成独立句子）：
   [101] 我深感荣幸与慰藉，因有众多友人相伴。  // 错误：应该用"并"延续前文，而不是"我"开头
   [102] 在我面对死亡之际，没有什么比
   [103] 从未冒犯过任何人这一事实更让我感到平静，

   ❌ 错误示例 3（为了语序流畅而合并序号）：
   原文：
   [763] The total value of his homes and villas,
   [764] in Florence, in Careggi, in Cafaggiolo,
   [765] in Trebbio, in Pisa and in Milan:

   错误翻译（只返回了 2 条，少了 1 条）：
   [763] 他在佛罗伦萨、卡雷吉、卡法焦洛、
   [764] 特雷比奥、比萨和米兰的住宅与别墅总价值：

   正确翻译（必须保持 3 条）：
   [763] 他的住宅与别墅的总价值，
   [764] 位于佛罗伦萨、卡雷吉、卡法焦洛、
   [765] 特雷比奥、比萨和米兰：

2. **格式规则：**
   - 每个序号 [数字] 必须在新的一行开头
   - 序号后紧跟一个空格，然后是翻译内容
   - 绝对不允许在同一行出现多个序号
   - **翻译内容应该在同一行内，不要换行**（原文已经将多行合并为单行）

   ✅ 正确格式：
   [51] 你诽谤一个逝者，只因他让你偿还了你兄弟的债务，
   [52] 但乔瓦尼总是尽力帮助每个人。

   ❌ 错误格式（翻译内容换行，可能导致解析错误）：
   [51] 你诽谤一个逝者，
   只因他让你偿还了你兄弟的债务，
   [52] 但乔瓦尼总是尽力帮助每个人。

   ❌ 错误格式（多个序号在同一行）：
   [51] 你诽谤一个逝者 [52] 但乔瓦尼总是尽力帮助每个人。

3. **上下文字幕处理（非常重要）：**
   如果字幕中包含标记为 [CONTEXT] 的条目，这些是**前后文语境**，用于帮助你理解句子的完整含义。

   **关键要求：**
   - [CONTEXT] 标记的字幕**不需要翻译**，也不要在返回结果中包含这些序号
   - 但**必须仔细阅读并理解这些上下文**，确保翻译的连贯性
   - 如果需要翻译的字幕是前面句子的延续，翻译时要体现出这种延续关系
   - 如果需要翻译的字幕是后面句子的铺垫，翻译时要为后续内容留下衔接

   **重要示例 1（句子延续 - 并列关系）：**
   上下文：
   [100] [CONTEXT] and prepared to live in Florence,

   需要翻译：
   [101] honored and comforted by the friendship of many.

   ✅ 正确翻译（体现延续）：
   [101] 并因众多友人的情谊而感到荣幸与慰藉。

   ❌ 错误翻译（忽略上下文）：
   [101] 我深感荣幸与慰藉，因有众多友人相伴。  // 错误：不应该用"我"开头，应该用"并"延续前文

   **重要示例 2（句子延续 - 从句关系）：**
   上下文：
   [96] [CONTEXT] I want to tell you that I believe I have lived out the time
   [97] [CONTEXT] assigned to me by God on the day of my birth.

   需要翻译：
   [98] And I wish to tell you that I die happy
   [99] because I leave you rich and healthy,

   ✅ 正确翻译：
   [98] 并且我想告诉你们，我死而无憾，
   [99] 因为我留给你们财富、健康，

   翻译 [98] 时，要理解这是 [96] 的延续（都是"我想告诉你们..."），使用"并且"等连接词。
   翻译 [99] 时，要理解这是 [98] 的原因从句（"因为..."），保持语义连贯。

4. **专有名词标记：**
   翻译完成后，另起一行，使用'### Proper Nouns JSON:'作为标记，然后在下一行以JSON格式列出新识别的专有名词。
   格式：{"original_term": "translated_term"}
   如果没有新的专有名词，则省略此部分。

5. **数量检查（最关键）：**
   确保返回的翻译数量与需要翻译的字幕数量完全一致（不包含 [CONTEXT] 标记的）。
   每个序号对应一条翻译，不能遗漏，不能合并，不能跳过。

   **允许在句子中间断开以适应字幕时间轴：**
   如果一句话需要分成多条字幕，可以在句子中间断开，例如：
   [1] 你今天...
   [2] ...吃了吗？

   **绝对不允许跳过任何序号，每个序号都必须有翻译内容，即使只是省略号、标点符号或单个词。**
   **宁可在句子中间断开，也不要跳过任何序号。**

   **重要提醒：保持分割的同时，也要保持语义连贯！**
   - 如果第一条需要翻译的字幕是前面 [CONTEXT] 的延续，使用连接词（并、也、而且等）
   - 不要因为保持分割就忽略了上下文的语义关系`

      // 组合完整提示词
      const fullPrompt = translationInstruction + translationRequirements + termsSection + formatSection

      // 打印完整提示词供调试
      console.log('📋 完整系统提示词：')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(fullPrompt)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return fullPrompt
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
        const startIndex = batchIndex * batchSize

        console.log(`\n=== 📦 批次 ${batchIndex + 1}/${batches.length} ===`)
        console.log(`📝 处理字幕: ${batch[0].index} - ${batch[batch.length - 1].index}`)

        // 获取前置上下文（前 contextSize 条）
        const preContext: SubtitleEntry[] = []
        if (batchIndex > 0 && contextSize > 0) {
          const preStart = Math.max(0, startIndex - contextSize)
          preContext.push(...entries.slice(preStart, startIndex))
        }

        // 获取后置上下文（后 contextSize 条）
        const postContext: SubtitleEntry[] = []
        if (batchIndex < batches.length - 1 && contextSize > 0) {
          const postStart = startIndex + batch.length
          const postEnd = Math.min(entries.length, postStart + contextSize)
          postContext.push(...entries.slice(postStart, postEnd))
        }

        // 构建完整的请求（包含上下文）
        const promptParts: string[] = []

        // 添加前置上下文（标记为 CONTEXT）
        if (preContext.length > 0) {
          promptParts.push('// ⚠️ 前置上下文（必须仔细阅读以理解句子完整含义，但不需要翻译这些序号）')
          preContext.forEach(entry => {
            // 将原文中的换行符替换为空格，确保每个序号在一行内
            const cleanText = entry.text.replace(/\n/g, ' ')
            promptParts.push(`[${entry.index}] [CONTEXT] ${cleanText}`)
          })
          promptParts.push('') // 空行分隔
        }

        // 添加需要翻译的主要内容
        promptParts.push('// 📝 以下是需要翻译的字幕（注意：如果是前面句子的延续，翻译时要体现延续关系）')
        batch.forEach(entry => {
          // 将原文中的换行符替换为空格，确保每个序号在一行内
          const cleanText = entry.text.replace(/\n/g, ' ')
          promptParts.push(`[${entry.index}] ${cleanText}`)
        })

        // 添加后置上下文（标记为 CONTEXT）
        if (postContext.length > 0) {
          promptParts.push('') // 空行分隔
          promptParts.push('// ⚠️ 后置上下文（必须仔细阅读以理解句子完整含义，但不需要翻译这些序号）')
          postContext.forEach(entry => {
            // 将原文中的换行符替换为空格，确保每个序号在一行内
            const cleanText = entry.text.replace(/\n/g, ' ')
            promptParts.push(`[${entry.index}] [CONTEXT] ${cleanText}`)
          })
        }

        const prompt = promptParts.join('\n')

        // 收集所有文本用于术语筛选（包括上下文）
        const allTexts = [
          ...preContext.map(e => e.text),
          ...batch.map(e => e.text),
          ...postContext.map(e => e.text)
        ]

        // 筛选当前批次相关的术语
        const relevantTerms = filterRelevantTerms(allTexts, accumulatedTerms)

        console.log(`🔍 批次信息:`)
        console.log(`   前置上下文: ${preContext.length} 条`)
        console.log(`   需要翻译: ${batch.length} 条`)
        console.log(`   后置上下文: ${postContext.length} 条`)
        console.log(`   累积术语总数: ${Object.keys(accumulatedTerms).length}`)
        console.log(`   当前批次相关术语: ${Object.keys(relevantTerms).length}`)
        console.log(`   相关术语列表:`, JSON.stringify(relevantTerms, null, 2))

        // 获取包含术语的系统提示词
        const systemPrompt = getSystemPrompt(relevantTerms)

        try {
          const userMessage = `请翻译以下电影字幕。

**⚠️ 关键要求（必读）：**
1. **上下文理解**：
   - 标记为 [CONTEXT] 的字幕是**前后文语境**，必须仔细阅读
   - 这些上下文帮助你理解句子的完整含义和延续关系
   - [CONTEXT] 字幕**不需要翻译**，但必须用来确保翻译的连贯性

2. **句子延续处理**：
   - **如果第一条需要翻译的字幕是前面 [CONTEXT] 句子的延续，翻译时必须体现延续关系**
   - 例如：如果 [CONTEXT] 是 "I want to tell you that..."，下一条是 "I die happy"
   - 应该翻译成 "...我死而无憾" 而不是 "我死而无憾"（独立句子）
   - 使用省略号、连词或其他方式体现延续关系

3. **格式要求**：
   - 只翻译没有 [CONTEXT] 标记的 ${batch.length} 条字幕
   - 每个序号 [数字] 必须在新的一行开头
   - **翻译内容应该在同一行内，不要换行**
   - 绝对不允许在同一行出现多个序号
   - **绝对不允许跳过任何序号，每个序号都必须有翻译**
   - **允许在句子中间断开，例如：[1] 你今天... [2] ...吃了吗？**

**字幕内容：**

${prompt}

**⚠️ 翻译前请先：**
1. 仔细阅读所有 [CONTEXT] 标记的上下文
2. 判断第一条需要翻译的字幕是否是前面句子的延续
3. 如果是延续，使用适当的方式（省略号、连词等）体现延续关系
4. 确保 ${batch.length} 个序号都有对应的翻译，一个都不能少`
          console.log(`\n📤 发送请求到 DeepSeek API...`)
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
          console.log(`� System 消息（完整）:`)
          console.log(systemPrompt)
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
          console.log(`�📨 User 消息（完整）:`)
          console.log(userMessage)
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
          const result = await callDeepSeekAPI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ], apiKey, model)
          
          console.log(`📥 收到 API 响应`)
          console.log(`📄 原始响应内容（前1000字符）:`, result.substring(0, 1000))

          // 分离翻译和专有名词
          let translationPart = result
          let properNounPart = ""
          const separator = '### Proper Nouns JSON:'
          const separatorIndex = result.indexOf(separator)

          if (separatorIndex !== -1) {
            translationPart = result.substring(0, separatorIndex).trim()
            properNounPart = result.substring(separatorIndex + separator.length).trim()
          }

          console.log(`📝 翻译部分（前500字符）:`, translationPart.substring(0, 500))

          // 解析翻译结果 - 改进版：支持多行翻译内容
          // 使用正则匹配所有 [数字] 标记及其后续内容
          const indexPattern = /\[(\d+)\]/g
          const translationMap = new Map<number, string>()

          let match
          const matches: Array<{ index: number; position: number }> = []

          // 找到所有序号标记的位置
          while ((match = indexPattern.exec(translationPart)) !== null) {
            matches.push({
              index: parseInt(match[1]),
              position: match.index
            })
          }

          console.log(`🔢 找到的序号标记:`, matches.map(m => m.index))

          // 提取每个序号对应的翻译内容（从当前序号到下一个序号之间的所有内容）
          for (let i = 0; i < matches.length; i++) {
            const current = matches[i]
            const next = matches[i + 1]

            // 提取内容：从当前 [数字] 标记后到下一个 [数字] 标记前（或到结尾）
            const startPos = current.position
            const endPos = next ? next.position : translationPart.length
            const fullText = translationPart.substring(startPos, endPos)

            // 移除开头的 [数字] 标记，保留后续所有内容（包括换行）
            const translation = fullText.replace(/^\[\d+\]\s*/, '').trim()

            if (translation) {
              // 检测串行问题：翻译内容中不应该包含其他序号标记
              const hasSerialIssue = /\[\d+\]/.test(translation)
              if (hasSerialIssue) {
                console.warn(`⚠️ 检测到串行问题！序号 ${current.index} 的翻译中包含其他序号标记:`, translation)
                console.warn(`   原始片段:`, fullText)
              }

              translationMap.set(current.index, translation)
            }
          }

          console.log(`✅ 解析完成，共提取 ${translationMap.size} 条翻译`)
          console.log(`   期望数量: ${batch.length}`)

          // 检查缺失的序号
          const expectedIndices = batch.map(e => e.index)
          const receivedIndices = Array.from(translationMap.keys())
          const missingIndices = expectedIndices.filter(idx => !translationMap.has(idx))

          if (translationMap.size !== batch.length) {
            console.warn(`⚠️ 翻译数量不匹配！期望 ${batch.length} 条，实际获得 ${translationMap.size} 条`)
            console.warn(`   期望的序号: [${expectedIndices.join(', ')}]`)
            console.warn(`   收到的序号: [${receivedIndices.join(', ')}]`)
            console.warn(`   缺失的序号: [${missingIndices.join(', ')}]`)

            // 显示缺失序号的原文
            if (missingIndices.length > 0) {
              console.warn(`\n   缺失序号的原文内容:`)
              missingIndices.forEach(idx => {
                const entry = batch.find(e => e.index === idx)
                if (entry) {
                  console.warn(`   [${idx}] "${entry.text}"`)
                }
              })
            }
          }

          // 将翻译结果填充到对应的字幕条目
          batch.forEach(entry => {
            const translation = translationMap.get(entry.index)
            if (translation) {
              entry.translatedText = translation
              entry.isMissing = false
            } else {
              console.warn(`⚠️ 序号 ${entry.index} 缺失翻译，原文: "${entry.text}"`)
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
    // 使用与批量翻译相同的提示词逻辑
    const customPrompt = store.settings.customPrompt?.trim()
    let translationInstruction = ''

    if (customPrompt) {
      translationInstruction = customPrompt
    } else {
      translationInstruction = '你是一个专业的电影字幕翻译助手。请将给定的字幕翻译成简体中文。'
    }

    const systemPrompt = `${translationInstruction}
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
      userPrompt = `请翻译以下电影字幕：\n\n${entry.text}`
    }

    const result = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], apiKey, model)

    // 更新翻译结果
    entry.translatedText = result.trim()
    entry.isMissing = false
  }

  // 批量重译缺失的字幕
  async function retranslateMissingSubtitles(
    apiKey: string,
    model: string,
    batchSize: number = 20,
    contextSize: number = 3  // 缺失字幕重译使用较小的上下文
  ): Promise<void> {
    const missingEntries = store.retryMissingTranslations()

    if (missingEntries.length === 0) {
      console.log('✅ 没有缺失的翻译')
      return
    }

    console.log(`🔄 开始重译 ${missingEntries.length} 条缺失的字幕`)

    // 使用批量翻译功能重译缺失的字幕
    await translateSubtitleBatch(missingEntries, apiKey, model, batchSize, contextSize)

    console.log('✅ 缺失字幕重译完成')
  }

  return {
    translateSubtitleBatch,
    retranslateSingleSubtitle,
    retranslateMissingSubtitles,
    updateProgress
  }
}

