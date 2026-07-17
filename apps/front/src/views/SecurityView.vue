<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { sessionsApi, twoFactorApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue'
import type { Session, TwoFactorSetup } from '@/types/api'

const auth = useAuthStore()

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

// --- Changement de mot de passe -------------------------------------------
const currentPassword = ref('')
const newPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordLoading = ref(false)

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  passwordLoading.value = true
  try {
    const res = await auth.changePassword(currentPassword.value, newPassword.value)
    passwordSuccess.value = res.message
    currentPassword.value = ''
    newPassword.value = ''
  } catch (err) {
    passwordError.value = errorMessage(err, 'Changement de mot de passe impossible')
  } finally {
    passwordLoading.value = false
  }
}

// --- Double authentification ----------------------------------------------
const twoFactorEnabled = ref(false)
const twoFactorSetup = ref<TwoFactorSetup | null>(null)
const twoFactorCode = ref('')
const twoFactorError = ref('')
const twoFactorSuccess = ref('')
const twoFactorLoading = ref(false)

async function loadTwoFactorStatus() {
  const res = await twoFactorApi.status()
  twoFactorEnabled.value = res.isEnabled
}

async function startTwoFactorSetup() {
  twoFactorError.value = ''
  twoFactorSuccess.value = ''
  twoFactorLoading.value = true
  try {
    twoFactorSetup.value = await twoFactorApi.setup()
  } catch (err) {
    twoFactorError.value = errorMessage(err, 'Initialisation du 2FA impossible')
  } finally {
    twoFactorLoading.value = false
  }
}

async function enableTwoFactor() {
  twoFactorError.value = ''
  twoFactorLoading.value = true
  try {
    await twoFactorApi.enable(twoFactorCode.value)
    twoFactorEnabled.value = true
    twoFactorSetup.value = null
    twoFactorCode.value = ''
    twoFactorSuccess.value = 'Double authentification activée.'
  } catch (err) {
    twoFactorError.value = errorMessage(err, 'Code invalide')
  } finally {
    twoFactorLoading.value = false
  }
}

async function disableTwoFactor() {
  twoFactorError.value = ''
  twoFactorLoading.value = true
  try {
    await twoFactorApi.disable(twoFactorCode.value)
    twoFactorEnabled.value = false
    twoFactorCode.value = ''
    twoFactorSuccess.value = 'Double authentification désactivée.'
  } catch (err) {
    twoFactorError.value = errorMessage(err, 'Code invalide')
  } finally {
    twoFactorLoading.value = false
  }
}

// --- Sessions actives ------------------------------------------------------
const sessions = ref<Session[]>([])
const sessionsError = ref('')

async function loadSessions() {
  const res = await sessionsApi.list()
  sessions.value = res.data
}

async function revokeSession(id: string) {
  sessionsError.value = ''
  try {
    await sessionsApi.revoke(id)
    await loadSessions()
  } catch (err) {
    sessionsError.value = errorMessage(err, 'Révocation impossible')
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadTwoFactorStatus(), loadSessions()])
  } catch (err) {
    sessionsError.value = errorMessage(err, 'Chargement impossible')
  }
})
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-semibold">Sécurité</h1>

    <!-- Changement de mot de passe -->
    <section class="rounded-lg border border-border bg-card p-6">
      <h2 class="mb-4 text-lg font-medium">Changer le mot de passe</h2>
      <p v-if="passwordError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ passwordError }}
      </p>
      <p v-if="passwordSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
        {{ passwordSuccess }}
      </p>
      <form class="max-w-sm space-y-4" @submit.prevent="handleChangePassword">
        <div>
          <label class="mb-1 block text-sm font-medium" for="current-password">
            Mot de passe actuel
          </label>
          <input
            id="current-password"
            v-model="currentPassword"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="space-y-2">
          <label class="mb-1 block text-sm font-medium" for="new-password">
            Nouveau mot de passe
          </label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            required
            minlength="12"
            maxlength="40"
            autocomplete="new-password"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <PasswordStrengthMeter :password="newPassword" />
        </div>
        <button
          type="submit"
          :disabled="passwordLoading"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {{ passwordLoading ? 'Enregistrement…' : 'Mettre à jour' }}
        </button>
      </form>
    </section>

    <!-- Double authentification -->
    <section class="rounded-lg border border-border bg-card p-6">
      <h2 class="mb-4 text-lg font-medium">Double authentification (2FA)</h2>
      <p v-if="twoFactorError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ twoFactorError }}
      </p>
      <p v-if="twoFactorSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
        {{ twoFactorSuccess }}
      </p>

      <!-- 2FA désactivé, pas de setup en cours -->
      <div v-if="!twoFactorEnabled && !twoFactorSetup">
        <p class="mb-3 text-sm text-muted-foreground">
          Protégez votre compte avec une application d'authentification (TOTP).
        </p>
        <button
          :disabled="twoFactorLoading"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          @click="startTwoFactorSetup"
        >
          Configurer le 2FA
        </button>
      </div>

      <!-- Setup en cours : QR code + validation -->
      <div v-else-if="twoFactorSetup" class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Scannez ce QR code avec votre application d'authentification, puis saisissez le code
          généré.
        </p>
        <img :src="twoFactorSetup.qrCode" alt="QR code 2FA" class="h-44 w-44 rounded-md border border-border" />
        <p class="text-xs text-muted-foreground">
          Clé manuelle : <code class="rounded bg-muted px-1 py-0.5">{{ twoFactorSetup.secret }}</code>
        </p>
        <form class="flex max-w-sm gap-2" @submit.prevent="enableTwoFactor">
          <input
            v-model="twoFactorCode"
            inputmode="numeric"
            maxlength="6"
            required
            placeholder="000000"
            class="w-32 rounded-md border border-input bg-background px-3 py-2 text-center tracking-widest"
          />
          <button
            type="submit"
            :disabled="twoFactorLoading"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Activer
          </button>
        </form>
      </div>

      <!-- 2FA activé -->
      <div v-else class="space-y-3">
        <p class="text-sm">
          Le 2FA est <span class="font-medium text-green-600">activé</span> sur votre compte.
        </p>
        <form class="flex max-w-sm gap-2" @submit.prevent="disableTwoFactor">
          <input
            v-model="twoFactorCode"
            inputmode="numeric"
            maxlength="6"
            required
            placeholder="000000"
            class="w-32 rounded-md border border-input bg-background px-3 py-2 text-center tracking-widest"
          />
          <button
            type="submit"
            :disabled="twoFactorLoading"
            class="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Désactiver
          </button>
        </form>
      </div>
    </section>

    <!-- Sessions actives -->
    <section class="rounded-lg border border-border bg-card p-6">
      <h2 class="mb-4 text-lg font-medium">Sessions actives</h2>
      <p v-if="sessionsError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ sessionsError }}
      </p>
      <p v-if="sessions.length === 0" class="text-sm text-muted-foreground">
        Aucune session active.
      </p>
      <ul v-else class="divide-y divide-border">
        <li v-for="session in sessions" :key="session.id" class="flex items-center justify-between gap-4 py-3 text-sm">
          <div class="min-w-0">
            <p class="truncate">{{ session.userAgent ?? 'Appareil inconnu' }}</p>
            <p class="text-muted-foreground">
              {{ session.ipAddress ?? 'IP inconnue' }} · créée le
              {{ dateFormatter.format(new Date(session.createdAt)) }}
            </p>
          </div>
          <button
            class="shrink-0 rounded-md border border-destructive px-3 py-1.5 text-destructive hover:bg-destructive/10"
            @click="revokeSession(session.id)"
          >
            Révoquer
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
