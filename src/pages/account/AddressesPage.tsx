import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronRight, MapPin, Plus, Edit2, Trash2,
  Star, Home, Briefcase, MoreHorizontal, Check, AlertCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Separator } from '../../components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Address {
  id: string
  user_id: string
  label: string
  full_name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  is_default: boolean
  created_at: string
}

type AddressForm = Omit<Address, 'id' | 'user_id' | 'created_at'>

const EMPTY_FORM: AddressForm = {
  label: 'Home',
  full_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  is_default: false,
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="w-3.5 h-3.5" />,
  Work: <Briefcase className="w-3.5 h-3.5" />,
  Other: <MoreHorizontal className="w-3.5 h-3.5" />,
}

// ── Form validation ───────────────────────────────────────────────────────────
function validateForm(form: AddressForm): Partial<Record<keyof AddressForm, string>> {
  const errors: Partial<Record<keyof AddressForm, string>> = {}
  if (!form.full_name.trim()) errors.full_name = 'Name is required'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, '')))
    errors.phone = 'Enter a valid 10-digit Indian mobile number'
  if (!form.line1.trim()) errors.line1 = 'Address line 1 is required'
  if (!form.city.trim()) errors.city = 'City is required'
  if (!form.state) errors.state = 'State is required'
  if (!form.pincode.trim()) errors.pincode = 'Pincode is required'
  else if (!/^\d{6}$/.test(form.pincode)) errors.pincode = 'Enter a valid 6-digit pincode'
  return errors
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AddressesPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/login' })
  }, [user, authLoading, navigate])

  async function fetchAddresses() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    setAddresses((data as Address[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchAddresses()
  }, [user])

  // ── Open dialog ─────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      is_default: addresses.length === 0,
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(addr: Address) {
    setEditingId(addr.id)
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    })
    setErrors({})
    setDialogOpen(true)
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)

    const payload = {
      user_id: user!.id,
      label: form.label,
      full_name: form.full_name.trim(),
      phone: form.phone.replace(/\s/g, ''),
      line1: form.line1.trim(),
      line2: form.line2?.trim() || null,
      city: form.city.trim(),
      state: form.state,
      pincode: form.pincode.trim(),
      is_default: form.is_default,
    }

    // If setting as default, unset others first
    if (form.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user!.id)
        .neq('id', editingId ?? '00000000-0000-0000-0000-000000000000')
    }

    let error
    if (editingId) {
      ;({ error } = await supabase.from('addresses').update(payload).eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('addresses').insert(payload))
    }

    setSaving(false)

    if (error) { toast.error('Failed to save address'); return }

    toast.success(editingId ? 'Address updated!' : 'Address saved!')
    setDialogOpen(false)
    await fetchAddresses()
  }

  // ── Set default ─────────────────────────────────────────────────────────────
  async function setDefault(addr: Address) {
    if (addr.is_default) return
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id)
    await supabase.from('addresses').update({ is_default: true }).eq('id', addr.id)
    toast.success('Default address updated')
    await fetchAddresses()
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(addr: Address) {
    if (!confirm('Delete this address?')) return
    const { error } = await supabase.from('addresses').delete().eq('id', addr.id)
    if (error) { toast.error('Failed to delete address'); return }
    toast.success('Address deleted')
    await fetchAddresses()
  }

  // ── Field helper ────────────────────────────────────────────────────────────
  function field(key: keyof AddressForm) {
    return {
      value: String(form[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [key]: e.target.value }))
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
      },
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (authLoading || loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-secondary rounded-xl" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <Link to="/account" className="hover:text-foreground transition-colors">Account</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Saved Addresses</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Saved Addresses</h1>
        {addresses.length < 5 && (
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Address
          </Button>
        )}
      </div>

      {/* Empty state */}
      {addresses.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <MapPin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-semibold text-lg">No saved addresses</p>
          <p className="text-muted-foreground text-sm mt-1 mb-5">Save an address for faster checkout</p>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> Add Address</Button>
        </div>
      )}

      {/* Address list */}
      <div className="space-y-3">
        {addresses.map(addr => (
          <div key={addr.id} className={`shopflow-card p-5 transition-all ${addr.is_default ? 'ring-2 ring-primary/30' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Label + default badge */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">
                    {LABEL_ICONS[addr.label] ?? <MapPin className="w-3.5 h-3.5" />}
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 gap-1">
                      <Check className="w-3 h-3" /> Default
                    </Badge>
                  )}
                </div>

                {/* Address details */}
                <p className="font-semibold text-sm">{addr.full_name}</p>
                <p className="text-sm text-muted-foreground">+91 {addr.phone}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {addr.line1}{addr.line2 && `, ${addr.line2}`}<br />
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(addr)} title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(addr)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Set as default */}
            {!addr.is_default && (
              <button
                className="mt-3 text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                onClick={() => setDefault(addr)}
              >
                <Star className="w-3 h-3" /> Set as default
              </button>
            )}
          </div>
        ))}
      </div>

      {addresses.length >= 5 && (
        <p className="text-xs text-muted-foreground text-center mt-4">Maximum 5 addresses allowed</p>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Label selector */}
            <div className="space-y-1.5">
              <Label>Label</Label>
              <div className="flex gap-2">
                {['Home', 'Work', 'Other'].map(lbl => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, label: lbl }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.label === lbl
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    {LABEL_ICONS[lbl]} {lbl}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-name">Full Name <span className="text-destructive">*</span></Label>
                <Input id="a-name" placeholder="Rahul Sharma" {...field('full_name')} />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-phone">Phone <span className="text-destructive">*</span></Label>
                <Input id="a-phone" placeholder="9876543210" maxLength={10} {...field('phone')} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            {/* Line 1 */}
            <div className="space-y-1.5">
              <Label htmlFor="a-line1">Address Line 1 <span className="text-destructive">*</span></Label>
              <Input id="a-line1" placeholder="Flat / House no., Building, Street" {...field('line1')} />
              {errors.line1 && <p className="text-xs text-destructive">{errors.line1}</p>}
            </div>

            {/* Line 2 */}
            <div className="space-y-1.5">
              <Label htmlFor="a-line2">
                Address Line 2
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <Input id="a-line2" placeholder="Landmark, Area, Colony" {...field('line2')} />
            </div>

            {/* City + Pincode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-city">City <span className="text-destructive">*</span></Label>
                <Input id="a-city" placeholder="Mumbai" {...field('city')} />
                {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-pincode">Pincode <span className="text-destructive">*</span></Label>
                <Input id="a-pincode" placeholder="400001" maxLength={6} {...field('pincode')} />
                {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}
              </div>
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <Label>State <span className="text-destructive">*</span></Label>
              <Select value={form.state} onValueChange={v => { setForm(f => ({ ...f, state: v })); if (errors.state) setErrors(p => ({ ...p, state: undefined })) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>

            {/* Default toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setForm(f => ({ ...f, is_default: !f.is_default }))}
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.is_default ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_default ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-medium">Set as default address</span>
            </label>

            {Object.keys(errors).length > 0 && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Please fix the errors above
              </p>
            )}

            <Separator />

            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update Address' : 'Save Address'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
