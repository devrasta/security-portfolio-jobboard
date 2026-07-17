export interface AuthUser {
  id: string
  name: string
}

export interface UserProfile {
  email: string
  name: string
  twoFactorEnabled: boolean
  createdAt: string
}

export interface LoginSuccess {
  accessToken: string
  user: AuthUser
}

export interface TwoFactorChallenge {
  accessToken: string
  twoFactorRequired: boolean
}

export type LoginResponse = LoginSuccess | TwoFactorChallenge

export function isTwoFactorChallenge(res: LoginResponse): res is TwoFactorChallenge {
  return 'twoFactorRequired' in res
}

export interface Session {
  id: string
  createdAt: string
  expiresAt: string
  lastUsedAt: string | null
  ipAddress: string | null
  userAgent: string | null
  deviceId: string | null
}

export interface SessionList {
  data: Session[]
  total: number
}

export const ACTIVITY_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'TOKEN_REFRESH',
  'PASSWORD_CHANGE',
  'TWO_FACTOR_ENABLED',
  'TWO_FACTOR_DISABLED',
  'BACKUP_CODE_USED',
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export interface ActivityLog {
  id: string
  userId: string | null
  action: ActivityAction
  ipAddress: string | null
  userAgent: string | null
  city: string | null
  country: string | null
  createdAt: string
}

export interface ActivityLogList {
  data: ActivityLog[]
  total: number
}

export const COMPANY_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const

export type CompanyRole = (typeof COMPANY_ROLES)[number]

export interface CompanyMember {
  role: CompanyRole
  user: {
    id: string
    name: string | null
    email: string
  }
}

export interface CompanyMemberSummary {
  userId: string;
  email: string;
  role: CompanyRole;
}

// Shape renvoyée par GET /companies : les entreprises du user avec son rôle
export interface CompanySummary {
  id: string
  name: string
  slug: string
  role: CompanyRole
  createdAt: string
}

export interface Company {
  id: string
  name: string
  slug: string
  createdAt: string
  users: CompanyMember[]
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
}
