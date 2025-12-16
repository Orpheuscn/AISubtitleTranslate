<template>
  <el-card class="settings-card">
    <template #header>
      <div class="settings-header">
        <span>API 设置</span>
        <el-button
          text
          @click="visible = !visible"
          :icon="visible ? ArrowUp : ArrowDown"
        >
          {{ visible ? '隐藏' : '显示' }}
        </el-button>
      </div>
    </template>
    
    <el-collapse-transition>
      <div v-show="visible" class="settings-content">
        <el-form :model="localSettings" label-width="120px" @submit.prevent>
          <el-form-item label="API Key" required>
            <el-input
              v-model="localSettings.apiKey"
              type="password"
              placeholder="输入你的 DeepSeek API Key"
              show-password
              @change="updateApiKey"
            />
          </el-form-item>
          
          <el-form-item label="选择模型">
            <el-select v-model="localSettings.model" @change="updateModel">
              <el-option label="DeepSeek Chat" value="deepseek-chat" />
              <el-option label="DeepSeek Coder" value="deepseek-coder" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="批量处理字幕数">
            <el-input-number
              v-model="localSettings.batchSize"
              :min="1"
              :max="200"
              :step="1"
              @change="updateBatchSize"
              controls-position="right"
            />
            <span style="margin-left: 8px; color: #909399; font-size: 12px;">
              建议: 50-100条
            </span>
          </el-form-item>

          <el-form-item label="自定义翻译提示词">
            <el-input
              v-model="localSettings.customPrompt"
              type="textarea"
              :rows="4"
              placeholder="留空则使用系统默认提示词。自定义提示词将替换默认的翻译指令（不影响术语库处理）"
              @input="handleCustomPromptInput"
              @blur="handleCustomPromptBlur"
            />
            <div style="margin-top: 4px; color: #909399; font-size: 12px;">
              提示：自定义提示词仅用于翻译，不影响专有名词的处理逻辑。清空输入框将恢复使用系统默认提示词。
            </div>
          </el-form-item>
        </el-form>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { useTranslationStore } from '@/stores/translation'
import type { TranslationSettings } from '@/types'

const store = useTranslationStore()
const visible = ref(false)

const localSettings = reactive<TranslationSettings>({
  apiKey: store.settings.apiKey,
  model: store.settings.model,
  batchSize: store.settings.batchSize,
  customPrompt: store.settings.customPrompt || ''
})

// 监听store变化并同步到本地
watch(() => store.settings, (newSettings) => {
  Object.assign(localSettings, newSettings)
}, { deep: true })

function updateApiKey(value: string) {
  store.updateSettings({ apiKey: value })
}

function updateModel(value: 'deepseek-chat' | 'deepseek-coder') {
  store.updateSettings({ model: value })
}

function updateBatchSize(value: number | undefined) {
  if (value && value >= 1 && value <= 200) {
    store.updateSettings({ batchSize: value })
  }
}

let customPromptTimer: ReturnType<typeof setTimeout> | null = null

// 输入时防抖更新
function handleCustomPromptInput(value: string) {
  if (customPromptTimer) {
    clearTimeout(customPromptTimer)
  }
  customPromptTimer = setTimeout(() => {
    updateCustomPrompt(value)
  }, 500)
}

// 失去焦点时立即更新
function handleCustomPromptBlur() {
  if (customPromptTimer) {
    clearTimeout(customPromptTimer)
  }
  updateCustomPrompt(localSettings.customPrompt || '')
}

function updateCustomPrompt(value: string) {
  const trimmedValue = value.trim()
  // 如果为空，传递空字符串以触发删除 localStorage
  store.updateSettings({ customPrompt: trimmedValue })
  console.log('📝 更新自定义提示词:', {
    isEmpty: !trimmedValue,
    length: trimmedValue.length,
    preview: trimmedValue.substring(0, 50)
  })
}
</script>

<style scoped>
.settings-card {
  margin-bottom: 16px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.settings-content {
  padding-top: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-input), :deep(.el-select) {
  width: 100%;
}

/* 暗色模式适配 */
html.dark .settings-card :deep(.el-card) {
  background-color: #1e1e1e;
  border-color: #3a3a3a;
}

html.dark .settings-card :deep(.el-card__header) {
  background-color: #252525;
  border-bottom-color: #3a3a3a;
}

html.dark .settings-header {
  color: #e5e5e5;
}
</style>
