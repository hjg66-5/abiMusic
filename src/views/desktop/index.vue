<template>
  <div class="size-full rounded-8px bg-[--right-bg-color]">
    <!-- 扫码登录组件 - 未登录时显示 -->
    <SaoMa v-if="!isLoggedIn" @login-success="handleLoginSuccess" />
    
    <!-- 登录成功后显示的内容 -->
    <div v-else class="size-full flex flex-col">
      <!-- 第二层：播放控制组件 -->
      <PlayControl class="h-16" />
      
      <!-- 第三层：左右28布局 -->
      <n-flex class="flex-1" :size="0" style="flex-direction: row;">
        <!-- 左边收藏夹列表 (20%) -->
        <Favorites class="w-[20%]" />
        <!-- 右边视频列表 (80%) -->
        <PlayList class="w-[80%]" />
      </n-flex>
    </div>
  </div>
</template>
<script setup lang="ts">
import Favorites from './layout/Favorites.vue'
import PlayList from './layout/PlayList.vue'
import SaoMa from './top/saoMa.vue'  // 导入扫码组件
import PlayControl from './top/PlayControl.vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted, onUnmounted, ref } from 'vue'
import { useMitt } from '@/hooks/useMitt.ts'

// 添加登录状态管理
const isLoggedIn = ref(false)

// 处理登录成功事件
const handleLoginSuccess = () => {
  isLoggedIn.value = true
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  window.addEventListener('keydown', handleKeyDown)
  // 监听扫码成功事件
  useMitt.on('bilibili-login-ok', handleLoginSuccess)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  // 移除事件监听
  useMitt.off('bilibili-login-ok', handleLoginSuccess)
})

// 添加键盘事件监听
const handleKeyDown = (e: KeyboardEvent) => {
  if (process.env.NODE_ENV !== 'development') {
    // 禁止F5刷新和F12开发者工具
    if (e.key === 'F5' || e.key === 'F12') {
      e.preventDefault()
      e.stopPropagation()
    }
  }
}
</script>
