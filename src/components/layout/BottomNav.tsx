import { Link, useLocation } from '@tanstack/react-router'
import { Home, ShoppingBag, Search, Heart, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const { user } = useAuth()
  const { itemCount } = useCart()
  const { itemCount: wishlistCount } = useWishlist()
  const location = useLocation()

  const path = location.pathname

  const tabs = [
    {
      to: '/',
      icon: Home,
      label: 'Home',
      active: path === '/',
    },
    {
      to: '/shop',
      icon: ShoppingBag,
      label: 'Shop',
      active: path.startsWith('/shop') || path.startsWith('/categories') || path.startsWith('/product'),
    },
    {
      to: '/cart',
      icon: ShoppingCart,
      label: 'Cart',
      active: path === '/cart' || path === '/checkout',
      badge: itemCount > 0 ? (itemCount > 99 ? '99+' : String(itemCount)) : null,
    },
    {
      to: user ? '/account/wishlist' : '/login',
      icon: Heart,
      label: 'Wishlist',
      active: path.startsWith('/account/wishlist'),
      badge: user && wishlistCount > 0 ? (wishlistCount > 99 ? '99+' : String(wishlistCount)) : null,
      heart: true,
      wishlisted: user ? wishlistCount > 0 : false,
    },
    {
      to: user ? '/account' : '/login',
      icon: User,
      label: user ? 'Account' : 'Sign In',
      active: path.startsWith('/account') && !path.startsWith('/account/wishlist'),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 relative transition-colors',
                tab.active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Active indicator pill at top */}
              {tab.active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
                />
              )}

              {/* Icon with badge */}
              <span className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    tab.active && 'scale-110',
                    tab.heart && (tab as any).wishlisted && 'fill-red-500 text-red-500'
                  )}
                />
                {tab.badge && (
                  <span
                    className="absolute -right-2 -top-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white leading-none"
                    style={{ backgroundColor: 'hsl(var(--secondary))' }}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={cn(
                'text-[10px] font-medium leading-none',
                tab.active ? 'text-primary' : 'text-muted-foreground'
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Safe area spacer for phones with home indicator */}
      <div className="h-safe-area-inset-bottom bg-card/95" />
    </nav>
  )
}
