<template>
  <el-card class="text-column">
    <template #header>
      <div class="column-header">
        <span>{{ title }}</span>
        <div class="header-buttons">
          <template v-if="isSource">
            <el-button
              size="default"
              :icon="DocumentCopy"
              @click="$emit('paste')"
            >
              粘贴
            </el-button>
            <el-button
              size="default"
              type="primary"
              :icon="Promotion"
              :disabled="sentences.length === 0 || !hasApiKey"
              @click="$emit('translate')"
            >
              翻译
            </el-button>
          </template>
          <el-button
            v-else
            size="default"
            :icon="CopyDocument"
            :disabled="sentences.length === 0"
            @click="$emit('copy')"
          >
            复制
          </el-button>
        </div>
      </div>
    </template>

    <div class="text-content" ref="contentRef">
      <div v-if="sentences.length === 0" class="empty-prompt">
        {{ isSource ? '点击"粘贴"按钮或直接在此处输入您的文本...' : '翻译将显示在这里...' }}
      </div>
      
      <div v-else class="sentences-container">
        <div
          v-for="(sentence, index) in groupedSentences"
          :key="index"
          class="paragraph"
          :class="{ 'poetry-mode': sentence.isPoetry }"
        >
          <SentenceItem
            v-for="s in sentence.sentences"
            :key="s.originalIndex"
            :sentence="s"
            :is-source="isSource"
            :is-highlighted="s.originalIndex === highlightedIndex"
            :is-permanent-highlighted="s.originalIndex === permanentHighlightIndex"
            @highlight="(permanent) => $emit('highlight', s.originalIndex, permanent)"
            @retranslate="() => $emit('retranslate', s.originalIndex)"
            @edit="(newText) => $emit('edit', s.originalIndex, newText)"
          />
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { DocumentCopy, CopyDocument, Promotion } from '@element-plus/icons-vue'
import type { Sentence } from '@/types'
import SentenceItem from './SentenceItem.vue'

interface Props {
  title: string
  sentences: Sentence[]
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

defineEmits<{
  paste: []
  copy: []
  translate: []
  highlight: [index: number, permanent?: boolean]
  retranslate: [index: number]
  edit: [index: number, newText: string]
}>()

const contentRef = ref<HTMLElement>()

// 将句子按段落分组
const groupedSentences = computed(() => {
  const paragraphs: { [key: number]: Sentence[] } = {}
  
  props.sentences.forEach(sentence => {
    const paraIndex = sentence.paragraph || 0
    if (!paragraphs[paraIndex]) {
      paragraphs[paraIndex] = []
    }
    paragraphs[paraIndex].push(sentence)
  })

  return Object.keys(paragraphs)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(paraKey => ({
      paragraph: parseInt(paraKey),
      sentences: paragraphs[parseInt(paraKey)].sort((a, b) => a.originalIndex - b.originalIndex),
      isPoetry: paragraphs[parseInt(paraKey)].some(s => s.type === 'poetry_line')
    }))
})
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

.empty-prompt {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fa;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
}

.sentences-container {
  font-size: 14px;
  line-height: 1.6;
}

.paragraph {
  margin-bottom: 16px;
}

.paragraph:last-child {
  margin-bottom: 0;
}

.poetry-mode {
  line-height: 1.8;
}

.poetry-mode :deep(.sentence-item) {
  display: block;
  margin-bottom: 4px;
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
