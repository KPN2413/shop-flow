import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CreditCard, Truck, CheckCircle, AlertCircle,
  Package, Zap, MapPin, ChevronRight, Gift,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Separator } from '../components/ui/separator'
import { formatINR } from '../lib/format'
import { useCart } from '../lib/cart-context'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type PaymentMethod = 'COD' | 'MOCK' | 'RAZORPAY'

interface ShippingAddress {
  full_name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
}

const FREE_SHIPPING_THRESHOLD = 49900
const SHIPPING_COST = 4900

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh',
]

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function CheckoutPage() {
  const { user, profile } = useAuth()
  const { items, totalPaise: cartTotal, refresh: refetch } = useCart()
  const navigate = useNavigate()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RAZORPAY')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})

  const [address, setAddress] = useState<ShippingAddress>({
    full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '',
  })

  useEffect(() => {
    if (profile) {
      setAddress(prev => ({
        ...prev,
        full_name: prev.full_name || profile.full_name || '',
        phone: prev.phone || profile.phone || '',
      }))
    }
  }, [profile])

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-2">Sign in to checkout</h2>
      <p className="text-muted-foreground mb-4">You need an account to place an order</p>
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

  const shippingCost = cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const grandTotal = cartTotal + shippingCost
  const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - cartTotal
  const freeShippingProgress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100)
  const totalItems = items.reduce((sum: number, i: any) => sum + i.qty, 0)

  function validateAddress(): boolean {
    const errors: Partial<Record<keyof ShippingAddress, string>> = {}
    if (!address.full_name.trim()) errors.full_name = 'Name is required'
    if (!address.phone.trim()) errors.phone = 'Phone is required'
    else if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\s/g, '')))
      errors.phone = 'Enter a valid 10-digit Indian mobile number'
    if (!address.line1.trim()) errors.line1 = 'Address is required'
    if (!address.city.trim()) errors.city = 'City is required'
    if (!address.state.trim()) errors.state = 'State is required'
    if (!address.pincode.trim()) errors.pincode = 'Pincode is required'
    else if (!/^\d{6}$/.test(address.pincode)) errors.pincode = 'Enter a valid 6-digit pincode'
    setAddressErrors(errors)
    return Object.keys(errors).length === 0
  }

  function setField(key: keyof ShippingAddress) {
    return (value: string) => {
      setAddress(prev => ({ ...prev, [key]: value }))
      if (addressErrors[key]) setAddressErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const handleRazorpayPayment = async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.')

      const rzpRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ amountPaise: grandTotal, receipt: `shopflow_${Date.now()}` }),
      })
      if (!rzpRes.ok) { const err = await rzpRes.json(); throw new Error(err.error || 'Failed to create payment order') }
      const { razorpayOrderId, keyId } = await rzpRes.json()

      const rpcResult = await supabase.rpc('checkout_and_place_order', { p_user_id: user.id, p_payment_method: 'RAZORPAY' })
      if (rpcResult.error) throw new Error(rpcResult.error.message)
      const rpcData = rpcResult.data as { success: boolean; order_id?: string; error?: string }
      if (!rpcData.success) throw new Error(rpcData.error || 'Failed to create order')
      const orderId = rpcData.order_id!

      await supabase.from('orders').update({ razorpay_order_id: razorpayOrderId, payment_status: 'PENDING', shipping_address: address }).eq('id', orderId)

      const options = {
        key: keyId, amount: grandTotal, currency: 'INR', name: 'ShopFlow',
        description: `Order #${orderId.slice(0, 8).toUpperCase()}`, order_id: razorpayOrderId,
        prefill: { name: address.full_name, email: user.email || '', contact: address.phone },
        theme: { color: '#FF6B35' },
        handler: async (response: any) => {
          await supabase.from('orders').update({ status: 'PAID', payment_status: 'SUCCESS', razorpay_payment_id: response.razorpay_payment_id }).eq('id', orderId)
          await refetch()
          toast.success('Payment successful! Order confirmed. 🎉')
          navigate({ to: '/account/orders' })
        },
        modal: { ondismiss: async () => {
          await supabase.from('orders').update({ status: 'FAILED', payment_status: 'FAILED' }).eq('id', orderId)
          setError('Payment cancelled. Your order was not placed.')
          setLoading(false)
        }},
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
      setLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!validateAddress()) {
      document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (paymentMethod === 'RAZORPAY') return handleRazorpayPayment()
    setLoading(true)
    setError(null)
    try {
      const result = await api.checkout(paymentMethod as 'COD' | 'MOCK')
      if (!result.success) { setError(result.error || 'Checkout failed. Please try again.'); return }
      if (result.orderId) {
        await supabase.from('orders').update({ shipping_address: address }).eq('id', result.orderId)
      }
      await refetch()
      toast.success('Order placed successfully! 🎉')
      navigate({ to: '/account/orders' })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/cart" className="hover:text-foreground transition-colors">Cart</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Checkout</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">

        {/* LEFT */}
        <div className="space-y-6">

          {/* Address Form */}
          <div id="address-form" className="shopflow-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Delivery Address</h2>
            </div>

            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="full_name" value={address.full_name} onChange={e => setField('full_name')(e.target.value)} placeholder="Priya Sharma" autoComplete="name" />
                  {addressErrors.full_name && <p className="text-xs text-destructive">{addressErrors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Mobile Number <span className="text-destructive">*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">+91</span>
                    <Input id="phone" type="tel" value={address.phone} onChange={e => setField('phone')(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="9876543210" autoComplete="tel" className="rounded-l-none" maxLength={10} />
                  </div>
                  {addressErrors.phone && <p className="text-xs text-destructive">{addressErrors.phone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="line1">Address Line 1 <span className="text-destructive">*</span></Label>
                <Input id="line1" value={address.line1} onChange={e => setField('line1')(e.target.value)} placeholder="House / Flat No., Building, Street" autoComplete="address-line1" />
                {addressErrors.line1 && <p className="text-xs text-destructive">{addressErrors.line1}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="line2">Address Line 2 <span className="text-muted-foreground text-xs ml-1">(optional)</span></Label>
                <Input id="line2" value={address.line2} onChange={e => setField('line2')(e.target.value)} placeholder="Landmark, Area, Colony" autoComplete="address-line2" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Input id="city" value={address.city} onChange={e => setField('city')(e.target.value)} placeholder="Bengaluru" autoComplete="address-level2" />
                  {addressErrors.city && <p className="text-xs text-destructive">{addressErrors.city}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode <span className="text-destructive">*</span></Label>
                  <Input id="pincode" value={address.pincode} onChange={e => setField('pincode')(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="560001" autoComplete="postal-code" maxLength={6} />
                  {addressErrors.pincode && <p className="text-xs text-destructive">{addressErrors.pincode}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                <select id="state" value={address.state} onChange={e => setField('state')(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Select state…</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {addressErrors.state && <p className="text-xs text-destructive">{addressErrors.state}</p>}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="shopflow-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Payment Method</h2>
            </div>
            <div className="space-y-3">
              {[
                { value: 'RAZORPAY' as PaymentMethod, icon: <Zap className="w-5 h-5 text-primary shrink-0" />, label: 'Pay Online', sub: 'Secure payment via Razorpay', badge: 'UPI · Cards · NetBanking' },
                { value: 'COD' as PaymentMethod, icon: <Truck className="w-5 h-5 text-primary shrink-0" />, label: 'Cash on Delivery', sub: 'Pay when your order arrives' },
                { value: 'MOCK' as PaymentMethod, icon: <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />, label: 'Demo Payment', sub: 'Instant confirmation — for testing only', muted: true },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === opt.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'}`}>
                  <input type="radio" name="payment" value={opt.value} checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paymentMethod === opt.value ? 'border-primary' : 'border-border'}`}>
                    {paymentMethod === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  {opt.icon}
                  <div className="flex-1">
                    <div className={`font-semibold text-sm flex items-center gap-2 ${opt.muted ? 'text-muted-foreground' : ''}`}>
                      {opt.label}
                      {opt.badge && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{opt.badge}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Order Summary */}
        <div>
          <div className="shopflow-card p-6 sticky top-24 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Order Summary</h2>
              <span className="text-sm text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            </div>

            {/* Free shipping progress */}
            {shippingCost > 0 ? (
              <div className="p-3 rounded-lg bg-accent border border-accent-foreground/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Gift className="w-3.5 h-3.5 text-accent-foreground" />
                  <span className="text-xs font-medium text-accent-foreground">
                    Add {formatINR(amountToFreeShipping)} more for <strong>FREE shipping</strong>
                  </span>
                </div>
                <div className="h-1.5 bg-accent-foreground/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-foreground/60 rounded-full transition-all duration-500" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-emerald-700">You've unlocked <strong>FREE shipping!</strong></span>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3">
              {items.map((item: any) => {
                const product = item.products as any
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-12 h-12 rounded-lg bg-secondary/50 overflow-hidden shrink-0 border border-border">
                      {product?.image_url
                        ? <img src={product.image_url} alt={product?.title} className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-muted-foreground/30 m-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product?.title}</div>
                      <div className="text-xs text-muted-foreground">{formatINR(product?.price_paise || 0)} × {item.qty}</div>
                    </div>
                    <span className="font-semibold shrink-0">{formatINR((product?.price_paise || 0) * item.qty)}</span>
                  </div>
                )
              })}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({totalItems} items)</span>
                <span className="text-foreground">{formatINR(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className={shippingCost === 0 ? 'text-emerald-600 font-medium' : 'text-foreground'}>
                  {shippingCost === 0 ? '🎉 Free' : formatINR(shippingCost)}
                </span>
              </div>
              {shippingCost > 0 && <p className="text-xs text-muted-foreground">Free shipping on orders above ₹499</p>}
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="price-tag text-lg">{formatINR(grandTotal)}</span>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
            )}

            <Button size="lg" className="w-full" onClick={handlePlaceOrder} disabled={loading}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Processing…</>
                : <><CheckCircle className="mr-2 w-4 h-4" />{paymentMethod === 'RAZORPAY' ? `Pay ${formatINR(grandTotal)}` : `Place Order — ${formatINR(grandTotal)}`}</>
              }
            </Button>

            {paymentMethod === 'RAZORPAY' && (
              <div className="flex items-center justify-center gap-2">
                <img src="https://razorpay.com/favicon.ico" alt="Razorpay" className="w-4 h-4" />
                <p className="text-xs text-muted-foreground">Secured by Razorpay</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
