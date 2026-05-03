'use client'

import { useEffect, useState } from 'react'
import { getCoupons, addCoupon, updateCoupon, deleteCoupon } from '@/lib/supabase'

const EMPTY = { code: '', type: 'percentage' as 'percentage'|'fixed', value: 10, max_uses: 100, expires_at: '', active: true, discount: '' }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function CouponsPage() {
  const [coupons, setCoupons]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'add'|'edit'|'delete'|null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getCoupons()
    setCoupons(data)
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  function openAdd() { setForm({ ...EMPTY }); setModal('add') }
  function openEdit(c: any) {
    setSelected(c)
    setForm({ code: c.code, type: c.type, value: c.value, max_uses: c.max_uses, expires_at: c.expires_at || '', active: c.active, discount: c.discount || '' })
    setModal('edit')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, discount: form.type === 'percentage' ? `${form.value}% off` : `Rs. ${form.value} off` }
    if (modal === 'edit' && selected) {
      const ok = await updateCoupon(selected.id, payload)
      if (ok) { setCoupons(cs => cs.map(c => c.id === selected.id ? { ...c, ...payload } : c)); showToast('Coupon updated!') }
    } else {
      const created = await addCoupon(payload)
      if (created) { setCoupons(cs => [created, ...cs]); showToast('Coupon created!') }
    }
    setSaving(false); setModal(null)
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    await deleteCoupon(selected.id)
    setCoupons(cs => cs.filter(c => c.id !== selected.id))
    showToast('Coupon deleted.')
    setSaving(false); setModal(null)
  }

  async function toggleActive(c: any) {
    await updateCoupon(c.id, { active: !c.active })
    setCoupons(cs => cs.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ background: '#0f0f1a' }}>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white font-semibold px-6 py-3 rounded-2xl shadow-2xl">✓ {toast}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Coupons</h1>
          <p className="text-gray-400 mt-1">{coupons.length} coupons · {coupons.filter(c=>c.active).length} active</p>
        </div>
        <button onClick={openAdd}
          className="px-6 py-3 rounded-xl font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
          + New Coupon
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse"/>)}</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-3">🎟️</div>
          <p className="text-white font-semibold text-lg">No coupons yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first discount coupon</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Code','Type','Value','Usage','Expires','Status','Actions'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <span className="font-black text-white tracking-widest bg-white/10 px-3 py-1 rounded-lg text-sm">{c.code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm capitalize">{c.type}</td>
                  <td className="px-4 py-3 text-orange-400 font-bold text-sm">
                    {c.type === 'percentage' ? `${c.value}%` : `Rs. ${c.value}`}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {c.usage_count ?? c.used ?? 0} / {c.max_uses}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c)}
                      className="text-xs font-bold px-3 py-1 rounded-full transition"
                      style={c.active
                        ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(107,114,128,0.15)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)' }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition">✏️</button>
                      <button onClick={() => { setSelected(c); setModal('delete') }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit Coupon' : 'New Coupon'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Coupon Code *</label>
              <input required value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                className={inputCls} placeholder="SAVE20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type *</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  className="w-full bg-[#12122a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs.)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Value *</label>
                <input required type="number" min="1" value={form.value} onChange={e => set('value', Number(e.target.value))}
                  className={inputCls} placeholder={form.type === 'percentage' ? '20' : '100'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Uses</label>
                <input type="number" min="1" value={form.max_uses} onChange={e => set('max_uses', Number(e.target.value))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Expires On</label>
                <input type="date" value={form.expires_at?.slice(0,10) || ''} onChange={e => set('expires_at', e.target.value)}
                  className={inputCls} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={() => set('active', !form.active)}
                className={`w-12 h-6 rounded-full transition-all relative ${form.active ? 'bg-orange-500' : 'bg-white/20'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.active ? 'left-7' : 'left-1'}`} />
              </div>
              <span className="text-sm text-gray-300">Active (usable by customers)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                {saving ? 'Saving…' : modal === 'edit' ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {modal === 'delete' && selected && (
        <Modal title="Delete Coupon?" onClose={() => setModal(null)}>
          <div className="text-center py-4">
            <div className="text-5xl mb-3">🎟️</div>
            <p className="text-white font-bold text-xl mb-1 tracking-wider">{selected.code}</p>
            <p className="text-gray-400 text-sm mb-6">This coupon will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
