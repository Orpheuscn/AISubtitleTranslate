import type { Sentence } from '@/types'
// @ts-ignore
import nlp from 'compromise'

export function useTextProcessing() {
  // 检测是否为诗歌格式
  function isPoetryText(text: string): boolean {
    if (!text) return false
    const lines = text.split('\n')
    if (lines.length < 3) return false

    let shortLineCount = 0
    let nonPuncEndCount = 0
    let totalNonEmptyLines = 0

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine.length > 0) {
        totalNonEmptyLines++
        if (trimmedLine.length < 60) {
          shortLineCount++
        }
        if (!/[.!?;:,]$/.test(trimmedLine)) {
          nonPuncEndCount++
        }
      }
    })

    if (totalNonEmptyLines < 3) return false
    return (shortLineCount / totalNonEmptyLines > 0.6 && nonPuncEndCount / totalNonEmptyLines > 0.5)
  }

  // 使用NLP分割句子
  function splitSentencesWithNLP(text: string): Sentence[] {
    if (!text) return []
    text = text.trim()

    const isPoetry = isPoetryText(text)

    if (isPoetry) {
      // 诗歌格式：按行分割
      const lines = text.split('\n')
      return lines.map((line, index) => ({
        text: line.trim(),
        type: line.trim() ? 'poetry_line' : 'empty_line',
        paragraph: index + 1,
        sentenceInParagraph: 1,
        originalIndex: index,
        indentation: line.length - line.trimStart().length,
        lineNumber: line.trim() ? index + 1 : -1
      }))
    } else {
      // 普通文本：使用NLP分割
      try {
        const paragraphs = text.split(/\n\s*\n+/)
        let result: Sentence[] = []
        let sentenceIndex = 0
        let currentParagraphIndex = 0

        // 检测标题（第一段，较短，无句号结尾）
        if (paragraphs.length > 0 && paragraphs[0].trim().length < 80 && !/[.?!]$/.test(paragraphs[0].trim())) {
          const firstPara = paragraphs.shift()?.trim()
          if (firstPara) {
            result.push({
              text: firstPara,
              type: 'title',
              paragraph: 0,
              sentenceInParagraph: 1,
              originalIndex: sentenceIndex++
            })
          }
        }

        paragraphs.forEach((paraText) => {
          paraText = paraText.trim()
          if (!paraText) return

          currentParagraphIndex++
          const doc = nlp(paraText)
          const sentences = doc.sentences().out('array')
          let sentenceInParagraphCounter = 0

          sentences.forEach((sentenceText: string) => {
            sentenceText = sentenceText.trim()
            if (sentenceText) {
              sentenceInParagraphCounter++
              result.push({
                text: sentenceText,
                type: 'sentence',
                paragraph: currentParagraphIndex,
                sentenceInParagraph: sentenceInParagraphCounter,
                originalIndex: sentenceIndex++
              })
            }
          })
        })

        return result
      } catch (error) {
        console.error('NLP sentence splitting failed:', error)
        // 降级到基本分割
        return basicSentenceSplit(text)
      }
    }
  }

  // 基本句子分割（fallback）
  function basicSentenceSplit(text: string): Sentence[] {
    const basicSentences = text.split(/([.?!])\s+(?=[A-ZÀ-ÿ"']|\n|$)/g)
    let result: Sentence[] = []
    let currentSentence = ""
    
    for (let i = 0; i < basicSentences.length; i++) {
      currentSentence += basicSentences[i]
      if (i % 2 === 1 || i === basicSentences.length - 1) {
        if (currentSentence.trim()) {
          result.push({
            text: currentSentence.trim(),
            type: 'sentence',
            paragraph: 1,
            sentenceInParagraph: result.length + 1,
            originalIndex: result.length
          })
        }
        currentSentence = ""
      }
    }
    
    return result
  }

  // 获取干净的翻译文本
  function getCleanTranslationText(sentences: Sentence[]): string {
    if (!sentences || sentences.length === 0) return ''

    // 按段落分组
    const paragraphs: { [key: number]: Sentence[] } = {}
    sentences.forEach(sentence => {
      if (sentence.isMissing || sentence.text.startsWith('[翻译错误]')) return
      
      const paraIndex = sentence.paragraph || 0
      if (!paragraphs[paraIndex]) {
        paragraphs[paraIndex] = []
      }
      paragraphs[paraIndex].push(sentence)
    })

    let cleanText = ''
    const sortedParaKeys = Object.keys(paragraphs).sort((a, b) => parseInt(a) - parseInt(b))

    sortedParaKeys.forEach((paraKey, idx) => {
      const sentencesInPara = paragraphs[parseInt(paraKey)]
      sentencesInPara.sort((a, b) => a.originalIndex - b.originalIndex)

      if (paraKey === '0' && sentencesInPara[0]?.type === 'title') {
        cleanText += sentencesInPara[0].text + '\n\n'
      } else if (sentencesInPara[0]?.type === 'poetry_line') {
        sentencesInPara.forEach(s => {
          cleanText += s.text + '\n'
        })
        if (idx < sortedParaKeys.length - 1) {
          cleanText += '\n'
        }
      } else {
        const paragraphText = sentencesInPara.map(s => s.text).join(' ')
        cleanText += paragraphText + '\n\n'
      }
    })

    return cleanText.trim()
  }

  return {
    isPoetryText,
    splitSentencesWithNLP,
    getCleanTranslationText
  }
}
