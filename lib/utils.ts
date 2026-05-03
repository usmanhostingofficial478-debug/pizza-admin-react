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
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
