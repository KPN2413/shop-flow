import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { slugify } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import type { Category } from '../../lib/database.types'
import { formatDate } from '../../lib/format'
import toast from 'react-hot-toast'

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const openCreate = () => { setEditing(null); setName(''); setSlug(''); setDialogOpen(true) }
  const openEdit = (cat: Category) => { setEditing(cat); setName(cat.name); setSlug(cat.slug); setDialogOpen(true) }

  const handleNameChange = (n: string) => {
    setName(n)
    if (!editing) setSlug(slugify(n))
  }

  const handleSave = async () => {
    if (!name || !slug) { toast.error('Name and slug required'); return }
    setSaving(true)

    if (editing) {
      const { error } = await supabase.from('categories').update({ name, slug }).eq('id', editing.id)
      if (error) toast.error(error.message)
      else { toast.success('Category updated!'); fetchCategories(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('categories').insert({ name, slug })
      if (error) toast.error(error.message)
      else { toast.success('Category created!'); fetchCategories(); setDialogOpen(false) }
    }
    setSaving(false)
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? Products in this category will be uncategorized.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) toast.error(error.message)
    else { toast.success('Category deleted'); fetchCategories() }
  }

  return (
    <AdminLayout title="Categories" breadcrumbs={[{ label: 'Categories' }]}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{categories.length} categories</p>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Category</Button>
      </div>

      <div className="shopflow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Slug</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Created</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="py-3 px-4"><div className="h-8 bg-secondary rounded animate-pulse" /></td></tr>
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">No categories yet</p>
                </td>
              </tr>
            ) : categories.map(cat => (
              <tr key={cat.id} className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium">{cat.name}</td>
                <td className="py-3 px-4 text-muted-foreground font-mono text-xs hidden sm:table-cell">{cat.slug}</td>
                <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{formatDate(cat.created_at)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(cat)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Electronics" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="electronics" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
