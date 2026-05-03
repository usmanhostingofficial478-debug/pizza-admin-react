'use client'

import { useEffect, useState } from 'react'
import { getOrders, getActivities, subscribeToOrders, addActivity } from '@/lib/supabase'
import { pkDateKey, pkTodayKey, isPkToday, parseTs } from '@/lib/utils'
import type { Order, Activity } from '@/types'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import Link from 'next/link'
import { ChefHat, ArrowRight, TrendingUp, ShoppingBag, Clock, CheckCircle2, XCircle, Zap } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  Pending: '#f59e0b', Processing: '#3b82f6', Confirmed: '#6366f1',
  'On the Way': '#8b5cf6', Delivered: '#10b981', Cancelled: '#ef4444',
}
function sc(s: string) { return STATUS_COLOR[s] || '#6b7280' }

function tAgo(ts: string) {
  const m = Math.floor((Date.now() - parseTs(ts)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m/60)}h ago`
  return `${Math.floor(m/1440)}d ago`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const CARD: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }
const TIP = { backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e5e7eb', fontSize: 12 }

export default function Dashboard() {
  const [orders,     setOrders]     = useState<Order[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [time,       setTime]       = useState('')

  useEffect(() => {
    loadData()
    const sub = subscribeToOrders((newOrder) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === newOrder.id)
        if (!exists) {
          const name = typeof newOrder.customer === 'object'
            ? (newOrder.customer as any)?.name || 'Someone' : newOrder.customer || 'Someone'
          addActivity('🛒', `New order from <strong>${name}</strong> – Rs. ${newOrder.total}`)
          setActivities(a => [{ id: Date.now().toString(), icon: '🛒',
            text: `New order from <strong>${name}</strong> – Rs. ${newOrder.total}`,
            timestamp: Date.now().toString() }, ...a].slice(0, 12))
          return [newOrder, ...prev]
        }
        return prev.map(o => o.id === newOrder.id ? newOrder : o)
      })
    })
    const tick = () => setTime(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' }))
    tick(); const iv = setInterval(tick, 1000)
    return () => { sub.unsubscribe(); clearInterval(iv) }
  }, [])

  async function loadData() {
    setLoading(true)
    const [od, act] = await Promise.all([getOrders(), getActivities(12)])
    setOrders(od); setActivities(act); setLoading(false)
  }

  // ── Derived ─────────────────────────────────────────────────
  const todayOrders   = orders.filter(o => isPkToday(o.created_at))
  const todayRevenue  = todayOrders.filter(o => o.status !== 'Cancelled').reduce((s,o) => s + Number(o.total), 0)
  const totalRevenue  = orders.filter(o => o.status !== 'Cancelled').reduce((s,o) => s + Number(o.total), 0)
  const pendingNow    = orders.filter(o => o.status === 'Pending').length
  const kitchenNow    = orders.filter(o => ['Processing','Confirmed'].includes(o.status)).length
  const deliveredToday= todayOrders.filter(o => o.status === 'Delivered').length
  const avgOrderVal   = orders.filter(o=>o.status!=='Cancelled').length
    ? Math.round(totalRevenue / orders.filter(o=>o.status!=='Cancelled').length) : 0

  // Last 7 days revenue — keyed by Pakistan YYYY-MM-DD so orders land on the correct day
  const rev7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6-i)*86400000)
    const key   = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
    const label = d.toLocaleDateString('en-PK', { weekday: 'short', timeZone: 'Asia/Karachi' })
    const rev = orders.filter(o =>
      o.status !== 'Cancelled' && pkDateKey(o.created_at) === key
    ).reduce((s,o) => s + Number(o.total), 0)
    return { label, rev }
  })

  // Top items today
  const itemMap: Record<string, number> = {}
  todayOrders.filter(o=>o.status!=='Cancelled').forEach(o => {
    if (!Array.isArray(o.items)) return
    o.items.forEach((it:any) => { if (it?.name) itemMap[it.name] = (itemMap[it.name]||0)+(Number(it.qty)||1) })
  })
  const topItems = Object.entries(itemMap).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Active kitchen + recent orders
  const kitchenOrders = orders.filter(o => ['Pending','Processing','Confirmed'].includes(o.status)).slice(0,5)
  const recentOrders  = orders.slice(0, 8)

  const dateStr = new Date().toLocaleDateString('en-PK', { weekday:'long', month:'long', day:'numeric', timeZone:'Asia/Karachi' })

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#0a0a14' }}>
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen p-5" style={{ background: '#0a0a14' }}>

      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{greeting()}, Admin 👋</h1>
          <p className="text-gray-500 text-xs mt-0.5">{dateStr} · {time}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/kitchen"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }}>
            <ChefHat className="w-4 h-4" /> Kitchen
            {kitchenNow > 0 && <span className="bg-white/20 px-1.5 rounded-full text-xs">{kitchenNow}</span>}
          </Link>
          <Link href="/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-300 transition"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <ShoppingBag className="w-4 h-4" /> Orders
          </Link>
          <Link href="/analytics"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-300 transition"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <TrendingUp className="w-4 h-4" /> Analytics
          </Link>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: "Today's Revenue",  value: `Rs. ${Math.round(todayRevenue).toLocaleString()}`,  color: '#f97316', icon: '📅', sub: `${todayOrders.length} orders today` },
          { label: 'Total Revenue',    value: `Rs. ${Math.round(totalRevenue/1000)}k`,             color: '#10b981', icon: '💰', sub: `${orders.length} total orders` },
          { label: 'Avg Order',        value: `Rs. ${avgOrderVal.toLocaleString()}`,               color: '#3b82f6', icon: '📊', sub: 'per order (ex-cancelled)' },
          { label: 'Pending',          value: pendingNow,                                          color: '#f59e0b', icon: '⏳', sub: 'need attention' },
          { label: 'In Kitchen',       value: kitchenNow,                                          color: '#8b5cf6', icon: '🍳', sub: 'being prepared' },
          { label: 'Delivered Today',  value: deliveredToday,                                      color: '#10b981', icon: '✅', sub: 'completed today' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl" style={CARD}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-tight">{s.label}</p>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="font-black text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue sparkline + status breakdown ──── */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 p-5 rounded-2xl" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-bold text-sm">Revenue — Last 7 Days</p>
              <p className="text-gray-500 text-xs">excluding cancelled orders</p>
            </div>
            <p className="text-orange-400 font-black text-lg">
              Rs. {rev7.reduce((s,d)=>s+d.rev,0).toLocaleString()}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={rev7}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={TIP} formatter={(v:any) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="rev" stroke="#f97316" strokeWidth={2.5} fill="url(#dg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2">
            {rev7.map(d => <span key={d.label} className="text-[10px] text-gray-600">{d.label}</span>)}
          </div>
        </div>

        <div className="p-5 rounded-2xl" style={CARD}>
          <p className="text-white font-bold text-sm mb-4">Order Status Breakdown</p>
          <div className="space-y-2.5">
            {Object.entries(STATUS_COLOR).map(([s, c]) => {
              const count = orders.filter(o => o.status === s).length
              const pct = orders.length ? count/orders.length : 0
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold" style={{ color: c }}>{s}</span>
                    <span className="text-gray-400 font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct*100}%`, background: c }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Recent orders + right panel ─────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Recent orders */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={CARD}>
          <div className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-white font-bold text-sm">Recent Orders</p>
            <Link href="/orders" className="text-xs text-orange-400 font-bold flex items-center gap-1 hover:text-orange-300">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentOrders.map((o, i) => {
              const c = sc(o.status)
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i<recentOrders.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', borderLeft: `3px solid ${c}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-xs truncate">{o.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                        style={{ background: `${c}22`, color: c }}>{o.status}</span>
                    </div>
                    <p className="text-gray-400 text-xs truncate">{o.customer}{o.phone ? ` · ${o.phone}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold text-sm">Rs. {Number(o.total).toLocaleString()}</p>
                    <p className="text-gray-600 text-xs">{tAgo(o.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Kitchen queue */}
          <div className="rounded-2xl" style={CARD}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white font-bold text-sm flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-400" /> Kitchen Queue
              </p>
              {kitchenNow > 0 && (
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f97316' }} />
              )}
            </div>
            <div className="p-3 space-y-2">
              {kitchenOrders.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">All clear! 🎉</p>
              ) : kitchenOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div>
                    <p className="text-white font-bold text-xs">{o.id}</p>
                    <p className="text-gray-500 text-[10px]">{o.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: sc(o.status) }}>{o.status}</p>
                    <p className="text-gray-600 text-[10px]">{tAgo(o.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top items today */}
          <div className="rounded-2xl" style={CARD}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white font-bold text-sm">🔥 Top Items Today</p>
            </div>
            <div className="p-3 space-y-2">
              {topItems.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">No orders today yet</p>
              ) : topItems.map(([name, qty], i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-[10px] font-black w-4 text-center"
                    style={{ color: i===0 ? '#f59e0b' : '#4b5563' }}>
                    {i+1}
                  </span>
                  <span className="text-gray-300 text-xs flex-1 truncate">{name}</span>
                  <span className="text-orange-400 font-black text-xs">×{qty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl" style={CARD}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white font-bold text-sm">⚡ Activity Feed</p>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 220 }}>
              {activities.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">No recent activity</p>
              ) : activities.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-xs">
                  <span className="text-base flex-shrink-0 mt-0.5">{a.icon}</span>
                  <div>
                    <p className="text-gray-300 leading-snug" dangerouslySetInnerHTML={{ __html: a.text }} />
                    <p className="text-gray-600 text-[10px] mt-0.5">{tAgo(String(a.timestamp))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
