import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSalesVsWaste, getMonthlyTrend, getTopProducts } from '../lib/reportApi'
import {
  getProducts,
  getStockBatches,
  getTopSellers,
  LOW_STOCK_THRESHOLD,
  NEAR_EXPIRY_DAYS,
} from '../lib/inventoryApi'
import { getAllOrders } from '../lib/orderApi'
import { getSales } from '../lib/salesApi'
import { getNotifications } from '../lib/notificationApi'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  Warehouse,
  Trophy,
  Package,
  ScanLine,
  ClipboardList,
  Bell,
  ChevronRight,
  Truck,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'staff') return <StaffDashboard />
  return <DistributorDashboard />
}

function DistributorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [topSellers, setTopSellers] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTopSellers(), getProducts(), getNotifications()])
      .then(([sellers, products, notifData]) => {
        const enriched = sellers
          .map((s) => {
            const product = products.find((p) => p.id === s.id)
            return product ? { ...product, total_sold: s.total_sold } : null
          })
          .filter(Boolean)
        setTopSellers(enriched)
        setUnreadCount(notifData.unread_count)
      })
      .finally(() => setLoading(false))
  }, [])

  const medalStyle = (rank) => {
    if (rank === 0) return { bg: '#f5b31a', color: '#fff' } // gold
    if (rank === 1) return { bg: '#9aa0a6', color: '#fff' } // silver
    if (rank === 2) return { bg: 'var(--color-danger-500)', color: '#fff' } // bronze/red
    return { bg: 'var(--color-canvas)', color: 'var(--color-ink-soft)' }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-soft">Welcome back,</p>
          <h1 className="font-display text-xl font-semibold text-ink">{user?.name}</h1>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center"
        >
          <Bell size={18} className="text-ink" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white text-[10px] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {unreadCount > 0 && (
        <button
          onClick={() => navigate('/notifications')}
          className="mt-5 w-full flex items-center gap-4 rounded-xl bg-brand-700 text-white p-5 text-left"
        >
          <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
          <div className="flex-1">
            <p className="font-medium">{unreadCount} new update{unreadCount === 1 ? '' : 's'} on your orders</p>
            <p className="text-sm text-brand-100 mt-0.5">Review now to stay on top of your deliveries.</p>
          </div>
          <ChevronRight size={18} className="text-brand-100 shrink-0" />
        </button>
      )}

      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">Top Selling</h2>
        <Link to="/shop" className="text-sm text-brand-600 hover:underline">
          View all
        </Link>
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : topSellers.length === 0 ? (
          <p className="text-sm text-ink-soft">No sales data yet.</p>
        ) : (
          topSellers.map((p, i) => (
            <Link
              key={p.id}
              to={`/shop/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                style={{ background: medalStyle(i).bg, color: medalStyle(i).color }}
              >
                {i + 1}
              </div>
              <div className="w-12 h-12 rounded-md bg-canvas overflow-hidden shrink-0">
                {p.image_path && <img src={p.image_path} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {p.name} {p.weight && <span className="text-ink-soft font-normal">{p.weight}g</span>}
                </p>
                <p className="text-sm text-brand-600 font-medium">₱{Number(p.price).toFixed(2)}</p>
              </div>
              <ChevronRight size={16} className="text-ink-soft shrink-0" />
            </Link>
          ))
        )}
      </div>

      <h2 className="mt-7 font-display text-base font-semibold text-ink">My Orders</h2>
      <Link
        to="/orders"
        className="mt-3 flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
      >
        <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center shrink-0">
          <Truck size={18} className="text-ink-soft" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-brand-600">Track My Orders</p>
          <p className="text-xs text-ink-soft">See status of orders you've placed</p>
        </div>
        <ChevronRight size={16} className="text-ink-soft shrink-0" />
      </Link>
    </div>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StaffDashboard() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSales(), getProducts(), getStockBatches()])
      .then(([s, p, b]) => {
        setSales(s)
        setProducts(p)
        setBatches(b)
      })
      .finally(() => setLoading(false))
  }, [])

  const todayStr = new Date().toDateString()
  const mySalesToday = sales.filter(
    (s) => s.staff_id === user?.id && new Date(s.created_at).toDateString() === todayStr
  )
  const mySalesTotal = mySalesToday.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

  const lowStockProducts = products.filter((p) => p.stock_quantity <= LOW_STOCK_THRESHOLD)
  const nearExpiryBatches = batches.filter((b) => {
    if (!b.best_before) return false
    const diffDays = (new Date(b.best_before) - new Date()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= NEAR_EXPIRY_DAYS
  })

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">
        {greeting()}, {user?.name?.split(' ')[0] || 'there'}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/barcode-stockout"
          className="flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-50/50 p-4 hover:bg-brand-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-500 text-white flex items-center justify-center shrink-0">
            <ScanLine size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Scan a sale</p>
            <p className="text-xs text-ink-soft">Barcode stock-out</p>
          </div>
        </Link>
        <Link
          to="/waste"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:bg-canvas transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-alert-50 text-alert-700 flex items-center justify-center shrink-0">
            <ClipboardList size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Log waste</p>
            <p className="text-xs text-ink-soft">Damaged or spoiled items</p>
          </div>
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft">My sales today</p>
              <p className="mt-1 font-display text-2xl font-semibold text-brand-600">
                ₱{mySalesTotal.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{mySalesToday.length} sale{mySalesToday.length === 1 ? '' : 's'} recorded</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft flex items-center gap-1.5">
                <AlertTriangle size={13} /> Stock alerts
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-danger-500">
                {lowStockProducts.length + nearExpiryBatches.length}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {lowStockProducts.length} low stock, {nearExpiryBatches.length} expiring soon
              </p>
            </div>
          </div>

          {(lowStockProducts.length > 0 || nearExpiryBatches.length > 0) && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-3 flex items-center gap-1.5">
                <Boxes size={13} /> Needs attention
              </p>
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((p) => (
                  <div key={`low-${p.id}`} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{p.name}</span>
                    <span className="text-danger-500 text-xs font-medium">{p.stock_quantity} left</span>
                  </div>
                ))}
                {nearExpiryBatches.slice(0, 5).map((b) => (
                  <div key={`exp-${b.id}`} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{b.product?.name} — {b.batch_no}</span>
                    <span className="text-alert-700 text-xs font-medium">Exp. {b.best_before}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tint }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: tint.bg, color: tint.fg }}
      >
        <Icon size={18} />
      </div>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold" style={{ color: tint.fg }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const today = now.toISOString().slice(0, 10)

    Promise.all([
      getSalesVsWaste({ from: monthStart, to: today }),
      getMonthlyTrend(6),
      getProducts(),
      getStockBatches(),
      getTopProducts({ from: monthStart, to: today, limit: 5 }),
      getAllOrders(),
    ])
      .then(([s, t, p, b, tp, o]) => {
        setSummary(s)
        setTrend(t)
        setProducts(p)
        setBatches(b)
        setTopProducts(tp)
        setOrders(o)
      })
      .finally(() => setLoading(false))
  }, [])

  const lowStockProducts = products.filter((p) => p.stock_quantity <= LOW_STOCK_THRESHOLD)
  const nearExpiryBatches = batches.filter((b) => {
    if (!b.best_before) return false
    const diffDays = (new Date(b.best_before) - new Date()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= NEAR_EXPIRY_DAYS
  })
  const activeStockUnits = products.reduce((sum, p) => sum + Number(p.stock_quantity || 0), 0)

  const stockByWarehouse = batches.reduce((acc, b) => {
    const key = b.warehouse || 'Unassigned'
    acc[key] = (acc[key] || 0) + Number(b.quantity || 0)
    return acc
  }, {})
  const warehouseEntries = Object.entries(stockByWarehouse).sort((a, b) => b[1] - a[1])
  const maxWarehouseQty = Math.max(1, ...warehouseEntries.map(([, qty]) => qty))

  const distributorLeaderboard = orders.reduce((acc, o) => {
    const name = o.distributor?.name || 'Unknown'
    if (!acc[name]) acc[name] = { name, total: 0, orders: 0 }
    acc[name].total += Number(o.total_amount || 0)
    acc[name].orders += 1
    return acc
  }, {})
  const leaderboard = Object.values(distributorLeaderboard)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">
        Welcome back, {user?.name?.split(' ')[0] || 'there'}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Here's how things are looking this month.</p>

      {loading ? (
        <p className="mt-6 text-sm text-ink-soft">Loading dashboard…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Revenue this month"
              value={`₱${Number(summary?.sales?.total_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub={`vs ₱${Number(summary?.waste?.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} waste value`}
              tint={{ bg: 'rgba(15,110,92,.12)', fg: 'var(--color-brand-500)' }}
            />
            <StatCard
              icon={Boxes}
              label="Active stock units"
              value={activeStockUnits.toLocaleString()}
              sub={`Across ${warehouseEntries.length || 1} warehouse${warehouseEntries.length === 1 ? '' : 's'}`}
              tint={{ bg: 'rgba(37,99,235,.12)', fg: '#2563eb' }}
            />
            <StatCard
              icon={AlertTriangle}
              label="High-risk alerts"
              value={lowStockProducts.length + nearExpiryBatches.length}
              sub={`${nearExpiryBatches.length} expiring, ${lowStockProducts.length} low stock`}
              tint={{ bg: 'rgba(166,69,46,.12)', fg: 'var(--color-danger-500)' }}
            />
            <StatCard
              icon={Package}
              label="Net (this month)"
              value={`₱${Number(summary?.net_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub="Sales minus waste"
              tint={{ bg: 'rgba(201,162,39,.15)', fg: 'var(--color-alert-700)' }}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-3">
                Last 6 months
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }}
                    tickFormatter={(v) => `₱${v / 1000}k`}
                  />
                  <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="sales_total" stroke="var(--color-brand-500)" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="waste_value" stroke="var(--color-danger-500)" strokeWidth={2} name="Waste" />
                  <Line type="monotone" dataKey="net_amount" stroke="var(--color-alert-500)" strokeWidth={2} strokeDasharray="4 4" name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-3 flex items-center gap-1.5">
                <AlertTriangle size={14} /> High-Risk Alerts
              </p>
              {lowStockProducts.length === 0 && nearExpiryBatches.length === 0 ? (
                <p className="text-sm text-ink-soft py-6 text-center">No alerts right now.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lowStockProducts.map((p) => (
                    <div key={`low-${p.id}`} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-ink-soft">Only {p.stock_quantity} units left — Low stock</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-700">
                        Critical
                      </span>
                    </div>
                  ))}
                  {nearExpiryBatches.map((b) => (
                    <div key={`exp-${b.id}`} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {b.product?.name} — Batch {b.batch_no}
                        </p>
                        <p className="text-xs text-ink-soft">Expires {b.best_before}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700">
                        Near expiry
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-3 flex items-center gap-1.5">
                <Warehouse size={14} /> Stock by Warehouse
              </p>
              {warehouseEntries.length === 0 ? (
                <p className="text-sm text-ink-soft py-6 text-center">No stock batches yet.</p>
              ) : (
                <div className="space-y-3">
                  {warehouseEntries.map(([name, qty]) => (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-ink">{name}</span>
                        <span className="text-sm font-semibold text-ink">{qty.toLocaleString()} units</span>
                      </div>
                      <div className="h-2 rounded-full bg-canvas overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${(qty / maxWarehouseQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft mb-3">
                Top Products (this month, by revenue)
              </p>
              {topProducts.length === 0 ? (
                <p className="text-sm text-ink-soft py-6 text-center">No sales yet this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="product_name"
                      tick={{ fontSize: 10, fill: 'var(--color-ink-soft)' }}
                      tickFormatter={(v) => (v.length > 10 ? v.slice(0, 10) + '…' : v)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }} tickFormatter={(v) => `₱${v / 1000}k`} />
                    <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-3 flex items-center gap-1.5">
              <Trophy size={14} /> Distributor Leaderboard (all-time)
            </p>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-ink-soft py-6 text-center">No distributor orders yet.</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{
                        background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fde7d9' : 'var(--color-canvas)',
                        color: i === 0 ? '#b45309' : i === 1 ? '#475569' : i === 2 ? '#9a5324' : 'var(--color-ink-soft)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <p className="flex-1 text-sm font-medium text-ink">{d.name}</p>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-brand-600">
                        ₱{d.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-ink-soft">{d.orders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
