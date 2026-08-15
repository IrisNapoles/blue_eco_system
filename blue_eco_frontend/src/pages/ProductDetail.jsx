import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Package, Tag, Scale, Archive, Hash } from 'lucide-react'
import { getProduct } from '../lib/inventoryApi'
import { useCart } from '../context/CartContext'

const MIN_ORDER_QTY = 12

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, clearCart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    getProduct(id)
      .then(setProduct)
      .finally(() => setLoading(false))
  }, [id])

  function handleAddToCart() {
    addItem(product, MIN_ORDER_QTY)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  function handleBuyNow() {
    clearCart()
    addItem(product, MIN_ORDER_QTY)
    navigate('/checkout', { state: { startStep: 2 } })
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!product) return <p className="text-sm text-ink-soft">Product not found.</p>

  const outOfStock = product.stock_quantity <= 0

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4">
        <ArrowLeft size={15} /> Product Details
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 flex items-center justify-center h-64">
        {product.image_path ? (
          <img src={product.image_path} alt={product.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <Package size={48} className="text-ink-soft" />
        )}
      </div>

      <h1 className="mt-4 font-display text-xl font-semibold text-ink">{product.name}</h1>
      <p className="mt-1 font-display text-2xl font-semibold text-brand-600">₱{Number(product.price).toFixed(2)}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {product.form && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-ink-soft">
            <Tag size={12} /> {product.form}
          </span>
        )}
        {product.weight && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-ink-soft">
            <Scale size={12} /> {product.weight}g
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-ink-soft">
          <Archive size={12} /> {product.stock_quantity} in stock
        </span>
        {product.sku && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-ink-soft font-mono">
            <Hash size={12} /> {product.sku}
          </span>
        )}
      </div>

      {product.description && (
        <div className="mt-5">
          <p className="font-display text-base font-semibold text-ink">Description</p>
          <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{product.description}</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="flex-1 rounded-md border border-brand-500 text-brand-600 hover:bg-brand-50 disabled:opacity-50 px-4 py-3 text-sm font-medium"
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 rounded-md bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-3 text-sm font-medium"
        >
          {outOfStock ? 'Out of Stock' : 'Buy Now'}
        </button>
      </div>
    </div>
  )
}
