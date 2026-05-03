'use client'

import { useEffect, useState, useRef } from 'react'
import { getOrders, updateOrderStatus, subscribeToOrders } from '@/lib/supabase'
import type { Order } from '@/types'
import { ChefHat, Clock, Bike, CheckCircle2, RefreshCw, Phone } from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────
function elapsed(ts: string): number {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
}
function fmtElapsed(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60), s = secs % 60
  if (m < 60) return `${m}m ${s}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
function urgencyLevel(secs: number): 'ok' | 'warn' | 'urgent' {
  if (secs < 15 * 60) return 'ok'
  if (secs < 30 * 60) return 'warn'
  return 'urgent'
}
const URGENCY_STYLE = {
  ok:     { border: '1px solid rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.08)'  },
  warn:   { border: '1px solid rgba(245,158,11,0.4)',  glow: 'rgba(245,158,11,0.1)'  },
  urgent: { border: '1px solid rgba(239,68,68,0.5)',   glow: 'rgba(239,68,68,0.12)'  },
}
const URGENCY_COLOR = { ok: '#10b981', warn: '#f59e0b', urgent: '#ef4444' }

// ── Live timer hook ────────────────────────────────────────────
function useNow() {
  const [, tick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(iv)
  }, [])
}

// ── Column config ──────────────────────────────────────────────
const COLUMNS = [
  { id: 'Pending',    label: 'New Orders',    icon: '🔔', color: '#f59e0b', next: 'Processing',  nextLabel: '🍳 Start Cooking' },
  { id: 'Processing', label: 'Cooking',       icon: '🍳', color: '#3b82f6', next: 'Confirmed',   nextLabel: '✅ Mark Ready'    },
  { id: 'Confirmed',  label: 'Ready / Pick',  icon: '✅', color: '#10b981', next: 'On the Way',  nextLabel: '🛵 Dispatch'      },
]

// ══════════════════════════════════════════════════════════════
export default function KitchenPage() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [lastNew, setLastNew] = useState(0)
  useNow()

  useEffect(() => {
    loadOrders()
    const sub = subscribeToOrders((updated) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === updated.id)
        if (!exists && updated.status === 'Pending') setLastNew(Date.now())
        return exists
          ? prev.map(o => o.id === updated.id ? updated : o)
          : [updated, ...prev]
      })
    })
    return () => { sub.unsubscribe() }
  }, [])

  async function loadOrders() {
    setLoading(true)
    const data = await getOrders()
    setOrders(data)
    setLoading(false)
  }

  async function advance(orderId: string, newStatus: string) {
    const ok = await updateOrderStatus(orderId, newStatus)
    if (ok) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o))
  }

  const active   = orders.filter(o => ['Pending','Processing','Confirmed'].includes(o.status))
  const recent   = orders.filter(o => o.status === 'On the Way').slice(0, 5)
  const todayDone = orders.filter(o => {
    const s = new Date(); s.setHours(0,0,0,0)
    return o.status === 'Delivered' && new Date(o.created_at) >= s
  })

  const avgWaitSecs = active.length
    ? Math.round(active.reduce((s,o) => s + elapsed(o.created_at), 0) / active.length)
    : 0
  const avgWait = avgWaitSecs >= 3600
    ? `${Math.floor(avgWaitSecs/3600)}h ${Math.floor((avgWaitSecs%3600)/60)}m`
    : `${Math.floor(avgWaitSecs/60)}m`

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#0a0a14' }}>
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen p-5" style={{ background: '#0a0a14' }}>

      {/* ── Header ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Kitchen Board</h1>
            <p className="text-gray-500 text-xs">Live order queue · auto-refreshes</p>
          </div>
        </div>
        <button onClick={loadOrders}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Stats bar ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active Orders',    value: active.length,       color: '#f97316', icon: '🔥' },
          { label: 'Avg Wait Time',    value: `${avgWait}m`,       color: '#3b82f6', icon: '⏱' },
          { label: 'Dispatched Today', value: recent.length,       color: '#8b5cf6', icon: '🛵' },
          { label: 'Delivered Today',  value: todayDone.length,    color: '#10b981', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Kanban columns ────────────────────────── */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <span className="text-6xl mb-4">😴</span>
          <p className="text-xl font-bold text-white">All clear! No active orders</p>
          <p className="text-gray-500 text-sm mt-1">New orders will appear here instantly</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const colOrders = active.filter(o => o.status === col.id)
              .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            return (
              <div key={col.id}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{col.icon}</span>
                    <span className="font-bold text-white text-sm">{col.label}</span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full"
                    style={{ background: `${col.color}22`, color: col.color }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="rounded-2xl p-6 text-center text-gray-600 text-sm"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                      Empty
                    </div>
                  ) : colOrders.map(order => (
                    <KitchenCard key={order.id} order={order} col={col} onAdvance={advance} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── On the Way strip ──────────────────────── */}
      {recent.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Bike className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white">On the Way ({recent.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {recent.map(o => (
              <div key={o.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div>
                  <p className="text-purple-300 font-bold text-xs">{o.id}</p>
                  <p className="text-gray-400 text-xs truncate max-w-[90px]">{(o as any).customer || '—'}</p>
                </div>
                <button onClick={() => advance(o.id, 'Delivered')}
                  className="text-[10px] px-2 py-1 rounded-lg font-bold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Order card ─────────────────────────────────────────────────
function KitchenCard({ order, col, onAdvance }: {
  order: Order; col: typeof COLUMNS[0]; onAdvance: (id: string, s: string) => void
}) {
  useNow()
  const secs    = elapsed(order.created_at)
  const urgency = urgencyLevel(secs)
  const ust     = URGENCY_STYLE[urgency]
  const totalQty = order.items?.reduce((s: number, i: any) => s + (Number(i.qty)||1), 0) || 0

  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: `#111127`, border: ust.border, boxShadow: `0 0 20px ${ust.glow}` }}>

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-black text-sm tracking-wide">{order.id}</p>
          <p className="text-gray-400 text-xs mt-0.5">{(order as any).customer || '—'}</p>
          {(order as any).phone && (
            <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />{(order as any).phone}
            </p>
          )}
        </div>
        {/* Live timer */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: `${URGENCY_COLOR[urgency]}22`, color: URGENCY_COLOR[urgency] }}>
            {fmtElapsed(secs)}
          </span>
          {urgency === 'urgent' && (
            <span className="text-[9px] font-bold text-red-400 animate-pulse">⚠ OVERDUE</span>
          )}
          {urgency === 'warn' && (
            <span className="text-[9px] font-bold text-yellow-400">⏳ Getting late</span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mb-3 rounded-xl p-2.5 space-y-1"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        {order.items?.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-gray-200 font-medium truncate mr-2">{item.name}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.size && <span className="text-gray-500">{item.size}</span>}
              <span className="font-black px-1.5 py-0.5 rounded-md text-[11px]"
                style={{ background: `${col.color}22`, color: col.color }}>
                ×{item.qty || 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-xs">{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
        <span className="text-white font-black text-sm">Rs. {Number(order.total).toLocaleString()}</span>
      </div>

      {/* Action button */}
      <button onClick={() => onAdvance(order.id, col.next)}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition active:scale-95"
        style={{ background: `linear-gradient(135deg,${col.color}cc,${col.color})`, color: '#fff' }}>
        {col.nextLabel}
      </button>
    </div>
  )
}
