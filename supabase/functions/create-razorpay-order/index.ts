/**
 * create-razorpay-order
 *
 * Creates a Razorpay order server-side so the secret key is never
 * exposed to the browser. Called from CheckoutPage before opening
 * the Razorpay payment widget.
 *
 * Flow:
 * 1. Frontend calls this function with the cart total
 * 2. Function creates a Razorpay order using secret key
 * 3. Returns razorpay_order_id to frontend
 * 4. Frontend opens Razorpay widget with order_id
 * 5. User pays → Razorpay calls webhook → order confirmed
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const keyId     = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

  if (!keyId || !keySecret) {
    return new Response(JSON.stringify({ error: 'Razorpay not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { amountPaise, currency = 'INR', receipt } = await req.json()

    if (!amountPaise || amountPaise < 100) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create order via Razorpay API (secret key used here, never on frontend)
    const credentials = btoa(`${keyId}:${keySecret}`)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,      // in paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1,       // auto-capture payment
      }),
    })

    if (!rzpRes.ok) {
      const err = await rzpRes.json()
      throw new Error(err.error?.description || 'Razorpay order creation failed')
    }

    const rzpOrder = await rzpRes.json()

    // Return only what the frontend needs — never return the secret
    return new Response(JSON.stringify({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId,                      // safe to send — this is the public key
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('create-razorpay-order error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
