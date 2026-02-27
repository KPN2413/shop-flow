import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Activity, Database, Shield, ShoppingCart } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env

interface Check {
  name: string
  status: 'ok' | 'error' | 'warning' | 'loading'
  message: string
  icon: React.ElementType
}

export function HealthPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const [dbStatus, setDbStatus] = useState<'ok' | 'error' | 'loading'>('loading')
  const [productCount, setProductCount] = useState(0)

  useEffect(() => {
    supabase.from('categories').select('id', { count: 'exact', head: true }).then(({ error }) => {
      setDbStatus(error ? 'error' : 'ok')
    })
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').then(({ count }) => {
      setProductCount(count || 0)
    })
  }, [])

  const supabaseUrl = env?.VITE_SUPABASE_URL
  const isConfigured = !!supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co'

  const checks: Check[] = [
    {
      name: 'Supabase Configuration',
      status: isConfigured ? 'ok' : 'error',
      message: isConfigured ? `Connected to ${supabaseUrl?.split('.')[0].replace('https://', '')}` : 'VITE_SUPABASE_URL not configured',
      icon: Database,
    },
    {
      name: 'Database Connection',
      status: dbStatus,
      message: dbStatus === 'ok' ? 'Database responding' : dbStatus === 'loading' ? 'Checking...' : 'Database unreachable',
      icon: Activity,
    },
    {
      name: 'Authentication',
      status: authLoading ? 'loading' : user ? 'ok' : 'warning',
      message: authLoading ? 'Checking...' : user ? `Signed in as ${user.email}` : 'Not signed in',
      icon: Shield,
    },
    {
      name: 'Products Available',
      status: productCount > 0 ? 'ok' : 'warning',
      message: `${productCount} active products in store`,
      icon: ShoppingCart,
    },
  ]

  const statusIcon = (status: Check['status']) => {
    if (status === 'loading') return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    if (status === 'ok') return <CheckCircle className="w-5 h-5" />
    if (status === 'error') return <XCircle className="w-5 h-5" />
    return <AlertCircle className="w-5 h-5" />
  }

  const statusColor = (status: Check['status']) => {
    if (status === 'loading') return 'text-muted-foreground'
    if (status === 'ok') return 'text-emerald-600'
    if (status === 'error') return 'text-destructive'
    return 'text-amber-600'
  }

  const allOk = checks.every(c => c.status === 'ok')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${allOk ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <Activity className={`w-8 h-8 ${allOk ? 'text-emerald-600' : 'text-amber-600'}`} />
        </div>
        <h1 className="text-3xl font-bold mb-2">System Health</h1>
        <p className="text-muted-foreground">ShopFlow application status and diagnostics</p>
      </div>

      <div className="space-y-3 mb-8">
        {checks.map(check => (
          <div key={check.name} className="shopflow-card p-4 flex items-center gap-4">
            <div className={`shrink-0 ${statusColor(check.status)}`}>
              {statusIcon(check.status)}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{check.name}</div>
              <div className="text-sm text-muted-foreground">{check.message}</div>
            </div>
            <Badge className={
              check.status === 'ok' ? 'badge-stock-in' :
              check.status === 'error' ? 'badge-stock-out' :
              check.status === 'loading' ? 'bg-secondary text-secondary-foreground' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }>
              {check.status === 'loading' ? 'Checking' : check.status.toUpperCase()}
            </Badge>
          </div>
        ))}
      </div>

      {user && (
        <div className="shopflow-card p-6 mb-4">
          <h2 className="font-bold mb-4">Current Session</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-muted-foreground w-24">User ID:</span>
              <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{user.id}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-24">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-24">Role:</span>
              <Badge className={profile?.role === 'ADMIN' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-secondary text-secondary-foreground'}>
                {profile?.role || 'USER'}
              </Badge>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-24">Name:</span>
              <span>{profile?.full_name || '—'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-secondary/50 rounded-xl text-xs text-muted-foreground font-mono space-y-1">
        <div>VITE_SUPABASE_URL: {env?.VITE_SUPABASE_URL ? '✓ Set' : '✗ Not set'}</div>
        <div>VITE_SUPABASE_ANON_KEY: {env?.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'}</div>
        <div>VITE_SUPABASE_SERVICE_ROLE_KEY: {env?.VITE_SUPABASE_SERVICE_ROLE_KEY ? '✓ Set (Edge Functions ready)' : '✗ Not set (checkout APIs need this)'}</div>
      </div>
    </div>
  )
}
