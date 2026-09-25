import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ChevronRight,
  Scan,
  Recycle,
  ShoppingBag,
  ClipboardList,
  Trophy,
  Truck,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

// How many units on hand counts as "running low." There's no
// per-product reorder_level column yet — this is a flat fallback
// threshold. Swap it out once that column exists.
const LOW_STOCK_THRESHOLD = 20

function formatPeso(amount) {
  const n = Number(amount) || 0
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Compact ₱ label for tight spaces (chart bars) — ₱1,234,567 becomes
// ₱1.2M so it never forces a flex item wider than its column.
function formatPesoCompact(amount) {
  const n = Number(amount) || 0
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`
  return `₱${n.toFixed(0)}`
}

// Same "Name 500g" convention Inventory.jsx uses — several products can
// share a name but come in different weights (separate catalog rows/SKUs),
// so the weight has to be shown or there's no way to tell them apart.
function formatProductLabel(name, weight) {
  const w = weight !== null && weight !== undefined && weight !== '' ? parseFloat(weight) : null
  return w ? `${name} ${w}g` : name
}

function isSameMonth(dateString, reference) {
  if (!dateString) return false
  const d = new Date(dateString)
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth()
}

function isToday(dateString, reference) {
  if (!dateString) return false
  const d = new Date(dateString)
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  )
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role

  if (role === 'staff') return <StaffDashboard user={user} />
  if (role === 'distributor') return <DistributorDashboard user={user} />
  return <AdminDashboard user={user} />
}

/* ------------------------------------------------------------------ */
/* Shared top bar                                                      */
/* ------------------------------------------------------------------ */

function TopBar({ firstName, subtitle, search, setSearch }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Hello, {firstName}!</h1>
        <p className="mt-0.5 text-sm text-ink/50">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, orders..."
            className="w-64 rounded-full border border-ink/10 bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink/30 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
        </div>
        <Link
          to="/notifications"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink/60 hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
        </Link>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Admin dashboard — system-wide overview, wired to real endpoints     */
/* ------------------------------------------------------------------ */

function AdminDashboard({ user }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [perfTab, setPerfTab] = useState('products') // 'products' | 'distributors' | 'movers'
  const [products, setProducts] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [pendingDistributors, setPendingDistributors] = useState([])
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [forecast, setForecast] = useState(null)
  const [salesToday, setSalesToday] = useState([])
  const [wasteToday, setWasteToday] = useState([])

  const firstName = user?.name ? user.name.split(' ')[0] : 'Admin'
  const now = new Date()

  useEffect(() => {
    let cancelled = false

    async function load() {
      // These four now paginate by default on the backend (20/page). The
      // dashboard needs full-dataset counts (total products, low-stock
      // count, today's sales/waste, etc.), not just one page of them, so
      // pass all: 1 to get the complete unpaginated array back — same
      // shape this code already expects.
      const results = await Promise.allSettled([
        api.get('/products', { params: { all: 1 } }),
        api.get('/admin/users'),
        api.get('/admin/orders', { params: { all: 1 } }),
        api.get('/admin/distributors/pending'),
        api.get('/admin/reports/monthly-trend', { params: { months: 12 } }),
        api.get('/admin/reports/sales-forecast', { params: { periods: 7 } }),
        api.get('/staff/sales', { params: { all: 1 } }),
        api.get('/staff/waste-log', { params: { all: 1 } }),
      ])
      if (cancelled) return

      const [productsRes, usersRes, ordersRes, pendingRes, trendRes, forecastRes, salesRes, wasteRes] = results

      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data)
      if (usersRes.status === 'fulfilled') setAllUsers(usersRes.value.data)
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data)
      if (pendingRes.status === 'fulfilled') setPendingDistributors(pendingRes.value.data)
      if (trendRes.status === 'fulfilled') setMonthlyTrend(trendRes.value.data)
      if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value.data)
      if (salesRes.status === 'fulfilled') setSalesToday(salesRes.value.data)
      if (wasteRes.status === 'fulfilled') setWasteToday(wasteRes.value.data)

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // --- Derived stats, all computed from real responses above ---
  const totalProducts = products.length
  const lowStockProducts = products.filter((p) => (p.stock_quantity ?? 0) < LOW_STOCK_THRESHOLD)

  const activeDistributors = allUsers.filter((u) => u.role === 'distributor' && u.status === 'active').length

  const totalOrders = orders.length
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4)

  const salesTodayCount = salesToday.filter((s) => isToday(s.created_at, now)).length
  const wasteTodayCount = wasteToday.filter((w) => isToday(w.created_at, now)).length
  const stockMovementsToday = salesTodayCount + wasteTodayCount

  const latestMonth = monthlyTrend[monthlyTrend.length - 1]
  const prevMonth = monthlyTrend[monthlyTrend.length - 2]

  const totalSalesThisMonth = latestMonth?.sales_total ?? 0
  const monthlyGrowthPct =
    prevMonth && Number(prevMonth.sales_total) > 0
      ? ((Number(latestMonth.sales_total) - Number(prevMonth.sales_total)) / Number(prevMonth.sales_total)) * 100
      : null
  const wasteRatePct =
    latestMonth && Number(latestMonth.sales_total) > 0
      ? (Number(latestMonth.waste_value) / Number(latestMonth.sales_total)) * 100
      : 0
  const profitMarginPct =
    latestMonth && Number(latestMonth.sales_total) > 0
      ? (Number(latestMonth.net_amount) / Number(latestMonth.sales_total)) * 100
      : 0

  const netAmountGrowthPct =
    prevMonth && Number(prevMonth.net_amount) > 0
      ? ((Number(latestMonth?.net_amount || 0) - Number(prevMonth.net_amount)) / Number(prevMonth.net_amount)) * 100
      : null
  const wasteValueChangePct =
    prevMonth && Number(prevMonth.waste_value) > 0
      ? ((Number(latestMonth?.waste_value || 0) - Number(prevMonth.waste_value)) / Number(prevMonth.waste_value)) * 100
      : null

  const next7DaysForecastTotal = forecast?.forecast
    ? forecast.forecast.reduce((sum, f) => sum + Number(f.predicted || 0), 0)
    : null

  const oldestPending = pendingDistributors.length
    ? [...pendingDistributors].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]
    : null
  const oldestPendingDaysAgo = oldestPending
    ? Math.max(0, Math.floor((now - new Date(oldestPending.created_at)) / (1000 * 60 * 60 * 24)))
    : null

  const salesTrendValues = monthlyTrend.length
    ? monthlyTrend.map((m) => Number(m.sales_total) || 0)
    : [0]

  // Product order-share split, feeds the donut card — % of ordered units
  // that belong to each product, computed from real order items.
  // Keyed by product id, not name: several products share a name but
  // come in different weights (separate catalog rows), and grouping by
  // name alone silently merged their quantities into one entry with no
  // way to tell which variant was which.
  const productOrderCounts = {}
  orders.forEach((o) => {
    o.items?.forEach((it) => {
      const product = it.product
      const key = product?.id ?? `unknown:${product?.name || 'Unknown'}`
      if (!productOrderCounts[key]) {
        productOrderCounts[key] = { name: product?.name || 'Unknown', weight: product?.weight ?? null, qty: 0 }
      }
      productOrderCounts[key].qty += Number(it.quantity || 0)
    })
  })
  const sortedProductOrders = Object.values(productOrderCounts).sort((a, b) => b.qty - a.qty)

  // Top 5 products by units ordered, for the compact ranked list at the
  // bottom of the page (replaces the old donut chart).
  const topProducts = sortedProductOrders.slice(0, 5).map((p) => ({
    name: formatProductLabel(p.name, p.weight),
    qty: p.qty,
  }))
  const maxProductQty = topProducts[0]?.qty || 1

  // Top distributors by total order value — grouped from the same
  // /admin/orders response already loaded above.
  const distributorTotals = {}
  orders.forEach((o) => {
    const name = o.distributor?.name || 'Unknown'
    if (!distributorTotals[name]) distributorTotals[name] = { name, total: 0, orderCount: 0 }
    distributorTotals[name].total += Number(o.total_amount || 0)
    distributorTotals[name].orderCount += 1
  })
  const topDistributors = Object.values(distributorTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
  const maxDistributorTotal = topDistributors[0]?.total || 1

  // Fast vs. slow movers — ranked by the same units-ordered figures used
  // for "Top Products". Each row in `products` is already a distinct
  // catalog entry (its own id), including different-weight variants of
  // the same name, so no separate dedupe step is needed here — matching
  // on product id (via productOrderCounts, keyed the same way above)
  // keeps every variant its own row instead of collapsing them together.
  const productsByQty = products
    .map((p) => ({
      key: p.id,
      name: formatProductLabel(p.name, p.weight),
      qty: productOrderCounts[p.id]?.qty || 0,
    }))
    .sort((a, b) => b.qty - a.qty)
  const splitPoint = Math.ceil(productsByQty.length / 2)
  const fastMovers = productsByQty.slice(0, Math.min(4, splitPoint))
  const slowMovers = productsByQty.slice(splitPoint).slice(-4).reverse()

  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <TopBar
        firstName={firstName}
        subtitle="Here's what's happening with your inventory today."
        search={search}
        setSearch={setSearch}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net Profit"
          value={loading ? '—' : formatPeso(latestMonth?.net_amount || 0)}
          sub="this month"
          changePct={netAmountGrowthPct}
          trendIcon={<MiniBars />}
        />
        <StatCard
          label="Waste Value"
          value={loading ? '—' : formatPeso(latestMonth?.waste_value || 0)}
          sub="this month"
          changePct={wasteValueChangePct}
          changeInverted
          trendIcon={<MiniLine tone="orange" />}
        />
        <StatCard
          label="Total Sales"
          value={loading ? '—' : formatPeso(totalSalesThisMonth)}
          sub="this month"
          trendIcon={<MiniLine tone="brand" />}
        />
        <StatCard
          label="Today's Stock Movements"
          value={loading ? '—' : stockMovementsToday}
          dark
          trendIcon={<MiniLine tone="white" />}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Sales Trend</h2>
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                Last {monthlyTrend.length || 12} months
              </span>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-ink/40 hover:text-ink">
              View reports ▾
            </Link>
          </div>

          <div className="mt-4 rounded-2xl bg-brand-100 p-3">
            <p className="text-[11px] text-ink/50">Monthly Growth</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-lg font-extrabold text-ink">
                {monthlyGrowthPct === null ? '—' : `${monthlyGrowthPct >= 0 ? '+' : ''}${monthlyGrowthPct.toFixed(1)}%`}
              </span>
              {monthlyGrowthPct !== null && (
                <span
                  className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    monthlyGrowthPct >= 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}
                >
                  {monthlyGrowthPct >= 0 ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5" />
                  )}
                  vs last month
                </span>
              )}
            </div>
          </div>

          <SalesSparkline values={salesTrendValues} />
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-ink">Profit Margin</h2>
          <p className="text-xs text-ink/40">This month (sales minus waste value)</p>
          {next7DaysForecastTotal !== null && (
            <p className="mt-2 text-xs text-ink/50">
              Next 7 days forecast: <span className="font-bold text-ink">{formatPeso(next7DaysForecastTotal)}</span>
            </p>
          )}
          {forecast?.warning && <p className="mt-1 text-[10px] text-red-500">{forecast.warning}</p>}
          <GaugeArc percent={Math.max(0, Math.min(100, Math.round(profitMarginPct)))} />
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400 text-xl font-bold text-white">
              {firstName[0].toUpperCase()}
            </div>
            <p className="mt-3 text-sm font-bold text-ink">{user?.name || 'Admin User'}</p>
            <p className="text-xs text-ink/40">{user?.email || ''}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-ink/10 border-t border-ink/10 pt-3 text-center">
            <div>
              <p className="text-sm font-extrabold text-ink">{loading ? '—' : totalProducts}</p>
              <p className="text-[10px] text-ink/40">Products</p>
            </div>
            <div>
              <p className="text-sm font-extrabold text-ink">{loading ? '—' : activeDistributors}</p>
              <p className="text-[10px] text-ink/40">Distributors</p>
            </div>
            <div>
              <p className="text-sm font-extrabold text-ink">{loading ? '—' : totalOrders}</p>
              <p className="text-[10px] text-ink/40">Orders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-ink">Low Stock Alert</h2>
          <p className="mt-1 text-xs text-ink/40">
            {loading
              ? 'Checking stock levels...'
              : `${lowStockProducts.length} product${lowStockProducts.length === 1 ? '' : 's'} below ${LOW_STOCK_THRESHOLD} units on hand.`}
          </p>

          {lowStockProducts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {lowStockProducts.slice(0, 4).map((p, i) => (
                <div
                  key={p.id}
                  className={`flex h-14 items-center justify-center rounded-2xl px-3 text-xs font-bold text-white shadow ${
                    i % 3 === 0 ? 'bg-brand-700' : i % 3 === 1 ? 'bg-brand-500' : 'bg-brand-400'
                  }`}
                  title={p.name}
                >
                  {p.stock_quantity ?? 0} left
                </div>
              ))}
            </div>
          )}

          <Link
            to="/inventory"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700"
          >
            View Inventory
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Recent Orders</h2>
            <Link to="/orders" className="text-[11px] font-semibold text-brand-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {loading && <p className="text-xs text-ink/40">Loading...</p>}
            {!loading && recentOrders.length === 0 && <p className="text-xs text-ink/40">No orders yet.</p>}
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-l-2 border-brand-400 pl-3">
                <div>
                  <p className="text-xs font-semibold text-ink">{o.distributor?.name || 'Distributor'}</p>
                  <p className="text-[10px] text-ink/40">{formatTimeAgo(o.created_at)}</p>
                </div>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-brand-700 p-6 text-center text-white shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-bold">Pending Approvals</p>
          <p className="mt-1 text-xs text-white/70">
            {loading
              ? 'Checking...'
              : `${pendingDistributors.length} new distributor registration${pendingDistributors.length === 1 ? '' : 's'} need your review.`}
          </p>
          {oldestPendingDaysAgo !== null && (
            <p className="mt-1 text-[10px] text-white/50">Oldest pending: {oldestPendingDaysAgo}d ago</p>
          )}
          <Link
            to="/users"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100"
          >
            Review now
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-[1.75rem] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Performance Overview</h2>
            <p className="text-[11px] text-ink/40">Products, distributors, and stock movement — all time</p>
          </div>
          <div className="flex gap-1.5 rounded-full bg-ink/5 p-1">
            {[
              { key: 'products', label: 'Top Products' },
              { key: 'distributors', label: 'Top Distributors' },
              { key: 'movers', label: 'Fast vs. Slow' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPerfTab(tab.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  perfTab === tab.key ? 'bg-white text-ink shadow-sm' : 'text-ink/40 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {perfTab === 'products' && (
            <RankedListSection
              icon={Trophy}
              title="Top Products"
              loading={loading}
              emptyText="No orders yet."
              items={topProducts.map((p) => ({
                key: p.name,
                label: p.name,
                value: `${p.qty} units`,
                fraction: p.qty / maxProductQty,
              }))}
            />
          )}

          {perfTab === 'distributors' && (
            <RankedListSection
              icon={Truck}
              title="Top Distributors"
              tone="alert"
              loading={loading}
              emptyText="No orders yet."
              items={topDistributors.map((d) => ({
                key: d.name,
                label: d.name,
                value: formatPesoCompact(d.total),
                fraction: d.total / maxDistributorTotal,
              }))}
            />
          )}

          {perfTab === 'movers' && (
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-xs font-bold text-ink">Fast vs. Slow Movers</h3>
              </div>

              {loading ? (
                <p className="mt-3 text-sm text-ink/40">Loading...</p>
              ) : fastMovers.length === 0 && slowMovers.length === 0 ? (
                <p className="mt-3 text-sm text-ink/40">No products yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-500">Fast movers</p>
                    <div className="mt-3 space-y-2">
                      {fastMovers.map((p) => (
                        <div key={p.key} className="flex items-center justify-between rounded-xl bg-brand-100 px-3 py-2">
                          <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                          <p className="shrink-0 text-xs text-ink/50">{p.qty} units</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-danger-500">Slow movers</p>
                    <div className="mt-3 space-y-2">
                      {slowMovers.map((p) => (
                        <div key={p.key} className="flex items-center justify-between rounded-xl bg-danger-50 px-3 py-2">
                          <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                          <p className="shrink-0 text-xs text-ink/50">{p.qty} units</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* One column of the "Performance Overview" card — an icon+title header
   followed by a compact ranked list (name, value, thin proportional
   bar). Only one of these (or the Fast/Slow view) is shown at a time,
   picked via the tab switcher above, so the section shows one clear
   chart instead of three competing for space at once. */
function RankedListSection({ icon: Icon, title, items, loading, emptyText, tone = 'brand', showRank = true, className = '' }) {
  const toneClasses = {
    brand: { iconBg: 'bg-brand-100', iconText: 'text-brand-600', bar: 'bg-brand-400' },
    alert: { iconBg: 'bg-alert-50', iconText: 'text-alert-700', bar: 'bg-alert-500' },
  }[tone]

  return (
    <div className={`pt-4 first:pt-0 lg:pt-0 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClasses.iconBg} ${toneClasses.iconText}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <h3 className="text-xs font-bold text-ink">{title}</h3>
      </div>

      <div className="mt-3 space-y-3">
        {loading && <p className="text-xs text-ink/40">Loading...</p>}
        {!loading && items.length === 0 && <p className="text-xs text-ink/40">{emptyText}</p>}
        {!loading &&
          items.map((item, i) => (
            <div key={item.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink">
                  {showRank && <span className="shrink-0 text-ink/30">{i + 1}.</span>}
                  {item.badge && (
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${item.badge.className}`}>
                      {item.badge.text}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-ink/60">{item.value}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                <div
                  className={`h-full rounded-full ${item.barColorClass || toneClasses.bar}`}
                  style={{ width: `${Math.max(4, Math.round((item.fraction || 0) * 100))}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Staff dashboard — daily stock operations, wired to real endpoints   */
/* ------------------------------------------------------------------ */

function StaffDashboard({ user }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [wasteLogs, setWasteLogs] = useState([])

  const firstName = user?.name ? user.name.split(' ')[0] : 'there'
  const now = new Date()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const results = await Promise.allSettled([
        api.get('/products'),
        api.get('/staff/sales'),
        api.get('/staff/waste-log'),
      ])
      if (cancelled) return
      const [productsRes, salesRes, wasteRes] = results
      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data)
      if (salesRes.status === 'fulfilled') setSales(salesRes.value.data)
      if (wasteRes.status === 'fulfilled') setWasteLogs(wasteRes.value.data)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const lowStockProducts = products.filter((p) => (p.stock_quantity ?? 0) < LOW_STOCK_THRESHOLD)
  const salesToday = sales.filter((s) => isToday(s.created_at, now))
  const wasteToday = wasteLogs.filter((w) => isToday(w.created_at, now))
  const wasteUnitsToday = wasteToday.reduce((sum, w) => sum + Number(w.quantity || 0), 0)
  const transactionsToday = salesToday.length + wasteToday.length

  const recentActivity = [
    ...sales.map((s) => ({
      label: s.items?.length === 1 ? s.items[0].product?.name : `${s.items?.length || 0} products`,
      action: `Stock-out · ${s.items?.reduce((sum, i) => sum + Number(i.quantity || 0), 0) || 0} units`,
      time: s.created_at,
    })),
    ...wasteLogs.map((w) => ({
      label: w.product?.name || 'Product',
      action: `Logged as waste · ${w.quantity} units`,
      time: w.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5)

  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <TopBar
        firstName={firstName}
        subtitle="Here's your stock activity for today."
        search={search}
        setSearch={setSearch}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock-Outs Today" value={loading ? '—' : salesToday.length} trendIcon={<MiniBars />} />
        <StatCard
          label="Units Logged as Waste"
          value={loading ? '—' : wasteUnitsToday}
          sub="today"
          trendIcon={<MiniLine tone="brand" />}
        />
        <StatCard label="Low Stock Alerts" value={loading ? '—' : lowStockProducts.length} trendIcon={<MiniLine tone="brand" />} />
        <StatCard label="Transactions Today" value={loading ? '—' : transactionsToday} dark trendIcon={<MiniLine tone="white" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickActionCard to="/barcode-stockout" icon={Scan} label="Barcode Stock-Out" desc="Scan and log outgoing stock" />
        <QuickActionCard to="/waste" icon={Recycle} label="Log Waste" desc="Record damaged or expired stock" />
        <QuickActionCard to="/inventory" icon={ClipboardList} label="View Inventory" desc="Check current stock levels" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-ink">Recent Activity</h2>
          <div className="mt-3 space-y-3">
            {loading && <p className="text-xs text-ink/40">Loading...</p>}
            {!loading && recentActivity.length === 0 && <p className="text-xs text-ink/40">No activity yet.</p>}
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between border-l-2 border-brand-400 pl-3">
                <div>
                  <p className="text-xs font-semibold text-ink">{a.label}</p>
                  <p className="text-[10px] text-ink/40">{a.action}</p>
                </div>
                <span className="text-[10px] text-ink/30">{formatTimeAgo(a.time)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-ink">Low Stock Alert</h2>
          <p className="mt-1 text-xs text-ink/40">
            {loading ? 'Checking...' : `${lowStockProducts.length} product(s) below ${LOW_STOCK_THRESHOLD} units.`}
          </p>
          {lowStockProducts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 3).map((p, i) => (
                <div
                  key={p.id}
                  title={p.name}
                  className={`flex h-12 items-center justify-center rounded-2xl px-3 text-[11px] font-bold text-white shadow ${
                    i % 3 === 0 ? 'bg-brand-700' : i % 3 === 1 ? 'bg-brand-500' : 'bg-brand-400'
                  }`}
                >
                  {p.stock_quantity ?? 0} left
                </div>
              ))}
            </div>
          )}
          <Link
            to="/inventory"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
          >
            View Inventory
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Distributor dashboard — own orders, wired to real endpoint          */
/* ------------------------------------------------------------------ */

const STATUS_STYLES = {
  Pending: 'bg-brand-100 text-brand-700',
  Approved: 'bg-blue-100 text-blue-700',
  Packing: 'bg-blue-100 text-blue-700',
  'Ready for Pickup': 'bg-blue-100 text-blue-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

function DistributorDashboard({ user }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])

  const firstName = user?.name ? user.name.split(' ')[0] : 'there'
  const now = new Date()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.get('/distributor/orders')
        if (!cancelled) setOrders(res.data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const activeOrders = orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status))
  const deliveredThisMonth = orders.filter((o) => o.status === 'Completed' && isSameMonth(o.created_at, now))
  const totalSpentThisMonth = orders
    .filter((o) => isSameMonth(o.created_at, now))
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <TopBar
        firstName={firstName}
        subtitle="Here's what's happening with your orders."
        search={search}
        setSearch={setSearch}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active Orders" value={loading ? '—' : activeOrders.length} trendIcon={<MiniBars />} />
        <StatCard label="Delivered This Month" value={loading ? '—' : deliveredThisMonth.length} trendIcon={<MiniLine tone="brand" />} />
        <StatCard
          label="Total Spent"
          value={loading ? '—' : formatPeso(totalSpentThisMonth)}
          sub="this month"
          dark
          trendIcon={<MiniLine tone="white" />}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickActionCard to="/shop" icon={ShoppingBag} label="Browse Products" desc="Place a new advance order" />
        <QuickActionCard to="/orders" icon={ClipboardList} label="Track My Orders" desc="Check status of past orders" />
      </div>

      <div className="mt-4 rounded-[1.75rem] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">My Orders</h2>
          <Link to="/orders" className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                <th className="pb-2">Order</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-3 text-xs text-ink/40">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-xs text-ink/40">
                    No orders yet —{' '}
                    <Link to="/shop" className="font-semibold text-brand-500 hover:underline">
                      browse products
                    </Link>{' '}
                    to place one.
                  </td>
                </tr>
              )}
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-ink/5">
                  <td className="py-3 font-medium text-ink">#{order.id}</td>
                  <td className="py-3 text-ink/70">{order.items?.length || 0} items</td>
                  <td className="py-3 text-ink/70">{formatPeso(order.total_amount)}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_STYLES[order.status] || 'bg-ink/10 text-ink/60'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared small components                                             */
/* ------------------------------------------------------------------ */

function QuickActionCard({ to, icon: Icon, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-[1.75rem] bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-lime-100 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-[11px] text-ink/40">{desc}</p>
      </div>
    </Link>
  )
}

function StatCard({ label, value, sub, dark, trendIcon, changePct, changeInverted }) {
  const hasChange = changePct !== undefined && changePct !== null
  // By default a positive % is good (green, up arrow). For metrics where
  // "up" is bad (e.g. waste value), changeInverted flips the color logic
  // while still showing the real direction of the arrow.
  const isGood = hasChange ? (changeInverted ? changePct <= 0 : changePct >= 0) : true

  return (
    <div className={`rounded-[1.75rem] p-5 shadow-sm ${dark ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs ${dark ? 'text-white/60' : 'text-ink/50'}`}>{label}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-xl font-extrabold">{value}</p>
            {sub && <span className={`text-[10px] ${dark ? 'text-white/50' : 'text-ink/30'}`}>{sub}</span>}
          </div>
          {hasChange && (
            <p
              className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                isGood ? (dark ? 'text-accent-lime' : 'text-brand-500') : 'text-red-500'
              }`}
            >
              {changePct >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(changePct).toFixed(0)}% from last month
            </p>
          )}
        </div>
        {trendIcon}
      </div>
    </div>
  )
}

function MiniBars() {
  const bars = [8, 14, 10, 18, 22]
  return (
    <svg width="44" height="24" viewBox="0 0 44 24" className="text-accent-lime">
      {bars.map((h, i) => (
        <rect key={i} x={i * 9} y={24 - h} width="5" height={h} rx="2" fill="currentColor" opacity={0.5 + i * 0.1} />
      ))}
    </svg>
  )
}

function MiniLine({ tone = 'brand' }) {
  const color = tone === 'white' ? '#ffffff' : tone === 'orange' ? 'var(--color-accent-orange)' : 'currentColor'
  return (
    <svg
      width="52"
      height="24"
      viewBox="0 0 52 24"
      className={tone === 'white' || tone === 'orange' ? '' : 'text-brand-400'}
      fill="none"
    >
      <path
        d="M0 18 C 8 18, 8 6, 16 10 C 24 14, 24 4, 32 8 C 40 12, 40 2, 52 6"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={tone === 'white' ? 0.9 : 1}
      />
    </svg>
  )
}

function SalesSparkline({ values }) {
  const width = 600
  const height = 120
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const stepX = values.length > 1 ? width / (values.length - 1) : width

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 20) - 10
    return [x, y]
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-28 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" className="text-brand-400" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-brand-400" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparklineFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-500"
      />
    </svg>
  )
}

function GaugeArc({ percent }) {
  const circumference = Math.PI * 70
  const filled = (percent / 100) * circumference

  return (
    <div className="relative mt-2 flex justify-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="text-brand-100"
        />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="text-accent-lime"
        />
      </svg>
      <div className="absolute bottom-0 text-2xl font-extrabold text-ink">{percent}%</div>
    </div>
  )
}
