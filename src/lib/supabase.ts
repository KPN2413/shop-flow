import { createClient } from '@supabase/supabase-js'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)

export function getServiceClient() {
  const serviceKey: string = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Service role key not configured')
  return createClient<any>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}