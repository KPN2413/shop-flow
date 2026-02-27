import { useState } from 'react'
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { slugify } from '../../lib/format'
import toast from 'react-hot-toast'

const SEED_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
]

const SEED_PRODUCTS = [
  { title: 'Wireless Bluetooth Earbuds', price: 199900, category: 'electronics', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', desc: 'Premium wireless earbuds with 30hr battery life, active noise cancellation, and IPX5 water resistance.' },
  { title: 'Smartwatch Pro', price: 349900, category: 'electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', desc: 'Feature-packed smartwatch with health tracking, GPS, and 7-day battery.' },
  { title: 'USB-C Fast Charger 65W', price: 149900, category: 'electronics', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400', desc: 'Universal 65W fast charger compatible with laptops, phones, and tablets.' },
  { title: 'Men\'s Classic Kurta', price: 89900, category: 'fashion', image: 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=400', desc: 'Premium cotton kurta with elegant embroidery. Perfect for festivals and casual wear.' },
  { title: 'Women\'s Silk Saree', price: 249900, category: 'fashion', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400', desc: 'Pure silk saree with traditional zari work. Available in multiple colors.' },
  { title: 'Running Sneakers', price: 179900, category: 'fashion', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', desc: 'Lightweight running shoes with advanced cushioning and breathable mesh.' },
  { title: 'Non-Stick Cookware Set', price: 259900, category: 'home-kitchen', image: 'https://images.unsplash.com/photo-1584990347449-a2a4fa6b7c7e?w=400', desc: '5-piece premium non-stick cookware set. Dishwasher safe, PFOA free coating.' },
  { title: 'Bamboo Cutting Board', price: 59900, category: 'home-kitchen', image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400', desc: 'Eco-friendly bamboo cutting board with juice groove and non-slip feet.' },
  { title: 'Electric Kettle 1.5L', price: 129900, category: 'home-kitchen', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', desc: 'BPA-free electric kettle with auto shut-off and keep-warm function.' },
  { title: 'LED Desk Lamp', price: 99900, category: 'electronics', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', desc: 'Adjustable LED desk lamp with 5 color temperatures and USB charging port.' },
]

export function AdminSeedPage() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<{ ok: boolean; msg: string }[]>([])
  const [done, setDone] = useState(false)

  const addLog = (ok: boolean, msg: string) => {
    setLog(prev => [...prev, { ok, msg }])
  }

  const runSeed = async () => {
    setRunning(true)
    setLog([])
    setDone(false)

    addLog(true, 'Starting seed...')

    // 1. Create categories
    const categoryMap: Record<string, string> = {}
    for (const cat of SEED_CATEGORIES) {
      const { data: existing } = await supabase.from('categories').select('id').eq('slug', cat.slug).single()
      if (existing) {
        categoryMap[cat.slug] = existing.id
        addLog(true, `Category "${cat.name}" already exists`)
        continue
      }
      const { data, error } = await supabase.from('categories').insert(cat).select('id').single()
      if (error) {
        addLog(false, `Failed to create category "${cat.name}": ${error.message}`)
      } else {
        categoryMap[cat.slug] = data.id
        addLog(true, `Created category "${cat.name}"`)
      }
    }

    // 2. Get categories for lookup
    const { data: allCats } = await supabase.from('categories').select('id, slug')
    const catLookup = new Map((allCats || []).map(c => [c.slug, c.id]))

    // 3. Create products
    for (const product of SEED_PRODUCTS) {
      const slug = slugify(product.title)
      const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).single()
      if (existing) {
        addLog(true, `Product "${product.title}" already exists`)
        continue
      }

      const catId = catLookup.get(product.category)
      const { data, error } = await supabase.from('products').insert({
        title: product.title,
        slug,
        description: product.desc,
        price_paise: product.price,
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        category_id: catId || null,
        image_url: product.image,
      }).select('id').single()

      if (error) {
        addLog(false, `Failed to create product "${product.title}": ${error.message}`)
      } else {
        // Create inventory
        const stock = Math.floor(Math.random() * 50) + 5
        await supabase.from('inventory').upsert({ product_id: data.id, stock })
        addLog(true, `Created product "${product.title}" (stock: ${stock})`)
      }
    }

    addLog(true, '✓ Seed complete!')
    setDone(true)
    setRunning(false)
    toast.success('Demo data seeded successfully!')
  }

  return (
    <AdminLayout title="Seed Data" breadcrumbs={[{ label: 'Seed Demo Data' }]}>
      <div className="max-w-2xl">
        <div className="shopflow-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-accent" />
            <h2 className="font-bold text-lg">Seed Demo Data</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This will create 3 categories, 10 products with inventory data. Existing records with the same slug will be skipped.
          </p>
          <Button onClick={runSeed} disabled={running}>
            {running ? 'Seeding...' : 'Run Seed'}
          </Button>
        </div>

        {log.length > 0 && (
          <div className="shopflow-card overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-sm">Seed Log</h3>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
              {log.map((entry, i) => (
                <div key={i} className={`flex items-start gap-2 ${entry.ok ? 'text-emerald-700' : 'text-destructive'}`}>
                  {entry.ok ? <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />}
                  {entry.msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
