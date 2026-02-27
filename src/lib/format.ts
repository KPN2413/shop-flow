/**
 * Format paise (integer) to INR display string
 * e.g. 19900 => "₹199.00"
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees)
}

/**
 * Convert rupee string input to paise integer
 * e.g. "199" or "199.50" => 19950
 */
export function rupeesToPaise(rupees: string | number): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees
  if (isNaN(val)) return 0
  return Math.round(val * 100)
}

/**
 * Convert paise to rupees number for display in forms
 */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2)
}

/**
 * Auto-generate slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Format date to readable Indian format
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}
