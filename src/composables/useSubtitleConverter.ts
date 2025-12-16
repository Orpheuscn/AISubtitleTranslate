import type { SubtitleEntry } from '@/types'

export function useSubtitleConverter() {
  
  /**
   * 检测字幕文件格式
   */
  function detectFormat(content: string): 'srt' | 'ass' | 'ssa' | 'vtt' | 'unknown' {
    const trimmed = content.trim()
    
    // 检测 VTT 格式
    if (trimmed.startsWith('WEBVTT')) {
      return 'vtt'
    }
    
    // 检测 ASS/SSA 格式
    if (trimmed.includes('[Script Info]') || trimmed.includes('[V4+ Styles]') || trimmed.includes('[Events]')) {
      if (trimmed.includes('[V4+ Styles]')) {
        return 'ass'
      }
      return 'ssa'
    }
    
    // 检测 SRT 格式（简单检测：数字开头，后面跟时间轴）
    const lines = trimmed.split('\n')
    if (lines.length >= 3) {
      const firstLine = lines[0].trim()
      const secondLine = lines[1].trim()
      if (/^\d+$/.test(firstLine) && /\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(secondLine)) {
        return 'srt'
      }
    }
    
    return 'unknown'
  }

  /**
   * 解析 VTT 格式
   */
  function parseVTT(content: string): SubtitleEntry[] {
    const entries: SubtitleEntry[] = []
    const lines = content.split('\n')
    let index = 1
    let i = 0

    // 跳过 WEBVTT 头部
    while (i < lines.length && !lines[i].includes('-->')) {
      i++
    }

    while (i < lines.length) {
      const line = lines[i].trim()
      
      // 查找时间轴行
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/)
      if (timeMatch) {
        const startTime = timeMatch[1].replace('.', ',')
        const endTime = timeMatch[2].replace('.', ',')
        
        // 收集字幕文本（直到空行）
        i++
        const textLines: string[] = []
        while (i < lines.length && lines[i].trim() !== '') {
          const textLine = lines[i].trim()
          // 移除 VTT 样式标签
          const cleanText = textLine.replace(/<[^>]+>/g, '')
          if (cleanText) {
            textLines.push(cleanText)
          }
          i++
        }
        
        if (textLines.length > 0) {
          entries.push({
            index,
            startTime,
            endTime,
            text: textLines.join('\n'),
            translatedText: undefined,
            isMissing: false
          })
          index++
        }
      }
      i++
    }

    return entries
  }

  /**
   * 解析 ASS/SSA 格式
   */
  function parseASS(content: string): SubtitleEntry[] {
    const entries: SubtitleEntry[] = []
    const lines = content.split('\n')
    let index = 1
    let inEvents = false
    let formatLine = ''

    for (const line of lines) {
      const trimmed = line.trim()
      
      // 检测是否进入 Events 部分
      if (trimmed === '[Events]') {
        inEvents = true
        continue
      }
      
      // 如果在其他部分，跳过
      if (trimmed.startsWith('[') && trimmed !== '[Events]') {
        inEvents = false
        continue
      }
      
      // 记录格式行
      if (inEvents && trimmed.startsWith('Format:')) {
        formatLine = trimmed.substring(7).trim()
        continue
      }
      
      // 解析对话行
      if (inEvents && (trimmed.startsWith('Dialogue:') || trimmed.startsWith('Comment:'))) {
        const dialoguePart = trimmed.substring(trimmed.indexOf(':') + 1).trim()
        const parts = dialoguePart.split(',')
        
        if (parts.length >= 9) {
          // ASS/SSA 格式: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
          const startTime = convertASSTimeToSRT(parts[1].trim())
          const endTime = convertASSTimeToSRT(parts[2].trim())
          
          // 文本是从第9个逗号之后的所有内容
          const text = parts.slice(9).join(',').trim()
          
          // 移除 ASS 样式标签
          const cleanText = text
            .replace(/\{[^}]+\}/g, '') // 移除 {} 标签
            .replace(/\\N/g, '\n')      // 换行符
            .replace(/\\n/g, '\n')      // 换行符
            .replace(/\\h/g, ' ')       // 硬空格
            .trim()
          
          if (cleanText) {
            entries.push({
              index,
              startTime,
              endTime,
              text: cleanText,
              translatedText: undefined,
              isMissing: false
            })
            index++
          }
        }
      }
    }

    return entries
  }

  /**
   * 将 ASS 时间格式转换为 SRT 时间格式
   * ASS: 0:00:20.00 -> SRT: 00:00:20,000
   */
  function convertASSTimeToSRT(assTime: string): string {
    // ASS 格式: H:MM:SS.CC (centiseconds)
    const match = assTime.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/)
    if (!match) return '00:00:00,000'

    const hours = match[1].padStart(2, '0')
    const minutes = match[2]
    const seconds = match[3]
    const centiseconds = match[4]

    // 将百分之一秒转换为毫秒
    const milliseconds = (parseInt(centiseconds) * 10).toString().padStart(3, '0')

    return `${hours}:${minutes}:${seconds},${milliseconds}`
  }

  /**
   * 统一转换接口
   */
  function convertToSRT(content: string, filename: string): SubtitleEntry[] | null {
    const format = detectFormat(content)

    console.log(`检测到字幕格式: ${format} (文件: ${filename})`)

    switch (format) {
      case 'srt':
        // 已经是 SRT 格式，返回 null 表示不需要转换
        return null

      case 'vtt':
        console.log('正在转换 VTT 格式到 SRT...')
        return parseVTT(content)

      case 'ass':
      case 'ssa':
        console.log(`正在转换 ${format.toUpperCase()} 格式到 SRT...`)
        return parseASS(content)

      default:
        console.warn('未知的字幕格式')
        return null
    }
  }

  return {
    detectFormat,
    convertToSRT,
    parseVTT,
    parseASS
  }
}


