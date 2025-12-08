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
            <el-select v-model="localSettings.batchSize" @change="updateBatchSize">
              <el-option :label="30" :value="30" />
              <el-option :label="50" :value="50" />
              <el-option :label="100" :value="100" />
            </el-select>
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
  batchSize: store.settings.batchSize
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

function updateBatchSize(value: 30 | 50 | 100) {
  store.updateSettings({ batchSize: value })
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
