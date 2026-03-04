// Status badge components for orders, payments, and products

type OrderStatus = 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED'
type PaymentStatus = 'NOT_INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED'

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  CREATED: { label: 'Created', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  PAID: { label: 'Paid', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  FULFILLED: { label: 'Fulfilled', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
}

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  NOT_INITIATED: { label: 'Not Initiated', className: 'bg-gray-100 text-gray-700' },
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  SUCCESS: { label: 'Success', className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status] ?? { label: status, className: '' }
  return (
    <span className={`inline-flex items-center rounded-md border-0 px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status] ?? { label: status, className: '' }
  return (
    <span className={`inline-flex items-center rounded-md border-0 px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

export function ProductStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DRAFT: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center rounded-md border-0 px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? ''}`}>
      {status}
    </span>
  )
}
