import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Archive, Package, Search } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { formatINR, paiseToRupees, rupeesToPaise, slugify } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import type { Product, Category } from '../../lib/database.types'
import toast from 'react-hot-toast'

interface ProductForm {
  title: string
  slug: string
  description: string
  price: string
  status: string
  visibility: string
  category_id: string
  image_url: string
}

const defaultForm: ProductForm = {
  title: '', slug: '', description: '', price: '', status: 'DRAFT', visibility: 'HIDDEN', category_id: '', image_url: ''
}

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug), inventory(stock)')
      .neq('status', 'ARCHIVED')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) query = query.ilike('title', `%${search}%`)
    const { data } = await query
    setProducts((data as Product[]) || [])
    setLoading(false)
  }, [search, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  const openCreate = () => { setEditingProduct(null); setForm(defaultForm); setDialogOpen(true) }
  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      title: product.title,
      slug: product.slug,
      description: product.description || '',
      price: paiseToRupees(product.price_paise),
      status: product.status,
      visibility: product.visibility,
      category_id: product.category_id || '',
      image_url: product.image_url || '',
    })
    setDialogOpen(true)
  }

  const handleTitleChange = (title: string) => {
    setForm(prev => ({ ...prev, title, slug: editingProduct ? prev.slug : slugify(title) }))
  }

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.price) {
      toast.error('Title, slug, and price are required')
      return
    }
    setSaving(true)

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      price_paise: rupeesToPaise(form.price),
      status: form.status,
      visibility: form.visibility,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
    }

    try {
      let result
      if (editingProduct) {
        result = await api.updateProduct(editingProduct.id, payload)
      } else {
        result = await api.createProduct(payload)
      }
      if (!result.ok) {
        toast.error(result.data?.error || 'Failed to save product')
      } else {
        toast.success(editingProduct ? 'Product updated!' : 'Product created!')
        setDialogOpen(false)
        fetchProducts()
      }
    } catch {
      toast.error('Something went wrong')
    }
    setSaving(false)
  }

  const handleArchive = async (product: Product) => {
    if (!confirm(`Archive "${product.title}"? It will be hidden from the store.`)) return
    const result = await api.updateProduct(product.id, { status: 'ARCHIVED' })
    if (result.ok) {
      toast.success('Product archived')
      fetchProducts()
    } else {
      toast.error(result.data?.error || 'Failed to archive')
    }
  }

  const statusBadge = (status: string) => {
    const cls = status === 'ACTIVE' ? 'badge-status-active' : status === 'DRAFT' ? 'badge-status-draft' : 'badge-status-archived'
    return <Badge className={`text-xs ${cls}`}>{status}</Badge>
  }

  return (
    <AdminLayout title="Products" breadcrumbs={[{ label: 'Products' }]}>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
      </div>

      <div className="shopflow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Price</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-4"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground">No products found</p>
                  </td>
                </tr>
              ) : products.map(product => (
                <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {product.image_url
                          ? <img src={product.image_url} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground/40" /></div>
                        }
                      </div>
                      <div>
                        <div className="font-medium line-clamp-1">{product.title}</div>
                        <div className="text-xs text-muted-foreground">{product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{(product as any).categories?.name || '—'}</td>
                  <td className="py-3 px-4 font-semibold">{formatINR(product.price_paise)}</td>
                  <td className="py-3 px-4 hidden sm:table-cell">{statusBadge(product.status)}</td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className={(product as any).inventory?.[0]?.stock === 0 ? 'text-destructive font-medium' : ''}>
                      {(product as any).inventory?.[0]?.stock ?? 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleArchive(product)} title="Archive">
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={products.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="Product title" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="auto-generated-slug" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Product description..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹) *</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} placeholder="199.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id || 'none'} onValueChange={v => setForm(prev => ({ ...prev, category_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={v => setForm(prev => ({ ...prev, visibility: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIDDEN">Hidden</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))} placeholder="https://example.com/image.jpg" />
              {form.image_url && (
                <div className="mt-2 h-20 w-20 rounded-lg overflow-hidden border bg-muted">
                  <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
