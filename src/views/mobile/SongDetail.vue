<template>
  <div class="detail-container">
    <!-- 返回按钮 -->
    <button class="back-btn" @click="goBack">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 19L5 12L12 5" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      返回列表
    </button>

    <!-- 歌曲详情主体 -->
    <div class="detail-main">
      <div class="detail-cover">
        <img src="https://picsum.photos/500/500" alt="歌曲封面" class="cover-img">
      </div>

      <div class="detail-info">
        <h1 class="detail-title">样例歌曲标题</h1>
        <p class="detail-artist">样例歌手</p>
        <p class="detail-album">收藏夹: 我的音乐收藏</p>
        <div class="detail-meta">
          <span>时长: 04:15</span>
          <span>上传时间: 2023-05-18</span>
          <span>UP主: B站音乐达人</span>
        </div>

        <div class="action-buttons">
          <button class="play-now-btn">立即播放</button>
          <button class="add-to-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            加入列表
          </button>
        </div>
      </div>
    </div>

    <!-- 歌词区域 -->
    <div class="lyrics-container">
      <h2>歌词</h2>
      <div class="lyrics-content">
        <p class="lyric">[00:00.00] 歌曲名称 - 歌手名称</p>
        <p class="lyric">[00:05.20] 这是样例歌词第一句</p>
        <p class="lyric">[00:10.40] 这是样例歌词第二句</p>
        <p class="lyric active">[00:15.60] 这是当前播放的歌词</p>
        <p class="lyric">[00:20.80] 这是样例歌词第四句</p>
        <p class="lyric">[00:26.00] 这是样例歌词第五句</p>
        <p class="lyric">[00:31.20] 这是样例歌词第六句</p>
        <p class="lyric">[00:36.40] 这是样例歌词第七句</p>
        <p class="lyric">[00:41.60] 这是样例歌词第八句</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.go(-1);
};
</script>

<style scoped>
.detail-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  margin-bottom: 30px;
  padding: 5px 0;
}

.detail-main {
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
}

.detail-cover {
  flex-shrink: 0;
}

.cover-img {
  width: 350px;
  height: 350px;
  border-radius: 15px;
  object-fit: cover;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.detail-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.detail-title {
  font-size: 2.5rem;
  margin-bottom: 15px;
  color: #333;
}

.detail-artist {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 10px;
}

.detail-album {
  color: #999;
  margin-bottom: 25px;
}

.detail-meta {
  display: flex;
  gap: 20px;
  color: #666;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 15px;
}

.play-now-btn {
  background-color: #FB7299;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-to-btn {
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lyrics-container {
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 25px;
}

.lyrics-container h2 {
  margin-bottom: 20px;
  color: #333;
}

.lyrics-content {
  line-height: 2;
  text-align: center;
  max-height: 300px;
  overflow-y: auto;
  padding: 20px 0;
}

.lyric {
  color: #666;
  margin: 5px 0;
}

.lyric.active {
  color: #FB7299;
  font-weight: 500;
}

@media (max-width: 768px) {
  .detail-main {
    flex-direction: column;
    align-items: center;
  }
}
</style>