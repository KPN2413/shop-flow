import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { ShoppingCart, ArrowLeft, Package, Minus, Plus, Heart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useWishlist } from '@/lib/wishlist-context'
import { toast } from 'react-hot-toast'
import type { ProductWithCategory } from '@/lib/database.types'
import { ReviewSection } from '@/components/shared/ReviewSection'

export function ProductPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const { addToCart } = useCart()
  const { user } = useAuth()
  const { isWishlisted, toggle } = useWishlist()
  const [product, setProduct] = useState<ProductWithCategory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*), inventory(stock)')
        .eq('slug', slug)
        .eq('status', 'ACTIVE')
        .eq('visibility', 'PUBLIC')
        .single()
      if (error || !data) setProduct(null)
      else setProduct(data as ProductWithCategory)
      setIsLoading(false)
    }
    fetchProduct()
  }, [slug])

  useEffect(() => {
    if (!product) return
    supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', product.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAvgRating(data.reduce((s, r) => s + r.rating, 0) / data.length)
          setReviewCount(data.length)
        }
      })
  }, [product])

  async function handleAddToCart() {
    if (!user) { toast.error('Please sign in to add items to cart'); return }
    if (!product) return
    setAdding(true)
    const result = await addToCart(product.id, qty)
    if (result?.error) toast.error(result.error)
    else toast.success(`${qty} item${qty > 1 ? 's' : ''} added to cart!`)
    setAdding(false)
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 animate-pulse">
          <div className="aspect-square bg-muted rounded-xl" />
          <div className="space-y-4 py-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-10 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Product not found</h2>
          <p className="text-muted-foreground mt-1">This product may have been removed or is no longer available.</p>
          <Link to="/shop"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" />Back to Shop</Button></Link>
        </div>
      </main>
    )
  }

  const invData = product.inventory as any
  const stock = Array.isArray(invData) ? (invData[0]?.stock ?? 0) : (invData?.stock ?? 0)
  const isOutOfStock = stock === 0
  const maxQty = Math.min(10, stock)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-xl bg-muted border">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col py-2">
          {product.categories && (
            <Link to="/shop" search={{ category: product.categories.slug }}>
              <Badge variant="outline" className="w-fit mb-3 hover:bg-muted cursor-pointer">
                {product.categories.name}
              </Badge>
            </Link>
          )}

          <h1 className="text-2xl font-bold sm:text-3xl leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {product.title}
          </h1>

          <div className="mt-4">
            <span className="price-inr text-3xl font-bold" style={{ color: 'hsl(var(--secondary))' }}>
              {formatINR(product.price_paise)}
            </span>
            <span className="text-sm text-muted-foreground ml-2">incl. of all taxes</span>
          </div>

          {/* Stock indicator */}
          <div className="mt-3">
            {isOutOfStock ? (
              <Badge variant="destructive">Out of Stock</Badge>
            ) : stock <= 5 ? (
              <Badge className="bg-orange-100 text-orange-800 border-0">Only {stock} left in stock</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 border-0">In Stock</Badge>
            )}
          </div>

          {/* Avg rating */}
          {avgRating !== null && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'}`} />
                ))}
              </div>
              <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}

          <Separator className="my-6" />

          {product.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Qty selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  className="px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-4 py-2 min-w-[3rem] text-center font-medium text-sm">{qty}</span>
                <button
                  className="px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                  onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 gap-2"
              disabled={isOutOfStock || adding}
              onClick={handleAddToCart}
              style={!isOutOfStock ? { backgroundColor: 'hsl(var(--secondary))', color: 'white' } : {}}
            >
              <ShoppingCart className="h-4 w-4" />
              {adding ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            {user && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => toggle(product!.id)}
                className={isWishlisted(product!.id) ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100' : 'hover:border-red-300 hover:text-red-500'}
                title={isWishlisted(product!.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart className={`h-4 w-4 ${isWishlisted(product!.id) ? 'fill-red-500' : ''}`} />
              </Button>
            )}
            {!isOutOfStock && (
              <Link to="/cart">
                <Button size="lg" variant="outline">View Cart</Button>
              </Link>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free delivery on orders above ₹499 · 7-day easy return
          </p>
        </div>
      </div>
      {/* Reviews */}
      <ReviewSection productId={product.id} />
    </main>
  )
}
