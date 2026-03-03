import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { ProductCard } from '../components/shop/ProductCard'
import { supabase } from '../lib/supabase'
import type { Product, Category } from '../lib/database.types'
import { useSearch } from '@tanstack/react-router'

export function ShopPage() {
  const searchParams = useSearch({ from: '/shop' as any })
  const categoryParam: string | undefined = (searchParams as any).category

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'all')
  const [sort, setSort] = useState<string>('newest')

  // Sync selectedCategory with URL param using a ref to avoid triggering on mount
  const prevCategoryParam = useRef(categoryParam)
  useEffect(() => {
    if (categoryParam !== prevCategoryParam.current) {
      prevCategoryParam.current = categoryParam
      setSelectedCategory(categoryParam || 'all')
    }
  }, [categoryParam])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories(data || [])
    })
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .eq('status', 'ACTIVE')
      .eq('visibility', 'PUBLIC')

    if (search) query = query.ilike('title', `%${search}%`)
    if (selectedCategory !== 'all') query = query.eq('category_id', selectedCategory)

    if (sort === 'price_asc') query = query.order('price_paise', { ascending: true })
    else if (sort === 'price_desc') query = query.order('price_paise', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    const { data } = await query
    setProducts((data as Product[]) || [])
    setLoading(false)
  }, [search, selectedCategory, sort])

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timeout)
  }, [fetchProducts])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Shop All Products</h1>
        <p className="text-muted-foreground">{loading ? '...' : `${products.length} products found`}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters */}
      {(selectedCategory !== 'all' || search) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {categories.find(c => c.id === selectedCategory)?.name}
              <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-foreground">×</button>
            </Badge>
          )}
          {search && (
            <Badge variant="secondary" className="gap-1">
              "{search}"
              <button onClick={() => setSearch('')} className="ml-1 hover:text-foreground">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shopflow-card overflow-hidden animate-pulse">
              <div className="aspect-square bg-secondary" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-secondary rounded w-1/3" />
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-6 bg-secondary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-xl">
          <SlidersHorizontal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No products found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setSelectedCategory('all') }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p as any} />)}
        </div>
      )}
    </div>
  )
}