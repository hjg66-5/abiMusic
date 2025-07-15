<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
/* 添加全局CSS变量 */
:root {
  --right-bg-color: #ffffff;
  --chat-text-color: #333333;
  --line-color: #e5e7eb;
  --bate-bg: #ff4d4f;
  --bate-color: #ffffff;
  --text-color: #333333;
}

/* 其他全局样式 */
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>