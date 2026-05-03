'use client'

import { useEffect, useState } from 'react'
import { getMenuItems } from '@/lib/supabase'
import type { MenuItem } from '@/types'

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMenuItems()
  }, [])

  async function loadMenuItems() {
    const data = await getMenuItems()
    setMenuItems(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Menu</h1>
        <p className="text-muted-foreground">Manage your pizza menu items</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">${item.price}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
              </div>
              {item.featured && (
                <span className="rounded-full bg-yellow-500/20 text-yellow-500 px-2 py-1 text-xs">
                  Featured
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
