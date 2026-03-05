import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, ShoppingCart, Trash2, Package, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { formatINR } from '../../lib/format'
import { useWishlist } from '../../lib/wishlist-context'
import { useCart } from '../../lib/cart-context'
import { useAuth } from '../../lib/auth-context'
import toast from 'react-hot-toast'

export function WishlistPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { items, isLoading, toggle } = useWishlist()
  const { addToCart } = useCart()
  const navigate = useNavigate()

  if (authLoading || isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-28 bg-secondary rounded-xl" />
      ))}
    </div>
  )

  if (!user) {
    navigate({ to: '/login' })
    return null
  }

  async function handleMoveToCart(productId: string, title: string) {
    const result = await addToCart(productId)
    if (result?.error) {
      toast.error(result.error)
    } else {
      await toggle(productId) // remove from wishlist
      toast.success(`${title} moved to cart!`)
    }
  }

  async function handleRemove(productId: string) {
    await toggle(productId)
    toast.success('Removed from wishlist')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <Link to="/account" className="hover:text-foreground transition-colors">Account</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Wishlist</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            My Wishlist
          </h1>
          {items.length > 0 && (
            <p className="text-muted-foreground mt-1 text-sm">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          )}
        </div>
        {items.length > 0 && (
          <Button variant="outline" asChild size="sm">
            <Link to="/shop">
              Continue Shopping <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        /* ── Empty state ── */
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-10 h-10 text-red-300" />
          </div>
          <h3 className="font-semibold text-xl mb-2">Your wishlist is empty</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Save items you love by clicking the heart icon on any product
          </p>
          <Button asChild>
            <Link to="/shop">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const product = item.products
            if (!product) return null

            const invData = product.inventory as any
            const stock = Array.isArray(invData) ? (invData[0]?.stock ?? 0) : (invData?.stock ?? 0)
            const isOutOfStock = stock === 0

            return (
              <div
                key={item.id}
                className="shopflow-card p-4 flex items-center gap-4 group"
              >
                {/* Product image */}
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug } as any}
                  className="shrink-0"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Package className="w-7 h-7 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  {product.categories && (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                      {product.categories.name}
                    </p>
                  )}
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug } as any}
                    className="font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2"
                  >
                    {product.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="price-tag font-bold text-base">
                      {formatINR(product.price_paise)}
                    </span>
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                    ) : stock <= 5 ? (
                      <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                        Only {stock} left
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">In Stock</Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    disabled={isOutOfStock}
                    onClick={() => handleMoveToCart(product.id, product.title)}
                    className="gap-1.5 whitespace-nowrap"
                    style={!isOutOfStock ? { backgroundColor: 'hsl(var(--secondary))', color: 'white' } : {}}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Move to Cart</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(product.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          {/* Move all to cart */}
          {items.some(i => {
            const inv = i.products?.inventory as any
            const stock = Array.isArray(inv) ? (inv[0]?.stock ?? 0) : (inv?.stock ?? 0)
            return stock > 0
          }) && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  let moved = 0
                  for (const item of items) {
                    if (!item.products) continue
                    const inv = item.products.inventory as any
                    const stock = Array.isArray(inv) ? (inv[0]?.stock ?? 0) : (inv?.stock ?? 0)
                    if (stock > 0) {
                      const result = await addToCart(item.product_id)
                      if (!result?.error) {
                        await toggle(item.product_id)
                        moved++
                      }
                    }
                  }
                  if (moved > 0) toast.success(`${moved} item${moved > 1 ? 's' : ''} moved to cart!`)
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Move All In-Stock Items to Cart
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
