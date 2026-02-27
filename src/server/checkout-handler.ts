/**
 * Checkout API handler - called from fetch('/api/checkout')
 * This simulates a server-side handler.
 * In production, this would be a Next.js API route or Supabase Edge Function.
 * 
 * For Vite deployment, we use Supabase Edge Functions as the backend.
 * This file documents the expected request/response contract.
 */

export const CHECKOUT_API_DOCS = {
  endpoint: 'POST /api/checkout',
  auth: 'Bearer <supabase_access_token>',
  request: {
    payment_method: 'COD | MOCK | RAZORPAY_PLACEHOLDER'
  },
  responses: {
    200: { success: true, order_id: 'uuid' },
    400: { error: 'Cart is empty | Invalid payment method' },
    401: { error: 'Unauthorized' },
    409: { error: 'Some items are unavailable', details: { '<product_id>': 'reason' } },
    500: { error: 'Internal server error' }
  }
}
