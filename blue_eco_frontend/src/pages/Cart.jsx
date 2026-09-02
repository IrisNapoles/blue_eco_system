import { useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { styles, EmptyState } from '../components/ui'

export default function Cart() {
  const { items, updateQuantity, removeItem, total } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="font-['Plus_Jakarta_Sans']">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the shop to add products."
          action={
            <button onClick={() => navigate('/shop')} className={styles.btnPrimary}>
              Go to Shop
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl font-['Plus_Jakarta_Sans']">
      <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Cart</h1>

      <div className={`mt-4 divide-y divide-ink/5 ${styles.card} p-0`}>
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 p-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-100">
              {item.image_path && (
                <img src={item.image_path} alt={item.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
              <p className="text-xs text-ink/40">₱{item.price.toFixed(2)} each</p>
            </div>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.product_id, Number(e.target.value))}
              className="w-16 rounded-full border border-ink/10 px-2 py-1.5 text-center text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
            <p className="w-20 text-right text-sm font-bold text-ink">
              ₱{(item.price * item.quantity).toFixed(2)}
            </p>
            <button onClick={() => removeItem(item.product_id)} className="shrink-0 text-red-500 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className={`mt-4 flex items-center justify-between ${styles.card}`}>
        <p className="text-sm text-ink/50">
          Subtotal: <span className="text-base font-bold text-ink">₱{total.toFixed(2)}</span>
        </p>
        <button onClick={() => navigate('/checkout')} className={styles.btnPrimary}>
          Proceed to Checkout
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-ink/40">Delivery fee is calculated at checkout.</p>
    </div>
  )
}
