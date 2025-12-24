/**
 * Token 计数工具
 * 用于估算 DeepSeek API 请求的 token 数量
 * 
 * DeepSeek 使用类似 GPT-3.5/4 的 tokenizer
 * 中文字符通常 1 个字 ≈ 1.5-2 tokens
 * 英文单词通常 1 个词 ≈ 1-1.5 tokens
 */

// 简单的 token 估算函数（基于字符数）
function estimateTokens(text) {
  // 统计中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 统计英文单词（简化版：按空格分割）
  const englishWords = text.split(/\s+/).filter(word => /[a-zA-Z]/.test(word)).length
  // 统计其他字符（标点、数字等）
  const otherChars = text.length - chineseChars
  
  // 估算公式：
  // - 中文字符：1 字 ≈ 1.8 tokens
  // - 英文单词：1 词 ≈ 1.3 tokens
  // - 其他字符：按 0.3 tokens 计算
  const estimatedTokens = Math.ceil(
    chineseChars * 1.8 + 
    englishWords * 1.3 + 
    (otherChars - englishWords * 5) * 0.3 // 假设平均单词长度 5
  )
  
  return {
    chineseChars,
    englishWords,
    totalChars: text.length,
    estimatedTokens
  }
}

// 模拟系统提示词（从 useSubtitleTranslation.ts 复制）
function getSystemPrompt(terms = {}) {
  const hasTerms = Object.keys(terms).length > 0
  
  const translationInstruction = `你是一位专业的电影字幕翻译专家，精通英语和中文。你的任务是将英文电影字幕翻译成中文，要求：

1. **翻译风格**：
   - 符合中文表达习惯，自然流畅
   - 保持电影对白的口语化特点
   - 准确传达原文的语气、情感和文化内涵

2. **专业要求**：
   - 保持角色性格和说话风格的一致性
   - 注意上下文连贯性，确保前后呼应
   - 对于专有名词（人名、地名、机构名等），保持译法统一
   - 如遇到俚语、习语或文化特定表达，采用对应的中文表达方式

3. **字幕特点**：
   - 简洁明了，避免冗长
   - 考虑字幕显示时长，不宜过长
   - 保持原文的分句和停顿节奏`

  const translationRequirements = `

**翻译要求示例：**

原文示例：
[101] honored and comforted by the friendship of many.
[102] Nothing gives me more serenity as I approach death
[103] than the knowledge of never having offended anyone,

翻译：
[101] 我深感荣幸与慰藉，因有众多友人相伴。
[102] 在我面对死亡之际，没有什么比
[103] 从未冒犯过任何人这一事实更让我感到平静，

❌ 错误示例（合并翻译）：
[101] 我深感荣幸与慰藉，因有众多友人相伴。在我面对死亡之际，没有什么比从未冒犯过任何人这一事实更让我感到平静，
[104] ...（跳过了 102 和 103）

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

3. **上下文字幕处理：**
   如果字幕中包含标记为 [CONTEXT] 的条目，这些是仅供上下文理解的辅助字幕。
   **不需要翻译，也不要在返回结果中包含这些序号**。
   只翻译没有 [CONTEXT] 标记的字幕。

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
   **宁可在句子中间断开，也不要跳过任何序号。**`

  const termsSection = hasTerms ? `

**已知术语参考**（请在翻译时保持一致）：
${JSON.stringify(terms, null, 2)}

翻译时如果遇到已知术语，请使用提供的译文保持一致性。` : ''

  return translationInstruction + translationRequirements + termsSection
}

// 模拟用户消息
function getUserMessage(batchSize, subtitleText) {
  return `请翻译以下电影字幕。

**重要提醒：**
- 标记为 [CONTEXT] 的字幕仅供上下文理解，不需要翻译
- 只翻译没有 [CONTEXT] 标记的 ${batchSize} 条字幕
- 每个序号 [数字] 必须在新的一行开头
- **翻译内容应该在同一行内，不要换行**（原文已经将多行合并为单行）
- 绝对不允许在同一行出现多个序号
- **绝对不允许跳过任何序号，每个序号都必须有翻译**
- **允许在句子中间断开，例如：[1] 你今天... [2] ...吃了吗？**
- **宁可断句不自然，也不要跳过任何序号**

**字幕内容：**

${subtitleText}

**请严格按照格式返回翻译，确保 ${batchSize} 个序号都有对应的翻译，一个都不能少。**`
}

