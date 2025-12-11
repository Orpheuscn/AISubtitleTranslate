import { useTranslationStore } from '@/stores/translation'
import type { ProperNoun } from '@/types'

export function useProperNounParsing() {
  const store = useTranslationStore()

  // 解析专有名词（自动查重，只添加新词条）
  function parseProperNouns(properNounText: string): ProperNoun {
    const newTerms: ProperNoun = {}

    // 策略1: 尝试JSON解析（新格式，最可靠）
    try {
      // 提取JSON部分（可能包含markdown代码块标记）
      let jsonText = properNounText.trim()

      // 移除可能的markdown代码块标记
      jsonText = jsonText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()

      // 尝试解析JSON
      const parsed = JSON.parse(jsonText)

      // 验证是否为有效的术语对象
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([original, translation]) => {
          if (typeof original === 'string' && typeof translation === 'string' &&
              original.trim() && translation.trim() && !store.properNouns[original]) {
            newTerms[original.trim()] = translation.trim()
          }
        })

        console.log('使用JSON格式解析成功:', JSON.stringify(newTerms, null, 2))
        return newTerms
      }
    } catch (e) {
      // JSON解析失败，继续尝试文本格式
      console.log('JSON解析失败，尝试文本格式解析')
    }

    // 策略2: 文本格式解析（兼容旧格式）
    const lines = properNounText.split('\n')

    lines.forEach((line: string) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      console.log('解析原始行:', trimmedLine)

      // 只在第一个冒号处分割
      const firstColonIndex = trimmedLine.indexOf(':')
      if (firstColonIndex === -1) return

      let original = trimmedLine.substring(0, firstColonIndex).trim()
      let afterFirstColon = trimmedLine.substring(firstColonIndex + 1).trim()

      console.log('  第一次分割 - 原文:', original)
      console.log('  第一次分割 - 后续:', afterFirstColon)

      // 策略1: 如果后续内容包含中文书名号《》，提取书名号内容作为翻译
      const bookTitleMatch = afterFirstColon.match(/《([^》]+)》/)
      if (bookTitleMatch) {
        const translation = `《${bookTitleMatch[1]}》`
        
        // 检查是否需要扩展原文（如果书名号前还有英文内容）
        const beforeBookTitle = afterFirstColon.substring(0, afterFirstColon.indexOf('《')).trim()
        if (beforeBookTitle) {
          // 移除末尾的冒号
          const cleanBeforeTitle = beforeBookTitle.replace(/:$/, '').trim()
          if (cleanBeforeTitle) {
            original = `${original}: ${cleanBeforeTitle}`
          }
        }
        
        console.log('  使用书名号提取 - 最终原文:', original)
        console.log('  使用书名号提取 - 最终译文:', translation)
        
        if (original && translation && !store.properNouns[original]) {
          newTerms[original] = translation
        }
        return
      }

      // 策略2: 如果没有书名号，尝试找到最后一个冒号后的中文内容
      const lastColonIndex = afterFirstColon.lastIndexOf(':')
      if (lastColonIndex !== -1) {
        const possibleTranslation = afterFirstColon.substring(lastColonIndex + 1).trim()
        
        // 检查是否包含中文
        const hasChinese = /[\u4e00-\u9fa5]/.test(possibleTranslation)
        if (hasChinese) {
          // 提取最后冒号前的英文部分（如果有）作为完整原文
          const englishPart = afterFirstColon.substring(0, lastColonIndex).trim()
          if (englishPart) {
            original = `${original}: ${englishPart}`
          }
          
          console.log('  使用最后冒号提取 - 最终原文:', original)
          console.log('  使用最后冒号提取 - 最终译文:', possibleTranslation)
          
          if (original && possibleTranslation && !store.properNouns[original]) {
            newTerms[original] = possibleTranslation
          }
          return
        }
      }

      // 策略3: 如果上面都不适用，检查afterFirstColon是否直接就是中文翻译
      const hasChinese = /[\u4e00-\u9fa5]/.test(afterFirstColon)
      if (hasChinese) {
        // 反向思维：找到第一个中文字符的位置，从那里开始提取
        // 这样可以自动过滤掉前面的任何英文注解、括号等噪音
        const firstChineseMatch = afterFirstColon.match(/[\u4e00-\u9fa5]/)
        if (firstChineseMatch && firstChineseMatch.index !== undefined) {
          // 从第一个中文字符开始，提取所有"可能是翻译"的字符
          // 包括中文、中文标点、数字、空格等，但排除明显的英文单词
          const fromFirstChinese = afterFirstColon.substring(firstChineseMatch.index)

          // 提取连续的中文相关字符（遇到连续的英文字母就停止）
          const translationMatch = fromFirstChinese.match(/^[\u4e00-\u9fa5《》：、，。！？；""''（）【】·\-—…0-9\s/&]+/)
          if (translationMatch) {
            const translation = translationMatch[0].trim()
            console.log('  直接提取中文 - 最终原文:', original)
            console.log('  直接提取中文 - 最终译文:', translation)

            if (original && translation && !store.properNouns[original]) {
              newTerms[original] = translation
            }
          }
        }
      }
    })

    console.log('解析后的新术语:', JSON.stringify(newTerms, null, 2))
    return newTerms
  }

  return {
    parseProperNouns
  }
}

