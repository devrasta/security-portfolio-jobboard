<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { jobsApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { JOB_STATUSES } from '@/types/api'
import type { Job, JobStatus } from '@/types/api'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

const route = useRoute()
const router = useRouter()
const companyId = route.params.companyId as string
const jobId = route.params.jobId as string

const job = ref<Job | null>(null)
const loadError = ref('')
const loading = ref(false)

async function loadJob() {
  loadError.value = ''
  loading.value = true
  try {
    job.value = await jobsApi.get(companyId, jobId)
    title.value = job.value.title
    location.value = job.value.location
    description.value = job.value.description
    status.value = job.value.status
  } catch (err) {
    loadError.value = errorMessage(err, "Chargement de l'offre impossible")
  } finally {
    loading.value = false
  }
}

onMounted(loadJob)

// --- Édition -----------------------------------------------------------
const title = ref('')
const location = ref('')
const description = ref('')
const status = ref<JobStatus>('DRAFT')
const updateError = ref('')
const updateSuccess = ref('')
const updateLoading = ref(false)

async function handleUpdate() {
  updateError.value = ''
  updateSuccess.value = ''
  updateLoading.value = true
  try {
    job.value = await jobsApi.update(companyId, jobId, {
      title: title.value,
      location: location.value,
      description: description.value,
      status: status.value,
    })
    updateSuccess.value = 'Offre mise à jour.'
  } catch (err) {
    updateError.value = errorMessage(err, 'Mise à jour impossible')
  } finally {
    updateLoading.value = false
  }
}

// --- Suppression ---------------------------------------------------------
const deleteError = ref('')

async function handleDelete() {
  if (!job.value) return
  if (!window.confirm(`Supprimer l'offre « ${job.value.title} » ?`)) return
  deleteError.value = ''
  try {
    await jobsApi.remove(companyId, jobId)
    await router.push({ name: 'company' })
  } catch (err) {
    deleteError.value = errorMessage(err, 'Suppression impossible')
  }
}

// --- Lien de partage -------------------------------------------------------
const shareLink = ref('')
const shareError = ref('')
const shareLoading = ref(false)

const shareSuccess = ref('')
const revokeLoading = ref(false)

async function handleRevokeShareLink() {
  if (!window.confirm('Supprimer le lien de partage ? Il ne fonctionnera plus pour personne.')) return
  shareError.value = ''
  shareSuccess.value = ''
  revokeLoading.value = true
  try {
    shareSuccess.value = await jobsApi.revokeShareLink(companyId, jobId)
    shareLink.value = ''
  } catch (err) {
    shareError.value = errorMessage(err, 'Suppression du lien impossible')
  } finally {
    revokeLoading.value = false
  }
}

async function handleGenerateShareLink() {
  shareError.value = ''
  shareSuccess.value = ''
  shareLoading.value = true
  try {
    shareLink.value = await jobsApi.generateShareLink(companyId, jobId)
  } catch (err) {
    shareError.value = errorMessage(err, 'Génération du lien impossible')
  } finally {
    shareLoading.value = false
  }
}

// --- Invitation ------------------------------------------------------------
const inviteEmail = ref('')
const inviteError = ref('')
const inviteSuccess = ref('')
const inviteLoading = ref(false)

async function handleInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  inviteLoading.value = true
  try {
    inviteSuccess.value = await jobsApi.invite(companyId, jobId, inviteEmail.value)
    inviteEmail.value = ''
  } catch (err) {
    inviteError.value = errorMessage(err, 'Invitation impossible')
  } finally {
    inviteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center gap-3">
      <RouterLink :to="{ name: 'company' }" class="text-sm text-muted-foreground hover:underline"
        >&larr; Entreprise</RouterLink
      >
    </div>

    <p v-if="loadError" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ loadError }}
    </p>
    <p v-if="loading" class="text-sm text-muted-foreground">Chargement…</p>

    <template v-if="job">
      <h1 class="text-2xl font-semibold">{{ job.title }}</h1>

      <section class="rounded-lg border border-border bg-card p-6">
        <h2 class="mb-4 text-lg font-medium">Modifier l'offre</h2>
        <p v-if="updateError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ updateError }}
        </p>
        <p v-if="updateSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
          {{ updateSuccess }}
        </p>
        <form class="flex max-w-xl flex-col gap-2" @submit.prevent="handleUpdate">
          <input
            v-model="title"
            type="text"
            required
            placeholder="Titre du poste"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            v-model="location"
            type="text"
            required
            placeholder="Localisation"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            v-model="description"
            required
            rows="3"
            placeholder="Description"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            v-model="status"
            class="w-fit rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option v-for="s in JOB_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <div class="flex items-center gap-2">
            <button
              type="submit"
              :disabled="updateLoading"
              class="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {{ updateLoading ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <button
              type="button"
              class="rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              @click="handleDelete"
            >
              Supprimer l'offre
            </button>
          </div>
          <p v-if="deleteError" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ deleteError }}
          </p>
        </form>
      </section>

      <section class="rounded-lg border border-border bg-card p-6">
        <h2 class="mb-4 text-lg font-medium">Lien de partage</h2>
        <p class="mb-3 text-sm text-muted-foreground">
          Génère un lien consultable sans compte (jobs en brouillon : lien à token, valable 48h ;
          offres publiées : lien direct vers la page publique).
        </p>
        <p v-if="shareError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ shareError }}
        </p>
        <p v-if="shareSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
          {{ shareSuccess }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <button
            :disabled="shareLoading"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            @click="handleGenerateShareLink"
          >
            {{ shareLoading ? 'Génération…' : 'Générer le lien' }}
          </button>
          <input
            v-if="shareLink"
            :value="shareLink"
            readonly
            class="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <!-- Le lien à token (brouillon/archivé) est révocable, même s'il a été
               généré lors d'une session précédente. -->
          <button
            v-if="job?.status !== 'PUBLISHED'"
            :disabled="revokeLoading"
            class="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            @click="handleRevokeShareLink"
          >
            {{ revokeLoading ? 'Suppression…' : 'Supprimer le lien' }}
          </button>
        </div>
        <p v-if="job?.status === 'PUBLISHED'" class="mt-3 text-xs text-muted-foreground">
          Offre publiée : le lien public reste accessible tant que l'offre est publiée. Pour
          ne plus la partager, repasse-la en brouillon ou archive-la.
        </p>
      </section>

      <section class="rounded-lg border border-border bg-card p-6">
        <h2 class="mb-4 text-lg font-medium">Inviter par email</h2>
        <p v-if="inviteError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ inviteError }}
        </p>
        <p v-if="inviteSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
          {{ inviteSuccess }}
        </p>
        <form class="flex max-w-xl flex-wrap gap-2" @submit.prevent="handleInvite">
          <input
            v-model="inviteEmail"
            type="email"
            required
            placeholder="email@exemple.com"
            class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            :disabled="inviteLoading"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {{ inviteLoading ? 'Envoi…' : 'Inviter' }}
          </button>
        </form>
      </section>
    </template>
  </div>
</template>
