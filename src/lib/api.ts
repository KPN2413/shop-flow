/**
 * API client - checkout handled directly via Supabase client
 * to avoid edge function JWT issues
 */
import { supabase } from './supabase'

const SUPABASE_URL: string = ((import.meta as any).env?.VITE_SUPABASE_URL) || 'https://placeholder.supabase.co'

function getFunctionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  }
}

export const api = {
  async checkout(paymentMethod: 'COD' | 'MOCK') {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return { success: false, error: 'Not authenticated' }

      const userId = session.user.id

      // 1. Get cart items with product details
      const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('*, products(id, title, price_paise, status, visibility, inventory(stock))')
        .eq('user_id', userId)

      if (cartError || !cartItems?.length) {
        return { success: false, error: 'Cart is empty or could not be loaded' }
      }

      // 2. Validate stock and compute total server-side
      for (const item of cartItems) {
        const product = item.products as any
        if (!product) return { success: false, error: `Product not found` }
        if (product.status !== 'ACTIVE' || product.visibility !== 'PUBLIC') {
          return { success: false, error: `${product.title} is no longer available` }
        }
        const stock = product.inventory?.stock ?? 0
        if (stock < item.qty) {
          return { success: false, error: `Insufficient stock for ${product.title}` }
        }
      }

      const totalPaise = cartItems.reduce((sum: number, item: any) => {
        return sum + (item.products.price_paise * item.qty)
      }, 0)

      // 3. Determine payment/order status
      const paymentStatus = paymentMethod === 'MOCK' ? 'SUCCESS' : 'NOT_INITIATED'
      const orderStatus = paymentMethod === 'MOCK' ? 'PAID' : 'CREATED'

      // 4. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          status: orderStatus,
          total_paise: totalPaise,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
        })
        .select()
        .single()

      if (orderError || !order) {
        return { success: false, error: 'Failed to create order' }
      }

      // 5. Create order items (snapshots)
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        title_snapshot: item.products.title,
        price_paise_snapshot: item.products.price_paise,
        qty: item.qty,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        return { success: false, error: 'Failed to create order items' }
      }

      // 6. Decrement inventory
      for (const item of cartItems) {
        const product = item.products as any
        const currentStock = product.inventory?.stock ?? 0
        await supabase
          .from('inventory')
          .update({ stock: currentStock - item.qty })
          .eq('product_id', item.product_id)
      }

      // 7. Clear cart
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)

      return { success: true, orderId: order.id }

    } catch (err: any) {
      return { success: false, error: err.message || 'Checkout failed' }
    }
  },

  async createProduct(data: Record<string, unknown>) {
    const headers = await getAuthHeaders()
    const res = await fetch(getFunctionUrl('admin-products'), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    return { ok: res.ok, data: await res.json() }
  },

  async updateProduct(id: string, data: Record<string, unknown>) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${getFunctionUrl('admin-product-update')}/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    })
    return { ok: res.ok, data: await res.json() }
  },

  async updateInventory(productId: string, stock: number) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${getFunctionUrl('api-admin')}/inventory/${productId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ stock }),
    })
    return { ok: res.ok, data: await res.json() }
  },

  async seedData() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${getFunctionUrl('api-admin')}/seed`, {
      method: 'POST',
      headers,
    })
    return { ok: res.ok, data: await res.json() }
  },
}