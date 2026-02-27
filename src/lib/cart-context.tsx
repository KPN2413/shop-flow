import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth-context'
import type { CartItemWithProduct } from './database.types'

interface CartContextType {
  items: CartItemWithProduct[]
  itemCount: number
  totalPaise: number
  isLoading: boolean
  addToCart: (productId: string, qty?: number) => Promise<{ error?: string }>
  updateQty: (cartItemId: string, qty: number) => Promise<void>
  removeItem: (cartItemId: string) => Promise<void>
  clearCart: () => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItemWithProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function fetchCart() {
    if (!user) { setItems([]); return }
    setIsLoading(true)
    const { data } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          *,
          categories (*),
          inventory (stock)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setItems((data as CartItemWithProduct[]) ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchCart() }, [user])

  async function addToCart(productId: string, qty = 1): Promise<{ error?: string }> {
    if (!user) return { error: 'Please login to add items to cart' }
    // Check existing
    const existing = items.find(i => i.product_id === productId)
    if (existing) {
      const newQty = existing.qty + qty
      if (newQty > 10) return { error: 'Maximum 10 items per product allowed' }
      const { error } = await supabase
        .from('cart_items')
        .update({ qty: newQty })
        .eq('id', existing.id)
      if (!error) await fetchCart()
      return {}
    }
    const { error } = await supabase
      .from('cart_items')
      .insert({ user_id: user.id, product_id: productId, qty })
    if (error) return { error: error.message }
    await fetchCart()
    return {}
  }

  async function updateQty(cartItemId: string, qty: number) {
    if (qty < 1 || qty > 10) return
    await supabase.from('cart_items').update({ qty }).eq('id', cartItemId)
    await fetchCart()
  }

  async function removeItem(cartItemId: string) {
    await supabase.from('cart_items').delete().eq('id', cartItemId)
    await fetchCart()
  }

  async function clearCart() {
    if (!user) return
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    setItems([])
  }

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPaise = items.reduce((sum, i) => {
    const price = i.products?.price_paise ?? 0
    return sum + price * i.qty
  }, 0)

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      totalPaise,
      isLoading,
      addToCart,
      updateQty,
      removeItem,
      clearCart,
      refresh: fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