// 生成模拟字幕文本
function generateMockSubtitles(count, contextBefore = 5, contextAfter = 5) {
  const lines = []
  
  // 前置上下文
  if (contextBefore > 0) {
    lines.push('// 以下是前置上下文，仅供理解，不需要翻译')
    for (let i = 1; i <= contextBefore; i++) {
      lines.push(`[${i}] [CONTEXT] This is a context subtitle for understanding.`)
    }
    lines.push('')
  }
  
  // 需要翻译的字幕
  lines.push('// 以下是需要翻译的字幕')
  const startIndex = contextBefore + 1
  for (let i = 0; i < count; i++) {
    const index = startIndex + i
    lines.push(`[${index}] This is subtitle number ${index} that needs to be translated into Chinese.`)
  }
  
  // 后置上下文
  if (contextAfter > 0) {
    lines.push('')
    lines.push('// 以下是后置上下文，仅供理解，不需要翻译')
    const postStart = startIndex + count
    for (let i = 0; i < contextAfter; i++) {
      const index = postStart + i
      lines.push(`[${index}] [CONTEXT] This is a context subtitle for understanding.`)
    }
  }
  
  return lines.join('\n')
}

console.log('='.repeat(80))
console.log('DeepSeek API Token 使用量估算')
console.log('='.repeat(80))
console.log()

// 测试不同的批次大小
const batchSizes = [10, 20, 30, 50, 100, 150, 200]
const contextBefore = 5
const contextAfter = 5

console.log('📊 测试配置：')
console.log(`   前置上下文: ${contextBefore} 条`)
console.log(`   后置上下文: ${contextAfter} 条`)
console.log()

batchSizes.forEach(batchSize => {
  console.log('-'.repeat(80))
  console.log(`📦 批次大小: ${batchSize} 条字幕`)
  console.log('-'.repeat(80))
  
  // 生成模拟数据
  const systemPrompt = getSystemPrompt({ "Giovanni": "乔瓦尼", "Florence": "佛罗伦萨" })
  const subtitleText = generateMockSubtitles(batchSize, contextBefore, contextAfter)
  const userMessage = getUserMessage(batchSize, subtitleText)
  
  // 统计 tokens
  const systemStats = estimateTokens(systemPrompt)
  const userStats = estimateTokens(userMessage)
  const totalTokens = systemStats.estimatedTokens + userStats.estimatedTokens
  
  console.log(`\n📝 System Prompt:`)
  console.log(`   字符数: ${systemStats.totalChars}`)
  console.log(`   中文字符: ${systemStats.chineseChars}`)
  console.log(`   英文单词: ${systemStats.englishWords}`)
  console.log(`   估算 Tokens: ${systemStats.estimatedTokens}`)
  
  console.log(`\n📨 User Message:`)
  console.log(`   字符数: ${userStats.totalChars}`)
  console.log(`   中文字符: ${userStats.chineseChars}`)
  console.log(`   英文单词: ${userStats.englishWords}`)
  console.log(`   估算 Tokens: ${userStats.estimatedTokens}`)
  
  console.log(`\n💰 总计:`)
  console.log(`   总 Tokens: ${totalTokens}`)
  console.log(`   DeepSeek 限制: 32,000 tokens (输入)`)
  console.log(`   使用率: ${(totalTokens / 32000 * 100).toFixed(2)}%`)
  console.log(`   剩余空间: ${32000 - totalTokens} tokens`)
  
  if (totalTokens > 32000) {
    console.log(`   ⚠️  警告: 超出限制！`)
  } else if (totalTokens > 28000) {
    console.log(`   ⚠️  接近限制，建议减少批次大小`)
  } else {
    console.log(`   ✅ 在安全范围内`)
  }
  
  console.log()
})

console.log('='.repeat(80))
console.log('💡 建议：')
console.log('   - DeepSeek 输入限制: 32,000 tokens')
console.log('   - 建议保留 20% 的缓冲空间（约 25,600 tokens）')
console.log('   - 实际字幕可能比模拟数据更长，建议保守估计')
console.log('   - 可以根据实际测试结果调整批次大小')
console.log('='.repeat(80))

