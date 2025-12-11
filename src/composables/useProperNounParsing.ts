import { useTranslationStore } from '@/stores/translation'
import type { ProperNoun } from '@/types'

export function useProperNounParsing() {
  const store = useTranslationStore()

  // 解析专有名词（自动查重，只添加新词条）
  function parseProperNouns(properNounText: string): ProperNoun {
    const newTerms: ProperNoun = {}
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
        // 移除可能的英文前缀，只保留中文部分
        // 支持的字符包括：
        // - 中文字符 \u4e00-\u9fa5
        // - 中文标点 《》：、，。！？；""''（）
        // - 间隔号 · (用于外文人名翻译，如：阿尔菲·鲍恩)
        // - 连字符 - (用于复合词，如：三十-四十)
        // - 破折号 — (用于解释说明)
        // - 省略号 …
        // - 数字 0-9 (翻译中可能包含数字)
        // - 空格 (多词翻译)
        // - 斜杠 / (用于并列，如：作者/编辑)
        // - 与号 & (用于连接)
        const chineseMatch = afterFirstColon.match(/[\u4e00-\u9fa5《》：、，。！？；""''（）·\-—…0-9\s/&]+/)
        if (chineseMatch) {
          const translation = chineseMatch[0].trim()
          console.log('  直接提取中文 - 最终原文:', original)
          console.log('  直接提取中文 - 最终译文:', translation)

          if (original && translation && !store.properNouns[original]) {
            newTerms[original] = translation
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

