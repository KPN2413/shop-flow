import { useState, useEffect, useRef } from 'react'
import { Sparkles, CheckCircle, AlertCircle, Plus, Upload, FileText, RefreshCw, X } from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { supabase } from '../../lib/supabase'
import { slugify, rupeesToPaise } from '../../lib/format'
import toast from 'react-hot-toast'
import type { Category } from '../../lib/database.types'

// ─── Seed batches ─────────────────────────────────────────────────────────────

const SEED_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
  { name: 'Sports & Fitness', slug: 'sports-fitness' },
  { name: 'Books & Stationery', slug: 'books-stationery' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
]

const SEED_BATCHES = [
  [
    { title: 'Wireless Bluetooth Earbuds', price: 199900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/mobile-accessories/Apple%20AirPods%20Max%20Silver/1.webp', desc: 'Premium wireless earbuds with 30hr battery life and active noise cancellation.' },
    { title: 'Smartwatch Pro', price: 349900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/mens-watches/Brown%20Leather%20Belt%20Watch/1.webp', desc: 'Feature-packed smartwatch with health tracking, GPS, and 7-day battery.' },
    { title: 'USB-C Fast Charger 65W', price: 149900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/mobile-accessories/Apple%2020W%20USB-C%20Power%20Adapter/1.webp', desc: 'Universal 65W fast charger compatible with laptops, phones, and tablets.' },
    { title: "Men's Classic Kurta", price: 89900, cat: 'fashion', image: 'https://cdn.dummyjson.com/products/images/mens-shirts/Blue%20%26%20Black%20Check%20Shirt/1.webp', desc: 'Premium cotton kurta with elegant embroidery. Perfect for festivals.' },
    { title: "Women's Silk Saree", price: 249900, cat: 'fashion', image: 'https://cdn.dummyjson.com/products/images/womens-dresses/Blue%20Horizons%20Sundress/1.webp', desc: 'Pure silk saree with traditional zari work. Available in multiple colors.' },
    { title: 'Running Sneakers', price: 179900, cat: 'fashion', image: 'https://cdn.dummyjson.com/products/images/mens-shoes/Nike%20Air%20Jordan%201%20Retro%20High/1.webp', desc: 'Lightweight running shoes with advanced cushioning and breathable mesh.' },
    { title: 'Non-Stick Cookware Set', price: 259900, cat: 'home-kitchen', image: 'https://cdn.dummyjson.com/products/images/kitchen-accessories/Stainless%20Steel%20Skillet/1.webp', desc: '5-piece premium non-stick cookware set. Dishwasher safe, PFOA free.' },
    { title: 'Electric Kettle 1.5L', price: 129900, cat: 'home-kitchen', image: 'https://cdn.dummyjson.com/products/images/kitchen-accessories/Electric%20Stove/1.webp', desc: 'BPA-free electric kettle with auto shut-off and keep-warm function.' },
    { title: 'LED Desk Lamp', price: 99900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/home-decoration/Scented%20Pillar%20Candles/1.webp', desc: 'Adjustable LED desk lamp with 5 color temperatures and USB charging port.' },
    { title: 'Bamboo Cutting Board', price: 59900, cat: 'home-kitchen', image: 'https://cdn.dummyjson.com/products/images/kitchen-accessories/Wooden%20Cutting%20Board/1.webp', desc: 'Eco-friendly bamboo cutting board with juice groove and non-slip feet.' },
  ],
  [
    { title: 'Yoga Mat Premium', price: 139900, cat: 'sports-fitness', image: 'https://cdn.dummyjson.com/products/images/sports-accessories/Yoga%20Mat/1.webp', desc: 'Non-slip 6mm thick yoga mat with carrying strap. Eco-friendly TPE material.' },
    { title: 'Resistance Bands Set', price: 79900, cat: 'sports-fitness', image: 'https://cdn.dummyjson.com/products/images/sports-accessories/Resistance%20Bands/1.webp', desc: 'Set of 5 resistance bands with varying tension levels for full body workout.' },
    { title: 'Dumbbell Set 10kg', price: 299900, cat: 'sports-fitness', image: 'https://cdn.dummyjson.com/products/images/sports-accessories/Dumbbell%20Set/1.webp', desc: 'Adjustable cast iron dumbbell set. Perfect for home gym workouts.' },
    { title: 'Atomic Habits Book', price: 39900, cat: 'books-stationery', image: 'https://cdn.dummyjson.com/products/images/stationery/Journal%20Notebook/1.webp', desc: 'International bestseller on building good habits and breaking bad ones.' },
    { title: 'Premium Notebook Set', price: 49900, cat: 'books-stationery', image: 'https://cdn.dummyjson.com/products/images/stationery/Colored%20Pencil%20Set/1.webp', desc: 'Set of 3 A5 dotted notebooks. 120gsm paper, lay-flat binding.' },
    { title: 'Gel Pen Set 24 Colors', price: 29900, cat: 'books-stationery', image: 'https://cdn.dummyjson.com/products/images/stationery/Colored%20Pencil%20Set/1.webp', desc: 'Smooth writing gel pens perfect for journaling, art, and note-taking.' },
    { title: 'Vitamin C Face Serum', price: 89900, cat: 'beauty-personal-care', image: 'https://cdn.dummyjson.com/products/images/beauty/Essence%20Mascara%20Lash%20Princess/1.webp', desc: '15% Vitamin C serum with hyaluronic acid. Brightens and evens skin tone.' },
    { title: 'Wooden Hair Brush', price: 59900, cat: 'beauty-personal-care', image: 'https://cdn.dummyjson.com/products/images/beauty/Eyeshadow%20Palette%20with%20Mirror/1.webp', desc: 'Natural boar bristle brush for smooth, frizz-free hair.' },
    { title: 'Perfume Gift Set', price: 199900, cat: 'beauty-personal-care', image: 'https://cdn.dummyjson.com/products/images/fragrances/Calvin%20Klein%20CK%20One/1.webp', desc: 'Luxury perfume gift set with 3 complementary fragrances. 30ml each.' },
    { title: 'Protein Shaker Bottle', price: 49900, cat: 'sports-fitness', image: 'https://cdn.dummyjson.com/products/images/sports-accessories/Gym%20Bag/1.webp', desc: 'BPA-free 700ml shaker with BlenderBall wire whisk. Leak-proof lid.' },
  ],
  [
    { title: 'Mechanical Keyboard TKL', price: 279900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/laptops/MacBook%20Pro%2014%20Inch%20Space%20Grey/1.webp', desc: 'Tenkeyless mechanical keyboard with Cherry MX switches and RGB backlighting.' },
    { title: 'Portable Bluetooth Speaker', price: 229900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/mobile-accessories/Apple%20HomePod%20Mini%20Yellow/1.webp', desc: '360 degree surround sound, 24hr battery, IPX7 waterproof. Perfect for outdoors.' },
    { title: 'Webcam 1080p HD', price: 189900, cat: 'electronics', image: 'https://cdn.dummyjson.com/products/images/laptops/Lenovo%20IdeaPad%20Flex%205i/1.webp', desc: 'Full HD webcam with built-in microphone and auto light correction.' },
    { title: 'Stainless Steel Water Bottle', price: 89900, cat: 'home-kitchen', image: 'https://cdn.dummyjson.com/products/images/kitchen-accessories/Black%20Aluminium%20Cup/1.webp', desc: 'Double-wall insulated 1L bottle. Keeps cold 24hrs, hot 12hrs.' },
    { title: 'Air Purifier Compact', price: 449900, cat: 'home-kitchen', image: 'https://cdn.dummyjson.com/products/images/furniture/Wooden%20Bathroom%20Sink%20With%20Mirror/1.webp', desc: 'True HEPA filter removes 99.97% of particles. Covers up to 300 sq ft.' },
    { title: 'Scented Candle Set', price: 79900, cat: 'home-kitchen', image: 'https://cdn.dummyjson.com/products/images/home-decoration/Scented%20Pillar%20Candles/1.webp', desc: 'Set of 4 natural soy wax candles in lavender, vanilla, and eucalyptus.' },
    { title: 'Casual Linen Shirt', price: 129900, cat: 'fashion', image: 'https://cdn.dummyjson.com/products/images/mens-shirts/Pale%20Blue%20Formal%20Shirt/1.webp', desc: 'Breathable linen shirt for summer. Available in 6 colors, sizes S-XXL.' },
    { title: 'Leather Wallet Slim', price: 99900, cat: 'fashion', image: 'https://cdn.dummyjson.com/products/images/mens-watches/Brown%20Leather%20Belt%20Watch/1.webp', desc: 'Genuine leather bifold wallet with RFID blocking and 8 card slots.' },
    { title: 'Sunglasses Polarized', price: 159900, cat: 'fashion', image: 'https://cdn.dummyjson.com/products/images/sunglasses/Fashionable%20Sunglasses/1.webp', desc: 'UV400 polarized sunglasses with lightweight frame. Unisex design.' },
    { title: 'Jump Rope Speed', price: 49900, cat: 'sports-fitness', image: 'https://cdn.dummyjson.com/products/images/sports-accessories/Jump%20Rope/1.webp', desc: 'Adjustable speed jump rope with ball bearings for smooth rotation.' },
  ],
]

const CSV_TEMPLATE = `title,price_rupees,category_slug,image_url,description,stock
Wireless Mouse,899,electronics,https://cdn.dummyjson.com/products/images/mobile-accessories/Apple%20Magic%20Mouse/1.webp,Ergonomic wireless mouse with 12-month battery life,50
Cotton T-Shirt,299,fashion,https://cdn.dummyjson.com/products/images/stationery/Colored%20Pencil%20Set/1.webp,Soft 100% cotton t-shirt available in 10 colors,100`

interface LogEntry { ok: boolean; msg: string }

interface ProductForm {
  title: string; slug: string; description: string; price: string
  category_id: string; image_url: string; stock: string
  status: string; visibility: string
}

const defaultForm: ProductForm = {
  title: '', slug: '', description: '', price: '',
  category_id: '', image_url: '', stock: '10',
  status: 'ACTIVE', visibility: 'PUBLIC',
}

async function ensureCategories() {
  const catMap: Record<string, string> = {}
  for (const cat of SEED_CATEGORIES) {
    const { data: existing } = await supabase.from('categories').select('id').eq('slug', cat.slug).single()
    if (existing) { catMap[cat.slug] = existing.id; continue }
    const { data } = await supabase.from('categories').insert(cat).select('id').single()
    if (data) catMap[cat.slug] = data.id
  }
  const { data: allCats } = await supabase.from('categories').select('id, slug')
  for (const c of (allCats || [])) catMap[c.slug] = c.id
  return catMap
}

async function insertProduct(
  p: { title: string; price: number; cat_slug?: string; category_id?: string; image_url?: string; description?: string; stock?: number; status?: string; visibility?: string },
  catMap: Record<string, string>,
  addLog: (ok: boolean, msg: string) => void
) {
  const slug = slugify(p.title)
  const catId = p.category_id || (p.cat_slug ? catMap[p.cat_slug] : undefined)
  // Skip if product with same title already exists
  const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle()
  if (existing) { addLog(true, `Skipped (already exists): "${p.title}"`); return }

  const { data, error } = await supabase.from('products').insert({
    title: p.title, slug,
    description: p.description || '',
    price_paise: p.price,
    status: p.status || 'ACTIVE',
    visibility: p.visibility || 'PUBLIC',
    category_id: catId || null,
    image_url: p.image_url || null,
  }).select('id').single()

  if (error) { addLog(false, `Failed: "${p.title}" — ${error.message}`); return }
  const stock = p.stock ?? Math.floor(Math.random() * 50) + 5
  await supabase.from('inventory').upsert({ product_id: data.id, stock })
  addLog(true, `Added "${p.title}" (stock: ${stock})`)
}

export function AdminSeedPage() {
  const [categories, setCategories] = useState<Category[]>([])

  // Bulk
  const [batchIndex, setBatchIndex] = useState(0)
  const [seeding, setSeeding] = useState(false)
  const [seedLog, setSeedLog] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  // Add Product
  const [form, setForm] = useState<ProductForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  // CSV
  const [csvText, setCsvText] = useState('')
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvLog, setCsvLog] = useState<LogEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [seedLog])

  const addSeedLog = (ok: boolean, msg: string) => setSeedLog(prev => [...prev, { ok, msg }])
  const addCsvLog = (ok: boolean, msg: string) => setCsvLog(prev => [...prev, { ok, msg }])

  // ── Bulk Seed ──
  const runBatch = async () => {
    setSeeding(true)
    setSeedLog([])
    addSeedLog(true, `Seeding batch ${batchIndex + 1} of ${SEED_BATCHES.length}...`)
    const catMap = await ensureCategories()
    const batch = SEED_BATCHES[batchIndex]
    for (const p of batch) {
      await insertProduct({ title: p.title, price: p.price, cat_slug: p.cat, image_url: p.image, description: p.desc }, catMap, addSeedLog)
    }
    const next = (batchIndex + 1) % SEED_BATCHES.length
    setBatchIndex(next)
    addSeedLog(true, `Done! Next click will seed batch ${next + 1}.`)
    toast.success(`Batch ${batchIndex + 1} seeded — ${batch.length} products added!`)
    setSeeding(false)
  }

  // ── Add Product ──
  const handleSaveProduct = async () => {
    if (!form.title.trim() || !form.price) { toast.error('Title and price are required'); return }
    setSaving(true)
    const catMap = await ensureCategories()
    await insertProduct({
      title: form.title, price: rupeesToPaise(form.price),
      category_id: form.category_id || undefined,
      image_url: form.image_url || undefined,
      description: form.description || undefined,
      stock: parseInt(form.stock) || 10,
      status: form.status, visibility: form.visibility,
    }, catMap, () => {})
    toast.success(`"${form.title}" added!`)
    setForm(defaultForm)
    setSaving(false)
  }

  // ── CSV ──
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n').filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
    })
  }

  const handleCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setCsvText(text)
      setCsvPreview(parseCSV(text))
    }
    reader.readAsText(file)
  }

  const handleCSVTextChange = (text: string) => {
    setCsvText(text)
    setCsvPreview(parseCSV(text))
  }

  const runCSVImport = async () => {
    if (csvPreview.length === 0) { toast.error('No valid rows to import'); return }
    setCsvImporting(true)
    setCsvLog([])
    addCsvLog(true, `Importing ${csvPreview.length} products...`)
    const catMap = await ensureCategories()
    for (const row of csvPreview) {
      if (!row.title) { addCsvLog(false, 'Skipped row with no title'); continue }
      await insertProduct({
        title: row.title, price: rupeesToPaise(row.price_rupees || '0'),
        cat_slug: row.category_slug, image_url: row.image_url || undefined,
        description: row.description || undefined, stock: parseInt(row.stock) || 10,
      }, catMap, addCsvLog)
    }
    addCsvLog(true, `Done! ${csvPreview.length} products imported.`)
    toast.success(`Imported ${csvPreview.length} products!`)
    setCsvImporting(false)
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'shopflow-products-template.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  const LogPanel = ({ log, onClear }: { log: LogEntry[], onClear: () => void }) => (
    <div className="shopflow-card overflow-hidden mt-4">
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Log</h3>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-1.5 max-h-60 overflow-y-auto font-mono text-xs">
        {log.map((e, i) => (
          <div key={i} className={`flex items-start gap-2 ${e.ok ? 'text-emerald-700' : 'text-destructive'}`}>
            {e.ok ? <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />}
            {e.msg}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  )

  return (
    <AdminLayout title="Add Products" breadcrumbs={[{ label: 'Add Products' }]}>
      <div className="max-w-3xl">
        <Tabs defaultValue="bulk">
          <TabsList className="mb-6">
            <TabsTrigger value="bulk" className="gap-2"><Sparkles className="w-4 h-4" />Bulk Seed</TabsTrigger>
            <TabsTrigger value="manual" className="gap-2"><Plus className="w-4 h-4" />Add Product</TabsTrigger>
            <TabsTrigger value="csv" className="gap-2"><Upload className="w-4 h-4" />CSV Import</TabsTrigger>
          </TabsList>

          {/* ── BULK SEED ── */}
          <TabsContent value="bulk">
            <div className="shopflow-card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" /> Bulk Seed Products
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click to add a batch of ~10 products at once. {SEED_BATCHES.length} batches available ({SEED_BATCHES.reduce((a, b) => a + b.length, 0)} total products).
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 mt-1">
                  Batch {batchIndex + 1} / {SEED_BATCHES.length}
                </Badge>
              </div>

              <div className="bg-muted/40 rounded-lg p-4 mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next batch preview</p>
                <ul className="space-y-1">
                  {SEED_BATCHES[batchIndex].slice(0, 5).map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      {p.title}
                      <span className="text-muted-foreground ml-auto text-xs">₹{(p.price / 100).toLocaleString('en-IN')}</span>
                    </li>
                  ))}
                  {SEED_BATCHES[batchIndex].length > 5 && (
                    <li className="text-xs text-muted-foreground pl-3.5">+ {SEED_BATCHES[batchIndex].length - 5} more products...</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={runBatch} disabled={seeding} className="gap-2">
                  {seeding
                    ? <><RefreshCw className="w-4 h-4 animate-spin" />Seeding...</>
                    : <><Sparkles className="w-4 h-4" />Seed Batch {batchIndex + 1}</>}
                </Button>
                <Button variant="outline" onClick={() => { setSeedLog([]); setBatchIndex(0) }} disabled={seeding}>Reset</Button>
              </div>
            </div>
            {seedLog.length > 0 && <LogPanel log={seedLog} onClear={() => setSeedLog([])} />}
          </TabsContent>

          {/* ── ADD PRODUCT ── */}
          <TabsContent value="manual">
            <div className="shopflow-card p-6">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
                <Plus className="w-5 h-5 text-orange-500" /> Add Single Product
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value, slug: slugify(e.target.value) }))} placeholder="Product title" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="auto-generated" className="font-mono text-sm" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Product description..." rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price (₹) *</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="499.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} placeholder="10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category_id || 'none'} onValueChange={v => setForm(p => ({ ...p, category_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Visibility</Label>
                  <Select value={form.visibility} onValueChange={v => setForm(p => ({ ...p, visibility: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="HIDDEN">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Image URL</Label>
                  <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://cdn.dummyjson.com/products/images/..." />
                  {form.image_url && (
                    <div className="mt-2 h-24 w-24 rounded-lg overflow-hidden border bg-muted">
                      <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                  )}
                </div>
                <div className="col-span-2 pt-2 flex gap-3">
                  <Button onClick={handleSaveProduct} disabled={saving} className="gap-2">
                    {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Add Product</>}
                  </Button>
                  <Button variant="outline" onClick={() => setForm(defaultForm)}>Clear</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── CSV IMPORT ── */}
          <TabsContent value="csv">
            <div className="shopflow-card p-6">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-1">
                <Upload className="w-5 h-5 text-orange-500" /> CSV Import
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Upload a .csv file or paste CSV text. Download the template to get the correct format.</p>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCSVFile(f) }}
              >
                <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">.csv files only</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }} />
              </div>

              <div className="flex items-center gap-3 mb-4">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <FileText className="w-4 h-4" /> Download Template
                </Button>
                <span className="text-xs text-muted-foreground">Required: title, price_rupees, category_slug</span>
              </div>

              <div className="space-y-1.5 mb-4">
                <Label>Or paste CSV text</Label>
                <Textarea
                  value={csvText}
                  onChange={e => handleCSVTextChange(e.target.value)}
                  placeholder={"title,price_rupees,category_slug,image_url,description,stock\nMy Product,499,electronics,https://...,Great product,20"}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>

              {csvPreview.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{csvPreview.length} rows ready to import</p>
                    <button onClick={() => { setCsvText(''); setCsvPreview([]) }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>{Object.keys(csvPreview[0]).map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {csvPreview.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-t">
                              {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 truncate max-w-[150px]">{v as string}</td>)}
                            </tr>
                          ))}
                          {csvPreview.length > 10 && (
                            <tr className="border-t"><td colSpan={Object.keys(csvPreview[0]).length} className="px-3 py-2 text-center text-muted-foreground">+ {csvPreview.length - 10} more rows</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={runCSVImport} disabled={csvImporting || csvPreview.length === 0} className="gap-2">
                {csvImporting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Importing...</>
                  : <><Upload className="w-4 h-4" />Import {csvPreview.length > 0 ? `${csvPreview.length} Products` : 'Products'}</>}
              </Button>
            </div>
            {csvLog.length > 0 && <LogPanel log={csvLog} onClear={() => setCsvLog([])} />}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}