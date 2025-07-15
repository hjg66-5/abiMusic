<template>
  <div v-if="isVisible" class="play-control-container" :class="{ expanded: isExpanded }">
    <!-- 展开/收缩切换按钮 -->
    <div class="expand-toggle" :class="{ 'collapsed': !isExpanded }" @click="toggleExpand">
      <n-icon size="20" v-if="!isExpanded" :component="ChevronUp" />
      <n-icon size="20" v-else :component="ChevronDown" />
    </div>

    <!-- A部分：视频播放区域（仅展开状态显示） -->
    <div class="video-section" v-show="isExpanded">
      <!-- 添加DPlayer容器 -->
      <div ref="dplayerContainer" class="video-player"></div>
    </div>

    <!-- B部分：控制区域（始终显示） -->
    <div class="controls-section">
      <div class="main-controls">
        <div class="button-group">
          <n-icon size="24" class="control-btn" @click="togglePlayMode" :component=playModeIcon />
          <n-icon size="24" class="control-btn" @click="prevSong" :component="PlaySkipBack" />
          <n-icon size="32" class="control-btn play-btn" @click="togglePlay">
            <Play v-if="!isPlaying" />
            <Pause v-else />
          </n-icon>
          <n-icon size="24" class="control-btn" @click="nextSong" :component="PlaySkipForward" />
          <!-- 音量控制 -->
          <div class="volume-control">
            <n-icon size="24" class="control-btn" @click="toggleMute" :component="volumeIcon" />
            <n-slider
              v-model:value="volume"
              :max="100"
              :min="0"
              @update:value="setVolume"
              class="volume-slider"
              :step="1"
              />
          </div>
          <n-icon size="24" class="control-btn play-btn1"  @click="toTop" :component=ArrowUp />
          <!-- <n-icon size="24" class="control-btn play-btn1"  @click="toBottom" :component=ArrowDown /> -->
        </div>
        <div class="progress-container">
          <span class="time">{{ formatTime(currentTime) }}</span>
          <n-slider
            v-model:value="currentTime"
            :max="duration"
            @update:value="seek"
            class="progress-slider"
          />
          <span class="time">{{ formatTime(duration) }}</span>
        </div>
        <div class="song-title" >{{ currentVideo.title }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted ,computed,watch} from 'vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { getVideoStreamUrl, getVideoInfo } from '@/service/bilibili.ts'
import { Play, Pause, 
  PlaySkipBack, PlaySkipForward, 
  ChevronUp, ChevronDown, Repeat,ArrowDown,Shuffle,VolumeHigh, VolumeMute ,ArrowUp
 } from '@vicons/ionicons5'
import { NIcon, NSlider } from 'naive-ui'
import DPlayer from 'dplayer';

const isListUpdated =  ref(false);
const isVisible = ref(false);
const isExpanded = ref(false);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(80);
const isMuted = ref(false);
const lastVolume = ref(80);
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
const currentVideoIndex = ref(0);
const dplayerContainer = ref(null);
let dp: DPlayer | null = null;
let timer: number | null = null; // 添加计时器变量

// 收藏夹数量
const favoriteCount = ref(0)
useMitt.on('favorite-count-change', (count) => {
  favoriteCount.value = count
})

const playerUrl = ref('')

const videoList = ref<Array<{
  bvid: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}>>([]);

// 事件总线
const mitt = useMitt

// 新增播放模式状态管理
const playMode = ref<'order' | 'random' | 'loop'>('random'); // 默认顺序播放

// 根据播放模式动态显示图标
const playModeIcon = computed(() => {
  switch(playMode.value) {
    case 'order': return ArrowDown;
    case 'random': return Shuffle;
    case 'loop': return Repeat;
  }
});

const toTop = ()  =>{
  useMitt.emit('toTop',0)
}
//const toBottom = ()  =>{
  //useMitt.emit('toBottom',1000)
//}


// 切换播放模式的方法
const togglePlayMode = () => {
  switch(playMode.value) {
    case 'order':
      playMode.value = 'random';
      break;
    case 'random':
      playMode.value = 'loop';
      break;
    case 'loop':
      playMode.value = 'order';
      break;
  }
};

// 音量图标计算属性
const volumeIcon = computed(() => {
  if (isMuted.value || volume.value === 0) return VolumeMute;
  return VolumeHigh;
});

// 设置音量
const setVolume = (val: number) => {
  volume.value = val;
  if (dp) {
    dp.volume(val / 100, true, false);
    if (val > 0 && isMuted.value) {
      isMuted.value = false;
    }
  }
};

// 切换静音
const toggleMute = () => {
 if (dp) {
    if (isMuted.value) {
      volume.value = lastVolume.value;
      dp.volume(lastVolume.value / 100, true, false);
    } else {
      lastVolume.value = volume.value;
      volume.value = 0;
      dp.volume(0, true, false);
    }
    isMuted.value = !isMuted.value;
  }
};

// 方法定义
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const prevSong = () => {
  isListUpdated.value = false
  if (videoList.value.length === 0) return
  currentVideoIndex.value = (currentVideoIndex.value - 1 + videoList.value.length) % videoList.value.length
  playVideo(videoList.value[currentVideoIndex.value].bvid)
}

