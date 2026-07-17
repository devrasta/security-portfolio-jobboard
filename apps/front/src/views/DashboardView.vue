<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usersApi, activityApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import type { ActivityLog, UserProfile } from '@/types/api'

const profile = ref<UserProfile | null>(null)
const recentActivity = ref<ActivityLog[]>([])
const error = ref('')
const loading = ref(true)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

onMounted(async () => {
  try {
    const [profileRes, activityRes] = await Promise.all([
      usersApi.getProfile(),
      activityApi.recent(5),
    ])
    profile.value = profileRes
    recentActivity.value = activityRes
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Chargement impossible'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-semibold">Tableau de bord</h1>

    <p v-if="error" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ error }}
    </p>
    <p v-else-if="loading" class="text-sm text-muted-foreground">Chargement…</p>

    <template v-else>
      <section v-if="profile" class="rounded-lg border border-border bg-card p-6">
        <h2 class="mb-4 text-lg font-medium">Mon profil</h2>
        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground">Nom</dt>
            <dd>{{ profile.name }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">Email</dt>
            <dd>{{ profile.email }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">Compte créé le</dt>
            <dd>{{ formatDate(profile.createdAt) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">Double authentification</dt>
            <dd>{{ profile.twoFactorEnabled ? 'Activée' : 'Désactivée' }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-lg border border-border bg-card p-6">
        <h2 class="mb-4 text-lg font-medium">Activité récente</h2>
        <p v-if="recentActivity.length === 0" class="text-sm text-muted-foreground">
          Aucune activité pour le moment.
        </p>
        <ul v-else class="divide-y divide-border text-sm">
          <li v-for="log in recentActivity" :key="log.id" class="flex justify-between py-2">
            <span>{{ log.action }}</span>
            <span class="text-muted-foreground">{{ formatDate(log.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
