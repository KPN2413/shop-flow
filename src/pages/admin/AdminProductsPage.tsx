import { useEffect, useState } from 'react'
import { Plus, Pencil, Archive, Search, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase, formatINR, rupeesToPaise, paiseTOrupees, generateSlug } from '@/lib/supabase'
import { ProductStatusBadge } from '@/components/shared/OrderStatusBadge'
import { toast } from 'react-hot-toast'
import type { ProductWithCategory } from '@/lib/database.types'

interface Category { id: string; name: string; slug: string }

interface ProductFormData {
  title: string
  slug: string
  description: string
  price_rupees: string
  status: string
  visibility: string
  category_id: string
  image_url: string
  stock: string
}

const defaultForm: ProductFormData = {
  title: '', slug: '', description: '', price_rupees: '',
  status: 'DRAFT', visibility: 'HIDDEN', category_id: '', image_url: '', stock: '0',
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, categories(*), inventory(stock)')
      .order('created_at', { ascending: false })
    setProducts((data as ProductWithCategory[]) ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data ?? []))
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(product: ProductWithCategory) {
    setEditingId(product.id)
    setForm({
      title: product.title,
      slug: product.slug,
      description: product.description || '',
      price_rupees: String(paiseTOrupees(product.price_paise)),
      status: product.status,
      visibility: product.visibility,
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      stock: String(product.inventory?.stock ?? 0),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title || !form.price_rupees) {
      toast.error('Title and price are required')
      return
    }
    setSaving(true)
    const pricePaise = rupeesToPaise(parseFloat(form.price_rupees))
    const slug = form.slug || generateSlug(form.title)

    if (editingId) {
      const { error } = await supabase.from('products').update({
        title: form.title,
        slug,
        description: form.description || null,
        price_paise: pricePaise,
        status: form.status,
        visibility: form.visibility,
        category_id: form.category_id || null,
        image_url: form.image_url || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId)

      if (!error) {
        // Update inventory
        await supabase.from('inventory').upsert({
          product_id: editingId,
          stock: parseInt(form.stock, 10),
          updated_at: new Date().toISOString(),
        })
        toast.success('Product updated!')
      } else {
        toast.error(error.message)
      }
    } else {
      const { data, error } = await supabase.from('products').insert({
        title: form.title,
        slug,
        description: form.description || null,
        price_paise: pricePaise,
        status: form.status,
        visibility: form.visibility,
        category_id: form.category_id || null,
        image_url: form.image_url || null,
      }).select().single()

      if (!error && data) {
        await supabase.from('inventory').insert({
          product_id: data.id,
          stock: parseInt(form.stock, 10),
        })
        toast.success('Product created!')
      } else {
        toast.error(error?.message ?? 'Failed to create product')
      }
    }

    setSaving(false)
    setDialogOpen(false)
    fetchProducts()
  }

  async function handleArchive(productId: string) {
    await supabase.from('products').update({ status: 'ARCHIVED' }).eq('id', productId)
    toast.success('Product archived')
    fetchProducts()
  }

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} total products</p>
        </div>
        <Button onClick={openCreate} className="gap-2" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
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
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[180px]">{product.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.categories?.name || '—'}</TableCell>
                  <TableCell className="font-semibold text-sm price-inr">{formatINR(product.price_paise)}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${(product.inventory?.stock ?? 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {product.inventory?.stock ?? 0}
                    </span>
                  </TableCell>
                  <TableCell><ProductStatusBadge status={product.status} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {product.visibility}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View product">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {product.status !== 'ARCHIVED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleArchive(product.id)}
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>
              {editingId ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  setForm(f => ({ ...f, title: e.target.value, slug: !editingId ? generateSlug(e.target.value) : f.slug }))
                }}
                placeholder="Product title"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price_rupees}
                onChange={(e) => setForm(f => ({ ...f, price_rupees: e.target.value }))}
                placeholder="e.g. 199.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => setForm(f => ({ ...f, visibility: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIDDEN">Hidden</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Product description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
