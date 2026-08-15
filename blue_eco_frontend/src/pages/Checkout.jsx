import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { MapPin, CheckCircle2, Trash2, Minus, Plus, Pencil } from 'lucide-react'
import { useCart } from '../context/CartContext'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../lib/addressApi'
import { getDeliveryEstimate, placeOrder } from '../lib/orderApi'
import { getPaymentSettings } from '../lib/paymentSettingApi'

const MIN_QTY_PER_ITEM = 12
const MIN_ORDER_TOTAL = 5000
const MAX_ADDRESSES = 3

const STEPS = [
  { n: 1, label: 'Select Product' },
  { n: 2, label: 'Set Details' },
  { n: 3, label: 'Review & Submit' },
]

const EMPTY_ADDRESS_FORM = {
  recipient_name: '',
  contact_number: '',
  street_no: '',
  barangay: '',
  city: '',
  state_province: '',
  region: '',
  is_default: false,
}

function Stepper({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s.n ? 'bg-brand-700 text-white' : 'bg-canvas text-ink-soft'
              }`}
            >
              {s.n}
            </div>
            <p className={`mt-1 text-xs whitespace-nowrap ${step >= s.n ? 'text-brand-700 font-medium' : 'text-ink-soft'}`}>
              {s.label}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 h-0.5 mx-1 mb-4 ${step > s.n ? 'bg-brand-700' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Checkout() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(location.state?.startStep || 1)
  const [addresses, setAddresses] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('GCash')
  const [paymentSettings, setPaymentSettings] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [placedOrder, setPlacedOrder] = useState(null)

  const [addressesLoading, setAddressesLoading] = useState(true)
  const [addressesError, setAddressesError] = useState(null)

  function loadAddresses() {
    setAddressesLoading(true)
    setAddressesError(null)
    getAddresses()
      .then((data) => {
        setAddresses(data)
        const real = data.filter((a) => a.id !== 0)
        const def = real.find((a) => a.is_default) || real[0] || data[0]
        if (def && !selectedId) setSelectedId(def.id)
      })
      .catch((err) => {
        setAddressesError(
          err.response?.data?.message || err.response?.status || err.message || 'Unknown error'
        )
      })
      .finally(() => setAddressesLoading(false))
  }

  useEffect(() => {
    loadAddresses()
    getPaymentSettings().then(setPaymentSettings)
  }, [])

  const selectedAddress = addresses.find((a) => a.id === selectedId)

  const [estimateError, setEstimateError] = useState(null)

  useEffect(() => {
    if (!selectedAddress?.region || items.length === 0) return
    setEstimateError(null)
    const cartItems = items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    getDeliveryEstimate(selectedAddress.region, cartItems)
      .then(setEstimate)
      .catch((err) => {
        setEstimate(null)
        setEstimateError(
          err.response?.data?.message || err.response?.status || err.message || 'Unknown error'
        )
      })
  }, [selectedAddress?.region, items.map((i) => `${i.product_id}:${i.quantity}`).join('|')])

  const belowMinQty = items.some((i) => i.quantity < MIN_QTY_PER_ITEM)
  const belowMinTotal = total < MIN_ORDER_TOTAL
  const amountToMin = MIN_ORDER_TOTAL - total

  async function handleDeleteAddress(id) {
    if (!confirm('Remove this address?')) return
    await deleteAddress(id)
    loadAddresses()
  }

  if (placedOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <CheckCircle2 className="mx-auto text-brand-500" size={44} />
        <h1 className="mt-3 font-display text-lg font-semibold text-ink">Order placed!</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Order #{placedOrder.id} — ₱{Number(placedOrder.total_amount).toFixed(2)}
        </p>
        <Link to="/orders" className="mt-6 inline-block rounded-md bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-medium text-white">
          View my orders
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-ink-soft">Your cart is empty.</p>
        <Link to="/shop" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          Go to Shop
        </Link>
      </div>
    )
  }

  async function handleSubmit() {
    if (!selectedAddress) return
    setError(null)
    setSubmitting(true)
    try {
      const order = await placeOrder({
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        delivery_fee: estimate?.fee ?? 300,
        delivery_recipient_name: selectedAddress.recipient_name,
        delivery_contact_number: selectedAddress.contact_number,
        delivery_street_no: selectedAddress.street_no,
        delivery_barangay: selectedAddress.barangay,
        delivery_city: selectedAddress.city,
        delivery_state_province: selectedAddress.state_province,
        delivery_region: selectedAddress.region,
      })
      setPlacedOrder(order)
      clearCart()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not place this order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Create New Order</h1>
      <Stepper step={step} />

      {step >= 2 && selectedAddress && (
        <div className="rounded-xl border border-border bg-surface p-4 mb-4 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-brand-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-0.5">Deliver To</p>
              <p className="text-sm font-medium text-ink">
                {selectedAddress.recipient_name} | {selectedAddress.contact_number}
              </p>
              <p className="text-sm text-ink-soft">
                {selectedAddress.combined_address ||
                  [selectedAddress.street_no, selectedAddress.barangay, selectedAddress.city, selectedAddress.state_province, selectedAddress.region]
                    .filter(Boolean)
                    .join(', ')}
              </p>
            </div>
          </div>
          <button onClick={() => setShowAddressPicker(true)} className="text-sm text-brand-600 hover:underline shrink-0">
            Change
          </button>
        </div>
      )}

      {/* Address Selection sheet */}
      {showAddressPicker && !showAddAddress && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-t-xl sm:rounded-xl bg-surface border border-border p-5 max-h-[85vh] overflow-y-auto">
            <p className="font-display text-base font-semibold text-ink mb-3">Address Selection</p>
            {addressesLoading && <p className="text-sm text-ink-soft">Loading addresses…</p>}
            {addressesError && (
              <p className="text-sm text-danger-500">Could not load addresses: {addressesError}</p>
            )}
            {!addressesLoading && !addressesError && addresses.length === 0 && (
              <p className="text-sm text-ink-soft">No addresses found. Add one below.</p>
            )}
            <div className="space-y-3">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 ${selectedId === a.id ? 'border-brand-500' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input type="radio" checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} className="mt-1" />
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {a.recipient_name} | {a.contact_number}
                        </p>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {a.combined_address || [a.street_no, a.barangay, a.city, a.state_province, a.region].filter(Boolean).join(', ')}
                        </p>
                        {(a.id === 0 || a.is_default) && (
                          <span className="mt-1.5 inline-block rounded-full border border-brand-500 text-brand-600 px-2 py-0.5 text-[10px]">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                    {a.id !== 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingAddress(a)
                            setShowAddAddress(true)
                          }}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDeleteAddress(a.id)} className="text-danger-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {addresses.filter((a) => a.id !== 0).length < MAX_ADDRESSES ? (
              <button
                onClick={() => {
                  setEditingAddress(null)
                  setShowAddAddress(true)
                }}
                className="mt-4 w-full rounded-md border border-brand-500 text-brand-600 hover:bg-brand-50 px-4 py-2.5 text-sm font-medium"
              >
                + Add a new address
              </button>
            ) : (
              <p className="mt-4 text-xs text-ink-soft text-center">
                Maximum of {MAX_ADDRESSES} addresses reached. Remove one to add another.
              </p>
            )}
            <button
              onClick={() => setShowAddressPicker(false)}
              className="mt-2 w-full rounded-md px-4 py-2 text-sm text-ink-soft"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Address sheet */}
      {showAddAddress && (
        <AddressFormSheet
          initial={editingAddress}
          onClose={() => {
            setShowAddAddress(false)
            setEditingAddress(null)
          }}
          onSaved={(savedId) => {
            setShowAddAddress(false)
            setEditingAddress(null)
            loadAddresses()
            if (savedId) setSelectedId(savedId)
          }}
        />
      )}

      {error && (
        <div className="mb-4 rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* STEP 1 — Select Product */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft mb-3">Selected Products</p>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-canvas overflow-hidden shrink-0">
                    {item.image_path && <img src={item.image_path} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-sm text-ink">{item.name}</p>
                </div>
                <button onClick={() => removeItem(item.product_id)} className="text-danger-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Link to="/shop" className="text-sm text-brand-600 hover:underline">
              + Add more products
            </Link>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => navigate('/shop')}
              className="rounded-md border border-border px-4 py-2.5 text-sm text-ink-soft hover:bg-canvas"
            >
              ←
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Quantity & Payment Method */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft mb-3">Step 2: Quantity &amp; Payment Method</p>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.product_id} className="border-b border-border pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <button onClick={() => removeItem(item.product_id)} className="text-danger-500">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">Unit Price</p>
                    <div className="rounded-md bg-canvas px-3 py-2 text-sm text-ink">₱{item.price.toFixed(0)}</div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">Quantity (pieces)</p>
                    <div className="flex items-center gap-2 rounded-md bg-canvas px-2 py-1.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-surface border border-border flex items-center justify-center text-ink-soft"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="flex-1 text-center text-sm font-medium text-ink">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-surface border border-border flex items-center justify-center text-ink-soft"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
                <p className={`mt-1.5 text-xs ${item.quantity < MIN_QTY_PER_ITEM ? 'text-danger-500' : 'text-ink-soft'}`}>
                  Minimum order: {MIN_QTY_PER_ITEM} pieces
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs uppercase tracking-wide text-ink-soft mt-5 mb-3">Payment Method</p>
          <div className="space-y-2">
            {[
              { key: 'GCash', label: 'GCash QR', desc: 'Payment should be completed within 30 mins. Scan QR then upload proof of payment.' },
              { key: 'Bank Transfer', label: 'Bank Transfer', desc: 'Transfer then upload proof of payment.' },
              { key: 'COD', label: 'COD', desc: 'Pay physically upon logistics drop.' },
            ].map((opt) => (
              <label
                key={opt.key}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                  paymentMethod === opt.key ? 'border-brand-500 bg-brand-50/40' : 'border-border'
                }`}
              >
                <input type="radio" checked={paymentMethod === opt.key} onChange={() => setPaymentMethod(opt.key)} className="mt-1" />
                <div>
                  <p className="text-sm font-medium text-ink">{opt.label}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {paymentMethod === 'GCash' && paymentSettings?.gcash_account_name && (
            <div className="mt-3 rounded-lg bg-canvas p-3">
              <p className="text-sm font-medium text-ink">Pay via GCash</p>
              <p className="text-sm text-ink-soft mt-0.5">
                {paymentSettings.gcash_account_name} · {paymentSettings.gcash_account_number}
              </p>
              <p className="text-xs text-ink-soft mt-1">You'll upload proof of payment after submitting the order.</p>
            </div>
          )}
          {paymentMethod === 'Bank Transfer' && paymentSettings?.bank_name && (
            <div className="mt-3 rounded-lg bg-canvas p-3">
              <p className="text-sm font-medium text-ink">Pay via Bank Transfer</p>
              <p className="text-sm text-ink-soft mt-0.5">
                {paymentSettings.bank_name} — {paymentSettings.bank_account_name} · {paymentSettings.bank_account_number}
              </p>
              <p className="text-xs text-ink-soft mt-1">You'll upload proof of payment after submitting the order.</p>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Subtotal</span>
              <span className="text-ink">₱{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Delivery Fee</span>
              <span className="text-ink">{estimate ? `₱${estimate.fee.toFixed(2)}` : '…'}</span>
            </div>
            {estimateError && (
              <p className="text-xs text-danger-500">Delivery fee error: {estimateError}</p>
            )}
            {belowMinTotal && (
              <p className="text-xs text-alert-700 font-medium">
                Add ₱{amountToMin.toFixed(2)} more to reach the ₱{MIN_ORDER_TOTAL.toLocaleString()} minimum order
              </p>
            )}
            <div className="flex justify-between pt-1">
              <span className="font-medium text-ink">Total</span>
              <span className="font-display font-semibold text-brand-600">
                ₱{(total + (estimate?.fee || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => navigate('/shop')} className="rounded-md border border-border px-4 py-2.5 text-sm text-ink-soft hover:bg-canvas">
              ←
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={belowMinTotal || belowMinQty || !selectedAddress}
              className="flex-1 rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Review & Submit */}
      {step === 3 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft mb-3">Step 3: Review &amp; Submit</p>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm">
                <div>
                  <p className="text-ink font-medium">{item.name}</p>
                  <p className="text-ink-soft text-xs">Qty: {item.quantity} · ₱{item.price.toFixed(0)} each</p>
                </div>
                <span className="text-ink">₱{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink">Payment: {paymentMethod}</p>

          <div className="mt-3 border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Subtotal</span>
              <span className="text-ink">₱{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Delivery Fee</span>
              <span className="text-ink">{estimate ? `₱${estimate.fee.toFixed(2)}` : '…'}</span>
            </div>
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between">
            <span className="font-medium text-ink">Total</span>
            <span className="font-display font-semibold text-lg text-brand-600">
              ₱{(total + (estimate?.fee || 0)).toFixed(2)}
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep(2)} className="rounded-md border border-border px-4 py-2.5 text-sm text-ink-soft hover:bg-canvas">
              ←
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddressFormSheet({ initial, onClose, onSaved }) {
  const [values, setValues] = useState(initial && initial.id ? initial : EMPTY_ADDRESS_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      let savedId = initial?.id
      if (initial?.id) {
        await updateAddress(initial.id, values)
      } else {
        const { data } = await createAddress(values)
        savedId = data?.id
      }
      onSaved(savedId)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this address.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, placeholder) => (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft mb-1">{label}</label>
      <input
        value={values[key] || ''}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-t-xl sm:rounded-xl bg-surface border border-border p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onClose} className="text-ink-soft">←</button>
          <p className="font-display text-base font-semibold text-ink">
            {initial?.id ? 'Edit Address' : 'Add a New Address'}
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {field('Recipient Name', 'recipient_name', 'e.g. Juan Dela Cruz')}
          {field('Contact Number', 'contact_number', 'e.g. 0934567890')}
          {field('Street / House No.', 'street_no', 'e.g. 123 Rizal St.')}
          {field('Barangay', 'barangay', 'e.g. Malabanan')}
          {field('City / Municipality', 'city', 'e.g. Calamba')}
          {field('Province', 'state_province', 'e.g. Laguna')}
          {field('Region', 'region', 'e.g. Region IV-A')}

          <label className="flex items-center gap-2 text-sm text-ink pt-1">
            <input
              type="checkbox"
              checked={!!values.is_default}
              onChange={(e) => update('is_default', e.target.checked)}
            />
            Set as default address
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-brand-700 hover:bg-brand-600 disabled:opacity-60 px-4 py-3 text-sm font-medium text-white"
          >
            {saving ? 'Saving…' : 'Save Address'}
          </button>
        </form>
      </div>
    </div>
  )
}
