import spirulinaIllustration from '../assets/spirulina-illustration.png'

// A playful, original illustration scene for the Blue Eco Farm auth screens.
// The spiral motif is a nod to spirulina's actual helical filament shape —
// not decoration for its own sake.
export default function SpirulinaScene() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-brand-100 via-brand-100 to-canvas">
      {/* Spirulina illustration, centered on the panel */}
      <div className="absolute inset-0 flex items-center justify-center px-10">
        <img
          src={spirulinaIllustration}
          alt="Spirulina powder, tablets and drink"
          className="w-96 sm:w-[32rem]"
          style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.25))' }}
        />
      </div>

      {/* Spiral filament — spirulina's real helical shape */}
      <svg
        className="absolute left-14 top-14 h-24 w-24 -rotate-12 text-brand-700/70"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M50 8 C 18 8, 18 42, 46 44 C 68 46, 68 20, 50 22 C 36 23, 36 36, 48 37" />
      </svg>

      {/* Floating bits */}
      <span className="absolute left-10 bottom-16 h-10 w-10 rotate-12 rounded-lg bg-brand-700 shadow-lg" />
      <span className="absolute right-16 bottom-32 h-8 w-8 rounded-full bg-white shadow-lg" />
      <span className="absolute right-28 bottom-10 h-6 w-6 rotate-45 rounded-md bg-brand-100 shadow-md" />
      <span className="absolute left-1/3 top-24 h-3 w-3 rounded-full bg-brand-700/60" />
      <span className="absolute right-1/3 top-40 h-4 w-4 rounded-full bg-white/70" />
    </div>
  )
}
