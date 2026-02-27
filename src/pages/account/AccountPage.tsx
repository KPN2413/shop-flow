import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { User, Phone, Mail, Save, LogOut } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { signOut } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import toast from 'react-hot-toast'

export function AccountPage() {
  const { user, profile, isLoading: loading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-32 bg-secondary rounded-xl" />
      <div className="h-48 bg-secondary rounded-xl" />
    </div>
  )

  if (!user) {
    navigate({ to: '/login' })
    return null
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null })
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated!')
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate({ to: '/' })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Account</h1>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />Sign Out
        </Button>
      </div>

      {/* Profile card */}
      <div className="shopflow-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{profile?.full_name || 'User'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={profile?.role === 'ADMIN' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-secondary text-secondary-foreground'}>
                {profile?.role || 'USER'}
              </Badge>
              {profile?.created_at && (
                <span className="text-xs text-muted-foreground">Joined {formatDate(profile.created_at)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number (optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="pl-9" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Quick links */}
      <div className="shopflow-card p-6">
        <h3 className="font-semibold mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" asChild>
            <Link to="/account/orders">My Orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
