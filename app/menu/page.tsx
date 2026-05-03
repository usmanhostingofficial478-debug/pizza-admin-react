'use client'

import { useEffect, useState } from 'react'
import { getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/supabase'
import type { MenuItem } from '@/types'

const CATEGORIES = ['Ice Cream','Burgers','Fries','Paratha Roll','Crispy Chicken','Shawarma','Oven Bake Pasta','Pizza','Deals','Drinks','Sides']

const EMPTY: Omit<MenuItem,'id'> = { name:'', price:0, category:'Pizza', description:'', image:'', badge:'', featured:false }

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.7)' }}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ProductForm({ initial, onSave, onCancel, saving }: {
  initial: Omit<MenuItem,'id'> & { id?: string }
  onSave: (data: Omit<MenuItem,'id'> & { id?: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(initial)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Product Name *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
          placeholder="e.g. Classic Burger" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category *</label>
          <select required value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full bg-[#12122a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Price (Rs.) *</label>
          <input required type="number" min="0" value={form.price} onChange={e => set('price', Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            placeholder="350" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
          placeholder="Short product description..." />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Image URL</label>
        <input value={form.image || ''} onChange={e => set('image', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
          placeholder="https://..." />
        {form.image && (
          <img src={form.image} alt="" className="mt-2 h-24 w-full object-cover rounded-xl" onError={e => (e.currentTarget.style.display='none')} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Badge (optional)</label>
          <input value={form.badge || ''} onChange={e => set('badge', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            placeholder="🔥 Hot / New" />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => set('featured', !form.featured)}
              className={`w-12 h-6 rounded-full transition-all relative ${form.featured ? 'bg-orange-500' : 'bg-white/20'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.featured ? 'left-7' : 'left-1'}`} />
            </div>
            <span className="text-sm text-gray-300">Featured</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition font-medium">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl font-bold text-white transition disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
          {saving ? 'Saving…' : 'Save Product'}
        </button>
      </div>
    </form>
  )
}

export default function MenuPage() {
  const [items, setItems]           = useState<MenuItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [activeCat, setActiveCat]   = useState('All')
  const [modal, setModal]           = useState<'add'|'edit'|'delete'|null>(null)
  const [selected, setSelected]     = useState<MenuItem | null>(null)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getMenuItems()
    setItems(data)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleSave(form: Omit<MenuItem,'id'> & { id?: string }) {
    setSaving(true)
    if (form.id) {
      const { id, ...updates } = form
      const ok = await updateMenuItem(id, updates)
      if (ok) { setItems(items.map(i => i.id === id ? { ...i, ...updates } : i)); showToast('Product updated!') }
    } else {
      const created = await addMenuItem(form)
      if (created) { setItems([...items, created]); showToast('Product added!') }
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    const ok = await deleteMenuItem(selected.id)
    if (ok) { setItems(items.filter(i => i.id !== selected.id)); showToast('Product deleted.') }
    setSaving(false)
    setModal(null)
  }

  const cats = ['All', ...CATEGORIES.filter(c => items.some(i => i.category === c))]
  const filtered = items.filter(i => {
    const matchCat = activeCat === 'All' || i.category === activeCat
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ background: '#0f0f1a' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white font-semibold px-6 py-3 rounded-2xl shadow-2xl animate-fade-in">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Menu</h1>
          <p className="text-gray-400 mt-1">{items.length} products across {cats.length - 1} categories</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
          + Add Product
        </button>
      </div>

      {/* Search + Category Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition ${activeCat === c ? 'text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              style={activeCat === c ? { background: 'linear-gradient(135deg,#ea580c,#f97316)' } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Products', value: items.length, icon: '🍽️' },
          { label: 'Featured',       value: items.filter(i=>i.featured).length, icon: '⭐' },
          { label: 'Categories',     value: cats.length - 1, icon: '📂' },
          { label: 'Showing',        value: filtered.length, icon: '👁️' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_,i) => (
            <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="text-lg font-semibold text-white">No products found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => (
            <div key={item.id} className="group rounded-2xl border border-white/10 overflow-hidden transition hover:border-orange-500/40 hover:shadow-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              {/* Image */}
              <div className="relative h-44 overflow-hidden bg-white/5">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg,rgba(234,88,12,0.1),rgba(249,115,22,0.05))' }}>
                    {item.category === 'Burgers' ? '🍔' : item.category === 'Pizza' ? '🍕' : item.category === 'Fries' ? '🍟' : item.category === 'Drinks' ? '🥤' : '🍽️'}
                  </div>
                )}
                {item.featured && (
                  <span className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full">⭐ Featured</span>
                )}
                {item.badge && (
                  <span className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ea580c' }}>{item.badge}</span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-white text-sm leading-tight">{item.name}</h3>
                  <span className="text-orange-400 font-black text-sm whitespace-nowrap">Rs. {item.price?.toLocaleString()}</span>
                </div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-2" style={{ background: 'rgba(234,88,12,0.15)', color: '#f97316' }}>{item.category}</span>
                {item.description && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{item.description}</p>}

                <div className="flex gap-2">
                  <button onClick={() => { setSelected(item); setModal('edit') }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-gray-300 hover:bg-white/10 transition">
                    ✏️ Edit
                  </button>
                  <button onClick={() => { setSelected(item); setModal('delete') }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modal === 'add' && (
        <Modal title="Add New Product" onClose={() => setModal(null)}>
          <ProductForm initial={EMPTY} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && selected && (
        <Modal title={`Edit: ${selected.name}`} onClose={() => setModal(null)}>
          <ProductForm initial={selected} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}

      {/* Delete Confirm */}
      {modal === 'delete' && selected && (
        <Modal title="Delete Product?" onClose={() => setModal(null)}>
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🗑️</div>
            <p className="text-white font-semibold text-lg mb-2">{selected.name}</p>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone. The product will be permanently removed from your menu.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
