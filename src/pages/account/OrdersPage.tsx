import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Package, ChevronRight, Eye, MapPin, ExternalLink } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { formatINR, formatDate } from '../../lib/format'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import type { Order, OrderItem } from '../../lib/database.types'

const statusClass: Record<string, string> = {
  CREATED: 'order-status-created',
  PAID: 'order-status-paid',
  FAILED: 'order-status-failed',
  CANCELLED: 'order-status-cancelled',
  FULFILLED: 'order-status-fulfilled',
}

export function OrdersPage() {
  const { user, isLoading: loading } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<(Order & { order_items: OrderItem[] }) | null>(null)

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/login' })
  }, [user, loading, navigate])

  useEffect(() => {
    if (loading) return
    if (!user) { setOrdersLoading(false); return }
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) || [])
        setOrdersLoading(false)
      })
  }, [user, loading])

  const openOrder = async (order: Order) => {
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
    setSelectedOrder({ ...order, order_items: data || [] })
  }

  if (loading || ordersLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-secondary rounded-xl" />)}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
        <Link to="/account" className="hover:text-foreground">Account</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">My Orders</span>
      </div>
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
          <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Your orders will appear here after checkout</p>
          <Button asChild><Link to="/shop">Start Shopping</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="shopflow-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <Badge className={`text-xs ${statusClass[order.status] || ''}`}>{order.status}</Badge>
                    <Badge variant="outline" className="text-xs">{order.payment_method}</Badge>
                  </div>
                  <div className="font-bold price-tag text-lg">{formatINR(order.total_paise)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Track
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openOrder(order)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" />Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusClass[selectedOrder.status] || ''}>{selectedOrder.status}</Badge>
                <Badge variant="outline">{selectedOrder.payment_method}</Badge>
                <Badge variant="outline">{selectedOrder.payment_status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(selectedOrder.created_at)}</div>

              {/* Shipping address */}
              {(selectedOrder as any).shipping_address && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 text-sm font-medium">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Delivery Address
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed pl-5">
                      {(() => {
                        const a = (selectedOrder as any).shipping_address
                        return [a.full_name, a.phone && `+91 ${a.phone}`, a.line1, a.line2, `${a.city}, ${a.state} - ${a.pincode}`].filter(Boolean).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))
                      })()}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-2">
                {selectedOrder.order_items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="flex-1 pr-4">{item.title_snapshot} × {item.qty}</span>
                    <span className="font-medium">{formatINR(item.price_paise_snapshot * item.qty)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="price-tag">{formatINR(selectedOrder.total_paise)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
