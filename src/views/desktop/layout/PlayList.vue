<template>
  <!-- <div class="player-container"> -->

  <!-- 设置的主体内容  -->
  <n-scrollbar  ref="scrollbarRef" style="max-height: calc(100vh - 10px)">
      <!-- 歌曲列表 -->
    <div class="song-list">
      <!-- 添加水平布局容器 -->
      <div class="header-container">
        <span class="inline-block w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center"
        title="
        随机播放模式会进入探索模式 ---------------->
        <----- 阿哔会自己到bilibili找音乐放到本地"
        >!</span>
        <h3>收藏夹歌曲({{favoriteVideos.list.length}}/{{ favoriteCount }})</h3>
        <!-- 搜索歌曲,名称和作者正则匹配 -->
        <div class="search-container">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="回车搜索歌曲名称或作者..."
            class="search-input"
            @keyup.enter="handleSearch" 
          >
        </div>
      </div>
      <div>
        <ul>
          <li v-for="(item, index) in filteredSongs.list"
              :key="item.bvid"
              class="song-item active"
              @click="goToDetail(item.bvid)">
            <div class="song-item-info">
              <span class="song-number">{{ index + 1 }}</span>
              <!-- 视频歌曲的封面图片 -->
              <img :src="item.thumbnail" alt="封面图片">
              <div class="song-item-details">
                <span class="song-item-title">{{item.title}}</span>
                <span class="song-item-artist">{{item.author}}</span>
              </div>
            </div>
            <span class="song-duration">{{ formatDuration(item.duration) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useMitt } from '@/hooks/useMitt.ts'
import {  getFavoriteDetail,getAvatarWithCache} from '@/service/bilibili.ts';
import { ref ,onUnmounted,onMounted } from 'vue';

// 添加滚动条ref
// 添加n-scrollbar的类型定义
const scrollbarRef = ref<{ scrollTo: (options: { top: number }) => void }>();

let mediaId = ref(0);
const goToDetail = (bvid: string) => {
  useMitt.emit('goPlayMusic', bvid)
};

// 在goToDetail函数下方添加
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};


// 收藏夹视频列表
const favoriteVideos = ref({
  list: [] as Array<{
    bvid: string;
    title: string;
    author: string;
    duration: number;
    thumbnail: string;
  }>
});

// 搜索相关
const searchQuery = ref('');

// 过滤后的歌曲列表（正则匹配名称和作者）
const filteredSongs = ref({
  list: [] as Array<{
    bvid: string;
    title: string;
    author: string;
    duration: number;
    thumbnail: string;
  }>
});

// 添加搜索方法
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    filteredSongs.value.list = favoriteVideos.value.list;
    useMitt.emit('video-list-updated', filteredSongs.value.list);
    return;
  }
  const regex = new RegExp(searchQuery.value.trim(), 'i');
  let returnList = favoriteVideos.value.list.filter(item => 
    regex.test(item.title) || regex.test(item.author)
  );
  try {
    console.log("搜索", mediaId.value, 20, 1, searchQuery.value.trim());
    const searchQueryList = await getFavoriteDetail(mediaId.value, 20, 1, searchQuery.value.trim());
    const remoteSongs = searchQueryList?.videos || [];
    // 合并去重逻辑
    const mergedSongs = Array.from(
      new Map([...returnList, ...remoteSongs].map(item => [item.bvid, item])).values()
    );
    // 处理封面图
    returnList = await Promise.all(
      mergedSongs.map(async (item) => ({...item, thumbnail: await getAvatarWithCache(item.thumbnail)}))
    );
  } catch (error) {
    // 保留本地过滤结果
  }

  filteredSongs.value.list = returnList;
  useMitt.emit('video-list-updated', returnList);

  favoriteVideos.value.list = Array.from(
    new Map([...returnList, ...favoriteVideos.value.list].map(item => [item.bvid, item])).values()
  );
};

let numTop = 0

// 一键回到顶部
useMitt.on('toTop', async () => {
    if (scrollbarRef.value) {
       numTop = 0
        // 调用n-scrollbar的滚动到顶部方法
        scrollbarRef.value.scrollTo({ top: 0 });
      }
})


// 一键到底部
useMitt.on('toBottom', async (num) => {
  if (scrollbarRef.value) {
    // 滚动到最底部
    numTop += num
    scrollbarRef.value.scrollTo({ top: numTop });

  }
})

// 收藏夹数量
const favoriteCount = ref(0)
useMitt.on('favorite-count-change', (count) => {
  favoriteCount.value = count;
})
let loadMoreTimer: any = null;
const isRunning = ref(false)


