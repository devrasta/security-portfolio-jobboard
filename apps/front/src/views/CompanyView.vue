<script setup lang="ts">
import { ref } from 'vue'
import { companyApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { COMPANY_ROLES } from '@/types/api'
import type { Company, CompanyRole } from '@/types/api'

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

// --- Création --------------------------------------------------------------
const newCompanyName = ref('')
const createError = ref('')
const createSuccess = ref('')
const createLoading = ref(false)

async function handleCreate() {
  createError.value = ''
  createSuccess.value = ''
  createLoading.value = true
  try {
    createSuccess.value = await companyApi.create({ name: newCompanyName.value })
    newCompanyName.value = ''
  } catch (err) {
    createError.value = errorMessage(err, "Création de l'entreprise impossible")
  } finally {
    createLoading.value = false
  }
}

// --- Consultation / suppression -------------------------------------------
// L'API ne renvoie pas l'id à la création et n'expose pas de liste :
// on charge une entreprise par son identifiant (UUID).
const companyId = ref('')
const company = ref<Company | null>(null)
const lookupError = ref('')
const lookupLoading = ref(false)

async function handleLookup() {
  lookupError.value = ''
  lookupLoading.value = true
  try {
    company.value = await companyApi.get(companyId.value.trim())
  } catch (err) {
    company.value = null
    lookupError.value = errorMessage(err, 'Entreprise introuvable')
  } finally {
    lookupLoading.value = false
  }
}

async function handleDelete() {
  if (!company.value) return
  if (!window.confirm(`Supprimer l'entreprise « ${company.value.name} » ?`)) return
  lookupError.value = ''
  try {
    await companyApi.remove(company.value.id)
    company.value = null
    companyId.value = ''
  } catch (err) {
    lookupError.value = errorMessage(err, 'Suppression impossible')
  }
}

// --- Invitation de membre --------------------------------------------------
const inviteEmail = ref('')
const inviteRole = ref<CompanyRole>('MEMBER')
const inviteError = ref('')
const inviteSuccess = ref('')
const inviteLoading = ref(false)

async function handleInvite() {
  if (!company.value) return
  inviteError.value = ''
  inviteSuccess.value = ''
  inviteLoading.value = true
  try {
    inviteSuccess.value = await companyApi.inviteMember(company.value.id, {
      email: inviteEmail.value,
      role: inviteRole.value,
    })
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
    <h1 class="text-2xl font-semibold">Entreprise</h1>

    <!-- Création -->
    <section class="rounded-lg border border-border bg-card p-6">
      <h2 class="mb-4 text-lg font-medium">Créer une entreprise</h2>
      <p v-if="createError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ createError }}
      </p>
      <p v-if="createSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
        {{ createSuccess }}
      </p>
      <form class="flex max-w-md gap-2" @submit.prevent="handleCreate">
        <input
          v-model="newCompanyName"
          type="text"
          required
          placeholder="Nom de l'entreprise"
          class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          :disabled="createLoading"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {{ createLoading ? 'Création…' : 'Créer' }}
        </button>
      </form>
    </section>

    <!-- Consultation -->
    <section class="rounded-lg border border-border bg-card p-6">
      <h2 class="mb-4 text-lg font-medium">Consulter une entreprise</h2>
      <p v-if="lookupError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ lookupError }}
      </p>
      <form class="flex max-w-xl gap-2" @submit.prevent="handleLookup">
        <input
          v-model="companyId"
          type="text"
          required
          placeholder="Identifiant de l'entreprise (UUID)"
          class="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
        />
        <button
          type="submit"
          :disabled="lookupLoading"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {{ lookupLoading ? 'Chargement…' : 'Charger' }}
        </button>
      </form>

      <div v-if="company" class="mt-6 space-y-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold">{{ company.name }}</h3>
            <p class="text-sm text-muted-foreground">
              {{ company.slug }} · créée le {{ dateFormatter.format(new Date(company.createdAt)) }}
            </p>
          </div>
          <button
            class="rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            @click="handleDelete"
          >
            Supprimer
          </button>
        </div>

        <div>
          <h4 class="mb-2 font-medium">Membres</h4>
          <ul class="divide-y divide-border rounded-md border border-border text-sm">
            <li
              v-for="member in company.users"
              :key="member.user.id"
              class="flex items-center justify-between px-4 py-2"
            >
              <span>{{ member.user.name ?? member.user.email }}</span>
              <span class="text-muted-foreground">{{ member.user.email }} · {{ member.role }}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="mb-2 font-medium">Inviter un membre</h4>
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
            <select
              v-model="inviteRole"
              class="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option v-for="role in COMPANY_ROLES" :key="role" :value="role">{{ role }}</option>
            </select>
            <button
              type="submit"
              :disabled="inviteLoading"
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {{ inviteLoading ? 'Envoi…' : 'Inviter' }}
            </button>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>
