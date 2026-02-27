import { useEffect, useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, formatINR } from '@/lib/supabase'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/OrderStatusBadge'
import type { OrderWithItems } from '@/lib/database.types'

interface OrderWithProfile extends OrderWithItems {
  profiles?: { full_name: string | null; phone: string | null } | null
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProfile | null>(null)

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders((data as OrderWithProfile[]) ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const filtered = orders.filter(o => {
    const matchSearch = o.id.includes(searchQ) || (o.profiles?.full_name?.toLowerCase().includes(searchQ.toLowerCase()) ?? false)
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} total orders</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search by ID or name..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="CREATED">Created</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="FULFILLED">Fulfilled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(order)}>
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                  <TableCell className="text-sm">{order.profiles?.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="font-semibold price-inr text-sm">{formatINR(order.total_paise)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{order.payment_method}</Badge>
                  </TableCell>
                  <TableCell><OrderStatusBadge status={order.status as any} /></TableCell>
                  <TableCell><PaymentStatusBadge status={order.payment_status as any} /></TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>Order Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Order ID</p>
                    <p className="font-mono mt-1 break-all">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Date</p>
                    <p className="mt-1">{new Date(selectedOrder.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Customer</p>
                    <p className="mt-1">{selectedOrder.profiles?.full_name || '—'}</p>
                    {selectedOrder.profiles?.phone && <p className="text-xs text-muted-foreground">{selectedOrder.profiles.phone}</p>}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Payment Method</p>
                    <p className="mt-1">{selectedOrder.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Order Status</p>
                    <div className="mt-1"><OrderStatusBadge status={selectedOrder.status as any} /></div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Payment Status</p>
                    <div className="mt-1"><PaymentStatusBadge status={selectedOrder.payment_status as any} /></div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                        <span className="font-medium">{item.title_snapshot} × {item.qty}</span>
                        <span className="font-semibold price-inr">{formatINR(item.price_paise_snapshot * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold mt-3 pt-3 border-t">
                    <span>Total</span>
                    <span className="price-inr">{formatINR(selectedOrder.total_paise)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
