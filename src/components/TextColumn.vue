<template>
  <el-card class="text-column">
    <template #header>
      <div class="column-header">
        <span>{{ title }}</span>
        <div class="header-buttons">
          <template v-if="isSource">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".srt"
              :on-change="handleFileSelect"
            >
              <el-button
                size="default"
                :icon="Upload"
              >
                选择原文SRT
              </el-button>
            </el-upload>
            <el-button
              size="default"
              type="primary"
              :icon="Promotion"
              :disabled="subtitles.length === 0 || !hasApiKey"
              @click="$emit('translate')"
            >
              翻译
            </el-button>
          </template>
          <template v-else>
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".srt"
              :on-change="handleFileSelect"
            >
              <el-button
                size="default"
                :icon="Upload"
              >
                导入译文SRT
              </el-button>
            </el-upload>
            <el-button
              size="default"
              :icon="Download"
              :disabled="subtitles.length === 0"
              @click="$emit('download')"
            >
              保存SRT
            </el-button>
          </template>
        </div>
      </div>
    </template>

    <div 
      class="text-content" 
      ref="contentRef"
      :class="{ 'drag-over': isDragging }"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
    >
      <div v-if="subtitles.length === 0" class="empty-prompt">
        {{ isSource ? '拖入原文SRT文件或点击"选择原文SRT"按钮...' : '点击"翻译"或拖入已有译文SRT进行校对...' }}
      </div>
      
      <div v-else class="subtitles-container">
        <SubtitleItem
          v-for="entry in subtitles"
          :key="entry.index"
          :entry="entry"
          :is-source="isSource"
          :is-highlighted="entry.index === highlightedIndex"
          :is-permanent-highlighted="entry.index === permanentHighlightIndex"
          @highlight="(permanent) => $emit('highlight', entry.index, permanent)"
          @clear-highlight="$emit('clearHighlight')"
          @retranslate="() => $emit('retranslate', entry.index)"
          @edit="(newText) => $emit('edit', entry.index, newText)"
        />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Upload, Download, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { SubtitleEntry } from '@/types'
import type { UploadFile } from 'element-plus'
import SubtitleItem from './SubtitleItem.vue'

interface Props {
  title: string
  subtitles: SubtitleEntry[]
  highlightedIndex?: number
  permanentHighlightIndex?: number
  isSource?: boolean
  hasApiKey?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  highlightedIndex: -1,
  permanentHighlightIndex: -1,
  isSource: false,
  hasApiKey: false
})

const emit = defineEmits<{
  fileSelected: [file: File]
  translate: []
  download: []
  highlight: [index: number, permanent?: boolean]
  clearHighlight: []
  retranslate: [index: number]
  edit: [index: number, newText: string]
}>()

const contentRef = ref<HTMLElement>()
const isDragging = ref(false)

function handleFileSelect(file: UploadFile) {
  if (file.raw) {
    if (!file.name.endsWith('.srt')) {
      ElMessage.error('请选择SRT格式的字幕文件')
      return
    }
    emit('fileSelected', file.raw)
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const file = files[0]
  if (!file.name.endsWith('.srt')) {
    ElMessage.error('请拖入SRT格式的字幕文件')
    return
  }
  
  emit('fileSelected', file)
}
</script>

<style scoped>
.text-column {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #2c3e50;
}

html.dark .column-header {
  color: #e5e5e5;
}

.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-buttons .el-button {
  border-radius: 6px;
}

.text-content {
  flex: 1;
  max-height: 500px;
  overflow-y: auto;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-top: 12px;
}

.text-content.drag-over {
  background-color: #ecf5ff;
  border: 2px dashed #409eff;
}

.empty-prompt {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 60px 20px;
  background: #f8f9fa;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
}

.subtitles-container {
  font-size: 14px;
}

/* 滚动条样式 */
.text-content::-webkit-scrollbar {
  width: 6px;
}

.text-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.text-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.text-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 暗色模式适配 */
html.dark .text-column :deep(.el-card) {
  background-color: #1e1e1e;
  border-color: #3a3a3a;
}

html.dark .text-column :deep(.el-card__header) {
  background-color: #252525;
  border-bottom-color: #3a3a3a;
}

html.dark .text-content {
  background: #1e1e1e;
}

html.dark .text-content.drag-over {
  background-color: #1a3a52;
  border-color: #409eff;
}

html.dark .empty-prompt {
  background: #2a2a2a;
  border-color: #3a3a3a;
  color: #909399;
}

html.dark .text-content::-webkit-scrollbar-track {
  background: #2a2a2a;
}

html.dark .text-content::-webkit-scrollbar-thumb {
  background: #4a4a4a;
}

html.dark .text-content::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}
</style>
