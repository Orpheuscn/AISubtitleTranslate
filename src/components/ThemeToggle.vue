<template>
  <div class="theme-toggle">
    <el-switch
      v-model="isDark"
      inline-prompt
      :active-icon="Moon"
      :inactive-icon="Sunny"
      active-text="暗色"
      inactive-text="亮色"
      @change="toggleTheme"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'

const isDark = ref(false)

// 初始化主题
onMounted(() => {
  // 从 localStorage 读取主题偏好
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 应用主题
  applyTheme(isDark.value)
})

function toggleTheme(value: boolean) {
  applyTheme(value)
  // 保存到 localStorage
  localStorage.setItem('theme', value ? 'dark' : 'light')
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  padding: 8px;
}
</style>

