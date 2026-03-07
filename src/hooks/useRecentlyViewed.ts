import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'shopflow_recently_viewed'
const MAX_ITEMS = 10

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      // localStorage unavailable (private browsing etc.) — silently ignore
    }
  }, [ids])

  const add = useCallback((productId: string) => {
    setIds(prev => {
      // Move to front, deduplicate, cap at MAX_ITEMS
      const filtered = prev.filter(id => id !== productId)
      return [productId, ...filtered].slice(0, MAX_ITEMS)
    })
  }, [])

  const clear = useCallback(() => {
    setIds([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  return { ids, add, clear }
}
