'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  BarChart3,
  UtensilsCrossed,
  Users,
  Ticket,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/kitchen', label: 'Kitchen', icon: ChefHat },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/coupons', label: 'Coupons', icon: Ticket },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Pizza Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Admin User</span>
              <span className="text-xs text-muted-foreground">admin@pizza.com</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
