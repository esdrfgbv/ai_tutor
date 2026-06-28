import { motion } from "framer-motion"

export function TriangleSVG({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 70" fill="none">
      <motion.polygon
        points="40,5 5,65 75,65"
        fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      <text x="40" y="50" textAnchor="middle" fontSize="11" fill="#60a5fa">△</text>
    </svg>
  )
}

export function CircleSVG({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <motion.circle
        cx="40" cy="40" r="32"
        fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      <line x1="40" y1="40" x2="40" y2="8" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 2" opacity={0.5} />
      <circle cx="40" cy="40" r="3" fill="#60a5fa" />
    </svg>
  )
}

export function RectangleSVG({ size = 90 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 90 60" fill="none">
      <motion.rect
        x="5" y="5" width="80" height="50"
        fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
    </svg>
  )
}

export function NumberLineSVG({ size = 140 }) {
  const ticks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
  const spacing = 12
  const offset = 5
  return (
    <svg width={size} height={50} viewBox="0 0 140 50" fill="none">
      <line x1="5" y1="25" x2="135" y2="25" stroke="#60a5fa" strokeWidth="2" />
      <motion.polygon points="135,25 128,20 128,30" fill="#60a5fa"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={offset + (i + 0.5) * spacing} y1="25" x2={offset + (i + 0.5) * spacing} y2="18" stroke="#60a5fa" strokeWidth="1.5" />
          <motion.text
            x={offset + (i + 0.5) * spacing} y="40" textAnchor="middle" fontSize="8" fill="#bdbdbd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 * i }}
          >{t}</motion.text>
        </g>
      ))}
    </svg>
  )
}

export function PieChartSVG({ size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="40" stroke="#60a5fa" strokeWidth="2" fill="rgba(96,165,250,0.05)" />
      <motion.path
        d="M50 50 L50 10 A40 40 0 0 1 88 30 Z"
        fill="rgba(96,165,250,0.3)" stroke="#60a5fa" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      />
      <motion.path
        d="M50 50 L88 30 A40 40 0 0 1 76 82 Z"
        fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      />
      <motion.path
        d="M50 50 L76 82 A40 40 0 0 1 30 82 Z"
        fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
      />
      <motion.path
        d="M50 50 L30 82 A40 40 0 0 1 50 10 Z"
        fill="rgba(248,113,113,0.3)" stroke="#f87171" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
      />
    </svg>
  )
}

export function CoordinatePlaneSVG({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <line x1="70" y1="5" x2="70" y2="135" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <line x1="5" y1="70" x2="135" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line x1={70 + i * 20} y1="68" x2={70 + i * 20} y2="72" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="68" y1={70 + i * 20} x2="72" y2={70 + i * 20} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </g>
      ))}
      <motion.circle cx="90" cy="50" r="4" fill="#ADFF44"
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} />
      <motion.circle cx="50" cy="90" r="4" fill="#f87171"
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }} />
      <motion.circle cx="110" cy="90" r="4" fill="#60a5fa"
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 }} />
      <text x="70" y="138" textAnchor="middle" fontSize="8" fill="#bdbdbd">Coordinate Plane</text>
    </svg>
  )
}

export function FractionCirclesSVG({ size = 100 }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="none">
      <circle cx="25" cy="30" r="20" stroke="#60a5fa" strokeWidth="2" fill="rgba(96,165,250,0.05)" />
      <motion.path d="M25 30 L25 10 A20 20 0 0 1 45 30 Z"
        fill="rgba(96,165,250,0.3)" stroke="#60a5fa" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} />
      <text x="25" y="35" textAnchor="middle" fontSize="9" fill="#60a5fa">1/4</text>
      <circle cx="75" cy="30" r="20" stroke="#4ade80" strokeWidth="2" fill="rgba(74,222,128,0.05)" />
      <motion.path d="M75 50 L75 30 A20 20 0 0 0 55 30 Z"
        fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} />
      <text x="75" y="35" textAnchor="middle" fontSize="9" fill="#4ade80">1/2</text>
    </svg>
  )
}

export function SquareSVG({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <motion.rect
        x="5" y="5" width="70" height="70"
        fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
    </svg>
  )
}
