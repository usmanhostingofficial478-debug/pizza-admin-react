import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Pending': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
    'Processing': 'bg-blue-500/20 text-blue-500 border-blue-500/50',
    'Confirmed': 'bg-indigo-500/20 text-indigo-500 border-indigo-500/50',
    'On the Way': 'bg-purple-500/20 text-purple-500 border-purple-500/50',
    'Delivered': 'bg-green-500/20 text-green-500 border-green-500/50',
    'Cancelled': 'bg-red-500/20 text-red-500 border-red-500/50',
  }
  return colors[status] || 'bg-gray-500/20 text-gray-500'
}

/** Parse Supabase/ISO timestamp correctly (force UTC if no tz info) */
export function parseTs(input: string | number | null | undefined): number {
  if (input == null) return NaN
  if (typeof input === 'number') return input
  const str = input && !input.endsWith('Z') && !input.includes('+') && !input.includes('-', 10)
    ? input + 'Z'
    : input
  return Date.parse(str)
}

/** Return a YYYY-MM-DD date string in Pakistan timezone for any timestamp */
export function pkDateKey(input: string | number | Date): string {
  const ms = input instanceof Date ? input.getTime() : parseTs(input as any)
  if (isNaN(ms)) return ''
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

/** Today's date key (YYYY-MM-DD) in Pakistan timezone */
export function pkTodayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

/** True if the given timestamp falls on "today" in Pakistan timezone */
export function isPkToday(input: string | number | Date): boolean {
  return pkDateKey(input) === pkTodayKey()
}

export function timeAgo(dateInput: string | number): string {
  const ts = parseTs(dateInput)
  if (isNaN(ts)) return ''
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
