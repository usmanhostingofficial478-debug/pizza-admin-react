'use client'

import { useEffect, useState } from 'react'
import { getCustomers } from '@/lib/supabase'
import type { Customer } from '@/types'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    const data = await getCustomers()
    setCustomers(data)
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
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">Manage your customers</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phone</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm">{customer.name}</td>
                <td className="px-4 py-3 text-sm">{customer.email}</td>
                <td className="px-4 py-3 text-sm">{customer.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
