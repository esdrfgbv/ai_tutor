import { motion } from "framer-motion"

export function AtomSVG({ size = 120, animated = false }) {
  const d = animated ? 1.5 : 0
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="8" fill="#ADFF44" />
      <motion.ellipse
        cx="60" cy="60" rx="45" ry="16"
        stroke="#60a5fa" strokeWidth="2" fill="none"
        animate={animated ? { rotate: 360 } : {}}
        transition={{ duration: 3 + d, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      <motion.ellipse
        cx="60" cy="60" rx="45" ry="16"
        stroke="#a78bfa" strokeWidth="2" fill="none"
        animate={animated ? { rotate: -360 } : {}}
        transition={{ duration: 4 + d, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      <motion.ellipse
        cx="60" cy="60" rx="45" ry="16"
        stroke="#f472b6" strokeWidth="2" fill="none"
        animate={animated ? { rotate: 180 } : {}}
        transition={{ duration: 3.5 + d, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      <circle cx="35" cy="35" r="4" fill="#60a5fa" opacity={0.7} />
      <circle cx="85" cy="45" r="4" fill="#a78bfa" opacity={0.7} />
      <circle cx="78" cy="80" r="4" fill="#f472b6" opacity={0.7} />
      <circle cx="30" cy="78" r="4" fill="#22d3ee" opacity={0.7} />
    </svg>
  )
}

export function PlantCellSVG({ size = 140 }) {
  const s = size / 140
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <rect x="10" y="10" width="120" height="120" rx="30" stroke="#4ade80" strokeWidth="3" fill="rgba(74,222,128,0.06)" />
      <rect x="25" y="25" width="90" height="90" rx="15" stroke="#22d3ee" strokeWidth="2" fill="rgba(34,211,238,0.06)" />
      <circle cx="70" cy="70" r="18" fill="rgba(173,255,68,0.2)" stroke="#ADFF44" strokeWidth="2" />
      <ellipse cx="45" cy="45" rx="10" ry="6" fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1" />
      <ellipse cx="95" cy="50" rx="10" ry="6" fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1" />
      <ellipse cx="50" cy="95" rx="10" ry="6" fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1" />
      <ellipse cx="90" cy="95" rx="10" ry="6" fill="rgba(74,222,128,0.3)" stroke="#4ade80" strokeWidth="1" />
      <rect x="65" y="35" width="10" height="25" rx="3" fill="#22d3ee" opacity={0.5} />
      <text x="70" y="138" textAnchor="middle" fontSize="10" fill="#bdbdbd">Plant Cell</text>
    </svg>
  )
}

export function AnimalCellSVG({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <circle cx="70" cy="70" r="55" stroke="#f87171" strokeWidth="3" fill="rgba(248,113,113,0.06)" />
      <circle cx="70" cy="70" r="18" fill="rgba(173,255,68,0.2)" stroke="#ADFF44" strokeWidth="2" />
      <circle cx="50" cy="50" r="6" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="88" cy="52" r="5" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="55" cy="90" r="7" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="85" cy="88" r="5" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="98" cy="73" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" />
      <text x="70" y="138" textAnchor="middle" fontSize="10" fill="#bdbdbd">Animal Cell</text>
    </svg>
  )
}

export function HeartSVG({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <motion.path
        d="M60 100 C25 75 10 55 10 38 10 24 22 12 36 12 46 12 54 18 60 26 66 18 74 12 84 12 98 12 110 24 110 38 110 55 95 75 60 100Z"
        fill="rgba(248,113,113,0.15)" stroke="#f87171" strokeWidth="2.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <motion.line x1="60" y1="26" x2="60" y2="82" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
      <motion.line x1="32" y1="48" x2="88" y2="48" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
      <text x="60" y="118" textAnchor="middle" fontSize="10" fill="#bdbdbd">Heart</text>
    </svg>
  )
}

export function LeafSVG({ size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <motion.path
        d="M50 90 C20 70 10 35 20 15 25 10 35 8 50 10 65 8 75 10 80 15 90 35 80 70 50 90Z"
        fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5 }}
      />
      <line x1="50" y1="90" x2="50" y2="15" stroke="#4ade80" strokeWidth="1.5" />
      <line x1="50" y1="50" x2="30" y2="30" stroke="#4ade80" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="50" y1="45" x2="70" y2="28" stroke="#4ade80" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="50" y1="65" x2="28" y2="50" stroke="#4ade80" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="50" y1="62" x2="72" y2="48" stroke="#4ade80" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  )
}

export function VolcanoSVG({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 120" fill="none">
      <motion.path
        d="M20 110 L60 30 L70 10 L80 30 L120 110Z"
        fill="rgba(251,191,36,0.1)" stroke="#fb923c" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5 }}
      />
      <path d="M60 30 L65 50 L75 50 L80 30Z" fill="rgba(248,113,113,0.3)" stroke="#f87171" strokeWidth="1" />
      <motion.ellipse cx="70" cy="22" rx="10" ry="6" fill="rgba(248,113,113,0.4)" stroke="#f87171" strokeWidth="1"
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.circle cx="62" cy="16" r="3" fill="rgba(248,113,113,0.5)"
        animate={{ opacity: [0, 1, 0], y: [-5, -15] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.circle cx="70" cy="10" r="4" fill="rgba(248,113,113,0.5)"
        animate={{ opacity: [0, 1, 0], y: [-3, -18] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }} />
      <motion.circle cx="78" cy="14" r="3" fill="rgba(248,113,113,0.5)"
        animate={{ opacity: [0, 1, 0], y: [-4, -14] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }} />
      <line x1="30" y1="110" x2="110" y2="110" stroke="#8a8a8a" strokeWidth="1.5" />
      <text x="70" y="118" textAnchor="middle" fontSize="10" fill="#bdbdbd">Volcano</text>
    </svg>
  )
}

export function SolarSystemSVG({ size = 140, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <circle cx="70" cy="70" r="10" fill="#fbbf24" stroke="#fb923c" strokeWidth="2" />
      {[30, 45, 60].map((r, i) => (
        <motion.ellipse
          key={i}
          cx="70" cy="70" rx={r} ry={r * 0.4}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"
          animate={animated ? { rotate: 360 } : {}}
          transition={{ duration: 5 + i * 2, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "70px 70px" }}
        />
      ))}
      <circle cx="100" cy="55" r="4" fill="#60a5fa" />
      <circle cx="53" cy="42" r="3" fill="#4ade80" />
      <circle cx="45" cy="88" r="5" fill="#f87171" />
      <text x="70" y="138" textAnchor="middle" fontSize="10" fill="#bdbdbd">Solar System</text>
    </svg>
  )
}

export function WaterCycleSVG({ size = 150 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 150 130" fill="none">
      <rect x="10" y="95" width="130" height="30" rx="15" fill="rgba(34,211,238,0.1)" stroke="#22d3ee" strokeWidth="1.5" />
      <motion.path d="M30 95 Q40 80 50 95 Q60 80 70 95 Q80 80 90 95 Q100 80 110 95 Q120 80 130 95"
        stroke="#22d3ee" strokeWidth="1" fill="none" opacity={0.5}
        animate={{ d: "M30 95 Q40 82 50 95 Q60 82 70 95 Q80 82 90 95 Q100 82 110 95 Q120 82 130 95" }}
        transition={{ duration: 2, repeat: Infinity }} />
      <motion.path d="M70 90 L65 72" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 2"
        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.path d="M60 72 L55 60 M80 72 L85 60 M70 72 L70 55"
        stroke="#60a5fa" strokeWidth="1" strokeDasharray="2 2" opacity={0.5}
        animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />
      <ellipse cx="70" cy="30" rx="25" ry="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <motion.g>
        <circle cx="58" cy="28" r="2" fill="rgba(255,255,255,0.3)" />
        <circle cx="65" cy="24" r="2.5" fill="rgba(255,255,255,0.3)" />
        <circle cx="75" cy="26" r="2" fill="rgba(255,255,255,0.3)" />
        <circle cx="82" cy="30" r="2" fill="rgba(255,255,255,0.3)" />
      </motion.g>
      <motion.circle cx="70" cy="18" r="4" fill="#fbbf24"
        animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
      <text x="75" y="128" textAnchor="middle" fontSize="9" fill="#bdbdbd">Water Cycle</text>
    </svg>
  )
}

export function FoodChainSVG({ size = 150 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 150 120" fill="none">
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.3 }}>
        <circle cx="25" cy="90" r="15" fill="rgba(74,222,128,0.2)" stroke="#4ade80" strokeWidth="2" />
        <text x="25" y="95" textAnchor="middle" fontSize="9" fill="#4ade80">🌿</text>
        <text x="25" y="118" textAnchor="middle" fontSize="8" fill="#bdbdbd">Plant</text>
      </motion.g>
      <motion.path d="M40 85 L55 75" stroke="#8a8a8a" strokeWidth="1.5" strokeDasharray="4 2"
        animate={{ opacity: [0.3, 1] }} transition={{ delay: 0.3 }} />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <circle cx="70" cy="70" r="15" fill="rgba(251,191,36,0.2)" stroke="#fbbf24" strokeWidth="2" />
        <text x="70" y="75" textAnchor="middle" fontSize="9" fill="#fbbf24">🐇</text>
        <text x="70" y="98" textAnchor="middle" fontSize="8" fill="#bdbdbd">Rabbit</text>
      </motion.g>
      <motion.path d="M85 65 L100 55" stroke="#8a8a8a" strokeWidth="1.5" strokeDasharray="4 2"
        animate={{ opacity: [0.3, 1] }} transition={{ delay: 0.6 }} />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <circle cx="115" cy="50" r="15" fill="rgba(248,113,113,0.2)" stroke="#f87171" strokeWidth="2" />
        <text x="115" y="55" textAnchor="middle" fontSize="9" fill="#f87171">🦊</text>
        <text x="115" y="78" textAnchor="middle" fontSize="8" fill="#bdbdbd">Fox</text>
      </motion.g>
    </svg>
  )
}

export function ElectricCircuitSVG({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 100" fill="none">
      <rect x="20" y="20" width="100" height="60" rx="5" stroke="#22d3ee" strokeWidth="2" fill="none" />
      <circle cx="70" cy="50" r="8" stroke="#fbbf24" strokeWidth="2" fill="rgba(251,191,36,0.15)" />
      <line x1="20" y1="50" x2="62" y2="50" stroke="#22d3ee" strokeWidth="2" />
      <line x1="78" y1="50" x2="120" y2="50" stroke="#22d3ee" strokeWidth="2" />
      <motion.circle cx="45" cy="50" r="3" fill="#ADFF44"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <motion.circle cx="55" cy="50" r="3" fill="#ADFF44"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
      <motion.circle cx="85" cy="50" r="3" fill="#ADFF44"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} />
      <motion.circle cx="95" cy="50" r="3" fill="#ADFF44"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }} />
      <rect x="32" y="20" width="6" height="15" rx="1" fill="#f87171" />
      <text x="70" y="98" textAnchor="middle" fontSize="9" fill="#bdbdbd">Circuit</text>
    </svg>
  )
}
