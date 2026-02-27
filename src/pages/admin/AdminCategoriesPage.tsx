import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase, generateSlug } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface Category { id: string; name: string; slug: string; created_at: string }

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  function openCreate() {
    setEditingId(null)
    setName('')
    setSlug('')
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setName(cat.name)
    setSlug(cat.slug)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const finalSlug = slug || generateSlug(name)

    if (editingId) {
      const { error } = await supabase.from('categories').update({ name: name.trim(), slug: finalSlug }).eq('id', editingId)
      if (error) toast.error(error.message)
      else toast.success('Category updated!')
    } else {
      const { error } = await supabase.from('categories').insert({ name: name.trim(), slug: finalSlug })
      if (error) toast.error(error.message)
      else toast.success('Category created!')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchCategories()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Products in this category will lose their category.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Category deleted'); fetchCategories() }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={openCreate} className="gap-2" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  No categories yet. Create one to start organizing products.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(cat.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>
              {editingId ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!editingId) setSlug(generateSlug(e.target.value))
                }}
                placeholder="e.g. Electronics"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated"
              />
              <p className="text-xs text-muted-foreground">Used in URLs. Auto-generated from name.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
