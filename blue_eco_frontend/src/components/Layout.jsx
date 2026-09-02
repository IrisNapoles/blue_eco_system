import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  ClipboardList,
  Recycle,
  Users,
  BarChart3,
  Settings,
  Scan,
  ShoppingBag,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import blueEcoLogo from '../assets/blue-eco-farm-logo-white.png'

// Nav items per role. Keeping this as plain data (not hardcoded JSX per
// role) makes it trivial to add pages later without touching the
// sidebar's structure — just add a row here.
//
// Note: Payment Settings, Shipping Rates, Notifications, and Account
// Settings are no longer separate sidebar entries — they're grouped
// under the single "Settings" hub page (/settings) to keep the rail
// from getting cluttered with rarely-touched configuration screens.
const NAV_BY_ROLE = {
  admin: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/forecast', label: 'Forecast', icon: TrendingUp },
    { to: '/orders', label: 'Orders', icon: ClipboardList },
    { to: '/waste', label: 'Waste Log', icon: Recycle },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/statistics', label: 'Statistics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  staff: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/barcode-stockout', label: 'Barcode Stock-Out', icon: Scan },
    { to: '/sales', label: 'Record Sale (manual)', icon: ShoppingCart },
    { to: '/waste', label: 'Waste Log', icon: Recycle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  distributor: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/shop', label: 'Browse Products', icon: ShoppingBag },
    { to: '/orders', label: 'My Orders', icon: ClipboardList },
    { to: '/cart', label: 'Cart', icon: ShoppingCart },
    { to: '/settings', label: 'Settings', icon: Settings },
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
  const initial = (user?.name?.[0] || '?').toUpperCase()

  return (
    <div className="flex min-h-screen gap-4 bg-brand-100 p-4 font-['Plus_Jakarta_Sans']">
      {/* Floating icon-rail sidebar */}
      <aside className="sticky top-4 flex h-[calc(100vh-2rem)] w-20 shrink-0 flex-col items-center gap-2 rounded-[2rem] bg-white py-6 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-400 p-1">
          <img src={blueEcoLogo} alt="Blue Eco Farm" className="h-full w-full object-contain" />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-1.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className={({ isActive }) =>
                `flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                  isActive ? 'bg-ink text-white' : 'text-ink/40 hover:bg-brand-100 hover:text-ink'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-1.5 border-t border-ink/10 pt-4">
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-ink/40 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
          <div
            title={`${user?.name || ''} · ${ROLE_LABEL[user?.role] || user?.role || ''}`}
            className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-400 text-xs font-bold text-white"
          >
            {initial}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-2 py-2">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
