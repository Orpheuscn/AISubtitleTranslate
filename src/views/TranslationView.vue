<template>
  <div class="translation-container">
    <!-- 主题切换 -->
    <div class="top-bar">
      <ThemeToggle />
    </div>
    
    <!-- API设置 -->
    <ApiSettings />

    <!-- 错误提示 -->
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="error-alert"
    />

    <!-- 专有名词索引 -->
    <ProperNounIndex />

    <!-- 文本区域 -->
    <div class="text-container">
      <div class="text-columns">
        <TextColumn
          title="源语言文本"
          :sentences="store.sourceSentences"
          :highlighted-index="store.highlightedIndex"
          :permanent-highlight-index="store.permanentHighlightIndex"
          :has-api-key="!!store.settings.apiKey"
          is-source
          @paste="handlePaste"
          @translate="handleTranslate"
          @highlight="handleHighlight"
        />
        
        <TextColumn
          title="中文译文"
          :sentences="store.targetSentences"
          :highlighted-index="store.highlightedIndex"
          :permanent-highlight-index="store.permanentHighlightIndex"
          @copy="handleCopy"
          @highlight="handleHighlight"
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
import { useTextProcessing } from '@/composables/useTextProcessing'
import { useTranslationAPI } from '@/composables/useTranslationAPI'
import ApiSettings from '@/components/ApiSettings.vue'
import ProperNounIndex from '@/components/ProperNounIndex.vue'
import TextColumn from '@/components/TextColumn.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const store = useTranslationStore()
const { splitSentencesWithNLP, getCleanTranslationText } = useTextProcessing()
const { translateBatch, retranslateSentence } = useTranslationAPI()

const errorMessage = ref('')

// 处理粘贴文本
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      ElMessage.warning('剪贴板为空')
      return
    }

    const sentences = splitSentencesWithNLP(text)
    store.setSourceSentences(sentences)
    
    errorMessage.value = ''
    ElMessage.success('文本已粘贴')
  } catch (error) {
    console.error('粘贴失败:', error)
    ElMessage.error('无法访问剪贴板，请手动粘贴文本')
  }
}

// 处理复制译文
function handleCopy() {
  const text = getCleanTranslationText(store.targetSentences)
  if (!text) {
    ElMessage.warning('没有可复制的译文')
    return
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      ElMessage.success('译文已复制到剪贴板')
    })
    .catch((error) => {
      console.error('复制失败:', error)
      ElMessage.error('复制失败')
    })
}

// 处理高亮
function handleHighlight(index: number, permanent = false) {
  store.setHighlight(index, permanent)
}

// 处理重译
async function handleRetranslate(index: number) {
  if (!store.settings.apiKey) {
    ElMessage.error('请输入API Key')
    return
  }

  try {
    await retranslateSentence(index, store.settings.apiKey, store.settings.model)
    ElMessage.success('重译完成')
  } catch (error: any) {
    console.error('重译失败:', error)
    ElMessage.error(`重译失败: ${error.message}`)
  }
}

// 处理编辑
function handleEdit(index: number, newText: string) {
  if (store.targetSentences[index]) {
    store.targetSentences[index].text = newText
    store.targetSentences[index].isMissing = false
    ElMessage.success('编辑已保存')
  }
}

// 处理翻译
async function handleTranslate() {
  if (!store.settings.apiKey) {
    ElMessage.error('请输入DeepSeek API Key')
    return
  }

  if (!store.hasSourceText) {
    ElMessage.error('请先输入或粘贴源文本')
    return
  }

  try {
    await translateBatch(
      store.sourceSentences,
      store.settings.apiKey,
      store.settings.model,
      store.settings.batchSize
    )

    if (store.missingTranslationsCount === 0) {
      ElMessage.success('翻译完成！')
    } else {
      ElMessage.warning(`翻译完成，但有 ${store.missingTranslationsCount} 个句子缺失或出错`)
    }
  } catch (error: any) {
    console.error('翻译失败:', error)
    ElMessage.error(`翻译失败: ${error.message}`)
  }
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

.error-alert {
  margin-bottom: 16px;
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
