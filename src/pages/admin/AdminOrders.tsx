import { useEffect, useState } from 'react'
import { ShoppingBag, Eye, Search } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { formatINR, formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import type { Order, OrderItem } from '../../lib/database.types'

const statusClass: Record<string, string> = {
  CREATED: 'order-status-created',
  PAID: 'order-status-paid',
  FAILED: 'order-status-failed',
  CANCELLED: 'order-status-cancelled',
  FULFILLED: 'order-status-fulfilled',
}

export function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      setOrders(data || [])
      setLoading(false)
    }
    fetch()
  }, [page])

  const openOrder = async (order: Order) => {
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    setSelected({ ...order, order_items: data || [] })
  }

  return (
    <AdminLayout title="Orders" breadcrumbs={[{ label: 'Orders' }]}>
      <div className="shopflow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Payment</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-3 px-4"><div className="h-8 bg-secondary rounded animate-pulse" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{order.profiles?.full_name || 'Unknown'}</td>
                  <td className="py-3 px-4 font-semibold">{formatINR(order.total_paise)}</td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <Badge className={`text-xs ${statusClass[order.status] || ''}`}>{order.status}</Badge>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">{order.payment_method}</Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">{formatDate(order.created_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openOrder(order)}><Eye className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={orders.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selected?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{selected.profiles?.full_name || 'Unknown'}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span>{formatDate(selected.created_at)}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span><Badge className={`text-xs ${statusClass[selected.status]}`}>{selected.status}</Badge></div>
                <div><span className="text-muted-foreground">Payment:</span> <Badge variant="outline" className="text-xs ml-1">{selected.payment_method}</Badge></div>
              </div>
              <Separator />
              <div className="space-y-2">
                {selected.order_items.map((item: OrderItem) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="flex-1 pr-4">{item.title_snapshot} × {item.qty}</span>
                    <span className="font-medium">{formatINR(item.price_paise_snapshot * item.qty)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="price-tag">{formatINR(selected.total_paise)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