const nextSong = () => {
  isListUpdated.value = false
  if (videoList.value.length === 0) return;
  switch(playMode.value) {
    case 'order':
      currentVideoIndex.value = (currentVideoIndex.value + 1) % videoList.value.length;
      break;
    case 'random':
      // 生成随机索引，但确保不是当前索引（如果列表长度大于1）
      if (videoList.value.length > 1) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * videoList.value.length);
        } while (randomIndex === currentVideoIndex.value);
        currentVideoIndex.value = randomIndex;
      }
      break;
    case 'loop':
      // 单曲循环 - 保持当前索引不变
      break;
  }
  // 如果不是单曲循环模式才切换歌曲
  if (playMode.value !== 'loop') {
    playVideo(videoList.value[currentVideoIndex.value].bvid);
  } else {
    // 单曲循环 - 重新播放当前歌曲
    playVideo(currentVideo.value.bvid);
  }
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

const playVideo = async (bvid: string) => {
  if(!isListUpdated){
    isPlaying.value = false;
  }
  currentTime.value=0;
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

  } catch (error) {
    console.error('播放视频失败:', error)
  }
}

// 事件监听
onMounted(() => {
 // 监听展开状态变化以初始化DPlayer
  watch(isExpanded, (newVal) => {
    if (newVal && !dp && dplayerContainer.value) {
      // 当展开且播放器未初始化且容器存在时创建DPlayer
      dp = new DPlayer({
        container: dplayerContainer.value,
        video: {
          url: playerUrl.value,
        },
        autoplay: false,
        muted: true,
        allowFullScreen: true,
      });
      dp.play()
    }
  });

  // 添加playerUrl监听以更新视频源
  watch(playerUrl, (newUrl) => {
    if (dp) {
      // 获取原生video元素
      const videoElement = dp.video;
      videoElement.src = newUrl;
      // 如果当前处于播放状态，切换后继续播放
      console.log(isPlaying.value)
      if (isPlaying.value) {
        dp.play();
      }
    }
  });

  // 监听视频时间更新
  watch(currentTime, (newTime) => {
    if(newTime==duration.value){
      nextSong()
    }
  });

  // 监听登录成功事件
  mitt.on('bilibili-login-ok', () => {
    isVisible.value = true
  })

  // 监听播放事件
  mitt.on('goPlayMusic', (bvid: string) => {
    // 查找视频在列表中的索引
    const index = videoList.value.findIndex(item => item.bvid === bvid)
    if (index !== -1) {
      currentVideoIndex.value = index
    }
    playVideo(bvid)
  })

  // 监听收藏夹变化事件，更新视频列表
  mitt.on('video-list-updated', (videos: any) => {
    videoList.value = videos
    // 默认第一首,加载好之后不播放
    mitt.emit('goPlayMusic', videoList.value?.[0]?.bvid)
    isListUpdated.value=true
  })
  mitt.on('video-list-updated-more', (videos: any) => {
    videoList.value = videoList.value.concat(videos)
  })
 
})
onUnmounted(() => {
  if (dp) {
    dp.destroy(); // 组件卸载时销毁播放器
  }
});

// 控制视频播放位置
const seek = (value: number) => {
  if (dp) {
    dp.seek(value);
  }
  currentTime.value = value;
};

// 控制视频播放状态
const togglePlay = () => {
  if(isListUpdated.value){
    isListUpdated.value = false
    isExpanded.value=true
  }
  if (dp) {
    if (isPlaying.value) {
      dp.pause();
      if (timer) clearInterval(timer); // 暂停时清除计时器
    } else {
      dp.play();
    }
  }
  isPlaying.value = !isPlaying.value;
  if(isPlaying.value){
    // 播放时启动计时器，每秒更新currentTime
    timer = window.setInterval(() => {
      if (currentTime.value < duration.value) {
        currentTime.value += 1;
      } else {
        clearInterval(timer!);
        nextSong();
      }
    }, 1000);
  }
};

onUnmounted(() => {
  if (dp) dp.destroy();
  if (timer) clearInterval(timer); // 组件卸载时清除计时器
  mitt.off('bilibili-login-ok',()=>{})
  mitt.off('goPlayMusic',()=>{})
});
</script>

<style scoped>
.play-control-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 10px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 1000;
  height: 120px; /* 固定高度 */
}

.expanded {
  height: 80vh;
}

.video-section {
  margin-bottom: 20px;
}

.video-player {
  width: 100%;
  height: 400px;
  /* 可以根据需要调整播放器样式 */
  object-fit: cover;
  border-radius: 8px;
  pointer-events: none;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.main-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.button-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  margin-left: 185px;
}

.control-btn {
  cursor: pointer;
  color: #333;
  transition: color 0.2s;
}

.control-btn:hover {
  color: #FB7299;
}

.play-btn {
  color: #FB7299;
}

.play-btn1 {
  color: #24be31;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
}

.time {
  font-size: 12px;
  color: #666;
}

.progress-slider {
  flex: 1;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 150px;
}

.volume-icon {
  cursor: pointer;
}

.volume-slider {
  width: 100px;
  color: #bd3d16;
}

.expand-toggle {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #fff;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.expand-toggle.collapsed {
  border-radius: 50% 50% 0 0;
  height: 15px;
  box-shadow: 0 -2px 5px rgba(160, 19, 19, 0.1);
}
.song-title {
  white-space: nowrap; /* 防止文字换行 */
  overflow: hidden;  /* 隐藏溢出内容 */
  text-overflow: ellipsis; /* 溢出部分显示省略号 */
  margin-bottom: 8px; /* 与下方按钮保持间距 */
  font-weight: 500; /* 加粗标题文字 */
  color: #962323; /* 设置文字颜色 */
}
</style>