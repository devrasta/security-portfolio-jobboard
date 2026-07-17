import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiFetch, setAccessToken, setRefreshHandler } from '@/lib/api'
import { isTwoFactorChallenge } from '@/types/api'
import type { AuthUser, LoginResponse, LoginSuccess } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const accessToken = ref<string | null>(null)
  // Token temporaire renvoyé par POST /auth/login quand le 2FA est requis.
  const pendingTwoFactorToken = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const twoFactorPending = computed(() => pendingTwoFactorToken.value !== null)

  function setSession(session: LoginSuccess) {
    user.value = session.user
    accessToken.value = session.accessToken
    pendingTwoFactorToken.value = null
    setAccessToken(session.accessToken)
  }

  function clearSession() {
    user.value = null
    accessToken.value = null
    pendingTwoFactorToken.value = null
    setAccessToken(null)
  }

  async function register(data: { name: string; email: string; password: string }) {
    return apiFetch<{ email: string; name: string }>('/auth/register', {
      method: 'POST',
      body: data,
      skipRefresh: true,
    })
  }

  /** Retourne true si le 2FA est requis pour finaliser la connexion. */
  async function login(email: string, password: string): Promise<boolean> {
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipRefresh: true,
    })
    if (isTwoFactorChallenge(res)) {
      pendingTwoFactorToken.value = res.accessToken
      return true
    }
    setSession(res)
    return false
  }

  async function loginWithTwoFactor(code: string) {
    const res = await apiFetch<LoginSuccess>('/auth/login/2fa', {
      method: 'POST',
      body: { accessToken: pendingTwoFactorToken.value, code },
      skipRefresh: true,
    })
    setSession(res)
  }

  let refreshPromise: Promise<boolean> | null = null

  /** Renouvelle la session via le cookie httpOnly. Dédupliqué entre appels concurrents. */
  function refresh(): Promise<boolean> {
    refreshPromise ??= apiFetch<LoginSuccess>('/auth/refresh', {
      method: 'POST',
      skipRefresh: true,
    })
      .then((res) => {
        setSession(res)
        return true
      })
      .catch(() => {
        clearSession()
        return false
      })
      .finally(() => {
        refreshPromise = null
      })
    return refreshPromise
  }

  /** Tentative silencieuse de restauration de session au démarrage de l'app. */
  async function initialize() {
    await refresh()
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // Même si l'API rejette (session déjà révoquée, token expiré…),
      // la session locale doit être purgée.
    } finally {
      clearSession()
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    })
  }

  async function checkPasswordStrength(password: string): Promise<number> {
    const res = await apiFetch<{ strength: number }>('/auth/password-strength', {
      method: 'POST',
      body: { password },
      skipRefresh: true,
    })
    return res.strength
  }

  setRefreshHandler(refresh)

  return {
    user,
    accessToken,
    isAuthenticated,
    twoFactorPending,
    register,
    login,
    loginWithTwoFactor,
    refresh,
    initialize,
    logout,
    changePassword,
    checkPasswordStrength,
    clearSession,
  }
})
