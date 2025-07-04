import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DesktopHome from '../views/desktop/index.vue'
import Login from '../views/mobile/Login.vue'
import Player from '../views/mobile/Player.vue'
import SongDetail from '../views/mobile/SongDetail.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'desktop-home', component: DesktopHome, meta: { device: 'desktop' }},
  { path: '/mobile', name: 'mobile-login', component: Login, meta: { device: 'mobile' }},
  { path: '/player', name: 'mobile-player', component: Player, meta: { device: 'mobile' }},
  { path: '/song-detail', name: 'mobile-song-detail', component: SongDetail, meta: { device: 'mobile' }}
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 添加设备检测路由守卫
router.beforeEach((to, from, next) => {
  console.log(from)
  // 检测移动设备（通过userAgent或屏幕宽度）
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  
  // 根据设备类型重定向到对应路由
  if (isMobile && to.meta.device !== 'mobile') {
    next('/mobile');
  } else if (!isMobile && to.meta.device !== 'desktop') {
    next('/');
  } else {
    next();
  }
});

export default router