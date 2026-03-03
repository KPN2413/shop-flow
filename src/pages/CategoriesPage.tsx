import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/database.types'

interface CategoryWithCount extends Category {
  product_count: number
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*, products(count)')
        .order('name')

      const mapped = (data || []).map((cat: any) => ({
        ...cat,
        product_count: cat.products?.[0]?.count ?? 0,
      }))

      setCategories(mapped)
      setIsLoading(false)
    }
    fetchCategories()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          All Categories
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse products by category
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 animate-pulse">
              <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-xl">
          <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No categories yet</h3>
          <p className="text-muted-foreground text-sm">Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to="/shop"
              search={{ category: cat.id }}
              className="group rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-orange-400"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg mb-4"
                style={{ backgroundColor: 'hsl(24 95% 96%)' }}
              >
                <Tag className="h-5 w-5" style={{ color: 'hsl(var(--secondary))' }} />
              </div>
              <h2
                className="font-semibold text-sm leading-tight mb-1 group-hover:text-secondary transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {cat.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {cat.product_count} {cat.product_count === 1 ? 'product' : 'products'}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                Browse <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}