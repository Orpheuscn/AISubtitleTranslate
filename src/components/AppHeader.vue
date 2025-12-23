<template>
  <header class="app-header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="app-title">字幕翻译器</h1>
        <div v-if="totalSubtitles > 0" class="progress-info">
          <span class="progress-text">
            {{ translatedCount }}/{{ totalSubtitles }}
            <span class="progress-percentage">({{ progressPercentage }}%)</span>
          </span>
          <span
            v-if="missingCount > 0"
            class="missing-count"
            @click="$emit('retranslate-missing')"
            :title="`点击重译 ${missingCount} 条缺失的字幕`"
          >
            {{ missingCount }} 条缺失
          </span>
        </div>
      </div>
      
      <div class="header-right">
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ThemeToggle from './ThemeToggle.vue'

interface Props {
  totalSubtitles?: number
  translatedCount?: number
  missingCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalSubtitles: 0,
  translatedCount: 0,
  missingCount: 0
})

const progressPercentage = computed(() => {
  if (props.totalSubtitles === 0) return 0
  return Math.round((props.translatedCount / props.totalSubtitles) * 100)
})

// 定义事件
defineEmits<{
  'retranslate-missing': []
}>()
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}

.progress-text {
  color: #606266;
  font-weight: 500;
}

.progress-percentage {
  color: #409eff;
  font-weight: 600;
}

.missing-count {
  padding: 2px 8px;
  background-color: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.missing-count:hover {
  background-color: #fde2e2;
  transform: translateY(-1px);
}

.header-right {
  display: flex;
  align-items: center;
}

/* 暗色模式 */
html.dark .app-header {
  background-color: #1d1e1f;
  border-bottom-color: #414243;
}

html.dark .app-title {
  color: #e5e5e5;
}

html.dark .progress-text {
  color: #a8abb2;
}

html.dark .missing-count {
  background-color: #3a2a2b;
  color: #f89898;
}

html.dark .missing-count:hover {
  background-color: #4a3a3b;
}
</style>

