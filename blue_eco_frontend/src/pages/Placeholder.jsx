// Generic stand-in for pages not built yet (Inventory, Sales, Forecast,
// etc. — those come in later days per the project schedule). Keeping
// this as one reusable component means adding a real page later is
// just swapping the route's element, no routing changes needed.
import { PageHeader } from '../components/ui'

export default function Placeholder({ title }) {
  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <PageHeader title={title} />
      <div className="mt-4 rounded-[1.75rem] border-2 border-dashed border-ink/15 bg-white/60 px-6 py-16 text-center">
        <p className="text-sm text-ink/50">This page hasn't been built yet — coming in a later step.</p>
      </div>
    </div>
  )
}
