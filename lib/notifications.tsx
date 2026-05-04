'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AdminNotification = {
  id: string
  orderId: string
  customer: string
  total: number
  items: number
  createdAt: number
  read: boolean
}

type Ctx = {
  notifications: AdminNotification[]
  unreadCount: number
  add: (n: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
  remove: (id: string) => void
}

const NotificationsContext = createContext<Ctx | null>(null)
const STORAGE_KEY = 'pizza-admin-notifications'
const MAX_NOTIFS  = 50

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (raw) setNotifications(JSON.parse(raw))
    } catch {}
  }, [])

  // Persist on change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)) } catch {}
  }, [notifications])

  const add: Ctx['add'] = useCallback((n) => {
    setNotifications(prev => {
      const entry: AdminNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        read: false,
      }
      return [entry, ...prev].slice(0, MAX_NOTIFS)
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => n.read ? n : { ...n, read: true }))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  const remove = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const value = useMemo<Ctx>(() => ({
    notifications, unreadCount, add, markAllRead, clear, remove,
  }), [notifications, unreadCount, add, markAllRead, clear, remove])

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
