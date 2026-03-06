import { useEffect, useState } from 'react'
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { formatINR, formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface Coupon {
  id: string
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  min_order_paise: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = {
  code: '',
  type: 'PERCENT' as 'PERCENT' | 'FLAT',
  value: '',
  min_order_rupees: '',
  max_uses: '',
  expires_at: '',
}

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function fetchCoupons() {
    setLoading(true)
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons((data as Coupon[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCoupons() }, [])

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    const code = form.code.trim().toUpperCase()
    if (!code) { setFormError('Coupon code is required'); return }
    if (!/^[A-Z0-9_-]+$/.test(code)) { setFormError('Code can only contain letters, numbers, _ and -'); return }
    const value = parseInt(form.value)
    if (!value || value <= 0) { setFormError('Value must be greater than 0'); return }
    if (form.type === 'PERCENT' && value > 100) { setFormError('Percentage cannot exceed 100'); return }

    setSaving(true)
    const payload = {
      code,
      type: form.type,
      value: form.type === 'FLAT' ? Math.round(parseFloat(form.value) * 100) : value,
      min_order_paise: form.min_order_rupees ? Math.round(parseFloat(form.min_order_rupees) * 100) : 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      is_active: true,
    }

    const { error } = await supabase.from('coupons').insert(payload)
    setSaving(false)

    if (error) {
      if (error.code === '23505') setFormError('A coupon with this code already exists')
      else setFormError(error.message)
      return
    }

    toast.success('Coupon created!')
    setDialogOpen(false)
    await fetchCoupons()
  }

  async function toggleActive(coupon: Coupon) {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id)
    if (error) { toast.error('Failed to update coupon'); return }
    toast.success(coupon.is_active ? 'Coupon disabled' : 'Coupon enabled')
    await fetchCoupons()
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return
    const { error } = await supabase.from('coupons').delete().eq('id', coupon.id)
    if (error) { toast.error('Failed to delete coupon'); return }
    toast.success('Coupon deleted')
    await fetchCoupons()
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tag className="w-6 h-6" /> Coupons
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create and manage discount codes
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> New Coupon
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Coupons', value: coupons.length },
            { label: 'Active', value: coupons.filter(c => c.is_active).length },
            { label: 'Total Uses', value: coupons.reduce((s, c) => s + c.uses_count, 0) },
          ].map(stat => (
            <div key={stat.label} className="shopflow-card p-4 text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-secondary rounded-xl" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <Tag className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-semibold">No coupons yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first discount code</p>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Coupon</Button>
          </div>
        ) : (
          <div className="shopflow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Min Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uses</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon, i) => (
                  <tr key={coupon.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-3 font-mono font-semibold">{coupon.code}</td>
                    <td className="px-4 py-3">
                      {coupon.type === 'PERCENT'
                        ? <span className="text-primary font-medium">{coupon.value}% off</span>
                        : <span className="text-primary font-medium">{formatINR(coupon.value)} off</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {coupon.min_order_paise > 0 ? formatINR(coupon.min_order_paise) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {coupon.uses_count}
                      {coupon.max_uses !== null && ` / ${coupon.max_uses}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at) < new Date()
                          ? <span className="text-destructive">Expired</span>
                          : formatDate(coupon.expires_at).split(',')[0]
                        : 'Never'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={coupon.is_active
                        ? 'bg-green-100 text-green-700 border-0'
                        : 'bg-secondary text-muted-foreground'
                      }>
                        {coupon.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(coupon)}
                          title={coupon.is_active ? 'Disable coupon' : 'Enable coupon'}
                        >
                          {coupon.is_active
                            ? <ToggleRight className="w-4 h-4 text-primary" />
                            : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          }
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(coupon)}
                          title="Delete coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Code */}
            <div className="space-y-1.5">
              <Label htmlFor="code">Coupon Code <span className="text-destructive">*</span></Label>
              <Input
                id="code"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE10"
                className="font-mono uppercase"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">Letters, numbers, _ and - only</p>
            </div>

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount Type <span className="text-destructive">*</span></Label>
                <div className="flex rounded-md border overflow-hidden">
                  {(['PERCENT', 'FLAT'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.type === t
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      }`}
                      onClick={() => setForm(f => ({ ...f, type: t, value: '' }))}
                    >
                      {t === 'PERCENT' ? '% Off' : '₹ Off'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">
                  {form.type === 'PERCENT' ? 'Percentage (1–100)' : 'Amount (₹)'}
                  <span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="value"
                  type="number"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === 'PERCENT' ? '10' : '50'}
                  min={1}
                  max={form.type === 'PERCENT' ? 100 : undefined}
                />
              </div>
            </div>

            {/* Min order */}
            <div className="space-y-1.5">
              <Label htmlFor="min_order">
                Minimum Order (₹)
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <Input
                id="min_order"
                type="number"
                value={form.min_order_rupees}
                onChange={e => setForm(f => ({ ...f, min_order_rupees: e.target.value }))}
                placeholder="0"
                min={0}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Max uses */}
              <div className="space-y-1.5">
                <Label htmlFor="max_uses">
                  Max Uses
                  <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                </Label>
                <Input
                  id="max_uses"
                  type="number"
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                  min={1}
                />
              </div>

              {/* Expiry */}
              <div className="space-y-1.5">
                <Label htmlFor="expires_at">
                  Expiry Date
                  <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                </Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </p>
            )}

            <Separator />

            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Creating…' : 'Create Coupon'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
