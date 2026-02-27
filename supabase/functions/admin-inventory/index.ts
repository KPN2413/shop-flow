import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Validate admin
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { data: profile } = await admin.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'ADMIN') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/')
  const productId = pathParts[pathParts.length - 1]

  if (!productId) return new Response(JSON.stringify({ error: 'Product ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'POST') {
    const { stock } = await req.json()
    if (typeof stock !== 'number' || stock < 0) {
      return new Response(JSON.stringify({ error: 'Invalid stock value' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data, error } = await admin
      .from('inventory')
      .upsert({ product_id: productId, stock, updated_at: new Date().toISOString() }, { onConflict: 'product_id' })
      .select()
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
