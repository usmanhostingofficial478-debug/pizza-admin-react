'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { isAuthenticated, updateActivity, logout } from '@/lib/auth'
import { subscribeToNewOrders, getOrders } from '@/lib/supabase'
import { X, ShoppingBag } from 'lucide-react'

// ── Notification sound (Web Audio API — no file needed) ────────
function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1046, ctx.currentTime)
    osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.12)
    osc.frequency.setValueAtTime(1568, ctx.currentTime + 0.24)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.7)
  } catch {}
}

// ── Toast type ─────────────────────────────────────────────────
type Toast = { id: string; orderId: string; customer: string; total: number; items: number }

// ══════════════════════════════════════════════════════════════
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [authed,  setAuthed]  = useState(false)
  const [checked, setChecked] = useState(false)
  const [toasts,  setToasts]  = useState<Toast[]>([])
  const seenIds  = useRef<Set<string>>(new Set())
  const titleIv  = useRef<ReturnType<typeof setInterval> | null>(null)
  const isLoginPage = pathname === '/login'

  // ── Auth check ─────────────────────────────────────────────
  useEffect(() => {
    if (isLoginPage) { setChecked(true); return }
    if (isAuthenticated()) { setAuthed(true); setChecked(true) }
    else { setChecked(true); router.replace('/login') }
  }, [pathname])

  // ── Inactivity timer ───────────────────────────────────────
  useEffect(() => {
    if (!authed || isLoginPage) return
    const events = ['mousemove','click','keydown','scroll','touchstart'] as const
    const onAct = () => updateActivity()
    events.forEach(ev => window.addEventListener(ev, onAct, { passive: true }))
    const t = setInterval(() => {
      if (!isAuthenticated()) { logout(); setAuthed(false); router.replace('/login') }
    }, 30_000)
    return () => { events.forEach(ev => window.removeEventListener(ev, onAct)); clearInterval(t) }
  }, [authed, isLoginPage])

  // ── Order subscription + notifications ────────────────────
  useEffect(() => {
    if (!authed || isLoginPage) return

    // Ask for browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Pre-seed seen IDs with ALL current orders so only truly new inserts notify
    let cancelled = false
    getOrders().then(list => {
      if (cancelled) return
      list.forEach(o => seenIds.current.add(o.id))
    }).catch(() => {})

    const sub = subscribeToNewOrders((order) => {
      // INSERT-only channel, but still dedupe in case subscription reconnects
      if (seenIds.current.has(order.id)) return
      seenIds.current.add(order.id)

      const customer = (order as any).customer || 'Someone'
      const total    = Number((order as any).total) || 0
      const items    = Array.isArray((order as any).items)
        ? (order as any).items.reduce((s: number, i: any) => s + (Number(i.qty) || 1), 0)
        : 0

      // 1️⃣ Play sound
      playDing()

      // 2️⃣ Browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification('🍕 New Order Received!', {
            body: `${customer} — Rs. ${total.toLocaleString()} · ${items} item${items !== 1 ? 's' : ''}`,
            icon: '/favicon.ico',
            tag: order.id,
            requireInteraction: false,
          })
          setTimeout(() => n.close(), 6000)
        } catch {}
      }

      // 3️⃣ Tab title flash
      const origTitle = document.title
      let flip = false
      if (titleIv.current) clearInterval(titleIv.current)
      titleIv.current = setInterval(() => {
        document.title = flip ? origTitle : '🔔 New Order!'
        flip = !flip
      }, 900)
      setTimeout(() => {
        if (titleIv.current) clearInterval(titleIv.current)
        document.title = origTitle
      }, 12000)

      // 4️⃣ In-app toast
      const id = `${Date.now()}`
      setToasts(prev => [{ id, orderId: order.id, customer, total, items }, ...prev].slice(0, 4))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 9000)
    })

    return () => { cancelled = true; sub.unsubscribe() }
  }, [authed, isLoginPage])

  // ── Render ─────────────────────────────────────────────────
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

      {/* ── In-app order toasts ─────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg,#1a0a00,#2a1200)',
              border: '1px solid rgba(249,115,22,0.4)',
              boxShadow: '0 0 30px rgba(249,115,22,0.2)',
              minWidth: 280, maxWidth: 320,
              animation: 'slideIn 0.3s ease',
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.2)' }}>
              <ShoppingBag className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-orange-400 font-black text-xs uppercase tracking-wider">🔔 New Order!</p>
              <p className="text-white font-bold text-sm truncate">{t.customer}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Rs. {t.total.toLocaleString()} &nbsp;·&nbsp; {t.items} item{t.items !== 1 ? 's' : ''}
              </p>
              <p className="text-gray-600 text-[10px] mt-0.5">{t.orderId}</p>
            </div>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
              className="text-gray-600 hover:text-gray-300 flex-shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
