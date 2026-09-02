import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Package, Tag, Scale, Archive, Hash } from 'lucide-react'
import { getProduct } from '../lib/inventoryApi'
import { useCart } from '../context/CartContext'
import { styles, LoadingState, Badge } from '../components/ui'

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

  if (loading) return <LoadingState />
  if (!product) return <p className="text-sm text-ink/40">Product not found.</p>

  const outOfStock = product.stock_quantity <= 0

  return (
    <div className="mx-auto max-w-lg font-['Plus_Jakarta_Sans']">
      <Link to="/shop" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={15} /> Product Details
      </Link>

      <div className={`flex h-64 items-center justify-center ${styles.card}`}>
        {product.image_path ? (
          <img src={product.image_path} alt={product.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <Package size={48} className="text-ink/20" />
        )}
      </div>

      <h1 className="mt-4 text-xl font-extrabold text-ink">{product.name}</h1>
      <p className="mt-1 text-2xl font-extrabold text-brand-700">₱{Number(product.price).toFixed(2)}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {product.form && (
          <Badge tone="neutral">
            <span className="inline-flex items-center gap-1.5">
              <Tag size={12} /> {product.form}
            </span>
          </Badge>
        )}
        {product.weight && (
          <Badge tone="neutral">
            <span className="inline-flex items-center gap-1.5">
              <Scale size={12} /> {product.weight}g
            </span>
          </Badge>
        )}
        <Badge tone={outOfStock ? 'danger' : 'brand'}>
          <span className="inline-flex items-center gap-1.5">
            <Archive size={12} /> {product.stock_quantity} in stock
          </span>
        </Badge>
        {product.sku && (
          <Badge tone="neutral">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Hash size={12} /> {product.sku}
            </span>
          </Badge>
        )}
      </div>

      {product.description && (
        <div className="mt-5">
          <p className="text-sm font-bold text-ink">Description</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{product.description}</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="flex-1 rounded-full border border-brand-400 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 rounded-full bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {outOfStock ? 'Out of Stock' : 'Buy Now'}
        </button>
      </div>
    </div>
  )
}
