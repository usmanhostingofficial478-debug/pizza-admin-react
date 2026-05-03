'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logout } from '@/lib/auth'
import { getOrders } from '@/lib/supabase'
import {
  LayoutDashboard, ShoppingBag, ChefHat, BarChart3,
  UtensilsCrossed, Users, Ticket, LogOut, Bell,
  TrendingUp, Clock, CheckCircle2, Settings,
} from 'lucide-react'

const SECTIONS = [
  {
    title: 'Main',
    items: [
      { href: '/',          label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/orders',    label: 'Orders',     icon: ShoppingBag,  badge: 'orders' },
      { href: '/kitchen',   label: 'Kitchen',    icon: ChefHat,      badge: 'kitchen' },
      { href: '/analytics', label: 'Analytics',  icon: BarChart3 },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/menu',      label: 'Menu',       icon: UtensilsCrossed },
      { href: '/customers', label: 'Customers',  icon: Users },
      { href: '/coupons',   label: 'Coupons',    icon: Ticket },
    ],
  },
]

function NavItem({ href, isActive, count, children }: {
  href: string; isActive: boolean; count: number; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 12, padding: '10px 12px',
        borderLeft: isActive ? '3px solid #f97316' : '3px solid transparent',
        background: isActive
          ? 'linear-gradient(135deg,rgba(234,88,12,0.22),rgba(249,115,22,0.12))'
          : hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'pointer', textDecoration: 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {children}
      </div>
      {count > 0 && (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
          background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
          {count}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [pendingOrders,  setPendingOrders]  = useState(0)
  const [kitchenOrders,  setKitchenOrders]  = useState(0)
  const [time, setTime] = useState('')

  useEffect(() => {
    async function loadBadges() {
      const orders = await getOrders()
      setPendingOrders(orders.filter(o => o.status === 'Pending').length)
      setKitchenOrders(orders.filter(o => ['Confirmed', 'Processing'].includes(o.status)).length)
    }
    loadBadges()
    const iv = setInterval(loadBadges, 30_000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' }))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  function getBadge(key?: string) {
    if (key === 'orders')  return pendingOrders
    if (key === 'kitchen') return kitchenOrders
    return 0
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col border-r border-white/10"
      style={{ background: 'linear-gradient(180deg, #111127 0%, #0d0d1f 100%)' }}>

      {/* Logo + time */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
            <span className="text-lg">🍕</span>
          </div>
          <div>
            <p className="text-white font-black text-sm leading-tight">Pizza Admin</p>
            <p className="text-gray-500 text-xs">Management Panel</p>
          </div>
        </div>
      </div>

      {/* Live clock + stats strip */}
      <div className="mx-3 mt-3 mb-1 rounded-xl px-3 py-2.5 flex items-center justify-between"
        style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)' }}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-300 text-xs font-bold">{time}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Bell className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{pendingOrders}</span>
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <ChefHat className="w-3 h-3 text-blue-400" />
            <span className="text-blue-400 font-bold">{kitchenOrders}</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon    = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href))
                const count   = getBadge((item as any).badge)
                return (
                  <NavItem key={item.href} href={item.href} isActive={isActive} count={count}>
                    <Icon style={{ width: 18, height: 18, color: isActive ? '#fb923c' : '#9ca3af', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? '#fdba74' : '#d1d5db' }}>
                      {item.label}
                    </span>
                  </NavItem>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 mb-1">
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-orange-400 font-black text-sm">{pendingOrders}</p>
            <p className="text-gray-600 text-[10px]">Pending</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-blue-400 font-black text-sm">{kitchenOrders}</p>
            <p className="text-gray-600 text-[10px]">In Kitchen</p>
          </div>
        </div>

        {/* Admin info + logout */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }}>
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">Admin</p>
            <p className="text-gray-500 text-[10px] truncate">Pizza Company</p>
          </div>
          <button onClick={handleLogout} title="Logout"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
