/**
 * send-order-confirmation
 *
 * Triggered after a successful checkout to send the user an order
 * confirmation email. Uses Resend (free tier: 3,000 emails/month).
 *
 * Called from: src/lib/api.ts after checkout_and_place_order RPC succeeds
 *
 * Environment variables required (set in Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY   — get from https://resend.com (free)
 *   FROM_EMAIL       — e.g. orders@yourdomain.com (must be verified in Resend)
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100)
}

function buildEmailHTML(data: {
  customerName: string
  orderId: string
  orderStatus: string
  paymentMethod: string
  items: Array<{ title: string; qty: number; price_paise: number }>
  totalPaise: number
  createdAt: string
}): string {
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333;">
        ${item.title}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; text-align: center;">
        ×${item.qty}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; text-align: right;">
        ${formatINR(item.price_paise * item.qty)}
      </td>
    </tr>
  `).join('')

  const statusColor = data.orderStatus === 'PAID' ? '#16a34a' : '#2563eb'
  const statusLabel = data.orderStatus === 'PAID' ? 'Payment Confirmed' : 'Order Received'
  const paymentLabel = data.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1C2A47 0%, #2d3f63 100%); padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Shop<span style="color: #FF6B35;">Flow</span>
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">India's Smart Shopping</p>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="background-color: ${statusColor}; padding: 16px 40px; text-align: center;">
              <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">
                ✓ ${statusLabel}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: white; padding: 40px; border-radius: 0 0 12px 12px;">

              <!-- Greeting -->
              <p style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1C2A47;">
                Hi ${data.customerName}! 👋
              </p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #666; line-height: 1.5;">
                ${data.orderStatus === 'PAID'
                  ? 'Your payment was successful and your order is confirmed. We\'ll get it ready for you soon!'
                  : 'Your order has been placed successfully. Please keep cash ready for delivery.'}
              </p>

              <!-- Order Details -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</td>
                    <td style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Date</td>
                  </tr>
                  <tr>
                    <td style="font-size: 14px; font-weight: 600; color: #1C2A47; font-family: monospace; padding-top: 4px;">
                      #${data.orderId.slice(0, 8).toUpperCase()}
                    </td>
                    <td style="font-size: 14px; color: #333; text-align: right; padding-top: 4px;">
                      ${new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 12px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="font-size: 14px; font-weight: 600; color: #1C2A47; padding-top: 4px;">
                      ${paymentLabel}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Items -->
              <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #1C2A47;">Order Items</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="font-size: 12px; color: #888; text-align: left; padding-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                    <th style="font-size: 12px; color: #888; text-align: center; padding-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th style="font-size: 12px; color: #888; text-align: right; padding-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <!-- Total -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #1C2A47;">
                <tr>
                  <td style="font-size: 16px; font-weight: 700; color: #1C2A47;">Total</td>
                  <td style="font-size: 20px; font-weight: 700; color: #FF6B35; text-align: right;">
                    ${formatINR(data.totalPaise)}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align: center; margin-top: 40px;">
                <a href="https://shop-flow-eight.vercel.app/account/orders"
                   style="display: inline-block; background-color: #FF6B35; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  View Your Orders →
                </a>
              </div>

              <!-- Footer -->
              <p style="margin: 40px 0 0; font-size: 13px; color: #999; text-align: center; line-height: 1.5;">
                Questions? Reply to this email or visit our store.<br>
                <a href="https://shop-flow-eight.vercel.app" style="color: #FF6B35; text-decoration: none;">shop-flow-eight.vercel.app</a>
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // No auth check needed - function uses service role internally
  // and is only called after a successful checkout with a valid order ID

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'orders@shopflow.in'

  if (!resendApiKey) {
    // Graceful degradation: log but don't fail the checkout
    console.warn('RESEND_API_KEY not set — skipping email')
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Email not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { orderId } = await req.json()
    if (!orderId) throw new Error('orderId is required')

    // Fetch order details using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get order with items and user profile
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id, status, total_paise, payment_method, created_at,
        order_items (title_snapshot, price_paise_snapshot, qty),
        profiles!orders_user_id_fkey (full_name),
        users:user_id (email)
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) throw new Error('Order not found')

    // Get user email from auth.users via service role
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id ?? '')

    const customerEmail = authUser?.user?.email
    const customerName = (order.profiles as any)?.full_name ?? 'Valued Customer'

    if (!customerEmail) throw new Error('Could not find customer email')

    const emailHtml = buildEmailHTML({
      customerName,
      orderId: order.id,
      orderStatus: order.status,
      paymentMethod: order.payment_method,
      items: (order.order_items as any[]).map(i => ({
        title: i.title_snapshot,
        qty: i.qty,
        price_paise: i.price_paise_snapshot,
      })),
      totalPaise: order.total_paise,
      createdAt: order.created_at,
    })

    // Send via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: customerEmail,
        subject: `Your ShopFlow Order #${order.id.slice(0, 8).toUpperCase()} is ${order.status === 'PAID' ? 'Confirmed' : 'Placed'}! 🛍️`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      throw new Error(`Resend error: ${JSON.stringify(err)}`)
    }

    const result = await emailRes.json()
    console.log('Email sent:', result.id)

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('send-order-confirmation error:', err.message)
    // Don't fail hard — email is non-critical, checkout already succeeded
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
