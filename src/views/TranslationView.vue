<template>
  <div class="translation-container">
    <!-- 固定 Header -->
    <AppHeader
      :total-subtitles="store.subtitleEntries.length"
      :translated-count="translatedCount"
      :missing-count="store.missingTranslationsCount"
      @retranslate-missing="handleRetranslateMissing"
    />

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- API设置 -->
      <ApiSettings />

      <!-- 专有名词索引 -->
      <ProperNounIndex />

    <!-- 字幕表格 -->
    <SubtitleTable
      :subtitles="store.subtitleEntries"
      :highlighted-index="store.highlightedIndex"
      :has-api-key="!!store.settings.apiKey"
      :file-name="store.originalFileName"
      @file-selected="handleFileSelected"
      @translation-file-selected="handleTranslationFileSelected"
      @translate="handleTranslate"
      @download="handleDownloadSubtitle"
      @retranslate="handleRetranslate"
      @edit="handleEdit"
      @edit-source="handleEditSource"
      @delete="handleDelete"
    />

    <!-- Footer -->
    <AppFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTranslationStore } from '@/stores/translation'
import { useSrtProcessing } from '@/composables/useSrtProcessing'
import { useSubtitleTranslation } from '@/composables/useSubtitleTranslation'
import { useSubtitleConverter } from '@/composables/useSubtitleConverter'
import AppHeader from '@/components/AppHeader.vue'
import ApiSettings from '@/components/ApiSettings.vue'
import ProperNounIndex from '@/components/ProperNounIndex.vue'
import SubtitleTable from '@/components/SubtitleTable.vue'
import AppFooter from '@/components/AppFooter.vue'

const store = useTranslationStore()
const { parseSrt, generateSrt, downloadSrt, generateBilingualASS, downloadAss } = useSrtProcessing()
const { translateSubtitleBatch, retranslateSingleSubtitle, retranslateMissingSubtitles } = useSubtitleTranslation()
const { convertToSRT } = useSubtitleConverter()

// 计算已翻译数量
const translatedCount = computed(() => {
  return store.subtitleEntries.filter(e => e.translatedText && !e.isMissing).length
})

// 处理原文文件选择
async function handleFileSelected(file: File) {
  try {
    const text = await file.text()

    // 尝试格式转换
    const convertedEntries = convertToSRT(text, file.name)
    let entries

    if (convertedEntries) {
      // 转换成功
      entries = convertedEntries
      ElMessage.success(`已将 ${file.name} 转换为 SRT 格式`)
    } else {
      // 已经是 SRT 格式或转换失败，使用原始解析
      entries = parseSrt(text)
    }

    if (entries.length === 0) {
      ElMessage.error('无法解析字幕文件，请检查文件格式')
      return
    }

    store.setSubtitleEntries(entries, file.name)
    ElMessage.success(`已加载 ${entries.length} 条原文字幕`)
  } catch (error) {
    console.error('文件读取失败:', error)
    ElMessage.error('文件读取失败')
  }
}

// 处理译文文件选择
async function handleTranslationFileSelected(file: File) {
  try {
    if (store.subtitleEntries.length === 0) {
      ElMessage.warning('请先加载原文字幕')
      return
    }

    const text = await file.text()

    // 尝试格式转换
    const convertedEntries = convertToSRT(text, file.name)
    let translationEntries

    if (convertedEntries) {
      // 转换成功
      translationEntries = convertedEntries
      ElMessage.success(`已将 ${file.name} 转换为 SRT 格式`)
    } else {
      // 已经是 SRT 格式或转换失败，使用原始解析
      translationEntries = parseSrt(text)
    }

    if (translationEntries.length === 0) {
      ElMessage.error('无法解析字幕文件，请检查文件格式')
      return
    }

    // 将译文填充到对应序号的字幕中
    let matchedCount = 0
    translationEntries.forEach(transEntry => {
      const entry = store.subtitleEntries.find(e => e.index === transEntry.index)
      if (entry) {
        entry.translatedText = transEntry.text
        entry.isMissing = false
        matchedCount++
      }
    })

    if (matchedCount === 0) {
      ElMessage.warning('未找到匹配的字幕序号，请确认译文与原文对应')
    } else {
      ElMessage.success(`已导入 ${matchedCount} 条译文，可以开始校对`)
    }
  } catch (error) {
    console.error('文件读取失败:', error)
    ElMessage.error('文件读取失败')
  }
}

