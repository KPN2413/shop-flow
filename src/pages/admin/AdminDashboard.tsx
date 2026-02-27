import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Package, Tag, Warehouse, ShoppingBag, TrendingUp, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { formatINR } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface Stats {
  products: number
  categories: number
  orders: number
  revenue: number
  lowStock: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0, orders: 0, revenue: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id,total_paise').neq('status', 'CANCELLED'),
      supabase.from('inventory').select('stock').lte('stock', 5).gt('stock', 0),
    ]).then(([products, cats, orders, lowStock]) => {
      const revenue = (orders.data || []).reduce((sum, o) => sum + (o.total_paise || 0), 0)
      setStats({
        products: products.count || 0,
        categories: cats.count || 0,
        orders: orders.data?.length || 0,
        revenue,
        lowStock: lowStock.data?.length || 0,
      })
      setLoading(false)
    })
  }, [])

  async function handleSeedData() {
    if (!confirm('This will insert 3 categories and 10 demo products. Existing data will not be deleted. Continue?')) return
    setSeeding(true)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    try {
      // Try edge function first, fall back to direct supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/api-admin/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(`Seeded: ${result.data?.categories} categories, ${result.data?.products} products!`)
        // Refresh stats
        window.location.reload()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Seed failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Seed request failed')
    }
    setSeeding(false)
  }

  const cards = [
    { label: 'Active Products', value: stats.products, icon: Package, href: '/admin/products', color: 'text-blue-600 bg-blue-50' },
    { label: 'Categories', value: stats.categories, icon: Tag, href: '/admin/categories', color: 'text-purple-600 bg-purple-50' },
    { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, href: '/admin/orders', color: 'text-green-600 bg-green-50' },
    { label: 'Revenue', value: formatINR(stats.revenue), icon: TrendingUp, href: '/admin/orders', color: 'text-orange-600 bg-orange-50', isText: true },
  ]

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <Link key={card.label} to={card.href} className="shopflow-card p-5 block hover:no-underline hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`font-bold ${card.isText ? 'text-xl' : 'text-3xl'} text-foreground`}>
                {loading ? <div className="h-8 bg-muted rounded animate-pulse w-16" /> : card.value}
              </div>
            </Link>
          ))}
        </div>

        {/* Low stock alert */}
        {stats.lowStock > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-800">{stats.lowStock} product(s)</span>
              <span className="text-amber-700"> have low stock (≤5 units). </span>
              <Link to="/admin/inventory" className="text-amber-800 underline font-medium">Update inventory →</Link>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="shopflow-card p-6">
          <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" asChild><Link to="/admin/products">Manage Products</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/categories">Manage Categories</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/inventory">Update Stock</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/orders">View Orders</Link></Button>
          </div>
        </div>

        {/* Seed data */}
        <div className="shopflow-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Demo Data
              </h2>
              <p className="text-sm text-muted-foreground">
                Insert 3 categories (Electronics, Fashion, Home & Kitchen) and 10 demo products with inventory.
                Use this to quickly populate the store for testing.
              </p>
            </div>
            <Button
              onClick={handleSeedData}
              disabled={seeding}
              className="shrink-0"
              style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}
            >
              {seeding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Seeding...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Seed Demo Data</>
              )}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>To make a user an Admin:</strong> In Supabase Dashboard → Table Editor → profiles → find user row → change <code>role</code> to <code>ADMIN</code>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
