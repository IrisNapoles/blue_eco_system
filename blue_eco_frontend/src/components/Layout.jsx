import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Nav items per role. Keeping this as plain data (not hardcoded JSX per
// role) makes it trivial to add pages later without touching the
// sidebar's structure — just add a row here.
const NAV_BY_ROLE = {
  admin: [
    { to: '/', label: 'Dashboard' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/sales', label: 'Sales' },
    { to: '/forecast', label: 'Forecast' },
    { to: '/orders', label: 'Orders' },
    { to: '/waste', label: 'Waste Log' },
    { to: '/users', label: 'Users' },
    { to: '/reports', label: 'Reports' },
    { to: '/payment-settings', label: 'Payment Settings' },
    { to: '/shipping-rates', label: 'Shipping Rates' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/account', label: 'Account Settings' },
  ],
  staff: [
    { to: '/', label: 'Dashboard' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/barcode-stockout', label: 'Barcode Stock-Out' },
    { to: '/sales', label: 'Record Sale (manual)' },
    { to: '/waste', label: 'Waste Log' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/account', label: 'Account Settings' },
  ],
  distributor: [
    { to: '/', label: 'Dashboard' },
    { to: '/shop', label: 'Browse Products' },
    { to: '/orders', label: 'My Orders' },
    { to: '/cart', label: 'Cart' },
    { to: '/account', label: 'Account Settings' },
  ],
}

const ROLE_LABEL = {
  admin: 'Administrator',
  staff: 'Staff',
  distributor: 'Distributor',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navItems = NAV_BY_ROLE[user?.role] || []

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="w-60 shrink-0 bg-brand-700 text-brand-50 flex flex-col">
        <div className="px-6 py-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Blue Eco
            </span>
          </div>
          {/* Signature element: a small ascending sparkline standing in
              for the forecast trend — ties the brand mark itself to the
              product's core feature instead of being a generic logo. */}
          <svg viewBox="0 0 120 24" className="mt-2 w-24 h-5" aria-hidden="true">
            <polyline
              points="0,20 20,16 40,18 60,10 80,12 100,4 120,6"
              fill="none"
              stroke="var(--color-brand-400)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-100 hover:bg-brand-600/60 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-brand-600">
          <p className="text-xs uppercase tracking-wide text-brand-100/70">
            {ROLE_LABEL[user?.role] || user?.role}
          </p>
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <button
            onClick={logout}
            className="mt-3 text-sm text-brand-100 hover:text-white underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
