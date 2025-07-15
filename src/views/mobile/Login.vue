<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="title">B站扫码登录</h2>
      <div class="qr-code-container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>正在获取二维码...</p>
        </div>
        <!-- 使用QR码组件代替img标签 -->
        <div v-else-if="qrCodeKey" class="qr-code-placeholder">
          <qrcode-vue 
            ref="qrRef"
            :value="qrCodeUrl" 
            :size="200" 
            class="qr-code-img" 
            style="margin-bottom: 16px; cursor: pointer;" 
            @click="refreshQrCode"/>
        </div>
        <div v-else-if="error" class="error-state">
          <p class="error-message">{{error}}</p>
          <button class="retry-btn" @click="fetchQrCode">重试</button>
        </div>
      </div>
        <!-- 手机移动端增加下载二维码跳转哔哩哔哩app进行扫一扫 -->
      <!-- <button class="retry-btn" @click="openBilibili">跳转哔哩哔哩扫一扫</button> -->
       <button @click="showToast" style="color: chocolate;" :disabled="error!=''">保存二维码到B站APP扫一扫</button>
      <div class="login-tips">
        <p>请使用B站APP扫描二维码登录</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted ,onBeforeMount} from 'vue';
import { useRouter } from 'vue-router';
// 导入QR码组件
import QrcodeVue from 'qrcode.vue';
import { invoke } from "@tauri-apps/api/core";
import { Store } from '@tauri-apps/plugin-store';
import { generateLoginQrCode } from '../../service/bilibili';
import { ping } from "tauri-plugin-openbiliscan-api";

// 二维码内容和配置
const qrRef = ref<any | null>(null);
 
async function showToast() {
    await ping(qrCodeUrl.value);
}

onBeforeMount(async () => {
    await invoke<string>('clear_cookies');
    getCookie()
    // Store 会在 JavaScript 绑定时自动加载。
    const store = await Store.load('store.bin');

    // 设置一个值。
    await store.set('some-key', { value: 5 });

    // 获取一个值。
    const val = await store.get('some-key');
    console.log(val); // { value: 5 }

    // 您可以在进行更改后手动保存存储
    // 否则如上所述，它将在正常退出时保存。
    await store.save();
});


const router = useRouter();
const qrCodeUrl = ref('');
const qrCodeKey = ref('');
const loading = ref(true);
const error = ref('');
const countdown = ref(300); // 二维码有效期180秒
let countdownTimer: number | null = null;
let pollTimer: number | null = null;

// 获取二维码
interface PollResponse {
  code: number;
  data: {
    url?: string;
    message: string;
    refresh_token?: string;
  };
}

const getCookie = async () => {
    const cookie = await invoke<string>('get_cookie_from_store', { cookieName: 'bili_jct' });
    console.log(cookie);
}

const fetchQrCode = async () => {
  loading.value = true;
  error.value = '';
  try {
    // 添加类型断言
    // const response = await invoke<QrCodeResponse>('fetch_qr_code');
    const response = await generateLoginQrCode();
    if (response.qrCodeUrl) {
      qrCodeUrl.value = response.qrCodeUrl;
      qrCodeKey.value = response.qrCodeKey;
      startCountdown();
      startPolling();
    } else {
      error.value = `获取二维码失败: ${response || '未知错误'}`;
      console.error('获取二维码失败:', response);
    }
  } catch (err) {
    error.value = '获取二维码时发生错误';
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
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = window.setInterval(async () => {
      try {
        // 添加类型断言
        const qrcodedata = await invoke<PollResponse>('poll_qr_code_status', {
          qrcodeKey: qrCodeKey.value
        });
        if (qrcodedata.code === 0 && qrcodedata.data && qrcodedata.data.url) {
          // 扫码成功
          router.push('/player');
        } else if (qrcodedata.data && qrcodedata.data.message === '二维码已失效') {
          // 二维码已失效
          clearInterval(pollTimer!);
          qrCodeKey.value = '';
          error.value = '二维码已失效，请重新获取';
          console.error('该二维码已失效，请重新获取二维码');
        } else if (qrcodedata.data && qrcodedata.data.message === '未扫码') {
          console.log('等待用户扫码...');
        } else if (qrcodedata.data && qrcodedata.data.message === '二维码已扫码未确认') {
          console.log('等待用户确认...');
        } else {
          // 其他错误
          clearInterval(pollTimer!);
          error.value = `登录失败: ${qrcodedata.data?.message || '未知错误'}`;
          console.error(`登录失败: ${qrcodedata.data?.message || '未知错误'}`);
        }
      } catch (err) {
        console.error('轮询扫码状态失败:', err);
        clearInterval(pollTimer!);
        error.value = '网络错误，请检查网络连接';
      }
    }, 1000);
  };

// 组件挂载时获取二维码
onMounted(async () => {
  fetchQrCode();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
  if (pollTimer) clearInterval(pollTimer);
});

const refreshQrCode = () => {
  // 清除现有定时器
  if (countdownTimer) clearInterval(countdownTimer);
  if (pollTimer) clearInterval(pollTimer);
  
  // 重置状态
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