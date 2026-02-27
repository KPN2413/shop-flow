import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/shared/ProductCard'
import { supabase } from '@/lib/supabase'
import type { ProductWithCategory } from '@/lib/database.types'

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchFeatured() {
      const { data } = await supabase
        .from('products')
        .select('*, categories(*), inventory(stock)')
        .eq('status', 'ACTIVE')
        .eq('visibility', 'PUBLIC')
        .order('created_at', { ascending: false })
        .limit(8)
      setFeaturedProducts((data as ProductWithCategory[]) ?? [])
      setIsLoading(false)
    }
    fetchFeatured()
  }, [])

  return (
    <main>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 47% 18%) 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(24 95% 53%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(24 95% 53%) 0%, transparent 40%)',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-300 mb-6">
              <Star className="h-3.5 w-3.5 fill-current" />
              India's trusted shopping destination
            </div>
            <h1
              className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl leading-tight"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
            >
              Shop Smart,
              <br />
              <span style={{ color: 'hsl(var(--secondary))' }}>Shop India.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-xl">
              Discover thousands of products at unbeatable prices. From electronics to fashion — all curated for Indian shoppers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link to="/shop">
                <Button size="lg" className="gap-2 w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}>
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white bg-transparent hover:bg-white/10">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₹499' },
              { icon: ShieldCheck, title: 'Secure Payments', desc: 'COD & online options' },
              { icon: RefreshCw, title: 'Easy Returns', desc: '7-day return policy' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'hsl(24 95% 96%)' }}>
                  <item.icon className="h-5 w-5" style={{ color: 'hsl(var(--secondary))' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Featured Products</h2>
            <p className="text-muted-foreground mt-1 text-sm">Handpicked deals just for you</p>
          </div>
          <Link to="/shop">
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-xl border bg-card p-16 text-center">
            <p className="text-muted-foreground">No products available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon or visit the admin panel to add products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/shop">
            <Button variant="outline" className="gap-1.5">
              View All Products <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
