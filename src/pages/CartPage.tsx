import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { formatINR } from '@/lib/format'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'

export function CartPage() {
  const { items, totalPaise, updateQty, removeItem, isLoading } = useCart()
  const { user } = useAuth()

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Sign in to view your cart</h2>
          <p className="text-muted-foreground mt-1 text-sm">Your cart items are saved to your account.</p>
          <div className="flex gap-3 mt-6">
            <Link to="/login"><Button style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>Sign In</Button></Link>
            <Link to="/shop"><Button variant="outline">Continue Shopping</Button></Link>
          </div>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Your cart is empty</h2>
          <p className="text-muted-foreground mt-1 text-sm">Add items to your cart to proceed to checkout.</p>
          <Link to="/shop" className="mt-6">
            <Button style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }} className="gap-2">
              Start Shopping <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  const deliveryFee = totalPaise >= 49900 ? 0 : 4900
  const grandTotal = totalPaise + deliveryFee

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
        Shopping Cart ({items.reduce((s, i) => s + i.qty, 0)} items)
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.products
            if (!product) return null
            const invData = product.inventory as any
            const stock = Array.isArray(invData) ? (invData[0]?.stock ?? 0) : (invData?.stock ?? 0)
            return (
              <div key={item.id} className="flex gap-4 rounded-xl border bg-card p-4 shadow-sm">
                {/* Image */}
                <Link to="/product/$slug" params={{ slug: product.slug }} className="shrink-0">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-lg bg-muted border">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <Link to="/product/$slug" params={{ slug: product.slug }}>
                      <h3 className="font-semibold text-sm hover:text-secondary transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>
                        {product.title}
                      </h3>
                    </Link>
                    {product.categories && (
                      <p className="text-xs text-muted-foreground mt-0.5">{product.categories.name}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {/* Qty controls */}
                      <div className="flex items-center border rounded-lg overflow-hidden text-sm">
                        <button
                          className="px-2.5 py-1 hover:bg-muted transition-colors disabled:opacity-50"
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          disabled={item.qty <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 py-1 font-medium min-w-[2rem] text-center">{item.qty}</span>
                        <button
                          className="px-2.5 py-1 hover:bg-muted transition-colors disabled:opacity-50"
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          disabled={item.qty >= Math.min(10, stock)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        className="text-destructive hover:text-destructive/80 transition-colors p-1"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="price-inr text-base font-bold" style={{ color: 'hsl(var(--secondary))' }}>
                      {formatINR(product.price_paise * item.qty)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatINR(totalPaise)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                  {deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}
                </span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-xs text-muted-foreground">
                  Add {formatINR(49900 - totalPaise)} more for free delivery
                </p>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="price-inr text-lg">{formatINR(grandTotal)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Link to="/checkout" className="w-full">
                <Button size="lg" className="w-full gap-2" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
