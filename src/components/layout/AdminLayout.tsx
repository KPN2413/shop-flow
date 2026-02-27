import { type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Package, Tag, Archive, ShoppingBag, LogOut, Home, BarChart3, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'react-hot-toast'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/categories', icon: Tag, label: 'Categories' },
  { to: '/admin/inventory', icon: Archive, label: 'Inventory' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
]

function NavLink({ to, icon: Icon, label, exact }: typeof navItems[0] & { exact?: boolean }) {
  const { location } = useRouterState()
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <Link to={to} className={`admin-sidebar-link ${isActive ? 'active' : ''}`}>
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile, isAdmin, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Access Denied</h2>
          <p className="text-muted-foreground mb-4">You must be an admin to access this area.</p>
          <Link to="/"><Button variant="outline">Return Home</Button></Link>
        </div>
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    navigate({ to: '/' })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex w-64 flex-col border-r"
        style={{ backgroundColor: 'hsl(var(--sidebar))', color: 'hsl(var(--sidebar-foreground))' }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-6" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Admin Panel
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}>
            <Link to="/" className="admin-sidebar-link">
              <Home className="h-4 w-4" /> View Store
            </Link>
          </div>
        </nav>

        {/* User */}
        <div className="border-t p-4 space-y-3" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white text-sm font-bold">
              {(profile?.full_name || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
              <p className="text-xs truncate" style={{ color: 'hsl(var(--sidebar-foreground) / 0.5)' }}>{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="admin-sidebar-link w-full text-left"
            style={{ color: 'hsl(0 72% 60%)' }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col"
            style={{ backgroundColor: 'hsl(var(--sidebar))' }}
          >
            <div className="flex h-16 items-center justify-between border-b px-4" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>Admin Panel</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)} className="text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
              <div className="pt-4 mt-4" style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}>
                <Link to="/" className="admin-sidebar-link">
                  <Home className="h-4 w-4" /> View Store
                </Link>
              </div>
            </nav>
            <div className="border-t p-4" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
              <button onClick={handleSignOut} className="admin-sidebar-link w-full text-left" style={{ color: 'hsl(0 72% 60%)' }}>
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-3 font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Admin Panel</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
