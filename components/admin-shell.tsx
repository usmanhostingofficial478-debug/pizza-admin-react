'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { isAuthenticated, updateActivity, logout } from '@/lib/auth'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [authed,  setAuthed]  = useState(false)
  const [checked, setChecked] = useState(false)
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (isLoginPage) { setChecked(true); return }
    if (isAuthenticated()) {
      setAuthed(true)
      setChecked(true)
    } else {
      setChecked(true)
      router.replace('/login')
    }
  }, [pathname])

  useEffect(() => {
    if (!authed || isLoginPage) return
    const events = ['mousemove','click','keydown','scroll','touchstart'] as const
    const onActivity = () => updateActivity()
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))
    const timer = setInterval(() => {
      if (!isAuthenticated()) { logout(); setAuthed(false); router.replace('/login') }
    }, 30_000)
    return () => { events.forEach(ev => window.removeEventListener(ev, onActivity)); clearInterval(timer) }
  }, [authed, isLoginPage])

  if (!checked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
      <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )

  if (isLoginPage) return <>{children}</>
  if (!authed) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 bg-background">{children}</main>
    </div>
  )
}
