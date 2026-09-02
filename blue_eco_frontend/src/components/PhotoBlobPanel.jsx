// Shared visual panel for auth screens — an organic "culture vessel" shape
// (spirulina lives in round-bottomed tanks/flasks, hence the blob) with
// ambient bubbles drifting on the dark green backdrop.
export default function PhotoBlobPanel({ image, alt, badge, badgePosition = 'left' }) {
  const badgePositionClasses =
    badgePosition === 'left'
      ? 'top-6 left-6 rounded-full pl-2 pr-4'
      : 'top-0 right-0 rounded-bl-2xl px-4 py-2'

  return (
    <div className="relative hidden md:flex md:w-2/5 shrink-0 items-center justify-center bg-brand-700 overflow-hidden p-10">
      {/* Ambient bubbles */}
      <span className="pointer-events-none absolute w-28 h-28 rounded-full bg-brand-400/10 blur-2xl -top-6 -left-8" />
      <span className="pointer-events-none absolute w-20 h-20 rounded-full bg-brand-100/10 blur-xl bottom-10 -right-6" />
      <span className="pointer-events-none absolute w-8 h-8 rounded-full bg-brand-400/30 top-1/3 right-8" />
      <span className="pointer-events-none absolute w-4 h-4 rounded-full bg-brand-100/40 bottom-20 left-10" />
      <span className="pointer-events-none absolute w-3 h-3 rounded-full bg-brand-400/40 top-14 right-1/3" />
      <span className="pointer-events-none absolute w-2 h-2 rounded-full bg-brand-100/50 top-1/2 left-6" />

      {/* Organic vessel-shaped photo */}
      <div
        className="relative w-full aspect-[4/5] overflow-hidden shadow-2xl ring-1 ring-white/10"
        style={{ borderRadius: '63% 37% 54% 46% / 43% 47% 53% 57%' }}
      >
        <img src={image} alt={alt} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/10 to-black/55" />
      </div>

      {badge && (
        <span
          className={`absolute z-10 flex items-center gap-2 bg-brand-500/90 text-white text-xs font-medium uppercase tracking-wider py-1.5 ${badgePositionClasses}`}
        >
          {badgePosition === 'left' && <span className="w-4 h-4 rounded-full bg-white/80" />}
          {badge}
        </span>
      )}
    </div>
  )
}
