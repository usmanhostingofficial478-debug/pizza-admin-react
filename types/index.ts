export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  size?: string;
}

export interface Order {
  id: string;
  tracking_id: string;
  customer: string;
  phone?: string;
  address?: string;
  items: OrderItem[];
  items_display?: string;
  total: number;
  status: 'Pending' | 'Processing' | 'Confirmed' | 'On the Way' | 'Delivered' | 'Cancelled';
  order_type: 'Delivery' | 'Pickup' | 'Dine-in';
  payment_method: 'Cash' | 'Card' | 'Online';
  created_at: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  badge?: string;
  featured: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount: string;
  max_uses: number;
  usage_count: number;
  expires_at: string;
  active: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  icon: string;
  text: string;
  timestamp: string;
}

export type OrderStatus = Order['status'];
