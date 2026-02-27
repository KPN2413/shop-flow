import { Link } from '@tanstack/react-router'
import { ShoppingCart, Package } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { formatINR } from '../../lib/format'
import type { Product } from '../../lib/database.types'
import { useCart } from '../../lib/cart-context'
import toast from 'react-hot-toast'

interface ProductCardProps {
  product: Product & { inventory?: { stock: number }[] }
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const stock = product.inventory?.[0]?.stock ?? 0
  const inStock = stock > 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!inStock) return
    const result = await addToCart(product.id)
    if (result?.error) toast.error(result.error)
    else toast.success('Added to cart!')
  }

  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="block group">
      <div className="shopflow-card overflow-hidden">
        {/* Image */}
        <div className="aspect-square bg-secondary/50 overflow-hidden relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Badge variant="secondary" className="badge-stock-out text-xs font-semibold">Out of Stock</Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="mb-1">
            {product.categories && (
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{(product.categories as any).name}</span>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <span className="price-tag text-lg">{formatINR(product.price_paise)}</span>
            <Button
              size="sm"
              variant={inStock ? 'default' : 'secondary'}
              disabled={!inStock}
              onClick={handleAddToCart}
              className="shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
          </div>
          {inStock && stock <= 5 && (
            <p className="text-xs text-amber-600 mt-1">Only {stock} left!</p>
          )}
        </div>
      </div>
    </Link>
  )
}
