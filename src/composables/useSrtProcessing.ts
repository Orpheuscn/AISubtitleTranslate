import type { SubtitleEntry } from '@/types'

export function useSrtProcessing() {
  // 解析SRT文件内容
  function parseSrt(content: string): SubtitleEntry[] {
    const entries: SubtitleEntry[] = []
    
    // 标准化换行符
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    
    // 按双换行符分割字幕块
    const blocks = content.split(/\n\s*\n/).filter(block => block.trim())
    
    blocks.forEach(block => {
      const lines = block.split('\n').map(line => line.trim())
      
      // 至少需要3行：序号、时间轴、文本
      if (lines.length < 3) return
      
      // 解析序号
      const index = parseInt(lines[0])
      if (isNaN(index)) return
      
      // 解析时间轴 (格式: 00:00:20,000 --> 00:00:24,400)
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
      if (!timeMatch) return
      
      const startTime = timeMatch[1]
      const endTime = timeMatch[2]
      
      // 剩余的行都是文本内容
      const text = lines.slice(2).join('\n')
      
      entries.push({
        index,
        startTime,
        endTime,
        text,
        translatedText: undefined,
        isMissing: false
      })
    })
    
    return entries
  }
  
  // 生成SRT文件内容
  function generateSrt(entries: SubtitleEntry[], useTranslation = true): string {
    let result = ''
    
    entries.forEach(entry => {
      result += `${entry.index}\n`
      result += `${entry.startTime} --> ${entry.endTime}\n`
      
      // 使用翻译文本或原文
      const text = useTranslation && entry.translatedText 
        ? entry.translatedText 
        : entry.text
      
      result += `${text}\n\n`
    })
    
    return result.trim()
  }
  
  // 提取用于翻译的纯文本（带序号）
  function extractTextForTranslation(entries: SubtitleEntry[]): string {
    return entries.map(entry => `[${entry.index}] ${entry.text}`).join('\n\n')
  }
  
  // 从翻译结果中提取文本并填充到字幕条目中
  function parseTranslationResult(
    translationResult: string,
    entries: SubtitleEntry[]
  ): void {
    // 分离翻译文本和专有名词部分
    let translationPart = translationResult
    const separator = '### Proper Nouns:'
    const separatorIndex = translationResult.indexOf(separator)

    if (separatorIndex !== -1) {
      translationPart = translationResult.substring(0, separatorIndex).trim()
    }

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
        translationMap.set(current.index, translation)
      }
    }

    // 将翻译结果填充到对应的字幕条目
    entries.forEach(entry => {
      const translation = translationMap.get(entry.index)
      if (translation) {
        entry.translatedText = translation
        entry.isMissing = false
      } else {
        entry.translatedText = '[翻译缺失]'
        entry.isMissing = true
      }
    })
  }
  
  // 下载SRT文件
  function downloadSrt(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  return {
    parseSrt,
    generateSrt,
    extractTextForTranslation,
    parseTranslationResult,
    downloadSrt
  }
}

