<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/api'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    await router.push({ name: 'login' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Inscription impossible'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto mt-16 max-w-sm">
    <h1 class="mb-6 text-2xl font-semibold">Inscription</h1>

    <p v-if="error" class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ error }}
    </p>

    <form class="space-y-4" @submit.prevent="handleRegister">
      <div>
        <label class="mb-1 block text-sm font-medium" for="name">Nom</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="3"
          autocomplete="name"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div class="space-y-2">
        <label class="mb-1 block text-sm font-medium" for="password">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <PasswordStrengthMeter :password="password" />
      </div>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {{ loading ? 'Inscription…' : "S'inscrire" }}
      </button>
    </form>

    <p class="mt-4 text-sm text-muted-foreground">
      Déjà un compte ?
      <RouterLink :to="{ name: 'login' }" class="text-foreground underline">Se connecter</RouterLink>
    </p>
  </div>
</template>
