import React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { 
  LayoutDashboard, Package, Tag, Warehouse, ShoppingBag, 
  ArrowLeft, ChevronRight, Sparkles
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useEffect } from 'react'

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/seed', label: 'Add Products', icon: Sparkles },
]

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
  const { isAdmin, isLoading: loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: '/login' })
  }, [isAdmin, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="flex h-screen bg-secondary/20">
      {/* Sidebar */}
      <aside className="w-64 h-screen flex flex-col bg-white border-r border-border shrink-0">
        <div className="h-16 border-b border-border flex items-center px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ShopFlow</div>
              <div className="text-[10px] text-orange-600 font-semibold">ADMIN</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {adminNav.map((item) => {
              const active = item.exact 
                ? location.pathname === item.href 
                : location.pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-border">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-white flex items-center px-6 gap-3 shrink-0">
          {breadcrumbs ? (
            <div className="flex items-center gap-1 text-sm">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link>
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  {b.href ? (
                    <Link to={b.href} className="text-muted-foreground hover:text-foreground">{b.label}</Link>
                  ) : (
                    <span className="font-medium text-foreground">{b.label}</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <h1 className="font-semibold text-lg">{title}</h1>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}