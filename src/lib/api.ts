/**
 * API client
 * Checkout uses a single atomic PostgreSQL stored procedure (RPC) so that
 * stock validation, order creation, inventory decrement, and cart clearance
 * all happen in one transaction — if anything fails, everything rolls back.
 *
 * Rate limiting (max 5 checkouts per user per 10 min) is enforced inside
 * the PostgreSQL function itself — no extra services needed.
 */
import { supabase } from './supabase'

export const api = {
  async checkout(paymentMethod: 'COD' | 'MOCK'): Promise<{ success: boolean; orderId?: string; error?: string }> {
    // Verify the user is authenticated client-side before hitting the DB
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { success: false, error: 'Please sign in to checkout' }

    // Single atomic RPC call — all logic runs in one DB transaction
    const { data, error } = await supabase.rpc('checkout_and_place_order', {
      p_user_id: session.user.id,
      p_payment_method: paymentMethod,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const result = data as { success: boolean; order_id?: string; error?: string }

    if (!result.success) {
      const msg = result.error ?? 'Checkout failed'
      if (msg.startsWith('RATE_LIMITED'))          return { success: false, error: 'Too many checkout attempts. Please wait a few minutes.' }
      if (msg.startsWith('CART_EMPTY'))            return { success: false, error: 'Your cart is empty' }
      if (msg.startsWith('PRODUCT_NOT_FOUND'))     return { success: false, error: 'A product in your cart no longer exists' }
      if (msg.startsWith('PRODUCT_UNAVAILABLE:'))  return { success: false, error: `${msg.split(':')[1]} is no longer available` }
      if (msg.startsWith('INSUFFICIENT_STOCK:')) {
        const parts = msg.split(':')
        return { success: false, error: `Not enough stock for ${parts[1]}` }
      }
      return { success: false, error: msg }
    }

    return { success: true, orderId: result.order_id }
  },
}
