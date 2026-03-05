import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './lib/auth-context'
import { WishlistProvider } from '../../wishlist-feature/src/lib/wishlist-context'
import { CartProvider } from './lib/cart-context'
import { Navbar } from '../../wishlist-feature/src/components/layout/Navbar/components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { supabase } from './lib/supabase'

// Public pages
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProductPage } from './account/ProductPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HealthPage } from './pages/HealthPage'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

// Account pages
import { AccountPage } from './account/AccountPage'
import { OrdersPage } from './pages/account/OrdersPage'
import { WishlistPage } from './account/WishlistPage'

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminProducts } from './pages/admin/AdminProducts'
import { AdminCategories } from './pages/admin/AdminCategories'
import { AdminInventory } from './pages/admin/AdminInventory'
import { AdminOrders } from './pages/admin/AdminOrders'
import { AdminSeedPage } from './pages/admin/AdminSeedPage'

import { Analytics } from '@vercel/analytics/react';

// Root layout with Navbar + Footer
function StoreLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

// Admin layout (no outer navbar — admin pages have their own sidebar layout)
function AdminRoot() {
  return <Outlet />
}

// ─── Admin auth guard ────────────────────────────────────────────────────────
// Runs before every /admin/* route. No session → /login. Non-admin → /.
async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw redirect({ to: '/login' })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()
  if (!profile || profile.role !== 'ADMIN') {
    throw redirect({ to: '/' })
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Route tree
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </>
  ),
})

// Store routes (with Navbar + Footer)
const storeLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'store',
  component: StoreLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/',
  component: HomePage,
})

const shopRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/shop',
  component: ShopPage,
  validateSearch: (search: Record<string, unknown>) => ({
    q: search.q as string | undefined,
    category: search.category as string | undefined,
  }),
})

const categoriesRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/categories',
  component: CategoriesPage,
})

const productRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/product/$slug',
  component: ProductPage,
})

const cartRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/cart',
  component: CartPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/checkout',
  component: CheckoutPage,
})

const loginRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/login',
  component: LoginPage,
})

const signupRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/signup',
  component: SignupPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
})

const accountRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/account',
  component: AccountPage,
})

const ordersRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/account/orders',
  component: OrdersPage,
})

const wishlistRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/account/wishlist',
  component: WishlistPage,
})

const healthRoute = createRoute({
  getParentRoute: () => storeLayoutRoute,
  path: '/health',
  component: HealthPage,
})

// Admin routes — ALL protected by requireAdmin beforeLoad guard
const adminRootRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminRoot,
  beforeLoad: requireAdmin,   // ← fires before any /admin/* route renders
})

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/',
  component: AdminDashboard,
})

const adminProductsRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/products',
  component: AdminProducts,
})

const adminCategoriesRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/categories',
  component: AdminCategories,
})

const adminInventoryRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/inventory',
  component: AdminInventory,
})

const adminOrdersRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/orders',
  component: AdminOrders,
})

const adminSeedRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/seed',
  component: AdminSeedPage,
})

const routeTree = rootRoute.addChildren([
  storeLayoutRoute.addChildren([
    indexRoute,
    shopRoute,
    categoriesRoute,
    productRoute,
    cartRoute,
    checkoutRoute,
    loginRoute,
    signupRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    accountRoute,
    ordersRoute,
    wishlistRoute,
    healthRoute,
  ]),
  adminRootRoute.addChildren([
    adminIndexRoute,
    adminProductsRoute,
    adminCategoriesRoute,
    adminInventoryRoute,
    adminOrdersRoute,
    adminSeedRoute,
  ]),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
      <CartProvider>
        <RouterProvider router={router} />
        <Analytics />
      </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  )
} 