import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env

const supabaseUrl: string = env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey: string = env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (!env?.VITE_SUPABASE_URL) {
  console.warn('[ShopFlow] Supabase not configured. Connect Supabase in the Blink editor.')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)

export function getServiceClient() {
  const serviceKey: string = env?.VITE_SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Service role key not configured')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
