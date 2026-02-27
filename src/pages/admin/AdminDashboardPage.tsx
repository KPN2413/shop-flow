import { useEffect, useState } from 'react'
import { ShoppingBag, Package, Users, TrendingUp, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, formatINR } from '@/lib/supabase'

interface Stats {
  totalOrders: number
  totalRevenuePaise: number
  totalProducts: number
  totalUsers: number
  recentOrders: Array<{
    id: string
    created_at: string
    total_paise: number
    status: string
    profiles: { full_name: string | null } | null
  }>
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [orders, products, profiles, recentOrders] = await Promise.all([
        supabase.from('orders').select('total_paise, status', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('profiles').select('user_id', { count: 'exact' }),
        supabase
          .from('orders')
          .select('id, created_at, total_paise, status, user_id')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const paidOrders = orders.data?.filter(o => o.status === 'PAID' || o.status === 'FULFILLED') ?? []
      const totalRevenuePaise = paidOrders.reduce((s, o) => s + o.total_paise, 0)

      setStats({
        totalOrders: orders.count ?? 0,
        totalRevenuePaise,
        totalProducts: products.count ?? 0,
        totalUsers: profiles.count ?? 0,
        recentOrders: (recentOrders.data ?? []).map(o => ({ ...o, profiles: null })),
      })
      setIsLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats ? formatINR(stats.totalRevenuePaise) : '—',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders ?? '—',
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Products',
      value: stats?.totalProducts ?? '—',
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Customers',
      value: stats?.totalUsers ?? '—',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome to ShopFlow Admin</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold mt-1 price-inr`} style={{ fontFamily: 'var(--font-heading)' }}>
                    {isLoading ? <span className="block h-7 w-24 bg-muted rounded animate-pulse" /> : card.value}
                  </p>
                </div>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base" style={{ fontFamily: 'var(--font-heading)' }}>Recent Orders</CardTitle>
          <a href="/admin/orders" className="text-sm text-secondary flex items-center gap-1 hover:underline">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (stats?.recentOrders.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold price-inr">{formatINR(order.total_paise)}</p>
                    <span className={`text-xs font-medium ${
                      order.status === 'PAID' || order.status === 'FULFILLED' ? 'text-green-600' :
                      order.status === 'CREATED' ? 'text-blue-600' : 'text-red-600'
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
