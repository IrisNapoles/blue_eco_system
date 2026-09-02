import blueEcoLogo from '../assets/blue-eco-farm-logo-white.png'

export default function BlueEcoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-400 p-1.5 shadow-sm">
        <img src={blueEcoLogo} alt="Blue Eco Farm logomark" className="h-full w-full object-contain" />
      </div>
      <span className="text-sm font-black tracking-tight text-ink">
        Blue Eco Farm
      </span>
    </div>
  )
}
