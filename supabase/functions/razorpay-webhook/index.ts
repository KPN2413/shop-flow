/**
 * razorpay-webhook
 *
 * Handles Razorpay payment webhooks. Verifies HMAC-SHA256 signature
 * to ensure the webhook is genuinely from Razorpay (not spoofed).
 * Updates order status atomically.
 *
 * Idempotent: checks if order is already PAID before updating,
 * so duplicate webhooks don't cause issues.
 *
 * Set webhook URL in Razorpay Dashboard:
 * https://rrclksfgojikwreqpzmh.supabase.co/functions/v1/razorpay-webhook
 *
 * Events to subscribe: payment.captured, payment.failed
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// HMAC-SHA256 signature verification
async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSignature === signature
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not set')
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature') ?? ''

    // ── Verify signature (HMAC-SHA256) ────────────────────────────────────────
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const event = JSON.parse(rawBody)
    const eventType = event.event  // e.g. "payment.captured"
    const payment   = event.payload?.payment?.entity

    if (!payment) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const razorpayOrderId = payment.order_id
    const razorpayPaymentId = payment.id

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find the ShopFlow order by razorpay_order_id
    const { data: order, error: findErr } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('razorpay_order_id', razorpayOrderId)
      .single()

    if (findErr || !order) {
      console.error('Order not found for razorpay_order_id:', razorpayOrderId)
      // Return 200 so Razorpay doesn't keep retrying
      return new Response(JSON.stringify({ received: true, warning: 'Order not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Idempotency check: don't double-update ────────────────────────────────
    if (order.payment_status === 'SUCCESS' || order.status === 'PAID') {
      console.log('Order already paid, skipping update:', order.id)
      return new Response(JSON.stringify({ received: true, skipped: 'already_paid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Update order based on event type ─────────────────────────────────────
    if (eventType === 'payment.captured') {
      await supabase
        .from('orders')
        .update({
          status: 'PAID',
          payment_status: 'SUCCESS',
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      console.log('Order marked as PAID:', order.id)

    } else if (eventType === 'payment.failed') {
      await supabase
        .from('orders')
        .update({
          status: 'FAILED',
          payment_status: 'FAILED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      console.log('Order marked as FAILED:', order.id)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
