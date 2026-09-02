import { Link } from 'react-router-dom'
import { CreditCard, Truck, UserCog, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui'

// Everything that used to be its own sidebar entry but is really a
// "configure once, revisit rarely" screen now lives behind this single
// Settings hub. Keeps the main rail focused on daily-use pages.
// Notifications isn't listed here — it's reached via the bell icon in
// the Dashboard's top bar instead, since it's a frequent check, not a
// settings screen.
const SETTINGS_ITEMS = [
  {
    to: '/payment-settings',
    label: 'Payment Settings',
    desc: 'Manage accepted payment methods and account details.',
    icon: CreditCard,
    roles: ['admin'],
  },
  {
    to: '/shipping-rates',
    label: 'Shipping Rates',
    desc: 'Set delivery fees and estimated delivery days per zone.',
    icon: Truck,
    roles: ['admin'],
  },
  {
    to: '/account',
    label: 'Account Settings',
    desc: 'Update your profile, contact info, and password.',
    icon: UserCog,
    roles: ['admin', 'staff', 'distributor'],
  },
]

export default function SettingsHub() {
  const { user } = useAuth()
  const items = SETTINGS_ITEMS.filter((item) => item.roles.includes(user?.role))

  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <PageHeader title="Settings" subtitle="Configuration and account options." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-[1.75rem] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{label}</p>
              <p className="mt-0.5 text-xs text-ink/50">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" />
          </Link>
        ))}
      </div>
    </div>
  )
}
