'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Store, Bell, Palette, Shield, Database, Info as InfoIcon, LogOut,
  Save, RotateCcw, Eye, EyeOff, Download, Upload, Trash2,
  CheckCircle2, AlertCircle, Volume2, KeyRound,
} from 'lucide-react'
import { useSettings } from '@/lib/settings'
import {
  changeAdminPassword, resetAdminPassword, getInactivityTimeoutMin, setInactivityTimeoutMin, logout,
} from '@/lib/auth'
import { getOrders, getCustomers } from '@/lib/supabase'
import { useNotifications } from '@/lib/notifications'

type Tab = 'profile' | 'store' | 'notifications' | 'appearance' | 'security' | 'data' | 'about'
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'store',         label: 'Store Info',    icon: Store },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'data',          label: 'Data',          icon: Database },
  { id: 'about',         label: 'About',         icon: InfoIcon },
]

function Toast({ kind, msg }: { kind: 'ok' | 'err'; msg: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-[300] px-4 py-3 rounded-xl text-sm font-bold text-white shadow-2xl flex items-center gap-2"
      style={{ background: kind === 'ok' ? '#10b981' : '#ef4444', animation: 'slideUp 0.25s ease' }}>
      {kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: any }) {
  return (
    <div className="space-y-1.5">
      <label className="text-gray-300 text-xs font-bold uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-gray-500 text-[11px]">{hint}</p>}
    </div>
  )
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold">{label}</p>
        {desc && <p className="text-gray-500 text-xs mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!on)}
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
        style={{ background: on ? '#f97316' : 'rgba(255,255,255,0.15)' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow"
          style={{ left: on ? '22px' : '2px' }} />
      </button>
    </div>
  )
}

const inputCls = 'w-full bg-black/30 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition focus:bg-black/50'
const inputStyle = { border: '1px solid rgba(255,255,255,0.12)' } as const

export default function SettingsPage() {
  const router = useRouter()
  const { settings, update, reset } = useSettings()
  const { clear: clearNotifications, notifications } = useNotifications()
  const [tab, setTab] = useState<Tab>('profile')
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Local draft for form fields (avoid writing on every keystroke)
  const [draft, setDraft] = useState(settings)
  const [timeoutMin, setTimeoutMinState] = useState(getInactivityTimeoutMin())
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)

  function flash(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 2500)
  }

  function saveProfileOrStore() {
    update(draft)
    flash('ok', 'Saved successfully')
  }

  function handleResetAll() {
    if (!confirm('Reset ALL settings to defaults? This cannot be undone.')) return
    const d = reset()
    setDraft(d)
    flash('ok', 'Settings reset to defaults')
  }

  // ── Security handlers ────────────────────────────────────
  function handleChangePwd() {
    if (!pwd.current || !pwd.next || !pwd.confirm) return flash('err', 'Fill all password fields')
    if (pwd.next !== pwd.confirm)                    return flash('err', 'New passwords do not match')
    const res = changeAdminPassword(pwd.current, pwd.next)
    if (!res.ok) return flash('err', res.error || 'Failed to change password')
    setPwd({ current: '', next: '', confirm: '' })
    flash('ok', 'Password changed successfully')
  }

  function handleResetPwd() {
    if (!confirm('Reset password to the factory default? You will need the original default password to login.')) return
    resetAdminPassword()
    flash('ok', 'Password reset to default')
  }

  function handleSaveTimeout() {
    setInactivityTimeoutMin(timeoutMin)
    flash('ok', `Session timeout set to ${timeoutMin} min`)
  }

  // ── Data handlers ────────────────────────────────────────
  function toCSV(rows: any[]): string {
    if (!rows.length) return ''
    const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r ?? {}))))
    const esc = (v: any) => {
      if (v === null || v === undefined) return ''
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n')
  }

  function download(filename: string, content: string, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportOrdersCSV() {
    try {
      const data = await getOrders()
      if (!data.length) return flash('err', 'No orders to export')
      download(`orders-${Date.now()}.csv`, toCSV(data), 'text/csv')
      flash('ok', `Exported ${data.length} orders`)
    } catch { flash('err', 'Export failed') }
  }

  async function exportCustomersCSV() {
    try {
      const data = await getCustomers()
      if (!data.length) return flash('err', 'No customers to export')
      download(`customers-${Date.now()}.csv`, toCSV(data), 'text/csv')
      flash('ok', `Exported ${data.length} customers`)
    } catch { flash('err', 'Export failed') }
  }

  function exportSettings() {
    download(`pizza-admin-settings-${Date.now()}.json`, JSON.stringify(settings, null, 2), 'application/json')
    flash('ok', 'Settings exported')
  }

  function handleImportSettings(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))
        const next = update(parsed)
        setDraft(next)
        flash('ok', 'Settings imported')
      } catch { flash('err', 'Invalid settings file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function doLogout() {
    if (!confirm('Log out now?')) return
    logout()
    router.replace('/login')
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ background: '#0f0f1a' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your admin panel, store and preferences</p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar tabs */}
        <aside className="space-y-1 lg:sticky lg:top-6 self-start">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition text-left"
                style={active
                  ? { background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff', boxShadow: '0 6px 20px rgba(249,115,22,0.3)' }
                  : { background: 'rgba(255,255,255,0.03)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
          <button onClick={doLogout}
            className="mt-4 w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition text-left hover:bg-red-500/10"
            style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </aside>

        {/* Content */}
        <section className="space-y-6">
          {/* ─── PROFILE ─── */}
          {tab === 'profile' && (
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-1">Profile</h2>
              <p className="text-gray-500 text-sm mb-6">How you appear inside the admin panel</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Display Name" hint="Shown in the sidebar">
                  <input className={inputCls} style={inputStyle} value={draft.adminName}
                    onChange={e => setDraft({ ...draft, adminName: e.target.value })} />
                </Field>
                <Field label="Currency Symbol" hint="e.g. Rs., $, €">
                  <input className={inputCls} style={inputStyle} value={draft.currency}
                    onChange={e => setDraft({ ...draft, currency: e.target.value })} />
                </Field>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={saveProfileOrStore}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <button onClick={() => setDraft(settings)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 flex items-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <RotateCcw className="w-4 h-4" /> Discard
                </button>
              </div>
            </div>
          )}

          {/* ─── STORE ─── */}
          {tab === 'store' && (
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-1">Store Information</h2>
              <p className="text-gray-500 text-sm mb-6">Used on receipts, orders and tracking pages</p>

              <div className="grid gap-4">
                <Field label="Store Name">
                  <input className={inputCls} style={inputStyle} value={draft.storeName}
                    onChange={e => setDraft({ ...draft, storeName: e.target.value })} />
                </Field>
                <Field label="Store Address">
                  <input className={inputCls} style={inputStyle} value={draft.storeAddress}
                    onChange={e => setDraft({ ...draft, storeAddress: e.target.value })} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Store Phone">
                    <input className={inputCls} style={inputStyle} value={draft.storePhone}
                      onChange={e => setDraft({ ...draft, storePhone: e.target.value })} />
                  </Field>
                  <Field label="Default Delivery Fee" hint="In your currency">
                    <input type="number" min={0} className={inputCls} style={inputStyle} value={draft.defaultDeliveryFee}
                      onChange={e => setDraft({ ...draft, defaultDeliveryFee: Number(e.target.value) || 0 })} />
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={saveProfileOrStore}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {tab === 'notifications' && (
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-1">Notifications</h2>
              <p className="text-gray-500 text-sm mb-6">Choose how new orders notify you</p>

              <div className="space-y-3">
                <Toggle on={settings.soundEnabled}  onChange={v => update({ soundEnabled: v })}
                  label="Sound alert" desc="Play a 3-note chime for new orders" />
                <div className="p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <Volume2 className="w-4 h-4 text-orange-400" />
                    <span className="text-white text-sm font-semibold">Sound volume</span>
                    <span className="text-gray-400 text-xs ml-auto">{Math.round(settings.soundVolume * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={settings.soundVolume}
                    onChange={e => update({ soundVolume: Number(e.target.value) })}
                    className="w-full accent-orange-500" />
                </div>
                <Toggle on={settings.browserNotifEnabled} onChange={async v => {
                  update({ browserNotifEnabled: v })
                  if (v && 'Notification' in window && Notification.permission !== 'granted') {
                    await Notification.requestPermission()
                  }
                }} label="Browser notifications" desc="OS-level popups even when tab is in background" />
                <Toggle on={settings.toastsEnabled}     onChange={v => update({ toastsEnabled: v })}
                  label="In-app toasts" desc="Slide-in cards in the top-right corner" />
                <Toggle on={settings.titleFlashEnabled} onChange={v => update({ titleFlashEnabled: v })}
                  label="Tab title flash" desc="Blink the browser tab title when a new order arrives" />
              </div>

              <div className="mt-6 p-4 rounded-xl flex items-center justify-between"
                style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)' }}>
                <div>
                  <p className="text-white text-sm font-bold">Notification history</p>
                  <p className="text-gray-400 text-xs">{notifications.length} saved notification{notifications.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => { clearNotifications(); flash('ok', 'History cleared') }}
                  disabled={!notifications.length}
                  className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* ─── APPEARANCE ─── */}
          {tab === 'appearance' && (
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-1">Appearance & Behavior</h2>
              <p className="text-gray-500 text-sm mb-6">Personalize the admin experience</p>

              <div className="space-y-3">
                <Field label="Theme">
                  <div className="grid grid-cols-2 gap-2">
                    {(['dark','dim'] as const).map(t => (
                      <button key={t} onClick={() => update({ theme: t })}
                        className="px-4 py-3 rounded-xl text-sm font-semibold transition capitalize"
                        style={settings.theme === t
                          ? { background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <Toggle on={settings.compactTables}  onChange={v => update({ compactTables: v })}
                  label="Compact tables" desc="Tighter row spacing — fit more data on screen" />
                <Toggle on={settings.showStatsStrip} onChange={v => update({ showStatsStrip: v })}
                  label="Sidebar stats strip" desc="Show the live clock + pending counts band" />

                <Field label="Default orders filter" hint="Active when you open the Orders page">
                  <select className={inputCls} style={inputStyle} value={settings.defaultOrdersFilter}
                    onChange={e => update({ defaultOrdersFilter: e.target.value as any })}>
                    {['All','Pending','Processing','Confirmed','On the Way','Delivered','Cancelled'].map(s =>
                      <option key={s} value={s}>{s}</option>
                    )}
                  </select>
                </Field>

                <Field label="Auto-refresh" hint="0 disables. Re-fetches orders every N seconds.">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={300} className={inputCls} style={inputStyle}
                      value={settings.autoRefreshSec}
                      onChange={e => update({ autoRefreshSec: Math.max(0, Math.min(300, Number(e.target.value) || 0)) })} />
                    <span className="text-gray-400 text-sm">sec</span>
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ─── SECURITY ─── */}
          {tab === 'security' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2"><KeyRound className="w-5 h-5 text-orange-400" /> Change Password</h2>
                <p className="text-gray-500 text-sm mb-6">At least 4 characters. Stored securely in your browser.</p>

                <div className="space-y-4 max-w-md">
                  <Field label="Current Password">
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} className={inputCls + ' pr-10'} style={inputStyle}
                        value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} />
                      <button type="button" onClick={() => setShowPwd(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="New Password">
                    <input type={showPwd ? 'text' : 'password'} className={inputCls} style={inputStyle}
                      value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })} />
                  </Field>
                  <Field label="Confirm New Password">
                    <input type={showPwd ? 'text' : 'password'} className={inputCls} style={inputStyle}
                      value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} />
                  </Field>

                  <div className="flex gap-3">
                    <button onClick={handleChangePwd}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                      <Save className="w-4 h-4" /> Update Password
                    </button>
                    <button onClick={handleResetPwd}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <RotateCcw className="w-4 h-4" /> Reset to Default
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-white font-bold text-lg mb-1">Session</h2>
                <p className="text-gray-500 text-sm mb-6">Automatically log out after inactivity</p>

                <div className="max-w-xs">
                  <Field label="Inactivity timeout (minutes)" hint="Default 15. Min 1, max 240.">
                    <input type="number" min={1} max={240} className={inputCls} style={inputStyle}
                      value={timeoutMin} onChange={e => setTimeoutMinState(Math.max(1, Math.min(240, Number(e.target.value) || 1)))} />
                  </Field>
                  <button onClick={handleSaveTimeout}
                    className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── DATA ─── */}
          {tab === 'data' && (
            <div className="p-6 rounded-2xl space-y-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 className="text-white font-bold text-lg mb-1">Export Data</h2>
                <p className="text-gray-500 text-sm">Download CSV backups for offline use or accounting.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button onClick={exportOrdersCSV}
                  className="flex items-center gap-3 p-4 rounded-xl transition hover:bg-white/5 text-left"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                    <Download className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">Export Orders (CSV)</p>
                    <p className="text-gray-500 text-xs">All orders with items, status & totals</p>
                  </div>
                </button>

                <button onClick={exportCustomersCSV}
                  className="flex items-center gap-3 p-4 rounded-xl transition hover:bg-white/5 text-left"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                    <Download className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">Export Customers (CSV)</p>
                    <p className="text-gray-500 text-xs">Customer list with totals & last order</p>
                  </div>
                </button>

                <button onClick={exportSettings}
                  className="flex items-center gap-3 p-4 rounded-xl transition hover:bg-white/5 text-left"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <Download className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">Export Settings (JSON)</p>
                    <p className="text-gray-500 text-xs">Back up your preferences</p>
                  </div>
                </button>

                <button onClick={() => importRef.current?.click()}
                  className="flex items-center gap-3 p-4 rounded-xl transition hover:bg-white/5 text-left"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,88,12,0.15)' }}>
                    <Upload className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">Import Settings (JSON)</p>
                    <p className="text-gray-500 text-xs">Restore from a backup file</p>
                  </div>
                </button>
                <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImportSettings} />
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-white font-bold text-sm mb-3">Danger Zone</h3>
                <button onClick={handleResetAll}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 className="w-4 h-4" /> Reset All Settings
                </button>
              </div>
            </div>
          )}

          {/* ─── ABOUT ─── */}
          {tab === 'about' && (
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-bold text-lg mb-1">About</h2>
              <p className="text-gray-500 text-sm mb-6">Admin panel build info and shortcuts</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-white text-sm font-bold">Pizza Admin</p>
                    <p className="text-gray-500 text-xs">Management Panel</p>
                  </div>
                  <span className="text-xs font-bold text-orange-400">v1.0</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <Info label="Stored notifications" value={String(notifications.length)} />
                  <Info label="Inactivity timeout"  value={`${getInactivityTimeoutMin()} min`} />
                  <Info label="Currency"            value={settings.currency} />
                </div>

                <div className="p-4 rounded-xl text-sm text-gray-400"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Keyboard-friendly, offline-capable, realtime-powered by Supabase. All settings are stored locally in your browser.
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {toast && <Toast kind={toast.kind} msg={toast.msg} />}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">{label}</p>
      <p className="text-white text-sm font-bold mt-0.5">{value}</p>
    </div>
  )
}
