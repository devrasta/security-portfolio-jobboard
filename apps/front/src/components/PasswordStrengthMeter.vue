<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiFetch } from '@/lib/api'

const props = defineProps<{ password: string }>()

const strength = ref(0)

const LABELS = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent']
const COLORS = ['bg-destructive', 'bg-destructive', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']

let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.password,
  (password) => {
    clearTimeout(debounceTimer)
    if (!password) {
      strength.value = 0
      return
    }
    // Évalué côté API (POST /auth/password-strength), avec un debounce pour éviter
    // une requête par frappe.
    debounceTimer = setTimeout(async () => {
      try {
        const res = await apiFetch<{ strength: number }>('/auth/password-strength', {
          method: 'POST',
          body: { password },
          skipRefresh: true,
        })
        strength.value = res.strength
      } catch {
        strength.value = 0
      }
    }, 300)
  },
)
</script>

<template>
  <div v-if="password" class="space-y-1">
    <div class="flex gap-1">
      <div
        v-for="i in 4"
        :key="i"
        class="h-1.5 flex-1 rounded-full transition-colors"
        :class="i <= strength ? COLORS[strength] : 'bg-muted'"
      />
    </div>
    <p class="text-xs text-muted-foreground">Force : {{ LABELS[strength] }}</p>
  </div>
</template>
