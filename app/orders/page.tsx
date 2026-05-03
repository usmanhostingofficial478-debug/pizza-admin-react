'use client'

import { useEffect, useState, useRef } from 'react'
import { getOrders, updateOrderStatus, subscribeToOrders } from '@/lib/supabase'
import { isPkToday, parseTs } from '@/lib/utils'
import type { Order } from '@/types'
import { Search, RefreshCw, Eye, Copy, Phone, MapPin, X, MessageCircle, ChevronDown, Printer } from 'lucide-react'
import { ReceiptModal } from '@/components/receipt-modal'

// ── Custom status dropdown ────────────────────────────────────
function StatusDropdown({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const meta    = sm(value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold cursor-pointer transition"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44`, width: 'fit-content' }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
        {value}
        <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div ref={menuRef}
          className="fixed z-[9999] rounded-xl py-1 shadow-2xl status-dd-menu"
          style={{ top: pos.top, left: pos.left, minWidth: 160, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', transformOrigin: 'top center' }}>
          {STATUSES.map((s, i) => {
            const m = sm(s)
            const isActive = s === value
            return (
              <button key={s}
                onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false) }}
                className="status-dd-item w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left hover:bg-white/5 transition"
                style={{ color: isActive ? m.color : '#9ca3af', animationDelay: `${i * 35}ms` }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                {s}
                {isActive && <span className="ml-auto text-[10px]">✓</span>}
              </button>
            )
          })}
        </div>
      )}
      <style jsx global>{`
        @keyframes statusDdIn {
          0%   { opacity: 0; transform: translateY(-8px) scale(0.96); }
          60%  { opacity: 1; transform: translateY(1px)  scale(1.005); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes statusDdItemIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .status-dd-menu  { animation: statusDdIn 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .status-dd-item  { animation: statusDdItemIn 0.25s ease both; opacity: 0; }
      `}</style>
    </>
  )
}

// ── helpers ───────────────────────────────────────────────────
const STATUS_META: Record<string, { color: string; bg: string; dot: string }> = {
  'Pending':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  dot: '#f59e0b' },
  'Processing': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  dot: '#3b82f6' },
  'Confirmed':  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  dot: '#6366f1' },
  'On the Way': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  dot: '#8b5cf6' },
  'Delivered':  { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  dot: '#10b981' },
  'Cancelled':  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   dot: '#ef4444' },
}
const sm = (s: string) => STATUS_META[s] || STATUS_META['Pending']

function timeAgo(ts: string) {
  const diff = Date.now() - parseTs(ts)
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  if (m < 1440) return `${Math.floor(m/60)}h ago`
  return `${Math.floor(m/1440)}d ago`
}
function fmtDate(ts: string) {
  return new Date(parseTs(ts)).toLocaleString('en-PK', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Karachi',
  })
}
const STATUSES = ['Pending','Processing','Confirmed','On the Way','Delivered','Cancelled']
const WA = '923178457586'

