<template>
  <div id="app">
    <TranslationView />
  </div>
</template>

<script setup lang="ts">
import TranslationView from './views/TranslationView.vue'
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
  transition: background-color 0.3s ease;
}

/* 暗色模式 */
html.dark #app {
  background-color: #141414;
}

html.dark body {
  background-color: #141414;
  color: #e5e5e5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>