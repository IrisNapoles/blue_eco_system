import { useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, updateQuantity, removeItem, total } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="mx-auto text-ink-soft" size={40} />
        <h1 className="mt-3 font-display text-lg font-semibold text-ink">Your cart is empty</h1>
        <p className="mt-1 text-sm text-ink-soft">Browse the shop to add products.</p>
        <button
          onClick={() => navigate('/shop')}
          className="mt-4 rounded-md bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-medium text-white"
        >
          Go to Shop
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink">Cart</h1>

      <div className="mt-4 rounded-xl border border-border bg-surface divide-y divide-border">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 p-4">
            <div className="w-14 h-14 rounded-md bg-canvas overflow-hidden shrink-0">
              {item.image_path && (
                <img src={item.image_path} alt={item.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{item.name}</p>
              <p className="text-xs text-ink-soft">₱{item.price.toFixed(2)} each</p>
            </div>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.product_id, Number(e.target.value))}
              className="w-16 rounded-md border border-border px-2 py-1.5 text-sm text-center focus:border-brand-500"
            />
            <p className="w-20 text-right text-sm font-medium text-ink">
              ₱{(item.price * item.quantity).toFixed(2)}
            </p>
            <button onClick={() => removeItem(item.product_id)} className="text-danger-500 shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          Subtotal: <span className="font-semibold text-ink text-base">₱{total.toFixed(2)}</span>
        </p>
        <button
          onClick={() => navigate('/checkout')}
          className="rounded-md bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-medium text-white"
        >
          Proceed to Checkout
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-soft text-center">Delivery fee is calculated at checkout.</p>
    </div>
  )
}