// ══════════════════════════════════════════════════════════════
export default function OrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<Order | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [copied,   setCopied]   = useState('')

  useEffect(() => {
    loadOrders()
    const sub = subscribeToOrders((u) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === u.id)
        return exists ? prev.map(o => o.id === u.id ? u : o) : [u, ...prev]
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

  async function changeStatus(orderId: string, newStatus: string) {
    const ok = await updateOrderStatus(orderId, newStatus)
    if (ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o))
      if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: newStatus as Order['status'] } : null)
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 1500)
  }

  // ── Stats ──────────────────────────────────────────────────
  const todayOrders   = orders.filter(o => isPkToday(o.created_at))
  const totalRevenue  = orders.filter(o => o.status !== 'Cancelled').reduce((s,o) => s + Number(o.total), 0)
  const pendingCount  = orders.filter(o => o.status === 'Pending').length
  const deliveredCount= orders.filter(o => o.status === 'Delivered').length
  const cancelledCount= orders.filter(o => o.status === 'Cancelled').length

  // ── Filter ─────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q || o.id.toLowerCase().includes(q)
      || o.customer.toLowerCase().includes(q)
      || (o.phone||'').replace(/\s/g,'').includes(q.replace(/\s/g,''))
    const matchStatus = statusFilter === 'All' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#0a0a14' }}>
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen p-5" style={{ background: '#0a0a14' }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Orders</h1>
          <p className="text-gray-500 text-xs">{orders.length} total · {filtered.length} shown</p>
        </div>
        <button onClick={loadOrders}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total Orders',   value: orders.length,      color: '#f97316', icon: '📦' },
          { label: 'Today',          value: todayOrders.length, color: '#3b82f6', icon: '📅' },
          { label: 'Revenue',        value: `Rs.${Math.round(totalRevenue/1000)}k`, color: '#10b981', icon: '💰' },
          { label: 'Pending',        value: pendingCount,       color: '#f59e0b', icon: '⏳' },
          { label: 'Delivered',      value: deliveredCount,     color: '#10b981', icon: '✅' },
          { label: 'Cancelled',      value: cancelledCount,     color: '#ef4444', icon: '❌' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3.5 flex items-center gap-2.5"
            style={CARD}>
            <span className="text-xl">{s.icon}</span>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide leading-tight">{s.label}</p>
              <p className="font-black text-lg leading-tight" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + status pills */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, order ID, or phone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', ...STATUSES].map(s => {
            const active = statusFilter === s
            const meta = s === 'All' ? null : sm(s)
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition"
                style={active
                  ? { background: meta ? meta.bg : 'rgba(249,115,22,0.15)', color: meta ? meta.color : '#f97316', border: `1px solid ${meta ? meta.color+'44' : '#f9731644'}` }
                  : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                {s}
                {s !== 'All' && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {orders.filter(o => o.status === s).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Table header */}
        <div className="grid gap-2 px-4 py-2.5"
          style={{ gridTemplateColumns: '1.6fr 1.2fr 1fr 0.7fr 0.8fr 0.9fr 1fr 0.7fr', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Order ID','Customer','Phone','Items','Total','Time','Status',''].map(h => (
            <span key={h} className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-500">No orders match your filters</div>
        ) : (
          <div style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            {filtered.map((order, i) => {
              const meta = sm(order.status)
              const discount = (order as any).discount || 0
              return (
                <div key={order.id}
                  className="grid gap-2 px-4 py-3 items-center transition-all cursor-pointer"
                  style={{
                    gridTemplateColumns: '1.6fr 1.2fr 1fr 0.7fr 0.8fr 0.9fr 1fr 0.7fr',
                    borderBottom: i < filtered.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderLeft: `3px solid ${meta.color}`,
                    background: 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}>

                  {/* Order ID */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-xs truncate">{order.id}</span>
                    <button onClick={() => copy(order.id, order.id)}
                      className="text-gray-600 hover:text-gray-300 flex-shrink-0">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Customer */}
                  <span className="text-gray-200 text-sm truncate">{order.customer}</span>

                  {/* Phone */}
                  <span className="text-gray-400 text-xs truncate">{order.phone || '—'}</span>

                  {/* Items */}
                  <span className="text-gray-400 text-xs">
                    {order.items?.reduce((s:number,i:any)=>s+(Number(i.qty)||1),0) || 0} items
                  </span>

                  {/* Total */}
                  <div>
                    <span className="text-white font-bold text-sm">Rs. {Number(order.total).toLocaleString()}</span>
                    {discount > 0 && <p className="text-green-400 text-[10px]">-Rs.{discount}</p>}
                  </div>

                  {/* Time */}
                  <span className="text-gray-500 text-xs">{timeAgo(order.created_at)}</span>

                  {/* Status */}
                  <StatusDropdown value={order.status} onChange={s => changeStatus(order.id, s)} />

                  {/* Actions */}
                  <div className="flex items-center gap-4 justify-center">
                    <button onClick={e => { e.stopPropagation(); setReceiptOrder(order) }}
                      className="text-gray-500 hover:text-orange-400 transition flex-shrink-0"
                      title="Print receipt">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setSelected(order) }}
                      className="text-gray-500 hover:text-orange-400 transition flex-shrink-0"
                      title="View details">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#111127', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(249,115,22,0.15)' }}>
                  <span className="text-lg">📦</span>
                </div>
                <div>
                  <p className="text-white font-black text-sm">{selected.id}</p>
                  <p className="text-gray-500 text-xs">{fmtDate(selected.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: sm(selected.status).bg, color: sm(selected.status).color }}>
                  {selected.status}
                </span>
                <button onClick={() => { const o = selected; setSelected(null); setReceiptOrder(o) }}
                  className="p-2 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                  style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}
                  title="Print receipt">
                  <Printer className="w-3.5 h-3.5" /> Receipt
                </button>
                <button onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {/* Customer info */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">Customer</p>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-white font-bold">{selected.customer}</p>
                    {selected.phone && (
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {selected.phone}
                      </p>
                    )}
                    {selected.address && (
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {selected.address}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {selected.phone && (
                      <a href={`https://wa.me/${WA}?text=Hi ${encodeURIComponent(selected.customer)}, your order ${selected.id} is ${selected.status}!`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl text-green-400 hover:text-green-300 transition"
                        style={{ background: 'rgba(16,185,129,0.12)' }} title="WhatsApp">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => copy(selected.id, 'id')}
                      className="p-2 rounded-xl text-gray-400 hover:text-white transition"
                      style={{ background: 'rgba(255,255,255,0.07)' }} title="Copy order ID">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">Order Items</p>
                <div className="space-y-2">
                  {selected.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: i < selected.items!.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div>
                        <span className="text-gray-200 text-sm font-medium">{item.name}</span>
                        {item.size && <span className="text-gray-500 text-xs ml-2">({item.size})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs">×{item.qty || 1}</span>
                        <span className="text-white font-bold text-sm">Rs. {((Number(item.price)||0)*(Number(item.qty)||1)).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total breakdown */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">Summary</p>
                <div className="space-y-2 text-sm">
                  {(selected as any).discount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-gray-300">Rs. {(Number(selected.total)+(Number((selected as any).discount)||0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-400">🎟 Coupon {(selected as any).coupon ? `(${(selected as any).coupon})` : ''}</span>
                        <span className="text-green-400 font-bold">- Rs. {Number((selected as any).discount).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-white font-bold">Total</span>
                    <span className="text-orange-400 font-black text-base">Rs. {Number(selected.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status change */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => {
                    const meta = sm(s)
                    const isActive = selected.status === s
                    return (
                      <button key={s} onClick={() => changeStatus(selected.id, s)}
                        className="py-2 rounded-xl text-xs font-bold transition"
                        style={isActive
                          ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}66` }
                          : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy toast */}
      {copied && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-xl"
          style={{ background: '#10b981' }}>
          ✓ Copied!
        </div>
      )}

      {/* Receipt modal */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </div>
  )
}
