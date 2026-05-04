const AUTH_KEY       = 'pz_admin_auth'
const PWD_KEY        = 'pz_admin_password'
const TIMEOUT_KEY    = 'pz_admin_timeout_min'
const DEFAULT_TIMEOUT_MIN = 15

export const DEFAULT_ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '0478'

/** Back-compat export — prefer getAdminPassword() */
export const ADMIN_PASSWORD = DEFAULT_ADMIN_PASSWORD

export function getAdminPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_PASSWORD
  try {
    const stored = localStorage.getItem(PWD_KEY)
    return stored && stored.length > 0 ? stored : DEFAULT_ADMIN_PASSWORD
  } catch { return DEFAULT_ADMIN_PASSWORD }
}

export function checkPassword(attempt: string): boolean {
  return attempt === getAdminPassword()
}

export function changeAdminPassword(current: string, next: string): { ok: boolean; error?: string } {
  if (!checkPassword(current))           return { ok: false, error: 'Current password is incorrect' }
  if (!next || next.length < 4)          return { ok: false, error: 'New password must be at least 4 characters' }
  if (next === current)                  return { ok: false, error: 'New password must be different' }
  try {
    localStorage.setItem(PWD_KEY, next)
    return { ok: true }
  } catch { return { ok: false, error: 'Failed to save password' } }
}

export function resetAdminPassword(): void {
  try { localStorage.removeItem(PWD_KEY) } catch {}
}

export function getInactivityTimeoutMin(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT_MIN
  try {
    const raw = localStorage.getItem(TIMEOUT_KEY)
    const n = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MIN
  } catch { return DEFAULT_TIMEOUT_MIN }
}

export function setInactivityTimeoutMin(mins: number) {
  try { localStorage.setItem(TIMEOUT_KEY, String(Math.max(1, Math.floor(mins)))) } catch {}
}

function timeoutMs() { return getInactivityTimeoutMin() * 60 * 1000 }

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const { lastActivity } = JSON.parse(raw)
    return typeof lastActivity === 'number' && (Date.now() - lastActivity) < timeoutMs()
  } catch { return false }
}

export function setLoggedIn() {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ lastActivity: Date.now() }))
}

export function updateActivity() {
  if (isAuthenticated()) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ lastActivity: Date.now() }))
  }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

export function getTimeRemaining(): number {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return 0
    const { lastActivity } = JSON.parse(raw)
    return Math.max(0, timeoutMs() - (Date.now() - lastActivity))
  } catch { return 0 }
}
