import { motion } from "framer-motion"

export function IndiaMapSVG({ size = 150 }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 120 135" fill="none">
      <motion.path
        d="M60 5 C70 8 85 12 90 20 C95 28 98 35 100 42 C102 49 105 55 103 62 C101 69 95 75 92 82 C89 89 88 95 82 100 C76 105 68 108 62 112 C56 116 50 118 45 115 C40 112 35 105 30 100 C25 95 18 90 15 82 C12 74 8 65 10 55 C12 45 15 35 20 28 C25 21 35 12 45 8 C50 6 55 4 60 5Z"
        fill="rgba(96,165,250,0.08)"
        stroke="#60a5fa"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.circle cx="60" cy="60" r="4" fill="#ADFF44"
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} />
      <text x="60" y="130" textAnchor="middle" fontSize="9" fill="#bdbdbd">India</text>
    </svg>
  )
}

export function WorldMapSVG({ size = 150 }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 150 90" fill="none">
      <motion.ellipse cx="30" cy="40" rx="18" ry="25"
        fill="rgba(96,165,250,0.06)" stroke="#60a5fa" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0 }} />
      <motion.ellipse cx="75" cy="35" rx="25" ry="20"
        fill="rgba(96,165,250,0.06)" stroke="#60a5fa" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.2 }} />
      <motion.path d="M95 20 Q105 15 115 20 Q130 25 140 35 Q145 45 140 55 Q130 60 115 58 Q105 55 98 50"
        fill="rgba(96,165,250,0.06)" stroke="#60a5fa" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.4 }} />
      <motion.path d="M10 45 Q8 55 15 65 Q20 70 28 68 Q32 65 30 58"
        fill="rgba(96,165,250,0.06)" stroke="#60a5fa" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.3 }} />
      <motion.path d="M55 50 Q52 60 55 70 Q58 78 65 80 Q72 78 75 70"
        fill="rgba(96,165,250,0.06)" stroke="#60a5fa" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
      <text x="75" y="88" textAnchor="middle" fontSize="9" fill="#bdbdbd">World Map</text>
    </svg>
  )
}

export function ContinentMapSVG({ size = 140 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 140 90" fill="none">
      {[
        { cx: 30, cy: 35, rx: 15, ry: 20, label: "NA", color: "#60a5fa" },
        { cx: 35, cy: 65, rx: 8, ry: 12, label: "SA", color: "#4ade80" },
        { cx: 75, cy: 30, rx: 20, ry: 15, label: "EU", color: "#a78bfa" },
        { cx: 80, cy: 55, rx: 15, ry: 18, label: "AF", color: "#fbbf24" },
        { cx: 115, cy: 30, rx: 12, ry: 15, label: "AS", color: "#f87171" },
        { cx: 125, cy: 68, rx: 6, ry: 8, label: "AU", color: "#22d3ee" },
      ].map((c, i) => (
        <g key={i}>
          <motion.ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
            fill={`${c.color}12`} stroke={c.color} strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: i * 0.15 }} />
          <text x={c.cx} y={c.cy + 2} textAnchor="middle" fontSize="6" fill={c.color}>{c.label}</text>
        </g>
      ))}
      <text x="70" y="88" textAnchor="middle" fontSize="9" fill="#bdbdbd">Continents</text>
    </svg>
  )
}
