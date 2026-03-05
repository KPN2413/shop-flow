import { Link, useNavigate } from '@tanstack/react-router'
import { ShoppingCart, User, Menu, X, Package, LayoutDashboard, LogOut, ChevronDown, Heart } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const { itemCount } = useCart()
  const { itemCount: wishlistCount } = useWishlist()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    // navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Shop<span className="text-secondary">Flow</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/shop"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Shop
            </Link>
            <Link
              to="/categories"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Categories
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 md:flex">
            {user && (
              <Link to="/account/wishlist">
                <Button variant="ghost" size="icon" className="relative" title="My Wishlist">
                  <Heart className={`h-5 w-5 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                  {wishlistCount > 0 && (
                    <span
                      className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs font-semibold"
                      style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}
                    >
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs font-semibold"
                    style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate text-sm">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/wishlist" className="flex items-center gap-2">
                      <Heart className="h-4 w-4" /> My Wishlist
                      {wishlistCount > 0 && (
                        <span className="ml-auto text-xs font-medium text-muted-foreground">{wishlistCount}</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 h-4 w-4 flex items-center justify-center rounded-full p-0 text-[10px] font-semibold"
                    style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}
                  >
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              <Link to="/shop" className="px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Shop</Link>
              <Link to="/categories" className="px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Categories</Link>
              {user ? (
                <>
                  <Link to="/account" className="px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>My Account</Link>
                  <Link to="/account/wishlist" className="px-2 py-2 text-sm font-medium flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <Heart className={`h-4 w-4 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                    My Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Admin Dashboard</Link>
                  )}
                  <button
                    className="px-2 py-2 text-left text-sm font-medium text-destructive"
                    onClick={() => { handleSignOut(); setMobileOpen(false) }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Sign In</Link>
                  <Link to="/signup" className="px-2 py-2 text-sm font-medium text-secondary" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}