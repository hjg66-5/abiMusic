<template>
  <div class="player-container">
    <!-- 顶部导航 -->
    <header class="player-header">
      <h3>{{ name }}</h3>
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </header>

    <!-- 主播放区域 -->
    <main class="player-main">
      <div class="album-cover">
        <img src="https://picsum.photos/400/400" alt="专辑封面" class="cover-img">
      </div>

      <div class="song-info">
        <h2 class="song-title">样例歌曲标题</h2>
        <p class="song-artist">样例歌手{{ currentVideo.author }}</p>
        <p class="song-album">收藏夹: 我的音乐收藏</p>
      </div>

      <!-- 播放控制 -->
      <div class="player-controls">
        <div class="progress-container">
          <span class="time current">02:30</span>
          <div class="progress-bar">
            <div class="progress" :style="{ width: '35%' }"></div>
          </div>
          <span class="time total">04:15</span>
        </div>

        <div class="control-buttons">
          <button class="control-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6L10 12L3 18V6Z" fill="#333"/>
              <path d="M14 6L21 12L14 18V6Z" fill="#333"/>
            </svg>
          </button>
          <button class="control-btn prev">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 20L9 12L19 4V20Z" fill="#333"/>
              <path d="M5 19V5" stroke="#333" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="control-btn play">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#FB7299"/>
              <path d="M9 16L16 12L9 8V16Z" fill="white"/>
            </svg>
          </button>
          <button class="control-btn next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 4L15 12L5 20V4Z" fill="#333"/>
              <path d="M19 5V19" stroke="#333" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="control-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3H18V21H6V3Z" fill="#333"/>
              <path d="M12 8V16" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <!-- 添加音频播放元素 -->
      <audio ref="audioPlayer" :src="playerUrl" controls ></audio>
    </main>

    <!-- 歌曲列表 -->
    <div class="song-list">
      <h3>收藏夹歌曲</h3>
      <ul>
        <!-- 使用v-for循环渲染动态列表 -->
        <li v-for="(song, index) in songList.list" 
        @click="playVideo(song.bvid)"
        class="song-item" >
          <div class="song-item-info">
            <span class="song-number">{{ index + 1 }}</span>
            <div class="song-item-details">
              <span class="song-item-title">{{ song.title }}</span>
              <span class="song-item-artist">{{ song.author }}</span>
            </div>
          </div>
          <span class="song-duration">{{ (song.duration) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { getUserInfo,
  getFavoriteInfo,
  getVideoInfo,
  getVideoStreamUrl,
  getFavoriteDetail 
} from '../../service/bilibili';
import { invoke } from "@tauri-apps/api/core";
import { onBeforeMount,onMounted,ref} from 'vue';
// import { AppException } from '../../utils/exception';
import { eventBus } from '../..//utils/eventBus';

const router = useRouter();
const name = ref('');
// 定义响应式变量存储歌曲列表
const songList = ref({
  list: [] as Array<{
    bvid: string;
    title: string;
    author: string;
    duration: number;
    thumbnail: string;
  }>
});
const currentVideo = ref<{
  bvid: string;
  title: string;
  author: string;
  thumbnail: string;
}>({
  bvid: '',
  title: '',
  author: '',
  thumbnail: ''
});
const playerUrl = ref('')
const duration = ref(0);

const handleLogout = () => {
  router.push('/');
};

// const goToDetail = () => {
//   router.push('/song-detail');
// };


onBeforeMount(async () => {
  const cookie_SESSDATA = await invoke<string>('get_cookie_from_store', { cookieName: 'SESSDATA' });
  // console.log(cookie_SESSDATA);
  const userInfo = await getUserInfo(cookie_SESSDATA);
  name.value = userInfo.uname!
  // console.log(response);
})

onMounted(async () => {
  const favoriteInfo = await getFavoriteInfo(4250885866);
  const detail =  await getFavoriteDetail(favoriteInfo.id!,20,1);
  songList.value.list = detail.videos || [];
  eventBus.emit('songList', { data: songList.value.list });
})


const playVideo = async (bvid: string) => {
  currentVideo.value.bvid = bvid;
  try {
    // 获取视频信息
    const videoInfo = await getVideoInfo(bvid)
    console.log(videoInfo);
    currentVideo.value = {
      bvid: videoInfo.bvid,
      title: videoInfo.title,
      author: videoInfo.author,
      thumbnail: videoInfo.thumbnail
    }

    // 获取音频URL
    const videoStreamUrl = await getVideoStreamUrl(bvid, videoInfo.cid)
    console.log(videoStreamUrl);
    playerUrl.value = videoStreamUrl;
    duration.value=videoInfo.duration;

       // 添加音频播放逻辑
    const audioElement = ref<HTMLAudioElement | null>(null);
    // 等待DOM更新后再播放
    if (audioElement.value) {
      audioElement.value.play().catch(error => {
        console.error('音频播放失败:', error);
      });
    }

  } catch (error) {
    console.error('播放视频失败:', error)
  }
}



</script>

<style scoped>
.player-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.logout-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
}

.player-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.album-cover {
  margin-bottom: 20px;
}

.cover-img {
  width: 300px;
  height: 300px;
  border-radius: 15px;
  object-fit: cover;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.song-info {
  text-align: center;
  margin-bottom: 30px;
}

.song-title {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #333;
}

.song-artist, .song-album {
  color: #666;
  margin: 5px 0;
}

.progress-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.time {
  color: #666;
  font-size: 0.9rem;
}

.progress-bar {
  flex-grow: 1;
  height: 4px;
  background-color: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background-color: #FB7299;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.control-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
}

.control-btn.play {
  padding: 0;
}

.song-list {
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
}

.song-list h3 {
  margin-bottom: 15px;
  color: #333;
}

.song-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.song-item:hover {
  background-color: #f0f0f0;
}

.song-item.active {
  background-color: rgba(251, 114, 153, 0.1);
}

.song-item-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.song-number {
  color: #999;
  width: 20px;
  text-align: center;
}

.song-item-details {
  display: flex;
  flex-direction: column;
}

.song-item-title {
  color: #333;
  font-weight: 500;
}

.song-item-artist {
  color: #999;
  font-size: 0.8rem;
}

.song-duration {
  color: #999;
  font-size: 0.9rem;
}
</style>