onMounted(async () => {
  // 默认只请求当前收藏夹前3页
  useMitt.on('favorite-change', async ({id,count}) => {
    mediaId.value = id;
    favoriteVideos.value.list = [];
    let currentPage = 1;
    const MAX_INITIAL_PAGES = 3; // 初始加载3页(60首)
    const BATCH_SIZE = 20; // 每次加载20首
    const MAX_TOTAL_SONGS = 200>count?count:200; // 最大歌曲总数
    let isLoadingMore = false;

    if (loadMoreTimer) {
      clearInterval(loadMoreTimer);
      loadMoreTimer = null;
    }

    // 初始加载前3页(60首)
    const loadInitialPages = async () => {
      favoriteVideos.value.list = [];
      while (currentPage <= MAX_INITIAL_PAGES) {
        try {
          const list = await getFavoriteDetail(id, BATCH_SIZE, currentPage);
          if (!list || !list.videos || list.videos.length === 0) break;

          const processedVideos = await Promise.all(
            list.videos.map(async (item) => ({
              ...item,
              thumbnail: await getAvatarWithCache(item.thumbnail)
            }))
          );

          favoriteVideos.value.list.push(...processedVideos);
          currentPage++;
        } catch (error) {
          console.error('加载失败:', error);
          break;
        }
      }
      filteredSongs.value.list = favoriteVideos.value.list;
      useMitt.emit('video-list-updated', favoriteVideos.value.list);

      // 初始60首加载完成后，设置延迟加载后续内容
      if (favoriteVideos.value.list.length >= 60) {
        startDelayedLoading();
      }
    };

    // 延迟加载函数
    const startDelayedLoading = () => {
      if (loadMoreTimer) return
      // 1分钟后开始加载更多
      setTimeout(() => {
        // 首次延迟加载
        loadMoreVideos();
        // 设置定时器，每30秒加载一次
        loadMoreTimer = setInterval(() => {
          loadMoreVideos();
        }, 30000); // 30秒
        isRunning.value = true
      }, 60000); // 1分钟
    };

    // 加载更多视频的函数
    const loadMoreVideos = async () => {
      // console.log("加载更多", id, BATCH_SIZE, currentPage);
      // console.log("当前收藏夹数量", favoriteCount.value);
      // console.log(isLoadingMore);
      // console.log("当前数量", favoriteVideos.value.list.length);
      // console.log(MAX_TOTAL_SONGS)
      if (isLoadingMore || favoriteVideos.value.list.length >= MAX_TOTAL_SONGS) {
        if (favoriteVideos.value.list.length >= MAX_TOTAL_SONGS) {
          clearInterval(loadMoreTimer);
          loadMoreTimer = null
          isRunning.value = false
        }
        return;
      }
      isLoadingMore = true;
      try {
        const list = await getFavoriteDetail(id, BATCH_SIZE, currentPage);
        console.log("加载++++++", list.videos.length);
        if (!list || !list.videos || list.videos.length === 0) {
          clearInterval(loadMoreTimer);
          loadMoreTimer = null
          isRunning.value = false
          return;
        }
        const processedVideos = await Promise.all(
          list.videos.map(async (item) => ({
            ...item,
            thumbnail: await getAvatarWithCache(item.thumbnail)
          }))
        );
        favoriteVideos.value.list.push(...processedVideos);
        filteredSongs.value.list = favoriteVideos.value.list;
        useMitt.emit('video-list-updated-more', favoriteVideos.value.list);
        // 达到200首时停止定时器
        if (favoriteVideos.value.list.length >= MAX_TOTAL_SONGS) {
          clearInterval(loadMoreTimer);
          loadMoreTimer = null
          isRunning.value = false
        }
      } catch (error) {
        console.error('加载更多失败:', error);
      } finally {
        isLoadingMore = false;
      }
      currentPage++;
    };
    // 清理函数
    const cleanup = () => {
      if (loadMoreTimer) {
        clearInterval(loadMoreTimer);
        loadMoreTimer = null
        isRunning.value = false
      }
    };
    // 监听组件卸载时清理定时器
    onUnmounted(cleanup);
    // 开始初始加载
    await loadInitialPages();
  })
})




</script>

<style scoped>
.player-container {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
  box-sizing: border-box;
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

.song-list {
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  /* max-height: 400px; */
}

/* 新增: 标题和搜索框水平布局容器 */
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
  
}

/* 修改: 调整标题样式 */
.song-list h3 {
  margin-bottom: 0; /* 移除原有的底部边距 */
  color: #333;
  white-space: nowrap; /* 防止标题换行 */
}

/* 修改: 调整搜索容器样式 */
.search-container {
  margin-bottom: 0; /* 移除原有的底部边距 */
  flex-grow: 1; /* 让搜索框容器占据剩余空间 */
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #FB7299;
}

.song-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 8px;
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
  gap: 10px; 
}

.song-item-info img {
  width: 80px; 
  height: 50px; 
  object-fit: cover; 
  border-radius: 4px; 
}
.song-number {
  color: #999;
  width: 20px;
  text-align: center;
}

.song-item-details {
  display: flex;
  flex-direction: column;
  gap: 6px; /* 新增：标题和歌手之间的间距 */
}

.song-item-title {
  color: #333;
  /* font-weight: 50; */
  font-size: 0.9rem;
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
