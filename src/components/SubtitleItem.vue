<template>
  <div 
    ref="itemRef"
    class="subtitle-item"
    :class="{ 
      'is-highlighted': isHighlighted, 
      'is-permanent-highlighted': isPermanentHighlighted,
      'is-missing': entry.isMissing
    }"
    @mouseenter="$emit('highlight', false)"
    @mouseleave="$emit('clearHighlight')"
    @click="$emit('highlight', true)"
  >
    <div class="subtitle-header">
      <span class="subtitle-index">{{ entry.index }}</span>
      <span class="subtitle-time">{{ entry.startTime }} → {{ entry.endTime }}</span>
      <div class="subtitle-actions" v-if="!isSource">
        <el-button
          text
          size="small"
          @click.stop="handleRetranslate"
          title="重新翻译"
        >
          🔄
        </el-button>
      </div>
    </div>
    <div class="subtitle-content">
      <div v-if="isSource" class="subtitle-text">{{ entry.text }}</div>
      <el-input
        v-else
        v-model="editText"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        @blur="saveEdit"
        @keydown.enter.ctrl="saveEdit"
        placeholder="等待翻译..."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { SubtitleEntry } from '@/types'

interface Props {
  entry: SubtitleEntry
  isSource?: boolean
  isHighlighted?: boolean
  isPermanentHighlighted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSource: false,
  isHighlighted: false,
  isPermanentHighlighted: false
})

const emit = defineEmits<{
  highlight: [permanent: boolean]
  clearHighlight: []
  retranslate: []
  edit: [newText: string]
}>()

const itemRef = ref<HTMLElement>()
const editText = ref(props.entry.translatedText || '')

// 监听翻译结果变化，自动更新编辑框内容
watch(() => props.entry.translatedText, (newValue) => {
  editText.value = newValue || ''
})

// 监听高亮状态，自动滚动到视图中
watch(() => props.isHighlighted, (isHighlighted) => {
  if (isHighlighted && itemRef.value) {
    nextTick(() => {
      itemRef.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    })
  }
})

// 监听永久高亮状态，自动滚动到视图中
watch(() => props.isPermanentHighlighted, (isPermanentHighlighted) => {
  if (isPermanentHighlighted && itemRef.value) {
    nextTick(() => {
      itemRef.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    })
  }
})

function saveEdit() {
  if (editText.value.trim() && editText.value !== props.entry.translatedText) {
    emit('edit', editText.value.trim())
  }
}

function handleRetranslate() {
  emit('retranslate')
}
</script>

<style scoped>
.subtitle-item {
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.subtitle-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.subtitle-item.is-highlighted {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.subtitle-item.is-permanent-highlighted {
  border-color: #67c23a;
  background-color: #f0f9ff;
  box-shadow: 0 2px 12px rgba(103, 194, 58, 0.2);
}

.subtitle-item.is-missing {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.subtitle-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.subtitle-index {
  font-weight: 600;
  color: #409eff;
  min-width: 40px;
}

.subtitle-time {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.subtitle-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.subtitle-item:hover .subtitle-actions {
  opacity: 1;
}

.subtitle-content {
  font-size: 14px;
  line-height: 1.6;
}

.subtitle-text {
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
}


/* 暗色模式 */
html.dark .subtitle-item {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .subtitle-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

html.dark .subtitle-item.is-highlighted {
  background-color: #1a3a52;
}

html.dark .subtitle-item.is-permanent-highlighted {
  background-color: #1a3a2a;
  border-color: #67c23a;
}

html.dark .subtitle-item.is-missing {
  background-color: #3a1a1a;
  border-color: #f56c6c;
}

html.dark .subtitle-text {
  color: #e5e5e5;
}
</style>

