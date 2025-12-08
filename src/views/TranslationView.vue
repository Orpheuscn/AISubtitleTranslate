<template>
  <div class="translation-container">
    <!-- 主题切换 -->
    <div class="top-bar">
      <ThemeToggle />
    </div>
    
    <!-- API设置 -->
    <ApiSettings />

    <!-- 翻译进度 -->
    <el-card v-if="store.translationState.isTranslating" class="progress-card">
      <el-progress 
        :percentage="store.translationState.progress.percentage" 
        :status="store.translationState.shouldStop ? 'exception' : undefined"
      />
      <div class="progress-message">{{ store.translationState.currentMessage }}</div>
      <el-button 
        type="danger" 
        size="small" 
        @click="handleStopTranslation"
        style="margin-top: 12px"
      >
        停止翻译
      </el-button>
    </el-card>

    <!-- 专有名词索引 -->
    <ProperNounIndex />

    <!-- 文本区域 -->
    <div class="text-container">
      <div class="text-columns">
        <TextColumn
          title="原始字幕"
          :subtitles="store.subtitleEntries"
          :highlighted-index="store.highlightedIndex"
          :permanent-highlight-index="store.permanentHighlightIndex"
          :has-api-key="!!store.settings.apiKey"
          is-source
          @file-selected="handleFileSelected"
          @translate="handleTranslate"
          @highlight="handleHighlight"
          @clear-highlight="handleClearHighlight"
        />
        
        <TextColumn
          title="中文译文"
          :subtitles="store.subtitleEntries"
          :highlighted-index="store.highlightedIndex"
          :permanent-highlight-index="store.permanentHighlightIndex"
          @download="handleDownload"
          @highlight="handleHighlight"
          @clear-highlight="handleClearHighlight"
          @retranslate="handleRetranslate"
          @edit="handleEdit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useTranslationStore } from '@/stores/translation'
import { useSrtProcessing } from '@/composables/useSrtProcessing'
import { useSubtitleTranslation } from '@/composables/useSubtitleTranslation'
import ApiSettings from '@/components/ApiSettings.vue'
import ProperNounIndex from '@/components/ProperNounIndex.vue'
import TextColumn from '@/components/TextColumn.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const store = useTranslationStore()
const { parseSrt, generateSrt, downloadSrt } = useSrtProcessing()
const { translateSubtitleBatch, retranslateSingleSubtitle } = useSubtitleTranslation()

// 处理文件选择
async function handleFileSelected(file: File) {
  try {
    const text = await file.text()
    const entries = parseSrt(text)
    
    if (entries.length === 0) {
      ElMessage.error('无法解析SRT文件，请检查文件格式')
      return
    }
    
    store.setSubtitleEntries(entries, file.name)
    ElMessage.success(`已加载 ${entries.length} 条字幕`)
  } catch (error) {
    console.error('文件读取失败:', error)
    ElMessage.error('文件读取失败')
  }
}

// 处理下载
function handleDownload() {
  if (store.subtitleEntries.length === 0) {
    ElMessage.warning('没有可保存的字幕')
    return
  }

  const hasTranslation = store.subtitleEntries.some(e => e.translatedText && !e.isMissing)
  if (!hasTranslation) {
    ElMessage.warning('请先翻译字幕')
    return
  }

  try {
    const srtContent = generateSrt(store.subtitleEntries, true)
    const filename = store.originalFileName 
      ? store.originalFileName.replace('.srt', '_translated.srt')
      : 'translated.srt'
    
    downloadSrt(srtContent, filename)
    ElMessage.success('SRT文件已保存')
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
  ElMessage.success('编辑已保存')
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

// 停止翻译
function handleStopTranslation() {
  store.updateTranslationState({ shouldStop: true })
  ElMessage.info('正在停止翻译...')
}
</script>

<style scoped>
.translation-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.top-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.progress-card {
  margin-bottom: 16px;
}

.progress-message {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.text-container {
  margin-top: 24px;
}

.text-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: 500px;
}

@media (max-width: 768px) {
  .text-columns {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
