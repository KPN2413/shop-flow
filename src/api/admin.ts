/**
 * Admin API utilities — server-side role validation
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

export function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Server configuration error: missing Supabase keys')
  }
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/**
 * Validates a JWT token and returns the user ID if valid
 */
export async function validateToken(token: string): Promise<string | null> {
  const admin = getAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

/**
 * Validates that a user is an ADMIN
 */
export async function validateAdmin(token: string): Promise<boolean> {
  const userId = await validateToken(token)
  if (!userId) return false

  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return profile?.role === 'ADMIN'
}
