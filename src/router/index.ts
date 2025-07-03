import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DesktopHome from '../views/desktop/index.vue'
import MobileHome from '../views/mobile/index.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'desktop-home',
    component: DesktopHome,
    meta: {
      device: 'desktop'
    }
  },
  {
    path: '/mobile',
    name: 'mobile-home',
    component: MobileHome,
    meta: {
      device: 'mobile'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 添加设备检测路由守卫
router.beforeEach((to, from, next) => {
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