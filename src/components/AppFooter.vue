<template>
  <footer class="app-footer">
    <div class="footer-content">
      <p class="footer-text">支持字幕翻译、校对、合并，以及字幕格式转换。</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
// Footer 组件 - 非固定，滚动到底部可见
</script>

<style scoped>
.app-footer {
  width: 100%;
  padding: 24px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color);
  margin-top: 40px;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.footer-text {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
}

/* 暗色模式适配 */
html.dark .app-footer {
  background-color: var(--el-bg-color);
  border-top-color: var(--el-border-color);
}
</style>

