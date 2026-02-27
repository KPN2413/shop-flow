import { Link } from '@tanstack/react-router'
import { Package } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-card mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Package className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Shop<span className="text-secondary">Flow</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              India's trusted e-commerce platform. Quality products, seamless shopping.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Shop</h3>
            <ul className="mt-3 space-y-2">
              <li><Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link to="/cart" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Account</h3>
            <ul className="mt-3 space-y-2">
              <li><Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
              <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link></li>
              <li><Link to="/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">My Orders</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="mt-3 space-y-2">
              <li><Link to="/health" className="text-sm text-muted-foreground hover:text-foreground transition-colors">System Status</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ShopFlow. All prices in INR.
          </p>
          <p className="text-xs text-muted-foreground">
            Payments: COD & Mock · Razorpay coming soon
          </p>
        </div>
      </div>
    </footer>
  )
}
