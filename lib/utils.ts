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

export function timeAgo(dateInput: string | number): string {
  let ts: number
  if (typeof dateInput === 'number') {
    ts = dateInput
  } else {
    // Force UTC parsing if no timezone info (Supabase returns timestamps without Z)
    const str = dateInput && !dateInput.endsWith('Z') && !dateInput.includes('+') && !dateInput.includes('-', 10)
      ? dateInput + 'Z'
      : dateInput
    ts = Date.parse(str)
  }
  if (isNaN(ts)) return ''
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
