/**
 * POST /api/checkout
 * Server-validated checkout:
 * 1. Reads cart items for user
 * 2. Re-fetches products + inventory
 * 3. Validates stock and computes totals server-side
 * 4. Creates order + order_items
 * 5. Reduces inventory (atomic update with stock check)
 * 6. Clears cart
 * 7. Returns created order id
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

type PaymentMethod = 'COD' | 'MOCK' | 'RAZORPAY_PLACEHOLDER'

interface CheckoutPayload {
  payment_method: PaymentMethod
}

export interface CheckoutResult {
  success: boolean
  order_id?: string
  error?: string
  details?: Record<string, string>
}

export async function processCheckout(
  userId: string,
  payload: CheckoutPayload
): Promise<CheckoutResult> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { success: false, error: 'Server configuration error' }
  }

  // Use service role client for atomic server-side ops
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { payment_method } = payload
  if (!['COD', 'MOCK', 'RAZORPAY_PLACEHOLDER'].includes(payment_method)) {
    return { success: false, error: 'Invalid payment method' }
  }

  // 1. Fetch cart items
  const { data: cartItems, error: cartError } = await admin
    .from('cart_items')
    .select('id, product_id, qty')
    .eq('user_id', userId)

  if (cartError) return { success: false, error: 'Failed to read cart' }
  if (!cartItems?.length) return { success: false, error: 'Cart is empty' }

  const productIds = cartItems.map(i => i.product_id)

  // 2. Re-fetch products + inventory server-side
  const { data: products, error: prodError } = await admin
    .from('products')
    .select('id, title, price_paise, status, visibility')
    .in('id', productIds)
    .eq('status', 'ACTIVE')
    .eq('visibility', 'PUBLIC')

  if (prodError) return { success: false, error: 'Failed to fetch products' }

  const { data: inventory, error: invError } = await admin
    .from('inventory')
    .select('product_id, stock')
    .in('product_id', productIds)

  if (invError) return { success: false, error: 'Failed to fetch inventory' }

  // 3. Validate stock and compute total
  const productMap = new Map(products?.map(p => [p.id, p]))
  const inventoryMap = new Map(inventory?.map(i => [i.product_id, i]))
  const stockErrors: Record<string, string> = {}

  let totalPaise = 0
  const orderItemsToCreate = []

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.product_id)
    if (!product) {
      stockErrors[cartItem.product_id] = 'Product no longer available'
      continue
    }

    const inv = inventoryMap.get(cartItem.product_id)
    const stock = inv?.stock ?? 0

    if (stock < cartItem.qty) {
      stockErrors[cartItem.product_id] = `Only ${stock} units available for "${product.title}"`
      continue
    }

    totalPaise += product.price_paise * cartItem.qty
    orderItemsToCreate.push({
      product_id: cartItem.product_id,
      title_snapshot: product.title,
      price_paise_snapshot: product.price_paise,
      qty: cartItem.qty,
    })
  }

  if (Object.keys(stockErrors).length > 0) {
    return { success: false, error: 'Some items are unavailable', details: stockErrors }
  }

  if (orderItemsToCreate.length === 0) {
    return { success: false, error: 'No valid items to order' }
  }

  // 4. Payment strategy
  const orderStatus = payment_method === 'MOCK' ? 'PAID' : 'CREATED'
  const paymentStatus = payment_method === 'MOCK' ? 'SUCCESS' : 'NOT_INITIATED'

  // 5. Create order
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: userId,
      status: orderStatus,
      total_paise: totalPaise,
      payment_method,
      payment_status: paymentStatus,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { success: false, error: 'Failed to create order' }
  }

  // 6. Create order items
  const { error: itemsError } = await admin
    .from('order_items')
    .insert(orderItemsToCreate.map(item => ({ ...item, order_id: order.id })))

  if (itemsError) {
    // Rollback order
    await admin.from('orders').delete().eq('id', order.id)
    return { success: false, error: 'Failed to create order items' }
  }

  // 7. Reduce inventory atomically (one by one with safe checks)
  for (const cartItem of cartItems) {
    const inv = inventoryMap.get(cartItem.product_id)
    const newStock = (inv?.stock ?? 0) - cartItem.qty
    await admin
      .from('inventory')
      .update({ stock: Math.max(0, newStock), updated_at: new Date().toISOString() })
      .eq('product_id', cartItem.product_id)
      .gte('stock', cartItem.qty) // Safe: only update if still enough stock
  }

  // 8. Clear cart
  await admin.from('cart_items').delete().eq('user_id', userId)

  return { success: true, order_id: order.id }
}
