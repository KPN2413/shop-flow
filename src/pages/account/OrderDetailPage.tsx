import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  ChevronRight, Package, MapPin, CreditCard,
  CheckCircle2, Clock, XCircle, Truck, ShoppingBag,
  ArrowLeft, Receipt,
} from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Button } from '../../components/ui/button'
import { formatINR, formatDate } from '../../lib/format'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import type { Order, OrderItem } from '../../lib/database.types'

// ── Status config ─────────────────────────────────────────────────────────────
type OrderStatus = 'CREATED' | 'PAID' | 'FULFILLED' | 'FAILED' | 'CANCELLED'

interface TimelineStep {
  status: OrderStatus
  label: string
  description: string
  icon: React.ReactNode
}

const HAPPY_PATH: TimelineStep[] = [
  {
    status: 'CREATED',
    label: 'Order Placed',
    description: 'Your order has been received',
    icon: <ShoppingBag className="w-4 h-4" />,
  },
  {
    status: 'PAID',
    label: 'Payment Confirmed',
    description: 'Payment was successful',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    status: 'FULFILLED',
    label: 'Delivered',
    description: 'Your order has been delivered',
    icon: <Truck className="w-4 h-4" />,
  },
]

const ERROR_STEPS: Record<string, TimelineStep> = {
  FAILED: {
    status: 'FAILED',
    label: 'Payment Failed',
    description: 'Payment could not be processed',
    icon: <XCircle className="w-4 h-4" />,
  },
  CANCELLED: {
    status: 'CANCELLED',
    label: 'Order Cancelled',
    description: 'This order was cancelled',
    icon: <XCircle className="w-4 h-4" />,
  },
}

const statusClass: Record<string, string> = {
  CREATED: 'order-status-created',
  PAID: 'order-status-paid',
  FAILED: 'order-status-failed',
  CANCELLED: 'order-status-cancelled',
  FULFILLED: 'order-status-fulfilled',
}

// ── Timeline component ────────────────────────────────────────────────────────
function OrderTimeline({ order }: { order: Order }) {
  const isError = order.status === 'FAILED' || order.status === 'CANCELLED'

  if (isError) {
    const errStep = ERROR_STEPS[order.status]
    return (
      <div className="shopflow-card p-6">
        <h2 className="font-bold text-base mb-5">Order Status</h2>
        <div className="flex items-start gap-4">
          {/* Completed placed step */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="w-0.5 h-8 bg-border mt-1" />
          </div>
          <div className="pt-1.5">
            <p className="font-semibold text-sm">Order Placed</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 mt-1">
          <div className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            {errStep.icon}
          </div>
          <div className="pt-1.5">
            <p className="font-semibold text-sm text-destructive">{errStep.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{errStep.description}</p>
          </div>
        </div>
      </div>
    )
  }

  // Happy path — find current step index
  const currentIdx = HAPPY_PATH.findIndex(s => s.status === order.status)

  return (
    <div className="shopflow-card p-6">
      <h2 className="font-bold text-base mb-6">Order Status</h2>
      <div className="space-y-0">
        {HAPPY_PATH.map((step, idx) => {
          const isCompleted = idx <= currentIdx
          const isActive = idx === currentIdx
          const isLast = idx === HAPPY_PATH.length - 1

          return (
            <div key={step.status} className="flex gap-4">
              {/* Line + dot column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isCompleted
                      ? isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-primary/90 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted && !isActive
                    ? <CheckCircle2 className="w-4 h-4" />
                    : step.icon
                  }
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 h-10 mt-1 transition-colors ${
                      idx < currentIdx ? 'bg-primary/50' : 'bg-border'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-8 pt-1.5 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5" /> Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isCompleted ? (
                    idx === 0
                      ? formatDate(order.created_at)
                      : step.description
                  ) : step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
type OrderWithItems = Order & {
  order_items: OrderItem[]
  shipping_address?: any
}

export function OrderDetailPage() {
  const { orderId } = useParams({ strict: false }) as { orderId: string }
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/login' })
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (authLoading || !user || !orderId) return

    async function fetch() {
      setLoading(true)
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user!.id)  // security: users can only see their own orders
        .single()

      if (error || !orderData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      setOrder({ ...orderData, order_items: items || [] } as OrderWithItems)
      setLoading(false)
    }

    fetch()
  }, [orderId, user, authLoading])

  if (authLoading || loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-5 bg-secondary rounded w-48" />
      <div className="h-40 bg-secondary rounded-xl" />
      <div className="h-48 bg-secondary rounded-xl" />
      <div className="h-32 bg-secondary rounded-xl" />
    </div>
  )

  if (notFound) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Order not found</h2>
      <p className="text-muted-foreground text-sm mb-4">This order doesn't exist or doesn't belong to your account.</p>
      <Button asChild variant="outline">
        <Link to="/account/orders"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Orders</Link>
      </Button>
    </div>
  )

  if (!order) return null

  const shippingCost = order.total_paise > 0
    ? (order as any).shipping_cost_paise ?? 0
    : 0
  const addr = order.shipping_address

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <Link to="/account" className="hover:text-foreground transition-colors">Account</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/account/orders" className="hover:text-foreground transition-colors">My Orders</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${statusClass[order.status] || ''}`}>{order.status}</Badge>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Timeline ── */}
        <OrderTimeline order={order} />

        {/* ── Order Items ── */}
        <div className="shopflow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold text-base">Items Ordered</h2>
          </div>

          <div className="space-y-3">
            {order.order_items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 pr-4">
                  <p className="font-medium">{item.title_snapshot}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatINR(item.price_paise_snapshot)} × {item.qty}
                  </p>
                </div>
                <span className="font-semibold shrink-0">
                  {formatINR(item.price_paise_snapshot * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">{formatINR(order.total_paise)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span className="text-emerald-600 font-medium">Free</span>
            </div>
          </div>

          <Separator className="my-3" />

          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="price-tag">{formatINR(order.total_paise)}</span>
          </div>
        </div>

        {/* ── Payment info ── */}
        <div className="shopflow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold text-base">Payment</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Method</p>
              <p className="font-medium">{order.payment_method === 'RAZORPAY_PLACEHOLDER' ? 'Razorpay' : order.payment_method}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Status</p>
              <Badge
                className={`text-xs ${
                  order.payment_status === 'SUCCESS' ? 'bg-green-100 text-green-700 border-0' :
                  order.payment_status === 'FAILED' ? 'bg-red-100 text-red-700 border-0' :
                  order.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-0' :
                  'bg-secondary text-secondary-foreground'
                }`}
              >
                {order.payment_status}
              </Badge>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Order ID</p>
              <p className="font-mono text-xs">{order.id}</p>
            </div>
          </div>
        </div>

        {/* ── Delivery address ── */}
        {addr && (
          <div className="shopflow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-bold text-base">Delivery Address</h2>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-0.5">
              {addr.full_name && <p className="font-medium text-foreground">{addr.full_name}</p>}
              {addr.phone && <p>+91 {addr.phone}</p>}
              {addr.line1 && <p>{addr.line1}</p>}
              {addr.line2 && <p>{addr.line2}</p>}
              {(addr.city || addr.state || addr.pincode) && (
                <p>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link to="/account/orders">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> All Orders
            </Link>
          </Button>
          {(order.status === 'PAID' || order.status === 'FULFILLED') && (
            <Button asChild className="flex-1">
              <Link to="/shop">
                <Package className="w-4 h-4 mr-1.5" /> Shop Again
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
