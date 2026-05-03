'use client'

import { useEffect, useState } from 'react'
import { getCoupons } from '@/lib/supabase'
import type { Coupon } from '@/types'

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCoupons()
  }, [])

  async function loadCoupons() {
    const data = await getCoupons()
    setCoupons(data)
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
        <h1 className="text-3xl font-bold">Coupons</h1>
        <p className="text-muted-foreground">Manage discount coupons</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Discount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Usage</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium">{coupon.code}</td>
                <td className="px-4 py-3 text-sm">{coupon.discount}</td>
                <td className="px-4 py-3 text-sm">{coupon.usage_count} / {coupon.max_uses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
