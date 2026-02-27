/**
 * API client that routes to Supabase Edge Functions
 * All sensitive operations go through here
 */

import { supabase } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_URL: string = ((import.meta as any).env?.VITE_SUPABASE_URL) || 'https://placeholder.supabase.co'

function getFunctionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  }
}

export const api = {
  async checkout(paymentMethod: 'COD' | 'MOCK') {
    const headers = await getAuthHeaders()
    try {
      const res = await fetch(getFunctionUrl('api-checkout'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error || 'Checkout failed' }
      return { success: true, ...data }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  },

  async createProduct(data: Record<string, unknown>) {
    const headers = await getAuthHeaders()
    const res = await fetch(getFunctionUrl('admin-products'), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    return { ok: res.ok, data: await res.json() }
  },

  async updateProduct(id: string, data: Record<string, unknown>) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${getFunctionUrl('admin-product-update')}/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    })
    return { ok: res.ok, data: await res.json() }
  },

  async updateInventory(productId: string, stock: number) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${getFunctionUrl('admin-inventory')}/${productId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ stock }),
    })
    return { ok: res.ok, data: await res.json() }
  },
}
