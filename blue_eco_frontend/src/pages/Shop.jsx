import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingCart, Package, Search } from 'lucide-react'
import { getProducts } from '../lib/inventoryApi'
import { useCart } from '../context/CartContext'

export default function Shop() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const { addItem, items } = useCart()
  const navigate = useNavigate()
  const [justAdded, setJustAdded] = useState(null)

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const forms = [...new Set(products.map((p) => p.form).filter(Boolean))]
    return ['All', ...forms]
  }, [products])

  const filtered = products.filter((p) => {
    const matchesCategory = category === 'All' || p.form === category
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function handleAdd(product) {
    addItem(product, 1)
    setJustAdded(product.id)
    setTimeout(() => setJustAdded(null), 1200)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">Products</h1>
        <button
          onClick={() => navigate('/cart')}
          className="relative rounded-md border border-border bg-surface p-2.5 text-ink hover:bg-canvas"
        >
          <ShoppingCart size={18} />
          {items.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full rounded-full border border-border bg-surface pl-10 pr-4 py-2.5 text-sm focus:border-brand-500"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              category === c ? 'bg-brand-700 text-white' : 'bg-surface border border-border text-ink-soft'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-soft">Loading products…</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Link
              to={`/shop/${p.id}`}
              key={p.id}
              className="rounded-xl border border-border bg-surface p-3 flex flex-col hover:border-brand-500/40"
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs text-ink-soft">{p.form || p.sku}</span>
              </div>
              <div className="h-28 rounded-lg bg-canvas flex items-center justify-center overflow-hidden mb-2">
                {p.image_path ? (
                  <img src={p.image_path} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-ink-soft" size={28} />
                )}
              </div>
              <p className="text-sm font-medium text-ink leading-tight">
                {p.name} {p.weight && <span className="text-ink-soft font-normal">{p.weight}g</span>}
              </p>
              <p className="text-xs text-brand-600 font-medium mt-1">{p.stock_quantity} in stock</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-ink-soft">
                  Price: <span className="text-sm font-semibold text-ink">₱{Number(p.price).toFixed(0)}</span>
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleAdd(p)
                  }}
                  disabled={p.stock_quantity <= 0}
                  className="w-8 h-8 rounded-full bg-brand-700 hover:bg-brand-600 disabled:opacity-40 text-white flex items-center justify-center text-lg leading-none"
                >
                  {justAdded === p.id ? '✓' : '+'}
                </button>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-ink-soft text-center py-10 col-span-full">No products found.</p>
          )}
        </div>
      )}
    </div>
  )
}
