import { apiFetch } from './api'
import type {
  ActivityAction,
  ActivityLog,
  ActivityLogList,
  Company,
  CompanyMemberSummary,
  CompanyRole,
  CompanySummary,
  Job,
  JobStatus,
  PublicJob,
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

export const jobsApi = {
  create: (
    companyId: string,
    data: { title: string; location: string; description: string; status?: JobStatus },
  ) => apiFetch<Job>(`/companies/${companyId}/jobs`, { method: 'POST', body: data }),
  list: (companyId: string) => apiFetch<Job[]>(`/companies/${companyId}/jobs`),
  get: (companyId: string, jobId: string) =>
    apiFetch<Job>(`/companies/${companyId}/jobs/${jobId}`),
  update: (
    companyId: string,
    jobId: string,
    data: Partial<{
      title: string
      location: string
      description: string
      ownerId: string
      status: JobStatus
    }>,
  ) => apiFetch<Job>(`/companies/${companyId}/jobs/${jobId}`, { method: 'PATCH', body: data }),
  remove: (companyId: string, jobId: string) =>
    apiFetch<string>(`/companies/${companyId}/jobs/${jobId}`, { method: 'DELETE' }),
  generateShareLink: (companyId: string, jobId: string) =>
    apiFetch<string>(`/companies/${companyId}/jobs/${jobId}/share`, { method: 'POST' }),
  revokeShareLink: (companyId: string, jobId: string) =>
    apiFetch<string>(`/companies/${companyId}/jobs/${jobId}/share`, { method: 'DELETE' }),
  invite: (companyId: string, jobId: string, email: string) =>
    apiFetch<string>(`/companies/${companyId}/jobs/${jobId}/invite`, {
      method: 'POST',
      body: { email },
    }),
  // Public endpoints, no auth required.
  getShared: (shareToken: string) =>
    apiFetch<Job>(`/jobs/shared/${shareToken}`, { skipRefresh: true }),
  listPublic: () => apiFetch<PublicJob[]>('/jobs/public', { skipRefresh: true }),
  getPublic: (jobId: string) =>
    apiFetch<Job>(`/jobs/public/${jobId}`, { skipRefresh: true }),
  getByInviteToken: (inviteToken: string) =>
    apiFetch<Job>(`/jobs/invite/${inviteToken}`, { skipRefresh: true }),
}
