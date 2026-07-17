import { apiFetch } from './api'
import type {
  ActivityAction,
  ActivityLog,
  ActivityLogList,
  Company,
  CompanyMemberSummary,
  CompanyRole,
  CompanySummary,
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
    apiFetch<string>('/companies', { method: 'POST', body: data }),
  get: (id: string) => apiFetch<Company>(`/companies/${id}`),
  list: () => apiFetch<CompanySummary[]>('/companies'),
  remove: (id: string) => apiFetch<string>(`/companies/${id}`, { method: 'DELETE' }),
  inviteMember: (id: string, data: { email: string; role: CompanyRole }) =>
    apiFetch<string>(`/companies/${id}/members/invite`, { method: 'POST', body: data }),
  listMembers: (id: string) => apiFetch<CompanyMemberSummary[]>(`/companies/${id}/members`),
  changeMemberRole: (id: string, userId: string, role: CompanyRole) =>
    apiFetch<string>(`/companies/${id}/members/${userId}`, { method: 'PATCH', body: { role } }),
  removeMember: (id: string, userId: string) =>
    apiFetch<string>(`/companies/${id}/members/${userId}`, { method: 'DELETE' }),
}
