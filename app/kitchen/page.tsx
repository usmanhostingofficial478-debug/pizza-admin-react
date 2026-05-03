'use client'

import { useEffect, useState } from 'react'
import { getOrders, updateOrderStatus, subscribeToOrders } from '@/lib/supabase'
import { formatCurrency, timeAgo, getStatusColor } from '@/lib/utils'
import type { Order } from '@/types'
import { ChefHat, Clock, CheckCircle, Package } from 'lucide-react'

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
    
    const subscription = subscribeToOrders((updatedOrder) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === updatedOrder.id)
        if (exists) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
        }
        return [updatedOrder, ...prev]
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadOrders() {
    setLoading(true)
    const data = await getOrders()
    setOrders(data)
    setLoading(false)
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const success = await updateOrderStatus(orderId, newStatus)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
    }
  }

  const activeOrders = orders.filter(o => 
    o.status === 'Pending' || o.status === 'Processing' || o.status === 'Confirmed'
  )

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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ChefHat className="h-8 w-8" />
          Kitchen View
        </h1>
        <p className="text-muted-foreground">Manage active orders in real-time</p>
      </div>

      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ChefHat className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">No active orders</p>
          <p className="text-sm text-muted-foreground">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeOrders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ 
  order, 
  onStatusChange 
}: { 
  order: Order
  onStatusChange: (id: string, status: string) => void 
}) {
  const statusSteps = ['Pending', 'Processing', 'Confirmed', 'On the Way', 'Delivered']
  const currentStep = statusSteps.indexOf(order.status)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-lg font-bold">{order.id}</p>
          <p className="text-sm text-muted-foreground">{order.customer}</p>
        </div>
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Items:</p>
        <ul className="space-y-1">
          {order.items?.map((item, idx) => (
            <li key={idx} className="text-sm flex justify-between">
              <span>{item.name} x{item.qty}</span>
              <span className="text-muted-foreground">{item.size}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between mb-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {timeAgo(order.created_at)}
        </div>
        <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
      </div>

      <div className="flex gap-2">
        {order.status === 'Pending' && (
          <button
            onClick={() => onStatusChange(order.id, 'Processing')}
            className="flex-1 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 py-2 text-sm font-medium transition-colors"
          >
            Start Processing
          </button>
        )}
        {order.status === 'Processing' && (
          <button
            onClick={() => onStatusChange(order.id, 'Confirmed')}
            className="flex-1 rounded-lg bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30 py-2 text-sm font-medium transition-colors"
          >
            Mark Ready
          </button>
        )}
        {order.status === 'Confirmed' && (
          <button
            onClick={() => onStatusChange(order.id, 'On the Way')}
            className="flex-1 rounded-lg bg-purple-500/20 text-purple-500 hover:bg-purple-500/30 py-2 text-sm font-medium transition-colors"
          >
            Dispatch
          </button>
        )}
      </div>
    </div>
  )
}
