<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { jobsApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import type { PublicJob } from '@/types/api'

// Page d'accueil publique : toutes les offres PUBLISHED, toutes entreprises.
const jobs = ref<PublicJob[]>([])
const loading = ref(false)
const loadError = ref('')

onMounted(async () => {
  loading.value = true
  try {
    jobs.value = await jobsApi.listPublic()
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Chargement des offres impossible'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold">Offres d'emploi</h1>

    <p v-if="loadError" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ loadError }}
    </p>
    <p v-if="loading" class="text-sm text-muted-foreground">Chargement des offres…</p>

    <ul v-else-if="jobs.length > 0" class="space-y-3">
      <li v-for="job in jobs" :key="job.id">
        <RouterLink
          :to="{ name: 'public-job', params: { jobId: job.id } }"
          class="block rounded-lg border border-border bg-card p-4 hover:bg-muted/50"
        >
          <h2 class="font-medium">{{ job.title }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ job.company }} · {{ job.location }}</p>
          <p class="mt-2 line-clamp-2 text-sm">{{ job.description }}</p>
        </RouterLink>
      </li>
    </ul>

    <p v-else-if="!loadError" class="text-sm text-muted-foreground">Aucune offre publiée pour le moment.</p>
  </div>
</template>
