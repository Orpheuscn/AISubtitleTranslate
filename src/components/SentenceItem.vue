<template>
  <span
    ref="sentenceRef"
    class="sentence-item"
    :class="{
      'highlighted': isHighlighted,
      'permanent-highlighted': isPermanentHighlighted,
      'missing-translation': !isSource && sentence.isMissing,
      'title-sentence': sentence.type === 'title',
      'poetry-line': sentence.type === 'poetry_line',
      'editing': isEditing
    }"
    @mouseenter="!isEditing && $emit('highlight', false)"
    @mouseleave="!isEditing && $emit('highlight', false)"
    @click="!isEditing && $emit('highlight', true)"
  >
    <span 
      class="sentence-number"
      :class="{ 'clickable': !isSource }"
      @click.stop="!isSource && toggleActions()"
    >
      {{ getSentenceLabel(sentence) }}
    </span>
    
    <!-- 显示模式 -->
    <span v-if="!isEditing" class="sentence-text">{{ sentence.text }}</span>
    
    <!-- 编辑模式 -->
    <span v-else class="sentence-edit">
      <el-input
        v-model="editText"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 10 }"
        ref="editInputRef"
        @keydown.enter.ctrl="saveEdit"
        @keydown.esc="cancelEdit"
      />
    </span>
    
    <!-- 操作按钮 -->
    <span v-if="!isSource && showActions && !isEditing" class="sentence-actions">
      <el-button
        size="small"
        type="primary"
        :icon="RefreshRight"
        link
        @click.stop="$emit('retranslate')"
      >
        重译
      </el-button>
      <el-button
        size="small"
        type="warning"
        :icon="Edit"
        link
        @click.stop="startEdit"
      >
        编辑
      </el-button>
    </span>
    
    <!-- 编辑时的保存/取消按钮 -->
    <span v-if="isEditing" class="sentence-edit-actions">
      <el-button
        size="small"
        type="primary"
        :icon="Check"
        @click.stop="saveEdit"
      >
        保存
      </el-button>
      <el-button
        size="small"
        :icon="Close"
        @click.stop="cancelEdit"
      >
        取消
      </el-button>
      <span class="edit-hint">Ctrl+Enter保存 / Esc取消</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { RefreshRight, Edit, Check, Close } from '@element-plus/icons-vue'
import type { Sentence } from '@/types'

interface Props {
  sentence: Sentence
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
  retranslate: []
  edit: [newText: string]
}>()

const showActions = ref(false)
const isEditing = ref(false)
const editText = ref('')
const editInputRef = ref()
const sentenceRef = ref<HTMLElement>()

// 监听高亮状态变化，自动滚动到可见区域（仅在容器内滚动）
watch(() => props.isHighlighted, (newVal) => {
  if (newVal && sentenceRef.value) {
    nextTick(() => {
      // 找到滚动容器（.text-content）
      const element = sentenceRef.value
      if (!element) return
      
      const container = element.closest('.text-content') as HTMLElement
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      
      // 计算元素在容器中的绝对位置
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop
      
      // 计算目标滚动位置：让元素在容器中央显示
      const targetScrollTop = relativeTop - (container.clientHeight / 2) + (elementRect.height / 2)
      
      // 只在容器内滚动，不影响页面
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    })
  }
})

function getSentenceLabel(sentence: Sentence): string {
  if (sentence.type === 'title') {
    return '[标题]'
  } else if (sentence.type === 'poetry_line') {
    return `[${sentence.lineNumber || sentence.originalIndex + 1}]`
  } else {
    return `[${sentence.paragraph}.${sentence.sentenceInParagraph}]`
  }
}

function toggleActions() {
  showActions.value = !showActions.value
}

async function startEdit() {
  isEditing.value = true
  editText.value = props.sentence.text
  showActions.value = false
  
  // 等待DOM更新后聚焦输入框
  await nextTick()
  editInputRef.value?.focus()
}

function saveEdit() {
  if (editText.value.trim() && editText.value.trim() !== props.sentence.text) {
    emit('edit', editText.value.trim())
  }
  isEditing.value = false
  showActions.value = false
}

function cancelEdit() {
  isEditing.value = false
  editText.value = ''
  showActions.value = false
}
</script>

<style scoped>
.sentence-item {
  display: inline;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 2px 4px;
  border-radius: 3px;
  position: relative;
}

.sentence-item:not(.editing):hover {
  background-color: #fff3cd;
}

.highlighted {
  background-color: #fff3cd !important;
}

.permanent-highlighted {
  background-color: #d4edda !important;
}

.missing-translation {
  background-color: #f8d7da;
  color: #721c24;
}

.title-sentence {
  font-weight: bold;
  display: block;
  margin-bottom: 8px;
}

.poetry-line {
  display: block;
  margin-bottom: 2px;
}

.editing {
  display: block;
  background-color: #f0f9ff;
  padding: 8px;
  margin: 4px 0;
  border: 2px solid #409eff;
  border-radius: 4px;
}

.sentence-number {
  color: #6c757d;
  font-size: 0.85em;
  margin-right: 4px;
  font-weight: 500;
}

.sentence-number.clickable {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.sentence-number.clickable:hover {
  background-color: #409eff;
  color: white;
}

.sentence-text {
  font-size: 14px;
}

.sentence-edit {
  display: block;
  margin: 4px 0;
}

.sentence-edit :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
}

.sentence-actions {
  display: inline-block;
  margin-left: 12px;
  white-space: nowrap;
}

.sentence-actions .el-button {
  margin-left: 6px;
  font-size: 13px;
}

.sentence-edit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

.sentence-edit-actions .el-button {
  border-radius: 6px;
}

.edit-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  font-style: italic;
}

/* 暗色模式适配 */
html.dark .sentence-item:not(.editing):hover {
  background-color: #4a4a2a;
}

html.dark .highlighted {
  background-color: #4a4a2a !important;
}

html.dark .permanent-highlighted {
  background-color: #2a4a3a !important;
}

html.dark .missing-translation {
  background-color: #4a2a2a;
  color: #ff6b6b;
}

html.dark .editing {
  background-color: #2a2a3a;
  border-color: #409eff;
}

html.dark .sentence-number {
  color: #a0a0a0;
}

html.dark .sentence-edit-actions {
  border-top-color: #3a3a3a;
}
</style>
