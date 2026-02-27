import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CreditCard, Truck, CheckCircle, AlertCircle, Package } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { formatINR } from '../lib/format'
import { useCart } from '../lib/cart-context'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

type PaymentMethod = 'COD' | 'MOCK'

export function CheckoutPage() {
  const { user, profile } = useAuth()
  const { items, totalPaise: cartTotal, refresh: refetch } = useCart()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOCK')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h2 className="text-2xl font-bold mb-2">Sign in to checkout</h2>
      <Button asChild><Link to="/login">Sign In</Link></Button>
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
      <Button asChild><Link to="/shop">Shop Now</Link></Button>
    </div>
  )

  const shippingCost = cartTotal >= 49900 ? 0 : 4900
  const grandTotal = cartTotal + shippingCost

  const handlePlaceOrder = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await api.checkout(paymentMethod)

      if (!result.success) {
        setError(result.error || 'Checkout failed. Please try again.')
        return
      }

      await refetch()
      toast.success('Order placed successfully!')
      navigate({ to: '/account/orders' })
    } catch (err: any) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left */}
        <div className="space-y-6">
          {/* Delivery Info */}
          <div className="shopflow-card p-6">
            <h2 className="font-bold text-lg mb-4">Delivery Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24">Name:</span>
                <span className="font-medium">{profile?.full_name || user.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24">Phone:</span>
                  <span className="font-medium">{profile.phone}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Update delivery details in <Link to="/account" className="text-primary hover:underline">My Account</Link>
            </p>
          </div>

          {/* Payment Method */}
          <div className="shopflow-card p-6">
            <h2 className="font-bold text-lg mb-4">Payment Method</h2>
            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'MOCK' ? 'border-primary bg-secondary/30' : 'border-border hover:border-primary/30'}`}>
                <input type="radio" name="payment" value="MOCK" checked={paymentMethod === 'MOCK'} onChange={() => setPaymentMethod('MOCK')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'MOCK' ? 'border-primary' : 'border-border'}`}>
                  {paymentMethod === 'MOCK' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <CreditCard className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Pay Now (Demo)</div>
                  <div className="text-xs text-muted-foreground">Instant order confirmation — demo mode</div>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-primary bg-secondary/30' : 'border-border hover:border-primary/30'}`}>
                <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'COD' ? 'border-primary' : 'border-border'}`}>
                  {paymentMethod === 'COD' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <Truck className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Cash on Delivery</div>
                  <div className="text-xs text-muted-foreground">Pay when your order arrives</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right — Order Summary */}
        <div>
          <div className="shopflow-card p-6 sticky top-24">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {items.map(item => {
                const product = item.products as any
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 overflow-hidden shrink-0">
                      {product?.image_url ? (
                        <img src={product.image_url} alt={product?.title} className="w-full h-full object-cover" />
                      ) : <Package className="w-5 h-5 text-muted-foreground/30 m-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product?.title}</div>
                      <div className="text-muted-foreground text-xs">Qty: {item.qty}</div>
                    </div>
                    <span className="font-medium shrink-0">{formatINR((product?.price_paise || 0) * item.qty)}</span>
                  </div>
                )
              })}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shippingCost === 0 ? 'text-emerald-600 font-medium' : ''}>{shippingCost === 0 ? 'Free' : formatINR(shippingCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="price-tag">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button size="lg" className="w-full mt-4" onClick={handlePlaceOrder} disabled={loading}>
              {loading ? 'Placing Order...' : (
                <>
                  <CheckCircle className="mr-2 w-4 h-4" />
                  Place Order — {formatINR(grandTotal)}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              By placing this order, you agree to our terms of service
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
