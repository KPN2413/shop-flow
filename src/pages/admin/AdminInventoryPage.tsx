import { useEffect, useState } from 'react'
import { Save, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase, formatINR } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface InventoryRow {
  id: string
  title: string
  slug: string
  price_paise: number
  status: string
  stock: number
  newStock?: string
}

export function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  async function fetchInventory() {
    const { data } = await supabase
      .from('products')
      .select('id, title, slug, price_paise, status, inventory(stock)')
      .neq('status', 'ARCHIVED')
      .order('title')
    const rows: InventoryRow[] = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price_paise: p.price_paise,
      status: p.status,
      stock: p.inventory?.stock ?? 0,
      newStock: undefined,
    }))
    setItems(rows)
    setIsLoading(false)
  }

  useEffect(() => { fetchInventory() }, [])

  function updateNewStock(id: string, value: string) {
    setItems(items => items.map(i => i.id === id ? { ...i, newStock: value } : i))
  }

  async function saveStock(item: InventoryRow) {
    if (item.newStock === undefined || item.newStock === '') return
    const newVal = parseInt(item.newStock, 10)
    if (isNaN(newVal) || newVal < 0) { toast.error('Invalid stock value'); return }
    setSaving(item.id)
    const { error } = await supabase
      .from('inventory')
      .upsert({ product_id: item.id, stock: newVal, updated_at: new Date().toISOString() })
    if (error) toast.error(error.message)
    else {
      toast.success(`Stock updated for ${item.title}`)
      setItems(items => items.map(i => i.id === item.id ? { ...i, stock: newVal, newStock: undefined } : i))
    }
    setSaving(null)
  }

  const filtered = items.filter(i => i.title.toLowerCase().includes(searchQ.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage stock levels for all products</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search products..." className="pl-9 max-w-sm" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>New Stock</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.slug}</p>
                  </TableCell>
                  <TableCell className="font-semibold text-sm price-inr">{formatINR(item.price_paise)}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold text-sm ${item.stock === 0 ? 'text-red-600' : item.stock <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                      {item.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      className="w-24 h-8"
                      placeholder={String(item.stock)}
                      value={item.newStock ?? ''}
                      onChange={(e) => updateNewStock(item.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveStock(item) }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={item.newStock !== undefined && item.newStock !== '' ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-1.5 h-8"
                      disabled={saving === item.id || !item.newStock}
                      onClick={() => saveStock(item)}
                      style={item.newStock !== undefined && item.newStock !== '' ? { backgroundColor: 'hsl(var(--secondary))', color: 'white' } : {}}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving === item.id ? 'Saving...' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
