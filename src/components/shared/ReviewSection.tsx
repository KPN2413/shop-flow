import { useEffect, useState } from 'react'
import { Star, Edit2, Trash2, ShieldCheck, MessageSquarePlus, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { formatDate } from '@/lib/format'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────
interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  title: string | null
  body: string | null
  verified_purchase: boolean
  created_at: string
  updated_at: string
  profiles?: { full_name: string | null } | null
}

interface Props {
  productId: string
}

// ── Star display ─────────────────────────────────────────────────────────────
function StarRow({
  value,
  onChange,
  size = 'md',
  readonly = false,
}: {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}) {
  const [hovered, setHovered] = useState(0)
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'
  const active = hovered || value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <Star
            className={`${dim} transition-colors ${
              i <= active
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ── Rating bar (e.g. "5 ★ ████░░░ 12") ──────────────────────────────────────
function RatingBar({ label, count, total }: { label: number; count: number; total: number }) {
  const pct = total === 0 ? 0 : (count / total) * 100
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-muted-foreground">{label}</span>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-muted-foreground text-xs">{count}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
const PAGE_SIZE = 5

export function ReviewSection({ productId }: Props) {
  const { user, profile } = useAuth()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Write/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Derived
  const myReview = reviews.find(r => r.user_id === user?.id) ?? null
  const avgRating = reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const counts = [5, 4, 3, 2, 1].map(n => ({
    label: n,
    count: reviews.filter(r => r.rating === n).length,
  }))

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchReviews() {
    setLoading(true)
    const from = 0
    const to = page * PAGE_SIZE - 1

    const { data, count } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(from, to)

    setReviews((data as Review[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [productId, page])

  // ── Open write dialog ──────────────────────────────────────────────────────
  function openWrite(existing?: Review) {
    if (!user) { toast.error('Please sign in to write a review'); return }
    setEditingReview(existing ?? null)
    setRating(existing?.rating ?? 5)
    setTitle(existing?.title ?? '')
    setBody(existing?.body ?? '')
    setDialogOpen(true)
  }

  // ── Submit review ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!user) return
    if (rating === 0) { toast.error('Please select a star rating'); return }
    setSubmitting(true)

    // Check verified purchase
    const { data: purchased } = await supabase.rpc('has_purchased', { p_product_id: productId })

    const payload = {
      product_id: productId,
      user_id: user.id,
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
      verified_purchase: !!purchased,
    }

    let error
    if (editingReview) {
      ;({ error } = await supabase.from('reviews').update(payload).eq('id', editingReview.id))
    } else {
      ;({ error } = await supabase.from('reviews').insert(payload))
    }

    setSubmitting(false)

    if (error) {
      if (error.code === '23505') toast.error("You've already reviewed this product")
      else toast.error(error.message)
      return
    }

    toast.success(editingReview ? 'Review updated!' : 'Review submitted!')
    setDialogOpen(false)
    setPage(1)
    await fetchReviews()
  }

  // ── Delete review ──────────────────────────────────────────────────────────
  async function handleDelete(reviewId: string) {
    if (!confirm('Delete your review?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (error) { toast.error('Failed to delete review'); return }
    toast.success('Review deleted')
    await fetchReviews()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="mt-12">
      <Separator className="mb-8" />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Customer Reviews
        </h2>
        {user && !myReview && (
          <Button variant="outline" size="sm" onClick={() => openWrite()} className="gap-2">
            <MessageSquarePlus className="w-4 h-4" />
            Write a Review
          </Button>
        )}
      </div>

      {/* ── Summary ── */}
      {reviews.length > 0 && (
        <div className="shopflow-card p-6 mb-8 flex flex-col sm:flex-row gap-6">
          {/* Average */}
          <div className="flex flex-col items-center justify-center sm:w-36 shrink-0">
            <span className="text-5xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {avgRating.toFixed(1)}
            </span>
            <StarRow value={Math.round(avgRating)} readonly size="md" />
            <span className="text-xs text-muted-foreground mt-1">
              {total} {total === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          <Separator orientation="vertical" className="hidden sm:block" />
          <Separator className="sm:hidden" />

          {/* Breakdown bars */}
          <div className="flex-1 space-y-1.5">
            {counts.map(({ label, count }) => (
              <RatingBar key={label} label={label} count={count} total={reviews.length} />
            ))}
          </div>
        </div>
      )}

      {/* ── No reviews yet ── */}
      {!loading && reviews.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Star className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-semibold text-lg">No reviews yet</p>
          <p className="text-muted-foreground text-sm mt-1 mb-5">
            Be the first to share your experience
          </p>
          {user ? (
            <Button onClick={() => openWrite()} className="gap-2">
              <MessageSquarePlus className="w-4 h-4" /> Write a Review
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in to leave a review
            </p>
          )}
        </div>
      )}

      {/* ── Review list ── */}
      {reviews.length > 0 && (
        <div className="space-y-5">
          {reviews.map(review => {
            const isOwn = review.user_id === user?.id
            const name = review.profiles?.full_name || 'Anonymous'
            const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

            return (
              <div key={review.id} className="shopflow-card p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Avatar + meta */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{name}</span>
                        {isOwn && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">You</Badge>
                        )}
                        {review.verified_purchase && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs px-1.5 py-0 gap-1">
                            <ShieldCheck className="w-3 h-3" /> Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRow value={review.rating} readonly size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Owner actions */}
                  {isOwn && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openWrite(review)}
                        title="Edit review"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(review.id)}
                        title="Delete review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content */}
                {review.title && (
                  <p className="font-semibold text-sm mt-3">{review.title}</p>
                )}
                {review.body && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.body}</p>
                )}
              </div>
            )
          })}

          {/* Load more */}
          {reviews.length < total && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
            >
              <ChevronDown className="w-4 h-4" />
              {loading ? 'Loading…' : `Show more (${total - reviews.length} remaining)`}
            </Button>
          )}
        </div>
      )}

      {/* ── Write / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReview ? 'Edit Your Review' : 'Write a Review'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Star picker */}
            <div className="space-y-1.5">
              <Label>Your Rating <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-3">
                <StarRow value={rating} onChange={setRating} size="lg" />
                <span className="text-sm text-muted-foreground">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="review-title">
                Review Title
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <Input
                id="review-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Summarise your experience"
                maxLength={120}
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label htmlFor="review-body">
                Review
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <Textarea
                id="review-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="What did you like or dislike? Would you recommend this product?"
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {body.length}/1000
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
              >
                {submitting ? 'Submitting…' : editingReview ? 'Update Review' : 'Submit Review'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
