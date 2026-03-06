import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, X, Package, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/database.types'

interface SearchResult extends Product {
  categories?: { name: string; slug: string } | null
}

interface SearchBarProps {
  /** Class applied to the outer wrapper */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** If true, renders a compact icon-only button that expands on click (for mobile/navbar) */
  collapsible?: boolean
}

const DEBOUNCE_MS = 300
const MAX_RESULTS = 6

export function SearchBar({
  className,
  placeholder = 'Search products…',
  collapsible = false,
}: SearchBarProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Collapsible state (mobile / navbar icon mode)
  const [expanded, setExpanded] = useState(!collapsible)

  // ── Debounced search ────────────────────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, categories(name, slug)')
      .eq('status', 'ACTIVE')
      .eq('visibility', 'PUBLIC')
      .ilike('title', `%${q}%`)
      .limit(MAX_RESULTS)
    setResults((data as SearchResult[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    setOpen(true)
    setActiveIndex(-1)
    const t = setTimeout(() => search(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, search])

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (collapsible) { setExpanded(false); setQuery('') }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [collapsible])

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        goToProduct(results[activeIndex])
      } else if (query.trim()) {
        goToShop()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setExpanded(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  // ── Navigation helpers ──────────────────────────────────────────────────────
  function goToProduct(product: SearchResult) {
    setOpen(false)
    setQuery('')
    if (collapsible) setExpanded(false)
    navigate({ to: '/product/$slug', params: { slug: product.slug } as any })
  }

  function goToShop() {
    setOpen(false)
    if (collapsible) setExpanded(false)
    navigate({ to: '/shop', search: { q: query } as any })
    setQuery('')
  }

  function handleExpandClick() {
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Collapsed icon button ───────────────────────────────────────────────────
  if (collapsible && !expanded) {
    return (
      <button
        onClick={handleExpandClick}
        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Open search"
      >
        <Search className="h-5 w-5" />
      </button>
    )
  }

  // ── Full search bar ─────────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm',
            'shadow-sm transition-colors placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            collapsible && 'w-56 sm:w-72'
          )}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-border bg-card shadow-lg overflow-hidden">

          {/* Loading skeleton */}
          {loading && (
            <div className="p-2 space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-2.5 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <ul className="py-1.5">
              {results.map((product, i) => (
                <li key={product.id}>
                  <button
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      i === activeIndex ? 'bg-accent' : 'hover:bg-accent/60'
                    )}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => goToProduct(product)}
                  >
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-muted-foreground/30 m-2.5" />
                      }
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.categories?.name && (
                          <span className="mr-1.5">{product.categories.name} ·</span>
                        )}
                        <span className="text-primary font-medium">{formatINR(product.price_paise)}</span>
                      </p>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}

              {/* "See all results" footer */}
              <li>
                <button
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary',
                    'border-t border-border hover:bg-accent/60 transition-colors'
                  )}
                  onClick={goToShop}
                >
                  <Search className="w-3.5 h-3.5" />
                  See all results for "{query}"
                </button>
              </li>
            </ul>
          )}

          {/* No results */}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center">
              <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try a different keyword
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
