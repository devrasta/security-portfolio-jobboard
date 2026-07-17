import { apiFetch } from './api'
import type {
  ActivityAction,
  ActivityLog,
  ActivityLogList,
  Company,
  CompanyRole,
  SessionList,
  TwoFactorSetup,
  UserProfile,
} from '@/types/api'

export const usersApi = {
  getProfile: () => apiFetch<UserProfile>('/users/profile'),
}

export const twoFactorApi = {
  status: () => apiFetch<{ isEnabled: boolean }>('/auth/2fa/status'),
  setup: () => apiFetch<TwoFactorSetup>('/auth/2fa/setup'),
  enable: (code: string) =>
    apiFetch<{ message?: string }>('/auth/2fa/enable', { method: 'POST', body: { code } }),
  disable: (code: string) =>
    apiFetch<{ message: string }>('/auth/2fa/disable', { method: 'POST', body: { code } }),
}

export const sessionsApi = {
  list: () => apiFetch<SessionList>('/sessions'),
  revoke: (id: string) => apiFetch<{ message: string }>(`/sessions/${id}`, { method: 'DELETE' }),
}

export const activityApi = {
  list: (filters: { action?: ActivityAction; limit?: number; offset?: number } = {}) =>
    apiFetch<ActivityLogList>('/activity', { query: filters }),
  recent: (limit?: number) => apiFetch<ActivityLog[]>('/activity/recent', { query: { limit } }),
}

export const companyApi = {
  create: (data: { name: string; description?: string; users?: { id: string }[] }) =>
    apiFetch<string>('/company', { method: 'POST', body: data }),
  get: (id: string) => apiFetch<Company>(`/company/${id}`),
  remove: (id: string) => apiFetch<string>(`/company/${id}`, { method: 'DELETE' }),
  inviteMember: (id: string, data: { email: string; role: CompanyRole }) =>
    apiFetch<string>(`/company/${id}/members`, { method: 'POST', body: data }),
}
