<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const twoFactorCode = ref('')
const error = ref('')
const loading = ref(false)

function redirectAfterLogin() {
  const redirect = route.query.redirect
  return router.push(typeof redirect === 'string' ? redirect : { name: 'dashboard' })
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const needsTwoFactor = await auth.login(email.value, password.value)
    if (!needsTwoFactor) {
      await redirectAfterLogin()
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Connexion impossible'
  } finally {
    loading.value = false
  }
}

async function handleTwoFactor() {
  error.value = ''
  loading.value = true
  try {
    await auth.loginWithTwoFactor(twoFactorCode.value)
    await redirectAfterLogin()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Code invalide'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto mt-16 max-w-sm">
    <h1 class="mb-6 text-2xl font-semibold">Connexion</h1>

    <p v-if="error" class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ error }}
    </p>

    <form v-if="!auth.twoFactorPending" class="space-y-4" @submit.prevent="handleLogin">
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
      <div>
        <label class="mb-1 block text-sm font-medium" for="password">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {{ loading ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>

    <form v-else class="space-y-4" @submit.prevent="handleTwoFactor">
      <p class="text-sm text-muted-foreground">
        Saisissez le code à 6 chiffres de votre application d'authentification.
      </p>
      <input
        v-model="twoFactorCode"
        inputmode="numeric"
        pattern="\d{6}"
        maxlength="6"
        required
        placeholder="000000"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-widest"
      />
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {{ loading ? 'Vérification…' : 'Valider le code' }}
      </button>
    </form>

    <p v-if="!auth.twoFactorPending" class="mt-4 text-sm text-muted-foreground">
      Pas encore de compte ?
      <RouterLink :to="{ name: 'register' }" class="text-foreground underline">S'inscrire</RouterLink>
    </p>
  </div>
</template>
