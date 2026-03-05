import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth-context'
import type { ProductWithCategory } from './database.types'

interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  created_at: string
  products: ProductWithCategory | null
}

interface WishlistContextType {
  items: WishlistItem[]
  itemCount: number
  isLoading: boolean
  isWishlisted: (productId: string) => boolean
  toggle: (productId: string) => Promise<void>
  refresh: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function fetchWishlist() {
    if (!user) { setItems([]); return }
    setIsLoading(true)
    const { data } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        products (
          *,
          categories (*),
          inventory (stock)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems((data as WishlistItem[]) ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchWishlist() }, [user])

  function isWishlisted(productId: string): boolean {
    return items.some(i => i.product_id === productId)
  }

  async function toggle(productId: string): Promise<void> {
    if (!user) return

    const existing = items.find(i => i.product_id === productId)

    if (existing) {
      // Optimistic remove
      setItems(prev => prev.filter(i => i.product_id !== productId))
      await supabase.from('wishlist_items').delete().eq('id', existing.id)
    } else {
      // Optimistic add (placeholder item — refresh will fill product details)
      const placeholder: WishlistItem = {
        id: `temp-${productId}`,
        user_id: user.id,
        product_id: productId,
        created_at: new Date().toISOString(),
        products: null,
      }
      setItems(prev => [placeholder, ...prev])
      await supabase
        .from('wishlist_items')
        .insert({ user_id: user.id, product_id: productId })
      // Fetch real data to replace placeholder
      await fetchWishlist()
    }
  }

  async function refresh() {
    await fetchWishlist()
  }

  return (
    <WishlistContext.Provider value={{
      items,
      itemCount: items.length,
      isLoading,
      isWishlisted,
      toggle,
      refresh,
    }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
