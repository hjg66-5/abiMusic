<template>
    <n-flex
    data-tauri-drag-region
    vertical
    :size="20"
    class="bg-[#555C6E] select-none  h-full p-[40px_20px_6px_20px] box-border">
      <!-- 标题 -->
      <n-flex justify="space-between" align="center" :size="0">
        <n-flex :size="4" vertical>
          <n-flex :size="0" align="center">
            <p class="text-(20px [--chat-text-color]) font-semibold select-none">bilibili-</p>
            <p class="gpt-subtitle">abiMusic</p>
            <div class="ml-6px p-[4px_8px] size-fit bg-[--bate-bg] rounded-8px text-(12px [--bate-color] center)">
              Beta
            </div>
          </n-flex>
          <p class="text-(14px #EB3324)">一个关心程序员身心健康的音乐软件</p>
        </n-flex>
      </n-flex>

      <!-- 头像和插件 -->
      <n-flex align="center" justify="space-between" :size="0">
        <n-flex align="center">
          <n-avatar bordered round 
          :src="bilibiliUserInfo.face" 
          @click="handleRelogin"
          :size="48" referrerpolicy="no-referrer" />
          <n-flex vertical>
            <n-flex align="center" :size="4">
            <p class="text-(14px [--chat-text-color]) font-500">{{ bilibiliUserInfo.name }}</p>
            <!-- <p class="text-(12px #909090)">开发者：高高飞起的勇敢麦当</p> -->
             <n-button
                size="tiny"
                @click="refreshFavorites"
                icon="refresh"
                class="suaxin" 
              >点我重来</n-button>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-flex>

      <n-flex vertical>
        <n-flex
          v-for="item in favoriteList.list"
          :key="item.id"
          class="cursor-pointer"
          @click="switchToFavorite(item.id,item.count)"
        >
          <n-flex :size="0" align="center">
            <p class="text-(14px [--chat-text-color]) font-500">{{ item.name }}({{ item.count }})</p>
          </n-flex>
        </n-flex>
      </n-flex>
    </n-flex>
</template>

<script setup lang="ts">
import { confirm } from '@tauri-apps/plugin-dialog'
import {  getUserInfo, getFavoriteList ,getAvatarWithCache,getFavoriteInfo} from '@/service/bilibili.ts';
import { useMitt } from '@/hooks/useMitt'
import { ref,onMounted} from 'vue'
import { invoke } from "@tauri-apps/api/core";

const bilibiliUserInfo = ref(
  {
    name: '',
    face: ''
  }
)
// 收藏夹列表
var favoriteList = ref(
  {
    list: [{
      id: 1,
      name: '默认收藏夹',
      count: 0
    }]
  }
)

// 处理登录成功事件
const handleLoginSuccess = async () => {
      console.log("登录成功")
      const cookie_SESSDATA = await invoke<string>('get_cookie_from_store', { cookieName: 'SESSDATA' });
      const userInfo = await getUserInfo(cookie_SESSDATA);
      bilibiliUserInfo.value.face = await getAvatarWithCache(userInfo.face!);
      bilibiliUserInfo.value.name = userInfo.uname!
      const favoriteInfo = await getFavoriteInfo(4250885866);
      // console.log(favoriteInfo)
      // 创建默认收藏夹对象并添加到列表开头
      const defaultFavorite = {
        id: favoriteInfo.id,
        name: favoriteInfo.title,
        count: favoriteInfo.media_count
      };
      const list = await getFavoriteList();
      favoriteList.value.list = [defaultFavorite, ...list.map((item) => {
        return {
          id: item.id,
          name: item.title,
          count: item.count
        }
      })]
      // console.log(favoriteList)
      useMitt.emit('favorite-change',{id:defaultFavorite.id,count:defaultFavorite.count})
      useMitt.emit('favorite-count-change', defaultFavorite.count)
}

const switchToFavorite = async (id: number,count:number) => {
  console.log(id)
  useMitt.emit('favorite-change', {id,count})
  useMitt.emit('favorite-count-change', count)
}


const handleRelogin = async () => {
  if (!(await confirm('确定重新登录吗'))) {
    return
  }
  // F5刷新
  window.location.reload()
}

const refreshFavorites = async () => {
  useMitt.emit('bilibili-login-ok');
};


onMounted(async () => {
  // 监听扫码成功事件
  useMitt.on('bilibili-login-ok', handleLoginSuccess)
})

</script>

<style scoped lang="scss">

</style>
