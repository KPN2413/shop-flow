import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { User, Package, Edit, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase, formatINR } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/OrderStatusBadge'
import { toast } from 'react-hot-toast'
import type { OrderWithItems } from '@/lib/database.types'

export function AccountPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { navigate({ to: '/login' }); return }
    fetchOrders()
  }, [user])

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
  }, [profile])

  async function fetchOrders() {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders((data as OrderWithItems[]) ?? [])
    setLoadingOrders(false)
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, full_name: fullName, phone: phone || null, role: profile?.role || 'USER' })
    if (error) toast.error(error.message)
    else {
      toast.success('Profile updated!')
      await refreshProfile()
      setEditing(false)
    }
    setSaving(false)
  }

  if (!user) return null

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>My Account</h1>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>My Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start shopping to see your orders here.</p>
                  <Link to="/shop" className="mt-4 inline-block">
                    <Button style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>Shop Now</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="font-semibold price-inr text-sm">{formatINR(order.total_paise)}</TableCell>
                          <TableCell><OrderStatusBadge status={order.status as any} /></TableCell>
                          <TableCell><PaymentStatusBadge status={order.payment_status as any} /></TableCell>
                          <TableCell>
                            <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>
                              <Button variant="ghost" size="sm" className="text-xs">View</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>Profile Information</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                  <Button size="sm" className="gap-1.5" disabled={saving} onClick={handleSaveProfile}
                    style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
                    <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  {editing ? (
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  ) : (
                    <p className="text-sm font-medium py-2">{profile?.full_name || '—'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm font-medium py-2">{user.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  {editing ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                  ) : (
                    <p className="text-sm font-medium py-2">{profile?.phone || '—'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <div className="py-2">
                    <Badge variant="outline" className="capitalize">
                      {profile?.role?.toLowerCase() || 'user'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
