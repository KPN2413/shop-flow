/**
 * send-order-confirmation
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   PROJECT_URL
 *   SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   FROM_EMAIL
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
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
  subtotalPaise: number
  discountPaise: number
  couponCode: string | null
  totalPaise: number
  createdAt: string
  shippingAddress: any | null
}): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333;">${item.title}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; text-align: center;">×${item.qty}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; text-align: right;">${formatINR(
        item.price_paise * item.qty,
      )}</td>
    </tr>
  `,
    )
    .join('')

  const statusColor = data.orderStatus === 'PAID' ? '#16a34a' : '#2563eb'
  const statusLabel = data.orderStatus === 'PAID' ? 'Payment Confirmed' : 'Order Received'
  const paymentLabel = data.paymentMethod === 'COD' ? 'Cash on Delivery' : data.paymentMethod === 'MOCK' ? 'Demo Payment' : 'Online Payment (Razorpay)'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1C2A47 0%,#2d3f63 100%);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Shop<span style="color:#FF6B35;">Flow</span></h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">India's Smart Shopping</p>
          </td>
        </tr>

        <tr>
          <td style="background:${statusColor};padding:16px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">✓ ${statusLabel}</p>
          </td>
        </tr>

        <tr>
          <td style="background:#fff;padding:40px;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C2A47;">Hi ${data.customerName}!</p>
            <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.5;">
              ${data.orderStatus === 'PAID'
                ? "Your payment was successful and your order is confirmed. We'll get it ready soon!"
                : "Your order has been placed successfully. Please keep cash ready for delivery."}
            </p>

            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Order ID</td>
                  <td style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Date</td>
                </tr>
                <tr>
                  <td style="font-size:14px;font-weight:600;color:#1C2A47;font-family:monospace;padding-top:4px;">#${data.orderId
                    .slice(0, 8)
                    .toUpperCase()}</td>
                  <td style="font-size:14px;color:#333;text-align:right;padding-top:4px;">${new Date(
                    data.createdAt,
                  ).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Payment Method</td>
                </tr>
                <tr>
                  <td colspan="2" style="font-size:14px;font-weight:600;color:#1C2A47;padding-top:4px;">${paymentLabel}</td>
                </tr>
              </table>
            </div>

            <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1C2A47;">Order Items</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr>
                  <th style="font-size:12px;color:#888;text-align:left;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
                  <th style="font-size:12px;color:#888;text-align:center;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                  <th style="font-size:12px;color:#888;text-align:right;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">
              <tr>
                <td style="font-size:14px;color:#666;padding-bottom:6px;">Subtotal</td>
                <td style="font-size:14px;color:#333;text-align:right;padding-bottom:6px;">${formatINR(data.subtotalPaise)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#16a34a;padding-bottom:6px;">Shipping</td>
                <td style="font-size:14px;color:#16a34a;text-align:right;padding-bottom:6px;">Free</td>
              </tr>
              \${data.discountPaise > 0 && data.couponCode ? \`<tr>
                <td style="font-size:14px;color:#16a34a;padding-bottom:6px;">🏷 Coupon (\${data.couponCode})</td>
                <td style="font-size:14px;color:#16a34a;text-align:right;padding-bottom:6px;">− \${formatINR(data.discountPaise)}</td>
              </tr>\` : ''}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;padding-top:12px;border-top:2px solid #1C2A47;">
              <tr>
                <td style="font-size:16px;font-weight:700;color:#1C2A47;">Total</td>
                <td style="font-size:20px;font-weight:700;color:#FF6B35;text-align:right;">${formatINR(data.totalPaise)}</td>
              </tr>
            </table>

            \${data.shippingAddress ? \`
            <h3 style="margin:32px 0 12px;font-size:15px;font-weight:700;color:#1C2A47;">📍 Delivery Address</h3>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:14px;color:#555;line-height:1.8;">
              \${[data.shippingAddress.full_name, data.shippingAddress.phone ? '+91 ' + data.shippingAddress.phone : null, data.shippingAddress.line1, data.shippingAddress.line2, [data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.pincode].filter(Boolean).join(', ')].filter(Boolean).map(l => '<div>' + l + '</div>').join('')}
            </div>\` : ''}

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
              <tr><td align="center">
                <a href="https://shop-flow-eight.vercel.app/account/orders/\${data.orderId}"
                   style="display:inline-block;background:#FF6B35;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 32px;border-radius:8px;">
                  Track Your Order →
                </a>
              </td></tr>
            </table>

            <p style="margin:32px 0 0;font-size:12px;color:#bbb;text-align:center;line-height:1.6;">
              Questions? Visit <a href="https://shop-flow-eight.vercel.app" style="color:#FF6B35;text-decoration:none;">shop-flow-eight.vercel.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'orders@shopflow.in'

  if (!resendApiKey) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Email not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { orderId } = await req.json()
    if (!orderId) throw new Error('orderId is required')

    const projectUrl = Deno.env.get('PROJECT_URL')
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')
    if (!projectUrl || !serviceKey) throw new Error('Missing PROJECT_URL or SERVICE_ROLE_KEY')

    const supabase = createClient(projectUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
  id, user_id, status, total_paise, payment_method, created_at,
  coupon_code, discount_paise, shipping_address,
  order_items (title_snapshot, price_paise_snapshot, qty)
`)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      // expose useful DB error
      throw new Error(orderErr?.message ?? 'Order not found')
    }

    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(order.user_id ?? '')
    if (authErr) throw new Error(`Auth lookup failed: ${authErr.message}`)

    const customerEmail = authUser?.user?.email
    // Get customer name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', order.user_id)
      .single()
    const customerName = profile?.full_name || (order as any).shipping_address?.full_name || 'Valued Customer'
    if (!customerEmail) throw new Error('Could not find customer email')

    const subtotalPaise = (order.order_items as any[]).reduce(
      (sum: number, i: any) => sum + i.price_paise_snapshot * i.qty, 0
    )

    const emailHtml = buildEmailHTML({
      customerName,
      orderId: order.id,
      orderStatus: order.status,
      paymentMethod: order.payment_method,
      items: (order.order_items as any[]).map((i) => ({
        title: i.title_snapshot,
        qty: i.qty,
        price_paise: i.price_paise_snapshot,
      })),
      subtotalPaise,
      discountPaise: (order as any).discount_paise ?? 0,
      couponCode: (order as any).coupon_code ?? null,
      totalPaise: order.total_paise,
      createdAt: order.created_at,
      shippingAddress: (order as any).shipping_address ?? null,
    })

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: customerEmail,
        subject: `Your ShopFlow Order #${order.id.slice(0, 8).toUpperCase()} is ${
          order.status === 'PAID' ? 'Confirmed' : 'Placed'
        }!`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}))
      throw new Error(`Resend error: ${JSON.stringify(err)}`)
    }

    const result = await emailRes.json()
    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
