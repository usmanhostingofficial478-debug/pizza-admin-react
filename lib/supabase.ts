import { createClient } from '@supabase/supabase-js'
import type { Order, Customer, MenuItem, Coupon, Activity } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://brazcavcdsgrkkvxgjeu.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyYXpjYXZjZHNncmtrdnhnamV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjM5NDIsImV4cCI6MjA5MzIzOTk0Mn0.M-4_OZGj1TvXXMeci8tDO1EbiH8ODXYy40CUEdo4CHo'

export const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeStatus(status: string): string {
  if (!status) return 'Pending'
  const s = status.trim()
  const validStatuses = ['Pending', 'Processing', 'Confirmed', 'On the Way', 'Delivered', 'Cancelled']
  const match = validStatuses.find(v => v.toLowerCase() === s.toLowerCase())
  return match || (s.charAt(0).toUpperCase() + s.slice(1))
}

// Helper to transform raw Supabase order into typed Order
function processOrder(order: any): Order {
  const customerObj = typeof order.customer === 'object' && order.customer !== null
    ? order.customer
    : {}
  return {
    ...order,
    id: order.tracking_id || order.order_id || String(order.id),
    tracking_id: order.tracking_id || order.order_id || String(order.id),
    customer: customerObj.name || order.customer || 'Unknown',
    phone: customerObj.phone || order.phone || '',
    address: customerObj.address || order.address || '',
    status: normalizeStatus(order.status),
    items: Array.isArray(order.items) ? order.items : [],
  } as Order
}

// Orders
export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }
  
  return (data || []).map(processOrder)
}

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  const updated_at = new Date().toISOString()

  const { data: d1, error: e1 } = await supabase
    .from('orders')
    .update({ status, updated_at })
    .eq('tracking_id', orderId)
    .select('id')

  if (!e1 && d1 && d1.length > 0) return true

  const { data: d2, error: e2 } = await supabase
    .from('orders')
    .update({ status, updated_at })
    .eq('order_id', orderId)
    .select('id')

  if (!e2 && d2 && d2.length > 0) return true

  const { error: e3 } = await supabase
    .from('orders')
    .update({ status, updated_at })
    .eq('id', orderId)

  if (e3) {
    console.error('Error updating order status:', e3)
    return false
  }

  return true
}

export function subscribeToOrders(callback: (order: Order) => void) {
  const channelName = `orders-realtime-${Math.random().toString(36).slice(2)}`
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      if (payload.new) callback(processOrder(payload.new))
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
      if (payload.new) callback(processOrder(payload.new))
    })
    .subscribe()
}

// Customers
export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('Error fetching customers:', error); return [] }
  return (data || []).map(c => ({
    ...c,
    orders_count: c.total_orders ?? c.orders ?? 0,
    total_spent:  c.total_spent  ?? c.spent  ?? 0,
  }))
}

export async function addCustomer(data: {
  name: string; phone: string; address?: string; email?: string; notes?: string; badge?: string
}): Promise<Customer | null> {
  const { data: row, error } = await supabase
    .from('customers')
    .insert([{ ...data, badge: data.badge || 'Regular', total_orders: 0, total_spent: 0 }])
    .select().single()
  if (error) { console.error('Error adding customer:', error); return null }
  return row as Customer
}

export async function updateCustomer(id: string, updates: Record<string, any>): Promise<boolean> {
  const { error } = await supabase.from('customers').update(updates).eq('id', id)
  if (error) { console.error('Error updating customer:', error); return false }
  return true
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) { console.error('Error deleting customer:', error); return false }
  return true
}

export async function getCustomerOrders(phone: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.filter(o => {
    const cust = typeof o.customer === 'object' ? o.customer : {}
    return (cust.phone || o.phone || '').replace(/\s/g,'') === phone.replace(/\s/g,'')
  })
}

// Menu
export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching menu:', error)
    return []
  }
  
  return (data || []).map(item => ({
    ...item,
    featured: item.featured || false,
  })) as MenuItem[]
}

export async function addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem | null> {
  const { data, error } = await supabase.from('menu').insert([item]).select().single()
  if (error) { console.error('Error adding menu item:', error); return null }
  return data as MenuItem
}

export async function updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<boolean> {
  const { error } = await supabase.from('menu').update(updates).eq('id', id)
  if (error) { console.error('Error updating menu item:', error); return false }
  return true
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('menu').delete().eq('id', id)
  if (error) { console.error('Error deleting menu item:', error); return false }
  return true
}

// Coupons
export async function getCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('code')
  
  if (error) {
    console.error('Error fetching coupons:', error)
    return []
  }
  
  return data || []
}

// Activities
export async function getActivities(limit: number = 20): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching activities:', error)
    return []
  }
  
  return data || []
}

export async function addActivity(icon: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .insert({ icon, text, timestamp: Date.now(), time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) })

  if (error) {
    console.error('Error adding activity:', error)
  }
}

// Analytics
export async function getOrderStats() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
  
  if (error || !orders) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      averageOrderValue: 0,
    }
  }
  
  const nonCancelled = orders.filter(o => 
    (o.status || '').toLowerCase() !== 'cancelled'
  )
  
  const totalRevenue = nonCancelled.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
  
  return {
    totalRevenue,
    totalOrders: orders.length,
    deliveredOrders: orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length,
    cancelledOrders: orders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length,
    pendingOrders: orders.filter(o => (o.status || '').toLowerCase() === 'pending').length,
    averageOrderValue: nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0,
  }
}
