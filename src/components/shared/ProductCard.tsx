import React from 'react'
import { Link } from '@tanstack/react-router'
import { ShoppingCart, Package } from 'lucide-react'
import { Button } from '../ui/button'
import { formatINR } from '@/lib/format'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'react-hot-toast'
import type { ProductWithCategory } from '@/lib/database.types'

interface ProductCardProps {
  product: ProductWithCategory
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const { user } = useAuth()
  const invData = product.inventory as any
  const stock = Array.isArray(invData) ? (invData[0]?.stock ?? 0) : (invData?.stock ?? 0)
  const isOutOfStock = stock === 0

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) {
      toast.error('Please sign in to add items to cart')
      return
    }
    const result = await addToCart(product.id)
    if (result?.error) toast.error(result.error)
    else toast.success('Added to cart!')
  }

  return (
    <Link to="/product/$slug" params={{ slug: product.slug } as any} className="group block">
      <div className="product-card rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Package className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-semibold bg-destructive text-destructive-foreground">Out of Stock</span>
            </div>
          )}
          {!isOutOfStock && stock <= 5 && (
            <span
              className="absolute top-2 right-2 inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: 'hsl(var(--secondary))', color: 'white' }}
            >
              Only {stock} left
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {product.categories && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              {product.categories.name}
            </p>
          )}
          <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-snug mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            {product.title}
          </h3>
          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="price-inr text-lg text-foreground">
              {formatINR(product.price_paise)}
            </span>
            <Button
              size="sm"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="gap-1.5 shrink-0"
              style={!isOutOfStock ? { backgroundColor: 'hsl(var(--secondary))', color: 'white' } : {}}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {isOutOfStock ? 'Sold Out' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
