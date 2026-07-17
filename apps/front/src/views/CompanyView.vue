<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { companyApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { COMPANY_ROLES } from '@/types/api'
import type { Company, CompanyMemberSummary, CompanyRole, CompanySummary } from '@/types/api'

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
    await loadCompanies()
  } catch (err) {
    createError.value = errorMessage(err, "Création de l'entreprise impossible")
  } finally {
    createLoading.value = false
  }
}

// --- Mes entreprises -------------------------------------------------------
// La liste vient de GET /companies (contract list) : les entreprises dont
// le user connecté est membre, avec son rôle.
const myCompanies = ref<CompanySummary[]>([])
const companiesError = ref('')
const companiesLoading = ref(false)

async function loadCompanies() {
  companiesError.value = ''
  companiesLoading.value = true
  try {
    myCompanies.value = await companyApi.list()
  } catch (err) {
    companiesError.value = errorMessage(err, 'Chargement des entreprises impossible')
  } finally {
    companiesLoading.value = false
  }
}

onMounted(loadCompanies)

// --- Consultation / suppression -------------------------------------------
const company = ref<Company | null>(null)
const lookupError = ref('')
const lookupLoading = ref(false)

async function handleSelect(id: string) {
  lookupError.value = ''
  lookupLoading.value = true
  try {
    company.value = await companyApi.get(id)
    await loadMembers()
  } catch (err) {
    company.value = null
    members.value = []
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
    members.value = []
    await loadCompanies()
  } catch (err) {
    lookupError.value = errorMessage(err, 'Suppression impossible')
  }
}

// --- Gestion des membres ---------------------------------------------------
// La liste vient de GET /companies/:id/members (contract listMembers).
const members = ref<CompanyMemberSummary[]>([])
const membersLoading = ref(false)
const memberError = ref('')
const memberSuccess = ref('')

async function loadMembers() {
  if (!company.value) return
  membersLoading.value = true
  try {
    members.value = await companyApi.listMembers(company.value.id)
  } catch (err) {
    members.value = []
    memberError.value = errorMessage(err, 'Chargement des membres impossible')
  } finally {
    membersLoading.value = false
  }
}

async function handleChangeRole(userId: string, event: Event) {
  if (!company.value) return
  const role = (event.target as HTMLSelectElement).value as CompanyRole
  memberError.value = ''
  memberSuccess.value = ''
  try {
    memberSuccess.value = await companyApi.changeMemberRole(company.value.id, userId, role)
  } catch (err) {
    memberError.value = errorMessage(err, 'Changement de rôle impossible')
  } finally {
    await loadMembers()
  }
}

async function handleRemoveMember(userId: string, label: string) {
  if (!company.value) return
  if (!window.confirm(`Retirer « ${label} » de l'entreprise ?`)) return
  memberError.value = ''
  memberSuccess.value = ''
  try {
    memberSuccess.value = await companyApi.removeMember(company.value.id, userId)
    await loadMembers()
  } catch (err) {
    memberError.value = errorMessage(err, 'Retrait du membre impossible')
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

    <!-- Mes entreprises -->
    <section class="rounded-lg border border-border bg-card p-6">
      <h2 class="mb-4 text-lg font-medium">Mes entreprises</h2>
      <p v-if="companiesError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ companiesError }}
      </p>
      <p v-if="lookupError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ lookupError }}
      </p>
      <p v-if="companiesLoading" class="text-sm text-muted-foreground">Chargement des entreprises…</p>
      <ul v-else class="divide-y divide-border rounded-md border border-border text-sm">
        <li v-for="item in myCompanies" :key="item.id">
          <button
            class="flex w-full items-center justify-between gap-4 px-4 py-2 text-left hover:bg-muted/50"
            :class="{ 'bg-muted/50': company?.id === item.id }"
            :disabled="lookupLoading"
            @click="handleSelect(item.id)"
          >
            <span class="font-medium">{{ item.name }}</span>
            <span class="text-muted-foreground">{{ item.slug }} · {{ item.role }}</span>
          </button>
        </li>
        <li v-if="myCompanies.length === 0" class="px-4 py-2 text-muted-foreground">
          Aucune entreprise
        </li>
      </ul>

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
          <p v-if="memberError" class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ memberError }}
          </p>
          <p v-if="memberSuccess" class="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
            {{ memberSuccess }}
          </p>
          <p v-if="membersLoading" class="text-sm text-muted-foreground">Chargement des membres…</p>
          <ul v-else class="divide-y divide-border rounded-md border border-border text-sm">
            <li
              v-for="member in members"
              :key="member.userId"
              class="flex items-center justify-between gap-4 px-4 py-2"
            >
              <span>{{ member.email }}</span>
              <span class="flex items-center gap-2">
                <select
                  :value="member.role"
                  class="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  @change="handleChangeRole(member.userId, $event)"
                >
                  <option v-for="role in COMPANY_ROLES" :key="role" :value="role">{{ role }}</option>
                </select>
                <button
                  class="rounded-md border border-destructive px-2 py-1 text-sm text-destructive hover:bg-destructive/10"
                  @click="handleRemoveMember(member.userId, member.email)"
                >
                  Retirer
                </button>
              </span>
            </li>
            <li v-if="members.length === 0" class="px-4 py-2 text-muted-foreground">Aucun membre</li>
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
