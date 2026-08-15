import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getProducts } from '../lib/inventoryApi'
import {
  getMyOrders,
  placeOrder,
  cancelOrder,
  markReceived,
  uploadProofOfPayment,
  getDeliveryEstimate,
  getAllOrders,
  updateOrderStatus,
  verifyPayment,
  uploadPackedPhoto,
} from '../lib/orderApi'
import { Store, ChevronRight, ShoppingCart } from 'lucide-react'
import Modal from '../components/Modal'

const STATUS_FLOW = ['Pending', 'Approved', 'Packing', 'Ready for Pickup', 'Shipped', 'Completed', 'Cancelled']

const STATUS_STYLES = {
  Pending: 'bg-alert-50 text-alert-700',
  Approved: 'bg-brand-50 text-brand-600',
  Packing: 'bg-brand-50 text-brand-600',
  'Ready for Pickup': 'bg-brand-50 text-brand-600',
  Shipped: 'bg-brand-50 text-brand-600',
  Completed: 'bg-brand-50 text-brand-700',
  Cancelled: 'bg-danger-50 text-danger-700',
}

const STATUS_TEXT_COLOR = {
  Pending: 'text-danger-500',
  Approved: 'text-alert-700',
  Packing: 'text-alert-700',
  'Ready for Pickup': 'text-alert-700',
  Shipped: 'text-blue-600',
  Completed: 'text-brand-600',
  Cancelled: 'text-ink-soft',
}

export default function Orders() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <AdminOrders /> : <DistributorOrders />
}

const TABS = ['All', 'To Pay', 'To Ship', 'To Receive', 'Completed', 'Cancelled']

function isAwaitingPayment(o) {
  return o.payment_method !== 'COD' && ['unpaid', 'rejected'].includes(o.payment_status)
}

function tabsForOrder(o) {
  const tabs = ['All']
  if (o.status === 'Cancelled') {
    tabs.push('Cancelled')
    return tabs
  }
  if (o.status === 'Pending' && isAwaitingPayment(o)) tabs.push('To Pay')
  else if (['Pending', 'Approved', 'Packing', 'Ready for Pickup'].includes(o.status)) tabs.push('To Ship')
  else if (o.status === 'Shipped') tabs.push('To Receive')
  else if (o.status === 'Completed') tabs.push('Completed')
  return tabs
}

// --- Distributor ---
function DistributorOrders() {
  const navigate = useNavigate()
  const { items } = useCart()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')

  const load = useCallback(() => {
    setLoading(true)
    getMyOrders()
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCancel(id) {
    if (!confirm('Cancel this order?')) return
    await cancelOrder(id)
    load()
  }

  async function handleReceived(id) {
    await markReceived(id)
    load()
  }

  const filtered = orders.filter((o) => tabsForOrder(o).includes(activeTab))

  if (loading) return <p className="text-sm text-ink-soft">Loading orders…</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">My Orders</h1>
        <button
          onClick={() => navigate('/cart')}
          className="relative rounded-md bg-brand-500 hover:bg-brand-600 p-2.5 text-white"
        >
          <ShoppingCart size={18} />
          {items.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger-500 text-white text-xs flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 flex border-b border-border bg-surface rounded-t-lg overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 shrink-0 px-3 py-3 text-sm text-center border-b-2 -mb-px transition-colors ${
              activeTab === t
                ? 'border-brand-500 text-brand-600 font-semibold'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {filtered.map((o) => {
          const totalPieces = o.items?.reduce((sum, it) => sum + it.quantity, 0) || 0
          const firstItem = o.items?.[0]
          return (
            <div key={o.id} className="rounded-lg bg-surface shadow-sm overflow-hidden">
              <Link to={`/orders/${o.id}`} className="block hover:bg-canvas/40">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                    <Store size={14} className="text-ink-soft" /> Order #{o.id}
                  </p>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TEXT_COLOR[o.status] || 'text-ink-soft'}`}>
                    {o.status}
                  </span>
                </div>

                {firstItem && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-md bg-canvas overflow-hidden shrink-0">
                      {firstItem.product?.image_path && (
                        <img src={firstItem.product.image_path} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink truncate">
                        {firstItem.product?.name}{' '}
                        {firstItem.product?.weight && (
                          <span className="text-ink-soft">{firstItem.product.weight}g</span>
                        )}
                      </p>
                      {o.items.length > 1 && (
                        <p className="text-xs text-ink-soft mt-0.5">+{o.items.length - 1} more item{o.items.length > 2 ? 's' : ''}</p>
                      )}
                    </div>
                    <p className="text-sm text-ink-soft shrink-0">×{firstItem.quantity}</p>
                  </div>
                )}

                <div className="px-4 pb-2 flex items-center justify-between">
                  <p className="text-xs text-ink-soft">{totalPieces} pcs</p>
                  <p className="text-sm text-ink">
                    Order Total: <span className="font-semibold">₱{Number(o.total_amount).toFixed(2)}</span>
                  </p>
                </div>
              </Link>

              {(o.status === 'Pending' || o.status === 'Shipped') && (
                <div className="border-t border-border px-4 py-3 flex items-center justify-end gap-2">
                  {o.status === 'Pending' && (
                    <button
                      onClick={() => handleCancel(o.id)}
                      className="rounded-full border border-danger-500 text-danger-500 hover:bg-danger-50 px-4 py-1.5 text-xs font-medium"
                    >
                      Cancel Order
                    </button>
                  )}
                  {o.status === 'Shipped' && (
                    <button
                      onClick={() => handleReceived(o.id)}
                      className="rounded-full bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 text-xs font-medium"
                    >
                      Mark as Received
                    </button>
                  )}
                  <Link
                    to={`/orders/${o.id}`}
                    className="rounded-full border border-border text-ink hover:bg-canvas px-4 py-1.5 text-xs font-medium flex items-center gap-1"
                  >
                    View Order <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-ink-soft text-center py-8">No orders in this category.</p>
        )}
      </div>
    </div>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getAllOrders()
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleStatusChange(id, status) {
    await updateOrderStatus(id, status)
    load()
  }

  async function handleVerify(id, action) {
    await verifyPayment(id, action)
    load()
  }

  async function handlePackedPhoto(id, file) {
    const formData = new FormData()
    formData.append('photo', file)
    await uploadPackedPhoto(id, formData)
    load()
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading orders…</p>

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Orders (all distributors)</h1>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Distributor</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-ink">#{o.id}</td>
                <td className="px-4 py-3">{o.distributor?.name}</td>
                <td className="px-4 py-3">₱{Number(o.total_amount).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-ink-soft">
                    {o.payment_method} · {o.payment_status}
                  </span>
                  {o.payment_status === 'proof_submitted' && (
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={() => handleVerify(o.id, 'verify')}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleVerify(o.id, 'reject')}
                        className="text-xs text-danger-500 hover:underline"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="rounded-md border border-border px-2 py-1 text-xs focus:border-brand-500"
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {['Packing', 'Ready for Pickup'].includes(o.status) && !o.packed_photo_path && (
                    <div className="mt-1">
                      <label className="text-xs text-brand-600 hover:underline cursor-pointer">
                        Upload packed photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handlePackedPhoto(o.id, file)
                          }}
                        />
                      </label>
                    </div>
                  )}
                </td>
                <td></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
