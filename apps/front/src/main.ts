import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

async function bootstrap() {
  const app = createApp(App)

  app.use(createPinia())

  // Restaure la session (cookie refresh httpOnly) avant d'installer le routeur,
  // pour que les guards voient l'état d'auth définitif dès la première navigation.
  await useAuthStore().initialize()

  app.use(router)
  app.mount('#app')
}

void bootstrap()
