<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header v-if="auth.isAuthenticated" class="border-b border-border bg-card">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav class="flex items-center gap-1">
          <RouterLink :to="{ name: 'dashboard' }" class="nav-link">Tableau de bord</RouterLink>
          <RouterLink :to="{ name: 'activity' }" class="nav-link">Activité</RouterLink>
          <RouterLink :to="{ name: 'security' }" class="nav-link">Sécurité</RouterLink>
          <RouterLink :to="{ name: 'company' }" class="nav-link">Entreprise</RouterLink>
        </nav>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted-foreground">{{ auth.user?.name }}</span>
          <button
            class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            @click="handleLogout"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.nav-link {
  @apply rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground;
}

.nav-link.router-link-exact-active {
  @apply bg-muted font-medium text-foreground;
}
</style>
