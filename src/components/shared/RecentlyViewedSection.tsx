import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Clock, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/shared/ProductCard'
import { supabase } from '@/lib/supabase'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import type { ProductWithCategory } from '@/lib/database.types'

interface Props {
  /** Current product id to exclude (on ProductPage, so it's not shown in its own "recently viewed") */
  excludeId?: string
  /** Section title */
  title?: string
}

export function RecentlyViewedSection({ excludeId, title = 'Recently Viewed' }: Props) {
  const { ids, clear } = useRecentlyViewed()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(false)

  // IDs to display (excluding current product)
  const displayIds = excludeId ? ids.filter(id => id !== excludeId) : ids

  useEffect(() => {
    if (displayIds.length === 0) { setProducts([]); return }

    setLoading(true)
    supabase
      .from('products')
      .select('*, categories(*), inventory(stock)')
      .in('id', displayIds)
      .eq('status', 'ACTIVE')
      .eq('visibility', 'PUBLIC')
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        // Preserve the recently-viewed order (most recent first)
        const sorted = displayIds
          .map(id => data.find(p => p.id === id))
          .filter(Boolean) as ProductWithCategory[]
        setProducts(sorted)
        setLoading(false)
      })
  }, [displayIds.join(',')])

  // Don't render if nothing to show
  if (!loading && products.length === 0) return null

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' })
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll arrows — desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('left')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('right')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Clear history */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
            onClick={clear}
            title="Clear history"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        </div>
      </div>

      {/* Horizontal scroll list */}
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-44 sm:w-52 rounded-xl border bg-card overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-7 bg-muted rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(product => (
            <div
              key={product.id}
              className="shrink-0 w-44 sm:w-52 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}

          {/* "Browse more" card at the end */}
          <div className="shrink-0 w-44 sm:w-52 snap-start">
            <Link to="/shop" className="flex flex-col items-center justify-center h-full min-h-[200px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors gap-2 text-muted-foreground hover:text-primary p-4 text-center">
              <ArrowRight className="w-6 h-6" />
              <span className="text-sm font-medium">Browse more products</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
