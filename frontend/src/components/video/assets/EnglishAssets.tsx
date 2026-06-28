import { motion } from "framer-motion"

export function SentenceTreeSVG({ size = 130 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 110" fill="none">
      <text x="65" y="15" textAnchor="middle" fontSize="10" fill="#f472b6" fontWeight="bold">Sentence</text>
      <line x1="65" y1="18" x2="65" y2="30" stroke="#f472b6" strokeWidth="1.5" />
      <motion.circle cx="65" cy="35" r="12" fill="rgba(244,114,182,0.1)" stroke="#f472b6" strokeWidth="1.5"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
      <text x="65" y="39" textAnchor="middle" fontSize="7" fill="#f472b6">S</text>

      <line x1="53" y1="45" x2="35" y2="55" stroke="#f472b6" strokeWidth="1" />
      <motion.circle cx="30" cy="60" r="10" fill="rgba(244,114,182,0.1)" stroke="#f472b6" strokeWidth="1"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }} />
      <text x="30" y="64" textAnchor="middle" fontSize="6" fill="#f472b6">NP</text>

      <line x1="77" y1="45" x2="95" y2="55" stroke="#f472b6" strokeWidth="1" />
      <motion.circle cx="100" cy="60" r="10" fill="rgba(244,114,182,0.1)" stroke="#f472b6" strokeWidth="1"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
      <text x="100" y="64" textAnchor="middle" fontSize="6" fill="#f472b6">VP</text>

      <line x1="20" y1="68" x2="12" y2="78" stroke="#f472b6" strokeWidth="0.8" />
      <text x="8" y="85" textAnchor="middle" fontSize="6" fill="rgba(244,114,182,0.6)">Det</text>
      <line x1="40" y1="68" x2="48" y2="78" stroke="#f472b6" strokeWidth="0.8" />
      <text x="52" y="85" textAnchor="middle" fontSize="6" fill="rgba(244,114,182,0.6)">N</text>

      <line x1="90" y1="68" x2="82" y2="78" stroke="#f472b6" strokeWidth="0.8" />
      <text x="78" y="85" textAnchor="middle" fontSize="6" fill="rgba(244,114,182,0.6)">V</text>
      <line x1="110" y1="68" x2="118" y2="78" stroke="#f472b6" strokeWidth="0.8" />
      <text x="122" y="85" textAnchor="middle" fontSize="6" fill="rgba(244,114,182,0.6)">NP</text>

      <text x="65" y="105" textAnchor="middle" fontSize="9" fill="#bdbdbd">Sentence Tree</text>
    </svg>
  )
}

export function MindMapSVG({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 120" fill="none">
      <motion.circle cx="70" cy="30" r="14" fill="rgba(244,114,182,0.12)" stroke="#f472b6" strokeWidth="2"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0 }} />
      <text x="70" y="35" textAnchor="middle" fontSize="7" fill="#f472b6">Main</text>
      {[
        { x: 30, y: 75, label: "Idea 1", color: "#60a5fa" },
        { x: 70, y: 85, label: "Idea 2", color: "#4ade80" },
        { x: 110, y: 75, label: "Idea 3", color: "#fbbf24" },
      ].map((item, i) => (
        <g key={i}>
          <line x1={70} y1={42} x2={item.x} y2={item.y - 10} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <motion.circle cx={item.x} cy={item.y} r="11" fill={`${item.color}15`} stroke={item.color} strokeWidth="1.5"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.2 }} />
          <text x={item.x} y={item.y + 4} textAnchor="middle" fontSize="6" fill={item.color}>{item.label}</text>
        </g>
      ))}
      {[
        { x: 12, y: 108, label: "Detail", color: "#60a5fa" },
        { x: 40, y: 112, label: "Detail", color: "#4ade80" },
        { x: 100, y: 112, label: "Detail", color: "#fbbf24" },
        { x: 128, y: 108, label: "Detail", color: "#f472b6" },
      ].map((item, i) => (
        <g key={i}>
          <line x1={30 + (i % 2) * 40} y1={84} x2={item.x} y2={item.y - 5} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
          <text x={item.x} y={item.y} textAnchor="middle" fontSize="5" fill={item.color} opacity={0.7}>{item.label}</text>
        </g>
      ))}
    </svg>
  )
}

export function GrammarFlowSVG({ size = 140 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 140 90" fill="none">
      <motion.rect x="10" y="10" width="50" height="25" rx="6" fill="rgba(244,114,182,0.1)" stroke="#f472b6" strokeWidth="1.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }} />
      <text x="35" y="27" textAnchor="middle" fontSize="8" fill="#f472b6">Noun</text>
      <motion.path d="M60 22 L75 22" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 }} />
      <motion.polygon points="75,18 82,22 75,26" fill="rgba(255,255,255,0.2)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
      <motion.rect x="82" y="10" width="50" height="25" rx="6" fill="rgba(244,114,182,0.1)" stroke="#f472b6" strokeWidth="1.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} />
      <text x="107" y="27" textAnchor="middle" fontSize="8" fill="#f472b6">Verb</text>
      <motion.path d="M35 35 L35 55" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6 }} />
      <motion.rect x="12" y="55" width="46" height="22" rx="5" fill="rgba(74,222,128,0.08)" stroke="#4ade80" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />
      <text x="35" y="69" textAnchor="middle" fontSize="7" fill="#4ade80">Subject</text>
      <motion.path d="M107 35 L107 55" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8 }} />
      <motion.rect x="84" y="55" width="46" height="22" rx="5" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
      <text x="107" y="69" textAnchor="middle" fontSize="7" fill="#fbbf24">Object</text>
    </svg>
  )
}
