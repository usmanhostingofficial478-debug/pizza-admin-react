const AUTH_KEY    = 'pz_admin_auth'
const TIMEOUT_MS  = 15 * 60 * 1000 // 15 minutes

export const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '0478'

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const { lastActivity } = JSON.parse(raw)
    return typeof lastActivity === 'number' && (Date.now() - lastActivity) < TIMEOUT_MS
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
    return Math.max(0, TIMEOUT_MS - (Date.now() - lastActivity))
  } catch { return 0 }
}
