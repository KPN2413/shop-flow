import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Validate user token
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const userId = user.id

  // Service role client for all writes
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let body: { payment_method: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { payment_method } = body
  if (!['COD', 'MOCK', 'RAZORPAY_PLACEHOLDER'].includes(payment_method)) {
    return new Response(JSON.stringify({ error: 'Invalid payment method' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // 1. Fetch cart items
  const { data: cartItems } = await admin
    .from('cart_items')
    .select('id, product_id, qty')
    .eq('user_id', userId)

  if (!cartItems?.length) {
    return new Response(JSON.stringify({ error: 'Cart is empty' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const productIds = cartItems.map((i: any) => i.product_id)

  // 2. Re-fetch products + inventory server-side
  const { data: products } = await admin
    .from('products')
    .select('id, title, price_paise, status, visibility')
    .in('id', productIds)
    .eq('status', 'ACTIVE')
    .eq('visibility', 'PUBLIC')

  const { data: inventory } = await admin
    .from('inventory')
    .select('product_id, stock')
    .in('product_id', productIds)

  // 3. Validate stock + compute totals
  const productMap = new Map((products || []).map((p: any) => [p.id, p]))
  const inventoryMap = new Map((inventory || []).map((i: any) => [i.product_id, i]))
  const stockErrors: Record<string, string> = {}
  let totalPaise = 0
  const orderItemsToCreate: any[] = []

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.product_id) as any
    if (!product) { stockErrors[cartItem.product_id] = 'Product no longer available'; continue }

    const inv = inventoryMap.get(cartItem.product_id) as any
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
    return new Response(JSON.stringify({ error: 'Some items are unavailable', details: stockErrors }), {
      status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // 4. Payment strategy
  const orderStatus = payment_method === 'MOCK' ? 'PAID' : 'CREATED'
  const paymentStatus = payment_method === 'MOCK' ? 'SUCCESS' : 'NOT_INITIATED'

  // 5. Create order
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({ user_id: userId, status: orderStatus, total_paise: totalPaise, payment_method, payment_status: paymentStatus })
    .select('id')
    .single()

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Failed to create order' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // 6. Create order items
  const { error: itemsError } = await admin
    .from('order_items')
    .insert(orderItemsToCreate.map((item: any) => ({ ...item, order_id: order.id })))

  if (itemsError) {
    await admin.from('orders').delete().eq('id', order.id)
    return new Response(JSON.stringify({ error: 'Failed to create order items' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // 7. Reduce inventory
  for (const cartItem of cartItems) {
    const inv = inventoryMap.get(cartItem.product_id) as any
    const newStock = Math.max(0, (inv?.stock ?? 0) - cartItem.qty)
    await admin
      .from('inventory')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('product_id', cartItem.product_id)
      .gte('stock', cartItem.qty)
  }

  // 8. Clear cart
  await admin.from('cart_items').delete().eq('user_id', userId)

  return new Response(JSON.stringify({ success: true, order_id: order.id }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
