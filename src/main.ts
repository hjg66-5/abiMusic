import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 确保类型正确
const app = createApp(App)
app.use(router)
app.mount('#app')

export default app
