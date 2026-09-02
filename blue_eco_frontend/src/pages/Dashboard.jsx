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
      const results = await Promise.allSettled([
        api.get('/products'),
        api.get('/admin/users'),
        api.get('/admin/orders'),
        api.get('/admin/distributors/pending'),
        api.get('/admin/reports/monthly-trend', { params: { months: 12 } }),
        api.get('/admin/reports/sales-forecast', { params: { periods: 7 } }),
        api.get('/staff/sales'),
        api.get('/staff/waste-log'),
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
  const productOrderCounts = {}
  orders.forEach((o) => {
    o.items?.forEach((it) => {
      const name = it.product?.name || 'Unknown'
      productOrderCounts[name] = (productOrderCounts[name] || 0) + Number(it.quantity || 0)
    })
  })
  const sortedProductOrders = Object.entries(productOrderCounts).sort((a, b) => b[1] - a[1])
  const topProductColors = ['var(--color-accent-lime)', 'var(--color-accent-orange)', 'var(--color-accent-teal)', 'var(--color-brand-400)']
  const top3 = sortedProductOrders.slice(0, 3)
  const othersTotal = sortedProductOrders.slice(3).reduce((sum, [, qty]) => sum + qty, 0)
  const totalOrderedUnits = sortedProductOrders.reduce((sum, [, qty]) => sum + qty, 0)
  const productOrderBreakdown = [
    ...top3.map(([name, qty], i) => ({ label: name, value: qty, color: topProductColors[i] })),
    ...(othersTotal > 0 ? [{ label: 'Others', value: othersTotal, color: topProductColors[3] }] : []),
  ]

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

      <div className="mt-4">
        <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-ink">Top Products by Orders</h2>
          <StockDonut
            breakdown={productOrderBreakdown}
            total={totalOrderedUnits}
            loading={loading}
            centerLabel="Units Ordered"
          />
          <p className="mt-4 text-center text-xs text-ink/40">
            Share of ordered units per product, all time.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-ink/50">
            {productOrderBreakdown.map((s) => (
              <span key={s.label} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
            {productOrderBreakdown.length === 0 && !loading && (
              <span>No orders yet.</span>
            )}
          </div>
        </div>
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

function StockDonut({ breakdown, total, loading, centerLabel = 'Total Products' }) {
  const size = 160
  const radius = 60
  const strokeWidth = 16
  const circumference = 2 * Math.PI * radius
  const sum = breakdown.reduce((s, b) => s + b.value, 0) || 1

  let offsetAccum = 0
  const segments = breakdown.map((b) => {
    const fraction = b.value / sum
    const dash = fraction * circumference
    const segment = {
      ...b,
      pct: Math.round(fraction * 100),
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offsetAccum,
    }
    offsetAccum += dash
    return segment
  })

  return (
    <div className="relative mx-auto mt-4" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-brand-100)"
          strokeWidth={strokeWidth}
        />
        {!loading &&
          sum > 0 &&
          segments.map((s) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] text-ink/40">{centerLabel}</p>
        <p className="text-xl font-extrabold text-ink">{loading ? '—' : total}</p>
      </div>
      {!loading &&
        segments.map((s, i) => {
          // Rough label placement around the ring, purely decorative.
          const angle = (offsetAccumForLabel(segments, i) / circumference) * 2 * Math.PI - Math.PI / 2
          const lx = size / 2 + (radius + 20) * Math.cos(angle)
          const ly = size / 2 + (radius + 20) * Math.sin(angle)
          if (s.value === 0) return null
          return (
            <span
              key={s.label}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-ink shadow"
              style={{ left: lx, top: ly }}
            >
              {s.pct}%
            </span>
          )
        })}
    </div>
  )
}

function offsetAccumForLabel(segments, index) {
  let acc = 0
  for (let i = 0; i < index; i++) {
    const [dash] = segments[i].dasharray.split(' ')
    acc += Number(dash)
  }
  const [ownDash] = segments[index].dasharray.split(' ')
  return acc + Number(ownDash) / 2
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
