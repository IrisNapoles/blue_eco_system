import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingCart, Package, Search } from 'lucide-react'
import { getProducts } from '../lib/inventoryApi'
import { useCart } from '../context/CartContext'
import { LoadingState } from '../components/ui'

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
    <div className="font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Products</h1>
        <button
          onClick={() => navigate('/cart')}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink/60 shadow-sm hover:text-ink"
        >
          <ShoppingCart size={18} />
          {items.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              {items.length}
            </span>
          )}
        </button>
      </div>

      <div className="relative mt-4">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full rounded-full border border-ink/10 bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink/30 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === c ? 'bg-ink text-white' : 'bg-white text-ink/50 shadow-sm hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingState label="Loading products…" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              to={`/shop/${p.id}`}
              key={p.id}
              className="flex flex-col rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-1 flex items-start justify-between">
                <span className="text-xs text-ink/40">{p.form || p.sku}</span>
              </div>
              <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-brand-100">
                {p.image_path ? (
                  <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="text-ink/20" size={28} />
                )}
              </div>
              <p className="text-sm font-semibold leading-tight text-ink">
                {p.name} {p.weight && <span className="font-normal text-ink/40">{p.weight}g</span>}
              </p>
              <p className="mt-1 text-xs font-medium text-brand-700">{p.stock_quantity} in stock</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-ink/40">
                  Price: <span className="text-sm font-bold text-ink">₱{Number(p.price).toFixed(0)}</span>
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleAdd(p)
                  }}
                  disabled={p.stock_quantity <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-lg font-bold leading-none text-white transition hover:bg-brand-700 disabled:opacity-40"
                >
                  {justAdded === p.id ? '✓' : '+'}
                </button>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-ink/40">No products found.</p>
          )}
        </div>
      )}
    </div>
  )
}
