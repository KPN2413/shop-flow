import { useEffect, useState, useCallback } from 'react'
import { Warehouse, Save } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface InventoryRow {
  product_id: string
  stock: number
  updated_at: string
  products: { id: string; title: string; slug: string; status: string }
}

export function AdminInventory() {
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const fetchInventory = useCallback(async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*, products(id, title, slug, status)')
      .order('updated_at', { ascending: false })
    setInventory((data as InventoryRow[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const handleSave = async (productId: string) => {
    const newStock = edits[productId]
    if (newStock === undefined || isNaN(newStock) || newStock < 0) {
      toast.error('Invalid stock value')
      return
    }

    setSaving(prev => ({ ...prev, [productId]: true }))
    const { data: { session } } = await supabase.auth.getSession()

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    try {
      const res = await window.fetch(`${supabaseUrl}/functions/v1/api-admin/inventory/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ stock: newStock }),
      })

      if (res.ok) {
        toast.success('Stock updated!')
        setEdits(prev => { const n = { ...prev }; delete n[productId]; return n })
        fetchInventory()
      } else {
        const r = await res.json()
        toast.error(r.error || 'Failed to update stock')
      }
    } catch {
      // Fallback: direct Supabase update (works if user is admin by RLS)
      const { error } = await supabase
        .from('inventory')
        .upsert({ product_id: productId, stock: newStock, updated_at: new Date().toISOString() }, { onConflict: 'product_id' })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Stock updated!')
        setEdits(prev => { const n = { ...prev }; delete n[productId]; return n })
        fetchInventory()
      }
    }
    setSaving(prev => ({ ...prev, [productId]: false }))
  }

  return (
    <AdminLayout title="Inventory" breadcrumbs={[{ label: 'Inventory' }]}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Update stock levels for all products</p>
      </div>

      <div className="shopflow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Product</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Current Stock</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">New Stock</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="py-3 px-4"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Warehouse className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">No inventory records. Add products first.</p>
                </td>
              </tr>
            ) : inventory.map(row => {
              const isLow = row.stock <= 5 && row.stock > 0
              const isOut = row.stock === 0
              return (
                <tr key={row.product_id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium">{row.products?.title}</div>
                    <div className="text-xs text-muted-foreground">{row.products?.slug}</div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <Badge className={row.products?.status === 'ACTIVE' ? 'badge-status-active' : 'badge-status-draft'}>
                      {row.products?.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-foreground'}`}>
                      {row.stock}
                    </span>
                    {isLow && <span className="ml-2 text-xs text-amber-600">Low</span>}
                    {isOut && <span className="ml-2 text-xs text-destructive">Out of stock</span>}
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      min="0"
                      placeholder={`${row.stock}`}
                      value={edits[row.product_id] ?? ''}
                      onChange={e => setEdits(prev => ({ ...prev, [row.product_id]: parseInt(e.target.value) || 0 }))}
                      className="w-24"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      disabled={edits[row.product_id] === undefined || saving[row.product_id]}
                      onClick={() => handleSave(row.product_id)}
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {saving[row.product_id] ? '...' : 'Save'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
