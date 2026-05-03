'use client'

import { useEffect, useState, useRef } from 'react'
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerOrders } from '@/lib/supabase'

const BADGES = [
  { label: 'Regular',   color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  { label: 'VIP',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  { label: 'Relatives', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)'  },
  { label: 'Staff',     color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  { label: 'Blocked',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  { label: 'New',       color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
]

function badgeStyle(badge: string) {
  return BADGES.find(b => b.label === badge) || BADGES[0]
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function BadgeDropdown({ current, onChange }: { current: string; onChange: (b: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const bs = badgeStyle(current)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer transition hover:opacity-80"
        style={{ background: bs.bg, color: bs.color, border: `1px solid ${bs.color}40` }}>
        {current} ▾
      </button>
      {open && (
        <div className="absolute z-10 top-8 left-0 rounded-xl border border-white/10 shadow-2xl py-1 min-w-[130px]" style={{ background: '#1a1a2e' }}>
          {BADGES.map(b => (
            <button key={b.label} onClick={() => { onChange(b.label); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/10 transition flex items-center gap-2"
              style={{ color: b.color }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: b.color }} />
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterBadge, setFilterBadge] = useState('All')
  const [modal, setModal]         = useState<'add' | 'history' | 'delete' | null>(null)
  const [selected, setSelected]   = useState<any>(null)
  const [orders, setOrders]       = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const [form, setForm]           = useState({ name: '', phone: '', address: '', email: '', notes: '', badge: 'Regular' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getCustomers()
    setCustomers(data)
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleBadgeChange(id: string, badge: string) {
    await updateCustomer(id, { badge })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, badge } : c))
    showToast(`Badge updated to ${badge}`)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const created = await addCustomer(form)
    if (created) { setCustomers(cs => [created, ...cs]); showToast('Customer added!') }
    setSaving(false); setModal(null)
    setForm({ name: '', phone: '', address: '', email: '', notes: '', badge: 'Regular' })
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    await deleteCustomer(selected.id)
    setCustomers(cs => cs.filter(c => c.id !== selected.id))
    showToast('Customer removed.')
    setSaving(false); setModal(null)
  }

  async function openHistory(c: any) {
    setSelected(c); setModal('history'); setOrdersLoading(true)
    const data = await getCustomerOrders(c.phone)
    setOrders(data); setOrdersLoading(false)
  }

  const filtered = customers.filter(c => {
    const matchBadge  = filterBadge === 'All' || c.badge === filterBadge
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
    return matchBadge && matchSearch
  })

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ background: '#0f0f1a' }}>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white font-semibold px-6 py-3 rounded-2xl shadow-2xl">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Customers</h1>
          <p className="text-gray-400 mt-1">{customers.length} total customers</p>
        </div>
        <button onClick={() => setModal('add')}
          className="px-6 py-3 rounded-xl font-bold text-white transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
          + Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {BADGES.slice(0,4).map(b => (
          <div key={b.label} className="rounded-2xl p-4 border border-white/10 cursor-pointer transition hover:border-white/20"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            onClick={() => setFilterBadge(filterBadge === b.label ? 'All' : b.label)}>
            <div className="text-2xl font-black" style={{ color: b.color }}>
              {customers.filter(c => c.badge === b.label).length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{b.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Badge filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition" />
        <div className="flex gap-2 flex-wrap">
          {['All', ...BADGES.map(b => b.label)].map(b => (
            <button key={b} onClick={() => setFilterBadge(b)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition"
              style={filterBadge === b
                ? { background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_,i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-3">👥</div>
          <p className="text-white font-semibold text-lg">No customers yet</p>
          <p className="text-gray-500 text-sm mt-1">Customers appear automatically when orders are placed</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Customer','Phone','Address','Orders','Spent','Badge','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className="border-t border-white/5 transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                        style={{ background: `hsl(${(c.phone?.charCodeAt(0) || 0) * 37 % 360},60%,35%)` }}>
                        {c.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{c.name}</p>
                        {c.email && <p className="text-gray-500 text-xs">{c.email}</p>}
                        {c.notes && <p className="text-gray-600 text-xs italic">{c.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{c.address || '—'}</td>
                  <td className="px-4 py-3 text-white font-bold text-sm">{c.orders_count ?? c.total_orders ?? 0}</td>
                  <td className="px-4 py-3 text-orange-400 font-bold text-sm">
                    Rs. {(c.total_spent ?? c.spent ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeDropdown current={c.badge || 'Regular'} onChange={badge => handleBadgeChange(c.id, badge)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openHistory(c)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition">
                        📋 Orders
                      </button>
                      <button onClick={() => { setSelected(c); setModal('delete') }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {modal === 'add' && (
        <Modal title="Add Customer" onClose={() => setModal(null)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {[
              { label: 'Name *',    key: 'name',    type: 'text',  required: true,  placeholder: 'Customer name' },
              { label: 'Phone *',   key: 'phone',   type: 'tel',   required: true,  placeholder: '03xxxxxxxxx' },
              { label: 'Address',   key: 'address', type: 'text',  required: false, placeholder: 'Delivery address' },
              { label: 'Email',     key: 'email',   type: 'email', required: false, placeholder: 'email@example.com' },
              { label: 'Notes',     key: 'notes',   type: 'text',  required: false, placeholder: 'Internal notes...' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                <input required={f.required} type={f.type} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition" />
              </div>
            ))}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Badge</label>
              <select value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
                className="w-full bg-[#12122a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition">
                {BADGES.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                {saving ? 'Saving…' : 'Add Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order History Modal */}
      {modal === 'history' && selected && (
        <Modal title={`Orders — ${selected.name}`} onClose={() => setModal(null)}>
          {ordersLoading ? (
            <div className="py-8 text-center text-gray-400">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No orders found for {selected.phone}</div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => {
                const cust = typeof o.customer === 'object' ? o.customer : {}
                return (
                  <div key={o.id} className="rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-bold text-sm">{o.order_id || o.tracking_id}</p>
                        <p className="text-gray-500 text-xs">{o.created_at ? new Date(o.created_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'}) : '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-black">Rs. {o.total?.toLocaleString()}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,88,12,0.15)', color: '#f97316' }}>{o.status}</span>
                      </div>
                    </div>
                    {cust.name && cust.name !== selected.name && (
                      <p className="text-yellow-500 text-xs">Ordered as: {cust.name}</p>
                    )}
                    {Array.isArray(o.items) && o.items.length > 0 && (
                      <p className="text-gray-500 text-xs mt-1">{o.items.map((it: any) => `${it.qty}x ${it.name}`).join(', ')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Delete Confirm */}
      {modal === 'delete' && selected && (
        <Modal title="Remove Customer?" onClose={() => setModal(null)}>
          <div className="text-center py-4">
            <div className="text-5xl mb-3">🗑️</div>
            <p className="text-white font-semibold text-lg mb-1">{selected.name}</p>
            <p className="text-gray-400 text-sm mb-6">This removes the customer record. Their orders remain in the system.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {saving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
