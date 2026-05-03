'use client'

import { useEffect, useState } from 'react'
import { getOrders, updateOrderStatus, subscribeToOrders } from '@/lib/supabase'
import { formatCurrency, formatDateTime, getStatusColor } from '@/lib/utils'
import type { Order } from '@/types'
import { Search, Filter, MoreHorizontal, ChevronDown } from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadOrders()
    
    const subscription = subscribeToOrders((updatedOrder) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase()) ||
                         order.customer.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and track all orders</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Confirmed">Confirmed</option>
          <option value="On the Way">On the Way</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{order.id}</td>
                  <td className="px-4 py-3 text-sm">{order.customer}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {order.items?.length || 0} items
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDateTime(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`rounded-full px-2 py-1 text-xs font-medium border ${getStatusColor(order.status)} bg-transparent`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="On the Way">On the Way</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-border bg-card p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customer}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(selectedOrder.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} x{item.qty}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
