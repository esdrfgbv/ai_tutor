export function IconGrid({
  icons,
  size = 120,
}: {
  icons: string[]
  size?: number
}) {
  const cols = Math.min(icons.length, 3)
  const rows = Math.ceil(icons.length / cols)
  return (
    <div
      className="grid gap-2 w-full h-full place-items-center p-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {icons.map((ic, i) => (
        <div
          key={i}
          className="flex items-center justify-center w-full h-full rounded-xl text-2xl"
          style={{
            background: "rgba(173,255,68,0.04)",
            border: "1px solid rgba(173,255,68,0.1)",
          }}
        >
          {ic}
        </div>
      ))}
    </div>
  )
}

export function ComparisonCardSVG({
  left,
  right,
  size = 140,
}: {
  left: string
  right: string
  size?: number
}) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 140 100" fill="none">
      <rect x="5" y="5" width="60" height="90" rx="8" fill="rgba(96,165,250,0.06)" stroke="#60a5fa" strokeWidth="1.5" />
      <rect x="75" y="5" width="60" height="90" rx="8" fill="rgba(248,113,113,0.06)" stroke="#f87171" strokeWidth="1.5" />
      <text x="35" y="30" textAnchor="middle" fontSize="8" fill="#60a5fa" fontWeight="bold">A</text>
      <text x="105" y="30" textAnchor="middle" fontSize="8" fill="#f87171" fontWeight="bold">B</text>
      <text x="35" y="65" textAnchor="middle" fontSize="6" fill="#bdbdbd">{left}</text>
      <text x="105" y="65" textAnchor="middle" fontSize="6" fill="#bdbdbd">{right}</text>
    </svg>
  )
}

export function TimelineSVG({
  milestones,
  size = 150,
}: {
  milestones: string[]
  size?: number
}) {
  const h = size * 0.6
  const spacing = h / (milestones.length + 1)
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} fill="none">
      <line x1="20" y1="10" x2="20" y2={h - 10} stroke="rgba(251,191,36,0.3)" strokeWidth="2" />
      {milestones.map((m, i) => (
        <g key={i}>
          <circle cx="20" cy={spacing * (i + 1)} r="5" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1.5" />
          <text x="30" y={spacing * (i + 1) + 3} fontSize="7" fill="#bdbdbd">{m}</text>
        </g>
      ))}
    </svg>
  )
}
