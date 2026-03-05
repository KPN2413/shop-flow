import { createClient } from "npm:@supabase/supabase-js@2"

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type PaymentMethod = "COD" | "MOCK" | "RAZORPAY_PLACEHOLDER"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Auth required
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Use anon key + user JWT for auth
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  // Use service role for admin writes (inventory, order creation)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { paymentMethod = "MOCK" }: { paymentMethod: PaymentMethod } = await req.json()

    // 1. Read cart items for user
    const { data: cartItems, error: cartError } = await supabaseUser
      .from("cart_items")
      .select("*, products(id, title, price_paise, status, visibility, inventory(stock))")
      .eq("user_id", user.id)

    if (cartError) throw cartError
    if (!cartItems || cartItems.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. Validate each item: status, visibility, stock
    let subtotalPaise = 0
    const orderItems: Array<{
      product_id: string
      title_snapshot: string
      price_paise_snapshot: number
      qty: number
    }> = []

    for (const item of cartItems) {
      const product = item.products as any
      if (!product || product.status !== "ACTIVE" || product.visibility !== "PUBLIC") {
        return new Response(
          JSON.stringify({ error: `Product "${product?.title ?? "Unknown"}" is no longer available` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // stock comes as array from supabase join
      const stockRow = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory
      const stock = stockRow?.stock ?? 0

      if (stock < item.qty) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock for "${product.title}". Only ${stock} available.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      subtotalPaise += product.price_paise * item.qty
      orderItems.push({
        product_id: product.id,
        title_snapshot: product.title,
        price_paise_snapshot: product.price_paise,
        qty: item.qty,
      })
    }

    // 3. Compute totals (delivery fee: free above ₹499)
    const deliveryFeePaise = subtotalPaise >= 49900 ? 0 : 4900
    const totalPaise = subtotalPaise + deliveryFeePaise

    // 4. Determine payment outcomes
    const orderStatus = paymentMethod === "MOCK" ? "PAID" : "CREATED"
    const paymentStatus = paymentMethod === "MOCK" ? "SUCCESS" : "NOT_INITIATED"

    // 5. Create order (use admin client for guaranteed write)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        status: orderStatus,
        total_paise: totalPaise,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
      })
      .select()
      .single()

    if (orderError || !order) throw orderError ?? new Error("Failed to create order")

    // 6. Create order items
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })))

    if (itemsError) throw itemsError

    // 7. Reduce inventory (safe: only decrement if stock >= qty)
    for (const item of orderItems) {
      await supabaseAdmin.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_qty: item.qty,
      }).then(async ({ error }) => {
        if (error) {
          // Fallback: direct update
          const { data: inv } = await supabaseAdmin
            .from("inventory")
            .select("stock")
            .eq("product_id", item.product_id)
            .single()
          if (inv) {
            await supabaseAdmin
              .from("inventory")
              .update({ stock: Math.max(0, inv.stock - item.qty), updated_at: new Date().toISOString() })
              .eq("product_id", item.product_id)
          }
        }
      })
    }

    // 8. Clear cart
    await supabaseAdmin.from("cart_items").delete().eq("user_id", user.id)

    return new Response(
      JSON.stringify({ data: { orderId: order.id, totalPaise, orderStatus, paymentStatus } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("Checkout error:", err)
    return new Response(JSON.stringify({ error: err.message || "Checkout failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
