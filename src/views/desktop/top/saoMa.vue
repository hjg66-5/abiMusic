<template>
  <!-- 添加v-if指令控制组件显示 -->
  <div class="login-container" v-if="isVisible">
    <div class="login-card">
      <h2 class="title">B站扫码登录</h2>
      <div class="qr-code-container">
        <!-- 使用骨架屏代替自定义加载状态 -->
        <n-skeleton v-if="loading" style="border-radius: 12px" :width="204" :height="204" :sharp="false" size="medium" />
        <!-- 使用n-qr-code组件替换qrcode-vue -->
        <div v-else-if="qrCodeKey" class="qr-code-placeholder relative">
          <n-qr-code
            :size="180"
            class="rounded-12px"
            :class="{ blur: scanStatus.show }"
            :value="qrCodeUrl"
            icon-src="/logo.png"
            error-correction-level="H"
            style="cursor: pointer; margin-bottom: 16px;"
            @click="refreshQrCode"
          />
          <!-- 添加二维码状态覆盖层 -->
          <n-flex
            v-if="scanStatus.show"
            vertical
            :size="12"
            align="center"
            class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <svg class="size-42px animate-pulse"><use :href="`#${scanStatus.icon}`"></use></svg>
            <span class="text-(16px #e3e3e3)">{{ scanStatus.text }}</span>
          </n-flex>
        </div>
        <div v-else-if="error" class="error-state">
          <p class="error-message">{{error}}</p>
          <button class="retry-btn" @click="fetchQrCode">重试</button>
        </div>
      </div>
      <div class="login-tips">
        <p>{{ loadText }}</p>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { generateLoginQrCode } from '@/service/bilibili.ts';
import { useMitt } from '@/hooks/useMitt.ts'
import { invoke } from "@tauri-apps/api/core";

// 添加控制组件显示的变量
const isVisible = ref(true);
const qrCodeUrl = ref('');
const qrCodeKey = ref('');
const loading = ref(true);
const error = ref('');
const countdown = ref(300);
let countdownTimer: number | null = null;
let pollTimer: number | null = null;
// 添加扫码状态管理
const scanStatus = ref<{
  status: 'error' | 'success' | 'auth'
  icon: 'cloudError' | 'success' | 'Security'
  text: string
  show: boolean
}>({ status: 'success', icon: 'success', text: '扫码成功', show: false });
const loadText = ref('请使用B站APP扫描二维码登录');
// 获取二维码
interface PollResponse {
  code: number;
  data: {
    url?: string;
    message: string;
    refresh_token?: string;
  };
}

// 获取二维码
const fetchQrCode = async () => {
  loading.value = true;
  error.value = '';
  try {
    // 使用统一封装的API服务
    const { qrCodeUrl: qrCodeUrlData, qrCodeKey: key } = await generateLoginQrCode();
    qrCodeUrl.value = qrCodeUrlData;
    qrCodeKey.value = key;
    startCountdown();
    startPolling();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取二维码时发生错误';
    console.error('获取二维码错误:', err);
  } finally {
    loading.value = false;
  }
};


// 开始倒计时
const startCountdown = () => {
  countdown.value = 300; // 修改为5分钟(300秒)
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = window.setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!);
      qrCodeUrl.value = '';
      error.value = '二维码已过期，请重新获取';
    }
  }, 1000);
};

// 轮询检查扫码状态
const startPolling = () => {
  // 添加授权超时计时器变量
  let authTimeoutTimer: number | null = null;

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = window.setInterval(async () => {
    try {
      // const qrcodedata = await pollQrCodeStatus(qrCodeKey.value);

      const qrcodedata =  await invoke<PollResponse>('poll_qr_code_status', {
          qrcodeKey: qrCodeKey.value
        });
      if (qrcodedata.data.url) {

        // 扫码成功状态 - 清除授权超时计时器
        if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
        useMitt.on('bilibili-login-ok', () => {
          scanStatus.value = { status: 'success', icon: 'success', text: '扫码成功', show: true };
          loadText.value = '登录中...';
        });
        //console.log("登录成功")
        // await getUserInfo();
        // await getFavoriteList();
        // await getFavoriteDetail();
        useMitt.emit('bilibili-login-ok');

        // 设置变量为false，隐藏组件
        isVisible.value = false;
      } else if (qrcodedata.data.message === '二维码已失效') {
        // 二维码失效 - 清除授权超时计时器
        if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
        clearInterval(pollTimer!);
        qrCodeKey.value = '';
        error.value = '二维码已失效，请重新获取';
        scanStatus.value.show = false;
      } else if (qrcodedata.data.message === '未扫码') {
        // 未扫码状态 - 清除授权超时计时器（如果存在）
        if (authTimeoutTimer) {
          clearTimeout(authTimeoutTimer);
          authTimeoutTimer = null;
        }
        //console.log('等待用户扫码...');
      } else if (qrcodedata.data.message === '二维码已扫码未确认') {
        // 等待授权状态 - 设置30秒超时计时器
        scanStatus.value = { status: 'auth', icon: 'Security', text: '扫码成功,等待授权', show: true };
        loadText.value = '等待授权...';

        // 如果计时器未设置，则创建新的30秒超时计时器
        if (!authTimeoutTimer) {
          authTimeoutTimer = window.setTimeout(() => {
            //console.log('授权超时，自动刷新二维码');
            // 清除轮询计时器
            clearInterval(pollTimer!);
            // 显示超时提示
            error.value = '授权超时，请重新扫码';
            scanStatus.value.show = false;
            // 刷新二维码
            refreshQrCode();
          }, 30000); // 30秒超时
        }
      } else {
        // 其他错误状态 - 清除授权超时计时器
        if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
        clearInterval(pollTimer!);
        error.value = `登录失败: ${qrcodedata.data.message || '未知错误'}`;
        scanStatus.value.show = false;
      }
    } catch (err) {
      // 异常情况 - 清除授权超时计时器
      if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
      console.error('轮询扫码状态失败:', err);
      clearInterval(pollTimer!);
      error.value = err instanceof Error ? err.message : '网络错误，请检查网络连接';
      scanStatus.value.show = false;
    }
  }, 3000);
};

// 组件挂载时获取二维码
onMounted(() => {
  fetchQrCode();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
  if (pollTimer) clearInterval(pollTimer);
});

const refreshQrCode = () => {
  // 重置状态
  scanStatus.value.show = false;
  error.value = '';
  qrCodeUrl.value = '';
  qrCodeKey.value = '';
  
  // 重新获取二维码
  fetchQrCode();
};

</script>
  

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-card {
  background: white;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 350px;
}

.title {
  color: #333;
  margin-bottom: 2rem;
}

.qr-code-container {
  margin-bottom: 1.5rem;
}

.qr-code-placeholder {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 15px;
  position: relative; /* 添加相对定位 */
}

.qr-code-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* 添加白色背景确保二维码清晰可见 */
  background-color: white;
  padding: 8px;
  box-sizing: border-box;
}

.expire-tip {
  font-size: 0.8rem;
  color: #999;
  margin-top: 5px;
}

.loading-state {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(251, 114, 153, 0.2);
  border-radius: 50%;
  border-top-color: #FB7299;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.error-message {
  color: #ff4d4f;
  margin-bottom: 1rem;
}

.retry-btn {
  background-color: #FB7299;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.login-tips {
  color: #666;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}
</style>