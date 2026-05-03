'use client'

import { useEffect, useState } from 'react'
import { getOrders, getOrderStats, getActivities, subscribeToOrders } from '@/lib/supabase'
import { formatCurrency, formatDateTime, getStatusColor, timeAgo } from '@/lib/utils'
import type { Order, Activity } from '@/types'
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  ChefHat,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react'

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    
    // Subscribe to real-time updates
    const subscription = subscribeToOrders((newOrder) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === newOrder.id)
        if (exists) {
          return prev.map(o => o.id === newOrder.id ? newOrder : o)
        }
        return [newOrder, ...prev]
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadData() {
    setLoading(true)
    const [ordersData, statsData, activitiesData] = await Promise.all([
      getOrders(),
      getOrderStats(),
      getActivities(10),
    ])
    setOrders(ordersData)
    setStats(statsData)
    setActivities(activitiesData)
    setLoading(false)
  }

  const recentOrders = orders.slice(0, 5)
  const activeOrders = orders.filter(o => 
    o.status === 'Pending' || o.status === 'Processing'
  ).slice(0, 4)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          change="This month"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          change={`${stats.pendingOrders} pending`}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders.length.toString()}
          change="In kitchen"
          icon={ChefHat}
          color="orange"
        />
        <StatCard
          title="Delivered"
          value={stats.deliveredOrders.toString()}
          change={`${stats.cancelledOrders} cancelled`}
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <a href="/orders" className="text-sm text-primary hover:underline">View All</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm font-medium">{order.id}</td>
                      <td className="px-4 py-3 text-sm">{order.customer}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.items?.length || 0} items
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Active Orders & Activity */}
        <div className="space-y-6">
          {/* Active Orders */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Active Orders
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {activeOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active orders</p>
              ) : (
                activeOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold">Activity Feed</h2>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <span className="text-lg">{activity.icon}</span>
                    <div className="flex-1">
                      <p dangerouslySetInnerHTML={{ __html: activity.text }} />
                      <p className="text-xs text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  change: string
  icon: React.ElementType
  color: string
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500/20 text-green-500',
    blue: 'bg-blue-500/20 text-blue-500',
    orange: 'bg-orange-500/20 text-orange-500',
    emerald: 'bg-emerald-500/20 text-emerald-500',
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{change}</p>
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
