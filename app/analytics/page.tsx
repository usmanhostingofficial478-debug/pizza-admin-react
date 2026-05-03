'use client'

import { useEffect, useState } from 'react'
import { getOrders, getOrderStats } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const statsData = await getOrderStats()
    setStats(statsData)
    setLoading(false)
  }

  const statusData = [
    { name: 'Pending', value: stats.pendingOrders },
    { name: 'Delivered', value: stats.deliveredOrders },
    { name: 'Cancelled', value: stats.cancelledOrders },
  ]

  const revenueData = [
    { name: 'Mon', revenue: 1200 },
    { name: 'Tue', revenue: 1800 },
    { name: 'Wed', revenue: 2400 },
    { name: 'Thu', revenue: 1600 },
    { name: 'Fri', revenue: 3200 },
    { name: 'Sat', revenue: 4500 },
    { name: 'Sun', revenue: 3800 },
  ]

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
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Business performance overview</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-3xl font-bold">{stats.totalOrders}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Average Order</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.averageOrderValue)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Weekly Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Order Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
