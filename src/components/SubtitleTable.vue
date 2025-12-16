<template>
  <el-card class="subtitle-table-card">
    <template #header>
      <div class="table-header">
        <span class="file-name">{{ fileName || '未加载文件' }}</span>
        <div class="header-buttons">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".srt,.ass,.ssa,.vtt"
            :on-change="handleFileSelect"
          >
            <el-button
              size="default"
              :icon="Upload"
            >
              选择字幕文件
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
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".srt,.ass,.ssa,.vtt"
            :on-change="handleTranslationFileSelect"
          >
            <el-button
              size="default"
              :icon="Upload"
            >
              导入译文
            </el-button>
          </el-upload>
          <el-dropdown @command="handleSaveCommand" :disabled="subtitles.length === 0">
            <el-button
              size="default"
              :icon="Download"
              :disabled="subtitles.length === 0"
            >
              保存字幕
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="source">保存原文 (SRT)</el-dropdown-item>
                <el-dropdown-item command="translation" :disabled="!hasTranslation">保存译文 (SRT)</el-dropdown-item>
                <el-dropdown-item command="bilingual" :disabled="!hasTranslation">保存双语字幕 (ASS)</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <div
      class="table-content"
      ref="contentRef"
      :class="{ 'drag-over': isDragging }"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
    >
      <div v-if="subtitles.length === 0" class="empty-prompt">
        拖入字幕文件或点击"选择字幕文件"按钮...<br>
        <span style="font-size: 12px; color: #909399;">支持 SRT、ASS、SSA、VTT 格式</span>
      </div>

      <table v-else class="subtitle-table">
        <thead>
          <tr>
            <th style="width: 60px;">序号</th>
            <th style="width: 120px;">起始时间</th>
            <th style="width: 120px;">结束时间</th>
            <th style="width: 35%;">原文</th>
            <th style="width: 35%;">译文</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in subtitles" :key="row.index">
            <td class="center">{{ row.index }}</td>
            <td>
              <input
                v-model="row.startTime"
                type="text"
                @blur="handleTimeEdit(row)"
              />
            </td>
            <td>
              <input
                v-model="row.endTime"
                type="text"
                @blur="handleTimeEdit(row)"
              />
            </td>
            <td>
              <textarea
                v-model="row.text"
                @change="handleSourceEdit(row)"
                rows="2"
              ></textarea>
            </td>
            <td>
              <textarea
                v-model="row.translatedText"
                @change="handleTranslationEdit(row)"
                placeholder="等待翻译..."
                rows="2"
              ></textarea>
            </td>
            <td class="actions">
              <button @click="handleRetranslate(row.index)" class="btn-retranslate">重译</button>
              <button @click="handleDelete(row.index)" class="btn-delete">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Download, Promotion, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { SubtitleEntry } from '@/types'
import type { UploadFile } from 'element-plus'

interface Props {
  subtitles: SubtitleEntry[]
  highlightedIndex?: number
  hasApiKey?: boolean
  fileName?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightedIndex: -1,
  hasApiKey: false,
  fileName: ''
})

const emit = defineEmits<{
  fileSelected: [file: File]
  translationFileSelected: [file: File]
  translate: []
  download: [type: 'source' | 'translation' | 'bilingual']
  retranslate: [index: number]
  edit: [index: number, newText: string]
  editSource: [index: number, newText: string]
  delete: [index: number]
}>()

const contentRef = ref<HTMLElement>()
const isDragging = ref(false)

// 检查是否有译文
const hasTranslation = computed(() => {
  return props.subtitles.some(s => s.translatedText && !s.isMissing)
})



// 处理时间编辑
function handleTimeEdit(row: SubtitleEntry) {
  // 时间已更新，无需提示
}

// 处理原文编辑
function handleSourceEdit(row: SubtitleEntry) {
  emit('editSource', row.index, row.text)
}

// 处理译文编辑
function handleTranslationEdit(row: SubtitleEntry) {
  emit('edit', row.index, row.translatedText || '')
}

// 处理重译
function handleRetranslate(index: number) {
  emit('retranslate', index)
}

// 处理删除
function handleDelete(index: number) {
  emit('delete', index)
}

// 处理保存命令
function handleSaveCommand(command: string) {
  emit('download', command as 'source' | 'translation' | 'bilingual')
}

// 验证字幕文件格式
function isValidSubtitleFile(filename: string): boolean {
  const validExtensions = ['.srt', '.ass', '.ssa', '.vtt']
  return validExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

// 处理文件选择
function handleFileSelect(file: UploadFile) {
  if (file.raw) {
    if (!isValidSubtitleFile(file.name)) {
      ElMessage.error('请选择字幕文件（支持 SRT、ASS、SSA、VTT 格式）')
      return
    }
    emit('fileSelected', file.raw)
  }
}

// 处理译文文件选择
function handleTranslationFileSelect(file: UploadFile) {
  if (file.raw) {
    if (!isValidSubtitleFile(file.name)) {
      ElMessage.error('请选择字幕文件（支持 SRT、ASS、SSA、VTT 格式）')
      return
    }
    emit('translationFileSelected', file.raw)
  }
}

// 处理拖放
function handleDrop(event: DragEvent) {
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]
  if (!isValidSubtitleFile(file.name)) {
    ElMessage.error('请拖入字幕文件（支持 SRT、ASS、SSA、VTT 格式）')
    return
  }

  emit('fileSelected', file)
}


</script>

<style scoped>
.subtitle-table-card {
  margin-top: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-weight: 500;
  color: #409eff;
  font-size: 14px;
}

.header-buttons {
  display: flex;
  gap: 12px;
}

.table-content {
  min-height: 400px;
  transition: background-color 0.3s;
}

.table-content.drag-over {
  background-color: rgba(64, 158, 255, 0.1);
  border: 2px dashed #409eff;
}

.empty-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #909399;
  font-size: 16px;
}

.subtitle-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.subtitle-table thead {
  position: sticky;
  top: 0;
  background-color: #f5f7fa;
  z-index: 10;
}

.subtitle-table th {
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.subtitle-table td {
  padding: 4px;
  border: 1px solid #dcdfe6;
  vertical-align: top;
}

.subtitle-table td.center {
  text-align: center;
  vertical-align: middle;
  color: #909399;
}

.subtitle-table input,
.subtitle-table textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.subtitle-table input:focus,
.subtitle-table textarea:focus {
  border-color: #409eff;
  background-color: #fff;
}

.subtitle-table textarea {
  min-height: 40px;
}

.subtitle-table td.actions {
  text-align: center;
  vertical-align: middle;
}

.subtitle-table button {
  padding: 4px 12px;
  margin: 0 2px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retranslate {
  background-color: #409eff;
  color: white;
}

.btn-retranslate:hover {
  background-color: #66b1ff;
}

.btn-delete {
  background-color: #f56c6c;
  color: white;
}

.btn-delete:hover {
  background-color: #f78989;
}

/* 暗色模式适配 */
html.dark .subtitle-table thead {
  background-color: #1d1e1f;
}

html.dark .subtitle-table th {
  color: #e5e5e5;
  border-color: #414243;
}

html.dark .subtitle-table td {
  border-color: #414243;
}

html.dark .subtitle-table input:focus,
html.dark .subtitle-table textarea:focus {
  background-color: #1d1e1f;
}

html.dark .empty-prompt {
  color: #909399;
}
</style>


