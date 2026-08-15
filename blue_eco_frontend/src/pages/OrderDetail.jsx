import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, MapPin, CreditCard } from 'lucide-react'
import { getMyOrders, cancelOrder, markReceived, uploadProofOfPayment } from '../lib/orderApi'

const STATUS_STYLES = {
  Pending: 'bg-alert-50 text-alert-700',
  Approved: 'bg-brand-50 text-brand-600',
  Packing: 'bg-brand-50 text-brand-600',
  'Ready for Pickup': 'bg-brand-50 text-brand-600',
  Shipped: 'bg-brand-50 text-brand-600',
  Completed: 'bg-brand-50 text-brand-700',
  Cancelled: 'bg-danger-50 text-danger-700',
}

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    getMyOrders()
      .then((orders) => setOrder(orders.find((o) => String(o.id) === String(id)) || null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return
    await cancelOrder(order.id)
    load()
  }

  async function handleReceived() {
    await markReceived(order.id)
    load()
  }

  async function handleUploadProof(file) {
    const formData = new FormData()
    formData.append('proof', file)
    await uploadProofOfPayment(order.id, formData)
    load()
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!order) return <p className="text-sm text-ink-soft">Order not found.</p>

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Order #{order.id}</h1>
          <p className="text-xs text-ink-soft mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-canvas text-ink-soft'}`}>
          {order.status}
        </span>
      </div>

      {order.status === 'Cancelled' && order.cancellation_reason && (
        <div className="mt-4 rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
          Cancelled: {order.cancellation_reason}
        </div>
      )}

      {order.estimated_delivery_min && order.estimated_delivery_max && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Estimated Delivery</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {order.estimated_delivery_min} to {order.estimated_delivery_max}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-ink mb-3 flex items-center gap-1.5">
          <Package size={15} /> Items
        </p>
        <div className="space-y-1.5">
          {order.items?.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span className="text-ink-soft">{it.product?.name} ×{it.quantity}</span>
              <span className="text-ink">₱{(it.price * it.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-border mt-3 pt-3 flex justify-between text-sm">
          <span className="text-ink-soft">Delivery fee</span>
          <span className="text-ink">₱{Number(order.delivery_fee).toFixed(2)}</span>
        </div>
        <div className="border-t border-border mt-2 pt-2 flex justify-between">
          <span className="font-medium text-ink">Total</span>
          <span className="font-display font-semibold text-brand-600">₱{Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-ink mb-2 flex items-center gap-1.5">
          <MapPin size={15} /> Delivery Address
        </p>
        <p className="text-sm text-ink">{order.delivery_recipient_name}</p>
        <p className="text-sm text-ink-soft">
          {[order.delivery_street_no, order.delivery_barangay, order.delivery_city, order.delivery_state_province, order.delivery_region]
            .filter(Boolean)
            .join(', ')}
        </p>
        <p className="text-sm text-ink-soft">{order.delivery_contact_number}</p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-ink mb-2 flex items-center gap-1.5">
          <CreditCard size={15} /> Payment
        </p>
        <p className="text-sm text-ink-soft">
          {order.payment_method} · {order.payment_status}
        </p>
        {order.payment_method !== 'COD' && ['unpaid', 'rejected'].includes(order.payment_status) && (
          <div className="mt-3 rounded-md bg-alert-50 px-3 py-2">
            <p className="text-xs text-alert-700 mb-1">
              {order.payment_status === 'rejected'
                ? `Payment rejected${order.payment_note ? ': ' + order.payment_note : ''} — please re-upload.`
                : 'Upload proof of payment to proceed.'}
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadProof(file)
              }}
              className="text-xs"
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        {order.status === 'Pending' && (
          <button
            onClick={handleCancel}
            className="rounded-md border border-danger-500 text-danger-500 hover:bg-danger-50 px-4 py-2 text-sm font-medium"
          >
            Cancel Order
          </button>
        )}
        {order.status === 'Shipped' && (
          <button
            onClick={handleReceived}
            className="rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Mark as Received
          </button>
        )}
      </div>
    </div>
  )
}
