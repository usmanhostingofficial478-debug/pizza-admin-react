'use client'

import { useEffect, useState } from 'react'
import { getOrders } from '@/lib/supabase'
import { pkDateKey, isPkToday, parseTs } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'

const C = { orange: '#f97316', blue: '#3b82f6', green: '#10b981', red: '#ef4444', purple: '#8b5cf6', yellow: '#f59e0b', gray: '#6b7280' }
const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }
const TIP  = { backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e5e7eb', fontSize: 13 }

function StatCard({ label, value, sub, color = C.orange, icon }: any) {
  return (
    <div className="p-5" style={CARD}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-white text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: any) {
  return <h2 className="text-white font-bold text-base mb-4">{children}</h2>
}

export default function AnalyticsPage() {
  const [orders, setOrders]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange]     = useState<number>(14)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState<string>('90')

  const PRESETS = [7, 14, 30] as const
  const isPreset = (PRESETS as readonly number[]).includes(range)

  function applyCustom() {
    const n = Math.max(1, Math.min(3650, parseInt(customDraft || '0', 10) || 0))
    if (!n) return
    setRange(n)
    setCustomOpen(false)
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getOrders()
    setOrders(data)
    setLoading(false)
  }

  // ── Derived data ──────────────────────────────────────────────
  const delivered  = orders.filter(o => o.status === 'Delivered')
  const cancelled  = orders.filter(o => o.status === 'Cancelled')
  const pending    = orders.filter(o => o.status === 'Pending')
  const active     = orders.filter(o => !['Cancelled'].includes(o.status))
  const revenue    = active.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const avgOrder   = active.length ? revenue / active.length : 0
  const todayOrders   = orders.filter(o => isPkToday(o.created_at))
  const todayRevenue  = todayOrders.filter(o => o.status !== 'Cancelled').reduce((s,o) => s + (Number(o.total)||0), 0)
  const deliveryRate  = orders.length ? Math.round(delivered.length / orders.length * 100) : 0

  // Build a lookup from PK-YYYY-MM-DD -> pretty label, in order
  const dayBuckets = (() => {
    const arr: { key: string; label: string }[] = []
    const now = Date.now()
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      arr.push({
        key:   d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
        label: d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' }),
      })
    }
    return arr
  })()

  // Revenue by day (last N days)
  const revByDay = (() => {
    const map: Record<string, number> = Object.fromEntries(dayBuckets.map(b => [b.key, 0]))
    active.forEach(o => {
      if (!o.created_at) return
      const k = pkDateKey(o.created_at)
      if (k in map) map[k] += Number(o.total) || 0
    })
    return dayBuckets.map(b => ({ day: b.label, rev: Math.round(map[b.key]) }))
  })()

  // Orders by day
  const ordersByDay = (() => {
    const map: Record<string, number> = Object.fromEntries(dayBuckets.map(b => [b.key, 0]))
    orders.forEach(o => {
      if (!o.created_at) return
      const k = pkDateKey(o.created_at)
      if (k in map) map[k]++
    })
    return dayBuckets.map(b => ({ day: b.label, count: map[b.key] }))
  })()

  // Status distribution
  const statusDist = [
    { name: 'Delivered',   value: delivered.length,                                        color: C.green  },
    { name: 'Pending',     value: pending.length,                                          color: C.yellow },
    { name: 'On the Way',  value: orders.filter(o=>o.status==='On the Way').length,        color: C.blue   },
    { name: 'Processing',  value: orders.filter(o=>o.status==='Processing').length,        color: C.purple },
    { name: 'Confirmed',   value: orders.filter(o=>o.status==='Confirmed').length,         color: C.orange },
    { name: 'Cancelled',   value: cancelled.length,                                        color: C.red    },
  ].filter(s => s.value > 0)

  // Top items by revenue
  const itemMap: Record<string, { name: string; revenue: number; qty: number }> = {}
  active.forEach(o => {
    if (!Array.isArray(o.items)) return
    o.items.forEach((it: any) => {
      if (!it?.name) return
      if (!itemMap[it.name]) itemMap[it.name] = { name: it.name, revenue: 0, qty: 0 }
      itemMap[it.name].revenue += (Number(it.price) || 0) * (Number(it.qty) || 1)
      itemMap[it.name].qty     += Number(it.qty) || 1
    })
  })
  const topItems = Object.values(itemMap).sort((a,b) => b.revenue - a.revenue).slice(0, 8)

  // Payment methods
  const payMap: Record<string, number> = {}
  orders.forEach(o => { const p = o.payment_method || o.paymentMethod || 'Cash'; payMap[p] = (payMap[p]||0) + 1 })
  const payData = Object.entries(payMap).map(([name,value]) => ({ name, value }))

  // Order type
  const typeMap: Record<string, number> = {}
  orders.forEach(o => { const t = o.order_type || o.orderType || 'Delivery'; typeMap[t] = (typeMap[t]||0) + 1 })
  const typeData = Object.entries(typeMap).map(([name,value]) => ({ name, value }))

  // Peak hours — compute hour in Pakistan timezone
  const hourMap: Record<number, number> = {}
  for (let h = 0; h < 24; h++) hourMap[h] = 0
  orders.forEach(o => {
    if (!o.created_at) return
    const ms = parseTs(o.created_at as any)
    if (isNaN(ms)) return
    const hStr = new Date(ms).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Karachi' })
    const h = parseInt(hStr, 10)
    if (!isNaN(h)) hourMap[h]++
  })
  const hourData = Object.entries(hourMap)
    .filter(([h]) => Number(h) >= 10 && Number(h) <= 24)
    .map(([h, count]) => ({
      hour: `${Number(h) > 12 ? Number(h)-12 : Number(h)}${Number(h)>=12?'pm':'am'}`,
      count
    }))

  // Day of week — Pakistan timezone
  const dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const dowMap: Record<number,{rev:number,orders:number}> = {}
  for(let i=0;i<7;i++) dowMap[i] = {rev:0,orders:0}
  active.forEach(o => {
    if (!o.created_at) return
    const ms = parseTs(o.created_at as any)
    if (isNaN(ms)) return
    const short = new Date(ms).toLocaleString('en-US', { weekday: 'short', timeZone: 'Asia/Karachi' })
    const idx = dowLabels.indexOf(short)
    if (idx >= 0) {
      dowMap[idx].rev    += Number(o.total)||0
      dowMap[idx].orders++
    }
  })
  const dowData = dowLabels.map((name,i) => ({ name, rev: Math.round(dowMap[i].rev), orders: dowMap[i].orders }))

  const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#0f0f1a' }}>
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ background: '#0f0f1a' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Real-time business insights</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center relative">
          {PRESETS.map(d => (
            <button key={d} onClick={() => { setRange(d); setCustomOpen(false) }}
              className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={range === d
                ? { background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
              {d} Days
            </button>
          ))}
          <button
            onClick={() => setCustomOpen(o => !o)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5"
            style={!isPreset
              ? { background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
            {!isPreset ? `${range} Days` : 'Custom'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
              style={{ transform: customOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {customOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 p-4 rounded-2xl shadow-2xl"
              style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', minWidth: 260,
                animation: 'rangePop 0.2s cubic-bezier(0.16,1,0.3,1) both', transformOrigin: 'top right' }}>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Custom Range</p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDraft}
                  onChange={e => setCustomDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyCustom() }}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/30 text-white text-sm font-bold outline-none"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  placeholder="e.g. 90"
                  autoFocus
                />
                <span className="text-gray-500 text-xs">days</span>
                <button onClick={applyCustom}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                  Apply
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[60, 90, 180, 365, 730].map(n => (
                  <button key={n} onClick={() => { setRange(n); setCustomDraft(String(n)); setCustomOpen(false) }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition hover:opacity-80"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                    {n >= 365 ? `${n/365}yr${n/365 > 1 ? 's' : ''}` : `${n}d`}
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-[10px] mt-3">1 – 3650 days allowed</p>
            </div>
          )}
        </div>
        <style>{`
          @keyframes rangePop {
            from { opacity: 0; transform: translateY(-8px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Revenue"    value={fmt(revenue)}      sub={`${active.length} orders`}         color={C.orange} icon="💰" />
        <StatCard label="Today Revenue"    value={fmt(todayRevenue)} sub={`${todayOrders.length} orders today`} color={C.green}  icon="📅" />
        <StatCard label="Avg Order Value"  value={fmt(avgOrder)}     sub="per non-cancelled order"           color={C.blue}   icon="📊" />
        <StatCard label="Delivered"        value={delivered.length}  sub={`${deliveryRate}% success rate`}   color={C.green}  icon="✅" />
        <StatCard label="Pending Now"      value={pending.length}    sub="need attention"                    color={C.yellow} icon="⏳" />
        <StatCard label="Cancelled"        value={cancelled.length}  sub={`${orders.length ? Math.round(cancelled.length/orders.length*100) : 0}% cancel rate`} color={C.red} icon="❌" />
      </div>

      {/* Revenue + Orders trend */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="p-5" style={CARD}>
          <SectionTitle>Revenue Trend (Last {range} Days)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revByDay}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day"  stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 11 }} interval={Math.floor(range/7)} />
              <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TIP} formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="rev" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-5" style={CARD}>
          <SectionTitle>Daily Orders (Last {range} Days)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ordersByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day"   stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 11 }} interval={Math.floor(range/7)} />
              <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={TIP} formatter={(v: any) => [v, 'Orders']} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of week + Peak Hours */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="p-5" style={CARD}>
          <SectionTitle>Best Days of Week</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TIP} formatter={(v: any, n: any) => [n === 'rev' ? `Rs. ${Number(v).toLocaleString()}` : v, n === 'rev' ? 'Revenue' : 'Orders']} />
              <Bar dataKey="rev" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-5" style={CARD}>
          <SectionTitle>Peak Order Hours</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={TIP} formatter={(v: any) => [v, 'Orders']} />
              <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Items + Status + Payment/Type */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">

        {/* Top Items */}
        <div className="lg:col-span-2 p-5" style={CARD}>
          <SectionTitle>Top Selling Items by Revenue</SectionTitle>
          {topItems.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No item data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topItems.map((item, i) => {
                const pct = topItems[0].revenue > 0 ? item.revenue / topItems[0].revenue : 0
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 font-medium truncate mr-2 flex items-center gap-2">
                        <span className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-black flex-shrink-0"
                          style={{ background: i === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#f59e0b' : '#6b7280' }}>
                          {i+1}
                        </span>
                        {item.name}
                      </span>
                      <span className="text-orange-400 font-bold flex-shrink-0">
                        Rs. {Math.round(item.revenue).toLocaleString()}
                        <span className="text-gray-500 font-normal text-xs ml-1">×{item.qty}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: i === 0 ? '#f97316' : '#3b82f6' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status Pie */}
        <div className="p-5" style={CARD}>
          <SectionTitle>Order Status</SectionTitle>
          {statusDist.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No orders yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {statusDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TIP} formatter={(v: any, n: any) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusDist.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment + Order Type */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-5" style={CARD}>
          <SectionTitle>Payment Methods</SectionTitle>
          <div className="space-y-3">
            {payData.map((p, i) => {
              const colors = [C.green, C.blue, C.purple, C.orange]
              const pct = orders.length ? p.value / orders.length : 0
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{p.name || 'Cash'}</span>
                    <span className="font-bold" style={{ color: colors[i % colors.length] }}>{p.value} ({Math.round(pct*100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct*100}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-5" style={CARD}>
          <SectionTitle>Order Type</SectionTitle>
          <div className="space-y-3">
            {typeData.map((t, i) => {
              const colors = [C.orange, C.blue, C.green]
              const pct = orders.length ? t.value / orders.length : 0
              return (
                <div key={t.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{t.name || 'Delivery'}</span>
                    <span className="font-bold" style={{ color: colors[i % colors.length] }}>{t.value} ({Math.round(pct*100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct*100}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Delivery success rate */}
          <div className="mt-5 rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-green-400 text-2xl font-black">{deliveryRate}%</p>
            <p className="text-gray-400 text-xs mt-0.5">Delivery Success Rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}
