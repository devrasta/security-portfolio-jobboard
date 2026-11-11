<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { jobsApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import type { Job } from '@/types/api'

const route = useRoute()
const inviteToken = route.query.token as string | undefined

const job = ref<Job | null>(null)
const loadError = ref('')
const loading = ref(false)

onMounted(async () => {
  if (!inviteToken) {
    loadError.value = "Lien d'invitation invalide : token manquant."
    return
  }
  loading.value = true
  try {
    job.value = await jobsApi.getByInviteToken(inviteToken)
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : "Invitation invalide ou expirée"
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
      <p class="mb-2 text-sm text-muted-foreground">Vous avez été invité(e) à consulter cette offre</p>
      <h1 class="text-2xl font-semibold">{{ job.title }}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{{ job.company }} · {{ job.location }}</p>
      <p class="mt-4 whitespace-pre-wrap text-sm">{{ job.description }}</p>
    </section>
  </div>
</template>
