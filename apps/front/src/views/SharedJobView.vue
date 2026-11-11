<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { jobsApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import type { Job } from '@/types/api'

// Sert deux routes publiques :
// - /jobs/shared/:shareToken → brouillon partagé via token (48h)
// - /jobs/public/:jobId      → offre publiée
const route = useRoute()
const shareToken = route.params.shareToken as string | undefined
const jobId = route.params.jobId as string | undefined

const job = ref<Job | null>(null)
const loadError = ref('')
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    job.value = shareToken
      ? await jobsApi.getShared(shareToken)
      : await jobsApi.getPublic(jobId as string)
  } catch (err) {
    loadError.value =
      err instanceof ApiError
        ? err.message
        : shareToken
          ? 'Lien de partage invalide ou expiré'
          : 'Offre introuvable'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 px-4 py-10">
    <p v-if="loading" class="text-sm text-muted-foreground">Chargement…</p>
    <p v-if="loadError" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ loadError }}
    </p>

    <section v-if="job" class="rounded-lg border border-border bg-card p-6">
      <h1 class="text-2xl font-semibold">{{ job.title }}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{{ job.company }} · {{ job.location }}</p>
      <p class="mt-4 whitespace-pre-wrap text-sm">{{ job.description }}</p>
    </section>
  </div>
</template>
