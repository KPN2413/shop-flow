import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { supabase, formatINR } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/OrderStatusBadge'
import type { OrderWithItems } from '@/lib/database.types'

export function OrderDetailPage() {
  const { orderId } = useParams({ strict: false }) as { orderId: string }
  const { user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate({ to: '/login' }); return }
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .eq('user_id', user!.id)
        .single()
      setOrder(data as OrderWithItems | null)
      setIsLoading(false)
    }
    fetchOrder()
  }, [orderId, user])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Order not found</p>
          <Link to="/account"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" />My Orders</Button></Link>
        </div>
      </main>
    )
  }

  const subtotal = order.order_items.reduce((s, i) => s + i.price_paise_snapshot * i.qty, 0)
  const deliveryFee = order.total_paise - subtotal

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Order Details</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">#{order.id}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={order.status as any} />
          <PaymentStatusBadge status={order.payment_status as any} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Order meta */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Placed On</p>
                <p className="font-medium mt-1">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Payment</p>
                <p className="font-medium mt-1">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Items</p>
                <p className="font-medium mt-1">{order.order_items.length} items</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Total</p>
                <p className="font-bold mt-1 price-inr">{formatINR(order.total_paise)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base" style={{ fontFamily: 'var(--font-heading)' }}>Items Ordered</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.title_snapshot}</TableCell>
                    <TableCell className="text-right text-sm">{formatINR(item.price_paise_snapshot)}</TableCell>
                    <TableCell className="text-right text-sm">{item.qty}</TableCell>
                    <TableCell className="text-right font-semibold text-sm price-inr">
                      {formatINR(item.price_paise_snapshot * item.qty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className={deliveryFee === 0 ? 'text-green-600' : ''}>{deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="price-inr">{formatINR(order.total_paise)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
