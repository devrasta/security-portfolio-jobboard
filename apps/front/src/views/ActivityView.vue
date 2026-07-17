<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { activityApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { ACTIVITY_ACTIONS } from '@/types/api'
import type { ActivityAction, ActivityLog } from '@/types/api'

const PAGE_SIZE = 10

const logs = ref<ActivityLog[]>([])
const total = ref(0)
const actionFilter = ref<ActivityAction | ''>('')
const page = ref(0)
const error = ref('')
const loading = ref(false)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

async function load() {
  error.value = ''
  loading.value = true
  try {
    const res = await activityApi.list({
      action: actionFilter.value || undefined,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
    })
    logs.value = res.data
    total.value = res.total
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Chargement impossible'
  } finally {
    loading.value = false
  }
}

watch(actionFilter, () => {
  page.value = 0
  void load()
})
watch(page, load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Journal d'activité</h1>
      <select
        v-model="actionFilter"
        class="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Toutes les actions</option>
        <option v-for="action in ACTIVITY_ACTIONS" :key="action" :value="action">
          {{ action }}
        </option>
      </select>
    </div>

    <p v-if="error" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ error }}
    </p>

    <div class="overflow-x-auto rounded-lg border border-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-muted text-muted-foreground">
          <tr>
            <th class="px-4 py-2 font-medium">Action</th>
            <th class="px-4 py-2 font-medium">Date</th>
            <th class="px-4 py-2 font-medium">Adresse IP</th>
            <th class="px-4 py-2 font-medium">Localisation</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="loading">
            <td colspan="4" class="px-4 py-6 text-center text-muted-foreground">Chargement…</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="4" class="px-4 py-6 text-center text-muted-foreground">
              Aucune activité trouvée.
            </td>
          </tr>
          <tr v-for="log in logs" v-else :key="log.id">
            <td class="px-4 py-2">{{ log.action }}</td>
            <td class="px-4 py-2">{{ dateFormatter.format(new Date(log.createdAt)) }}</td>
            <td class="px-4 py-2">{{ log.ipAddress ?? '—' }}</td>
            <td class="px-4 py-2">
              {{ log.city && log.country ? `${log.city}, ${log.country}` : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between text-sm">
      <span class="text-muted-foreground">{{ total }} entrée(s)</span>
      <div class="flex items-center gap-2">
        <button
          :disabled="page === 0 || loading"
          class="rounded-md border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
          @click="page--"
        >
          Précédent
        </button>
        <span class="text-muted-foreground">Page {{ page + 1 }} / {{ pageCount }}</span>
        <button
          :disabled="page + 1 >= pageCount || loading"
          class="rounded-md border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
          @click="page++"
        >
          Suivant
        </button>
      </div>
    </div>
  </div>
</template>