// 处理下载字幕
function handleDownloadSubtitle(type: 'source' | 'translation' | 'bilingual') {
  if (store.subtitleEntries.length === 0) {
    ElMessage.warning('没有可保存的字幕')
    return
  }

  try {
    const baseFilename = store.originalFileName
      ? store.originalFileName.replace(/\.(srt|ass|ssa|vtt)$/i, '')
      : 'subtitle'

    switch (type) {
      case 'source':
        // 保存原文SRT
        const sourceSrt = generateSrt(store.subtitleEntries, false)
        downloadSrt(sourceSrt, `${baseFilename}_source.srt`)
        ElMessage.success('原文字幕已保存')
        break

      case 'translation':
        // 保存译文SRT
        const hasTranslation = store.subtitleEntries.some(e => e.translatedText && !e.isMissing)
        if (!hasTranslation) {
          ElMessage.warning('没有可保存的译文')
          return
        }
        const translationSrt = generateSrt(store.subtitleEntries, true)
        downloadSrt(translationSrt, `${baseFilename}_translated.srt`)
        ElMessage.success('译文字幕已保存')
        break

      case 'bilingual':
        // 保存双语ASS
        const hasTranslationForBilingual = store.subtitleEntries.some(e => e.translatedText && !e.isMissing)
        if (!hasTranslationForBilingual) {
          ElMessage.warning('没有可保存的译文')
          return
        }
        const bilingualAss = generateBilingualASS(store.subtitleEntries)
        downloadAss(bilingualAss, `${baseFilename}_bilingual.ass`)
        ElMessage.success('双语字幕已保存')
        break
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 处理高亮
function handleHighlight(index: number, permanent = false) {
  store.setHighlight(index, permanent)
}

// 处理清除高亮
function handleClearHighlight() {
  store.clearHighlight()
}

// 处理重译
async function handleRetranslate(index: number) {
  if (!store.settings.apiKey) {
    ElMessage.error('请输入API Key')
    return
  }

  const entry = store.subtitleEntries.find(e => e.index === index)
  if (!entry) {
    ElMessage.error('找不到字幕条目')
    return
  }

  try {
    // 获取上下文
    const entryArrayIndex = store.subtitleEntries.findIndex(e => e.index === index)
    const context = {
      previous: entryArrayIndex > 0 ? store.subtitleEntries[entryArrayIndex - 1] : undefined,
      next: entryArrayIndex < store.subtitleEntries.length - 1 ? store.subtitleEntries[entryArrayIndex + 1] : undefined
    }

    await retranslateSingleSubtitle(entry, store.settings.apiKey, store.settings.model, context)
    ElMessage.success('重译完成')
  } catch (error: any) {
    console.error('重译失败:', error)
    ElMessage.error(`重译失败: ${error.message}`)
  }
}

// 处理编辑
function handleEdit(index: number, newText: string) {
  store.updateSubtitleTranslation(index, newText)
}

// 处理原文编辑
function handleEditSource(index: number, newText: string) {
  const entry = store.subtitleEntries.find(e => e.index === index)
  if (entry) {
    entry.text = newText
  }
}

// 处理翻译
async function handleTranslate() {
  if (!store.settings.apiKey) {
    ElMessage.error('请输入DeepSeek API Key')
    return
  }

  if (!store.hasSubtitles) {
    ElMessage.error('请先加载SRT文件')
    return
  }

  try {
    await translateSubtitleBatch(
      store.subtitleEntries,
      store.settings.apiKey,
      store.settings.model,
      store.settings.batchSize
    )

    if (store.missingTranslationsCount === 0) {
      ElMessage.success('翻译完成！')
    } else {
      ElMessage.warning(`翻译完成，但有 ${store.missingTranslationsCount} 条字幕缺失或出错`)
    }
  } catch (error: any) {
    console.error('翻译失败:', error)
    ElMessage.error(`翻译失败: ${error.message}`)
  }
}

// 处理批量重译缺失字幕
async function handleRetranslateMissing() {
  if (!store.settings.apiKey) {
    ElMessage.error('请输入DeepSeek API Key')
    return
  }

  const missingCount = store.missingTranslationsCount
  if (missingCount === 0) {
    ElMessage.info('没有缺失的翻译')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要重译 ${missingCount} 条缺失的字幕吗？`,
      '批量重译',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await retranslateMissingSubtitles(
      store.settings.apiKey,
      store.settings.model,
      20 // 缺失字幕使用较小的批次大小
    )

    if (store.missingTranslationsCount === 0) {
      ElMessage.success('重译完成！所有字幕已翻译')
    } else {
      ElMessage.warning(`重译完成，仍有 ${store.missingTranslationsCount} 条字幕缺失`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('重译失败:', error)
      ElMessage.error(`重译失败: ${error.message}`)
    }
  }
}

// 处理删除
async function handleDelete(index: number) {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条字幕吗？删除后序号将自动重新排序。',
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    store.deleteSubtitleEntry(index)
    ElMessage.success('字幕已删除，序号已重新排序')
  } catch {
    // 用户取消删除
  }
}
</script>

<style scoped>
.translation-container {
  min-height: 100vh;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 24px 24px;
}
</style>
