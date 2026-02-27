import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  )

  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  // /api-products or /api-products/{slug}
  const slug = pathParts[pathParts.length - 1] !== "api-products" ? pathParts[pathParts.length - 1] : null

  try {
    if (slug) {
      // GET /api/products/[slug]
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(*), inventory(stock)")
        .eq("slug", slug)
        .eq("status", "ACTIVE")
        .eq("visibility", "PUBLIC")
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // GET /api/products (with filters)
    const q = url.searchParams.get("q")
    const category = url.searchParams.get("category")
    const sort = url.searchParams.get("sort") || "newest"
    const limit = parseInt(url.searchParams.get("limit") || "60")

    let query = supabase
      .from("products")
      .select("*, categories(*), inventory(stock)")
      .eq("status", "ACTIVE")
      .eq("visibility", "PUBLIC")

    if (category) {
      const { data: cat } = await supabase.from("categories").select("id").eq("slug", category).single()
      if (cat) query = query.eq("category_id", cat.id)
    }

    if (q) query = query.ilike("title", `%${q}%`)

    if (sort === "price_asc") query = query.order("price_paise", { ascending: true })
    else if (sort === "price_desc") query = query.order("price_paise", { ascending: false })
    else query = query.order("created_at", { ascending: false })

    const { data, error } = await query.limit(limit)

    if (error) throw error

    return new Response(JSON.stringify({ data: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
