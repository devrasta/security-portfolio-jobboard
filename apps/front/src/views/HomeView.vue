<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { jobsApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import type { PublicJob } from '@/types/api'

// Page d'accueil publique : hero + recherche, puis toutes les offres PUBLISHED.
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

const companyCount = computed(() => new Set(jobs.value.map((j) => j.company)).size)

// --- Recherche (filtrage côté client) --------------------------------------
const keyword = ref('')
const place = ref('')
const offersSection = ref<HTMLElement | null>(null)

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const filteredJobs = computed(() => {
  const k = normalize(keyword.value)
  const p = normalize(place.value)
  return jobs.value.filter((job) => {
    const matchesKeyword =
      !k ||
      normalize(job.title).includes(k) ||
      normalize(job.description).includes(k) ||
      normalize(job.company).includes(k)
    const matchesPlace = !p || normalize(job.location).includes(p)
    return matchesKeyword && matchesPlace
  })
})

const isFiltering = computed(() => keyword.value.trim() !== '' || place.value.trim() !== '')

function scrollToOffers() {
  offersSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function resetSearch() {
  keyword.value = ''
  place.value = ''
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section
      class="relative overflow-hidden bg-zinc-900 bg-cover bg-right text-white"
      style="background-image: url('/bg-laptop.jpg')"
    >
      <!-- Dégradé : assombrit la gauche pour la lisibilité, laisse l'image visible à droite -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/70 to-zinc-950/10"
        aria-hidden="true"
      />

      <div class="relative mx-auto max-w-5xl px-4 pb-32 pt-16 sm:pb-40 sm:pt-24">
        <div class="max-w-2xl">
          <h1 class="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Trouvez votre prochain poste
            <span class="block text-zinc-300">en quelques clics.</span>
          </h1>

          <p class="mt-6 text-base sm:text-lg">
            <span class="font-semibold">
              {{ jobs.length }} offre{{ jobs.length > 1 ? 's' : '' }} publiée{{ jobs.length > 1 ? 's' : '' }}
              par {{ companyCount }} entreprise{{ companyCount > 1 ? 's' : '' }}
            </span>
            <span class="block text-zinc-300">
              Développement, infrastructure, data, sécurité… consultez-les sans créer de compte.
            </span>
          </p>

          <form class="mt-8 space-y-4" role="search" @submit.prevent="scrollToOffers">
            <div
              class="flex flex-col overflow-hidden rounded-lg bg-white text-zinc-900 shadow-lg sm:flex-row"
            >
              <label class="flex flex-1 items-center gap-3 px-4 py-3">
                <svg class="h-5 w-5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" stroke-linecap="round" />
                </svg>
                <span class="sr-only">Poste ou mot-clé</span>
                <input
                  v-model="keyword"
                  type="search"
                  placeholder="Développeur, DevOps, Node.js…"
                  class="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
                />
              </label>
              <div class="h-px bg-zinc-200 sm:h-auto sm:w-px" aria-hidden="true" />
              <label class="flex flex-1 items-center gap-3 px-4 py-3">
                <svg class="h-5 w-5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" stroke-linejoin="round" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                <span class="sr-only">Lieu</span>
                <input
                  v-model="place"
                  type="search"
                  placeholder="Lieu"
                  class="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
                />
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <button
                type="submit"
                class="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
              >
                Voir les offres
              </button>
              <RouterLink
                :to="{ name: 'company' }"
                class="rounded-lg border-2 border-white px-6 py-3 text-center text-sm font-semibold hover:bg-white/10"
              >
                Publier une offre
              </RouterLink>
            </div>
          </form>
        </div>
      </div>

      <!-- Vague de transition vers le contenu -->
      <svg
        class="absolute inset-x-0 bottom-0 h-16 w-full text-background sm:h-24"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0 70C240 20 480 10 720 40s480 70 720 40v40H0Z"
        />
      </svg>
    </section>

    <!-- Offres -->
    <section ref="offersSection" class="mx-auto max-w-5xl scroll-mt-4 px-4 py-12">
      <div class="mb-8 text-center">
        <h2 class="text-3xl font-bold tracking-tight">
          Les dernières <span class="text-muted-foreground">offres publiées</span>
        </h2>
        <p v-if="isFiltering && !loading" class="mt-2 text-sm text-muted-foreground">
          {{ filteredJobs.length }} résultat{{ filteredJobs.length > 1 ? 's' : '' }}
          ·
          <button class="underline hover:text-foreground" @click="resetSearch">
            Réinitialiser la recherche
          </button>
        </p>
      </div>

      <p v-if="loadError" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ loadError }}
      </p>
      <p v-if="loading" class="text-center text-sm text-muted-foreground">Chargement des offres…</p>

      <ul v-else-if="filteredJobs.length > 0" class="grid gap-4 sm:grid-cols-2">
        <li v-for="job in filteredJobs" :key="job.id">
          <RouterLink
            :to="{ name: 'public-job', params: { jobId: job.id } }"
            class="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 class="font-semibold">{{ job.title }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ job.company }} · {{ job.location }}</p>
            <p class="mt-3 line-clamp-3 text-sm">{{ job.description }}</p>
            <span class="mt-auto pt-4 text-sm font-medium">Voir l'offre →</span>
          </RouterLink>
        </li>
      </ul>

      <p v-else-if="!loadError" class="text-center text-sm text-muted-foreground">
        {{ isFiltering ? 'Aucune offre ne correspond à votre recherche.' : 'Aucune offre publiée pour le moment.' }}
      </p>
    </section>
  </div>
</template>
