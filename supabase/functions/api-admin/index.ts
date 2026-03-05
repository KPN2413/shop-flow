import { createClient } from "npm:@supabase/supabase-js@2"

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
}

async function getAdminClient(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return { error: "Unauthorized", admin: null, user: null }

  // Verify user identity + role
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabaseUser.auth.getUser()
  if (error || !user) return { error: "Unauthorized", admin: null, user: null }

  // Check role
  const { data: profile } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "ADMIN") return { error: "Forbidden: Admin access required", admin: null, user: null }

  // Return service role client for admin writes
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  return { error: null, admin, user }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  // Path after function name: e.g. /api-admin/products/{id}
  const funcIdx = pathParts.findIndex(p => p === "api-admin")
  const subPath = pathParts.slice(funcIdx + 1)
  const resource = subPath[0] // products | inventory | orders | categories | seed
  const resourceId = subPath[1]

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  const { error: authError, admin } = await getAdminClient(req)
  if (authError) return json({ error: authError }, 401)

  try {
    // ---- PRODUCTS ----
    if (resource === "products") {
      if (req.method === "GET") {
        const page = parseInt(url.searchParams.get("page") || "0")
        const pageSize = 20
        const q = url.searchParams.get("q")
        let query = admin!
          .from("products")
          .select("*, categories(id, name, slug), inventory(stock)")
          .neq("status", "ARCHIVED")
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (q) query = query.ilike("title", `%${q}%`)

        const { data, error } = await query
        if (error) throw error
        return json({ data: data ?? [] })
      }

      if (req.method === "POST") {
        const body = await req.json()
        const { data, error } = await admin!
          .from("products")
          .insert({
            title: body.title,
            slug: body.slug,
            description: body.description ?? null,
            price_paise: body.price_paise,
            status: body.status ?? "DRAFT",
            visibility: body.visibility ?? "HIDDEN",
            category_id: body.category_id ?? null,
            image_url: body.image_url ?? null,
          })
          .select()
          .single()

        if (error) return json({ error: error.message }, 400)

        // Create inventory entry
        await admin!.from("inventory").insert({ product_id: data.id, stock: 0 })
        return json({ data }, 201)
      }

      if (req.method === "PATCH" && resourceId) {
        const body = await req.json()
        const { data, error } = await admin!
          .from("products")
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq("id", resourceId)
          .select()
          .single()

        if (error) return json({ error: error.message }, 400)
        return json({ data })
      }
    }

    // ---- INVENTORY ----
    if (resource === "inventory") {
      if (req.method === "POST" && resourceId) {
        const { stock } = await req.json()
        if (typeof stock !== "number" || stock < 0) {
          return json({ error: "Invalid stock value" }, 400)
        }
        const { error } = await admin!
          .from("inventory")
          .upsert(
            { product_id: resourceId, stock, updated_at: new Date().toISOString() },
            { onConflict: "product_id" }
          )
        if (error) return json({ error: error.message }, 400)
        return json({ data: { success: true, stock } })
      }
    }

    // ---- ORDERS ----
    if (resource === "orders") {
      if (req.method === "GET") {
        const page = parseInt(url.searchParams.get("page") || "0")
        const pageSize = 20
        const { data, error } = await admin!
          .from("orders")
          .select("*, profiles(full_name)")
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error
        return json({ data: data ?? [] })
      }

      if (req.method === "GET" && resourceId) {
        const { data, error } = await admin!
          .from("orders")
          .select("*, order_items(*), profiles(full_name)")
          .eq("id", resourceId)
          .single()

        if (error) return json({ error: "Order not found" }, 404)
        return json({ data })
      }
    }

    // ---- CATEGORIES ----
    if (resource === "categories") {
      if (req.method === "GET") {
        const { data, error } = await admin!.from("categories").select("*").order("name")
        if (error) throw error
        return json({ data: data ?? [] })
      }
      if (req.method === "POST") {
        const body = await req.json()
        const { data, error } = await admin!.from("categories").insert(body).select().single()
        if (error) return json({ error: error.message }, 400)
        return json({ data }, 201)
      }
    }

    // ---- SEED ----
    if (resource === "seed" && req.method === "POST") {
      // Insert 3 categories
      const { data: cats } = await admin!
        .from("categories")
        .upsert([
          { name: "Electronics", slug: "electronics" },
          { name: "Fashion", slug: "fashion" },
          { name: "Home & Kitchen", slug: "home-kitchen" },
        ], { onConflict: "slug" })
        .select()

      const catMap: Record<string, string> = {}
      ;(cats ?? []).forEach((c: any) => { catMap[c.slug] = c.id })

      // 10 demo products
      const products = [
        { title: "Wireless Bluetooth Headphones", slug: "wireless-bluetooth-headphones", description: "Premium sound quality with 40hr battery life and active noise cancellation.", price_paise: 299900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["electronics"], image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80" },
        { title: "Smart Watch Pro", slug: "smart-watch-pro", description: "Track fitness, notifications, and more with a beautiful AMOLED display.", price_paise: 499900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["electronics"], image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80" },
        { title: "USB-C Fast Charger 65W", slug: "usb-c-fast-charger-65w", description: "GaN technology charger for laptops and phones. Charges 3 devices simultaneously.", price_paise: 199900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["electronics"], image_url: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=500&q=80" },
        { title: "Premium Cotton Kurta", slug: "premium-cotton-kurta", description: "Handcrafted pure cotton kurta with traditional Indian embroidery.", price_paise: 159900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["fashion"], image_url: "https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?w=500&q=80" },
        { title: "Formal Blazer - Navy", slug: "formal-blazer-navy", description: "Slim fit formal blazer perfect for office and events. Available in multiple sizes.", price_paise: 399900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["fashion"], image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80" },
        { title: "Silk Saree - Kanjivaram", slug: "silk-saree-kanjivaram", description: "Authentic Kanjivaram silk saree with zari border. Perfect for weddings.", price_paise: 899900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["fashion"], image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80" },
        { title: "Stainless Steel Pressure Cooker 5L", slug: "steel-pressure-cooker-5l", description: "ISI marked 5L pressure cooker. Tri-ply base for even heating.", price_paise: 249900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["home-kitchen"], image_url: "https://images.unsplash.com/photo-1594971475674-6a97ce4cf7a7?w=500&q=80" },
        { title: "Air Fryer 4L Digital", slug: "air-fryer-4l-digital", description: "Digital air fryer with 8 preset cooking modes. Up to 85% less oil.", price_paise: 549900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["home-kitchen"], image_url: "https://images.unsplash.com/photo-1648390848126-e9eb99fae163?w=500&q=80" },
        { title: "Bamboo Cutting Board Set", slug: "bamboo-cutting-board-set", description: "Set of 3 eco-friendly bamboo cutting boards in different sizes.", price_paise: 79900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["home-kitchen"], image_url: "https://images.unsplash.com/photo-1589365252845-092198ba5334?w=500&q=80" },
        { title: "True Wireless Earbuds ANC", slug: "tws-earbuds-anc", description: "35hr total battery, IPX5 waterproof, and exceptional active noise cancellation.", price_paise: 349900, status: "ACTIVE", visibility: "PUBLIC", category_id: catMap["electronics"], image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80" },
      ]

      const { data: insertedProducts, error: prodError } = await admin!
        .from("products")
        .upsert(products, { onConflict: "slug" })
        .select()

      if (prodError) return json({ error: prodError.message }, 400)

      // Create inventory for each
      const inventoryRecords = (insertedProducts ?? []).map((p: any) => ({
        product_id: p.id,
        stock: Math.floor(Math.random() * 50) + 10,
      }))
      await admin!.from("inventory").upsert(inventoryRecords, { onConflict: "product_id" })

      return json({ data: { message: "Seed data inserted", categories: cats?.length ?? 0, products: insertedProducts?.length ?? 0 } })
    }

    return json({ error: "Not found" }, 404)
  } catch (err: any) {
    console.error("Admin API error:", err)
    return json({ error: err.message || "Internal server error" }, 500)
  }
})
