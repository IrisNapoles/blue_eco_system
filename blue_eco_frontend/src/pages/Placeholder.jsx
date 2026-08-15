// Generic stand-in for pages not built yet (Inventory, Sales, Forecast,
// etc. — those come in later days per the project schedule). Keeping
// this as one reusable component means adding a real page later is
// just swapping the route's element, no routing changes needed.
export default function Placeholder({ title }) {
  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
      <div className="mt-4 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm text-ink-soft">This page hasn't been built yet — coming in a later step.</p>
      </div>
    </div>
  )
}
