const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3002'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// Enregistré par le store d'auth : tente un refresh du token,
// retourne true si la session a pu être renouvelée.
let refreshHandler: (() => Promise<boolean>) | null = null

export function setRefreshHandler(handler: () => Promise<boolean>) {
  refreshHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  /** Ne pas tenter de refresh automatique sur 401 (endpoints d'auth). */
  skipRefresh?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(API_URL + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? ''
  if (res.status === 204) return undefined
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: string | string[] }).message
    return Array.isArray(message) ? message.join(', ') : message
  }
  if (typeof body === 'string' && body.length > 0) return body
  return `Erreur ${status}`
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = () => {
    const headers: Record<string, string> = {}
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

    return fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    })
  }

  let res = await doFetch()

  // Le token d'accès expire vite : sur 401, on tente un refresh puis on rejoue la requête.
  if (res.status === 401 && !options.skipRefresh && refreshHandler) {
    const refreshed = await refreshHandler()
    if (refreshed) {
      res = await doFetch()
    }
  }

  const body = await parseBody(res)

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(body, res.status))
  }

  return body as T
}
