// Shared design-system tokens + small components, reused across every
// page so the app stays visually consistent without repeating the same
// long className strings everywhere. Import what you need:
//
//   import { styles, PageHeader, EmptyState, Badge } from '../components/ui'

export const styles = {
  card: 'rounded-[1.75rem] bg-white p-6 shadow-sm',
  cardSm: 'rounded-2xl bg-white p-4 shadow-sm',
  input:
    'w-full rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30',
  inputSquare:
    'w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30',
  label: 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/60',
  btnPrimary:
    'rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60',
  btnSecondary:
    'rounded-full border border-ink/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink/60 transition-colors hover:bg-brand-100',
  errorBox: 'rounded-2xl border border-red-500/30 bg-red-50 px-4 py-2.5 text-sm text-red-600',
  successBox: 'rounded-2xl border border-green-500/30 bg-green-50 px-4 py-2.5 text-sm text-green-700',
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className={`${styles.card} text-center`}>
      {Icon && <Icon className="mx-auto h-10 w-10 text-ink/20" />}
      <h2 className="mt-3 text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink/50">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

const BADGE_TONES = {
  neutral: 'bg-ink/10 text-ink/60',
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
}

export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE_TONES[tone] || BADGE_TONES.neutral}`}>
      {children}
    </span>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return <p className="text-sm text-ink/40">{label}</p>
}
