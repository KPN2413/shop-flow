/**
 * API client
 * Checkout uses a single atomic PostgreSQL stored procedure (RPC) so that
 * stock validation, order creation, inventory decrement, and cart clearance
 * all happen in one transaction — if anything fails, everything rolls back.
 *
 * After a successful checkout, fires the send-order-confirmation Edge Function
 * to email the customer their order details (non-blocking — won't fail checkout).
 */
import { supabase } from './supabase'

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return

    // Fire and forget — email failure should never block the user
    fetch(`${SUPABASE_URL}/functions/v1/send-order-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,          // required by Supabase gateway
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ orderId }),
    }).catch(err => console.warn('Email notification failed (non-critical):', err))
  } catch {
    // Silently ignore — email is non-critical
  }
}

export const api = {
  async checkout(paymentMethod: 'COD' | 'MOCK'): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { success: false, error: 'Please sign in to checkout' }

    const { data, error } = await supabase.rpc('checkout_and_place_order', {
      p_user_id: session.user.id,
      p_payment_method: paymentMethod,
    })

    if (error) return { success: false, error: error.message }

    const result = data as { success: boolean; order_id?: string; error?: string }

    if (!result.success) {
      const msg = result.error ?? 'Checkout failed'
      if (msg.startsWith('RATE_LIMITED'))          return { success: false, error: 'Too many checkout attempts. Please wait a few minutes.' }
      if (msg.startsWith('CART_EMPTY'))            return { success: false, error: 'Your cart is empty' }
      if (msg.startsWith('PRODUCT_NOT_FOUND'))     return { success: false, error: 'A product in your cart no longer exists' }
      if (msg.startsWith('PRODUCT_UNAVAILABLE:'))  return { success: false, error: `${msg.split(':')[1]} is no longer available` }
      if (msg.startsWith('INSUFFICIENT_STOCK:'))   return { success: false, error: `Not enough stock for ${msg.split(':')[1]}` }
      return { success: false, error: msg }
    }

    if (result.order_id) sendOrderConfirmationEmail(result.order_id)

    return { success: true, orderId: result.order_id }
  },
}
