import { useMemo } from "react"
import { motion } from "framer-motion"
import type { VisualData, AnimationData } from "./RendererUtils"
import { COLORS } from "./RendererUtils"
import { AnimationWrapper } from "./AnimationWrapper"
import { NumberLineSVG, CoordinatePlaneSVG, PieChartSVG } from "./assets/MathAssets"

export function GraphRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const kw = visual.keywords?.join(" ")?.toLowerCase() || ""

  const isNumberLine = /number line|numberline/.test(kw)
  const isCoordinate = /coordinate|graph.*axis|plot/.test(kw)
  const isPie = /pie/.test(kw)
  const isBar = /bar.*graph|bar.*chart/.test(kw)
  const isLineGraph = /line.*graph|line.*chart/.test(kw)

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "graph"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-4">
        {isNumberLine && <NumberLineSVG size={180} />}
        {isCoordinate && <CoordinatePlaneSVG size={160} />}
        {isPie && <PieChartSVG size={120} />}
        {isBar && <BarGraphSVG speaking={speaking} />}
        {isLineGraph && <LineGraphSVG speaking={speaking} />}
        {!isNumberLine && !isCoordinate && !isPie && !isBar && !isLineGraph && (
          <div className="flex flex-col items-center gap-3">
            <NumberLineSVG size={160} />
            <p className="text-[10px] text-white/30">Graph</p>
          </div>
        )}
        {visual.description && (
          <p className="text-xs text-white/50 text-center max-w-[85%]">{visual.description}</p>
        )}
      </div>
    </AnimationWrapper>
  )
}

function BarGraphSVG({ speaking }: { speaking: boolean }) {
  const bars = [
    { label: "A", value: 0.6 },
    { label: "B", value: 0.8 },
    { label: "C", value: 0.4 },
    { label: "D", value: 0.9 },
    { label: "E", value: 0.5 },
  ]
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <line x1="20" y1="85" x2="135" y2="85" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="20" y1="10" x2="20" y2="85" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {bars.map((b, i) => {
        const h = b.value * 65
        const x = 25 + i * 22
        return (
          <g key={i}>
            <motion.rect
              x={x} y={85 - h} width="14" height={h} rx="3"
              fill={`${COLORS.primary}${speaking ? "80" : "30"}`}
              initial={{ scaleY: 0, y: 85 }}
              animate={{ scaleY: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              style={{ transformOrigin: `${x + 7}px 85px` }}
            />
            <text x={x + 7} y="98" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.3)">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function LineGraphSVG({ speaking }: { speaking: boolean }) {
  const points = [
    { x: 25, y: 70 },
    { x: 48, y: 50 },
    { x: 71, y: 60 },
    { x: 94, y: 35 },
    { x: 117, y: 45 },
  ]
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <line x1="15" y1="85" x2="135" y2="85" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="15" y1="10" x2="15" y2="85" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <motion.path
        d={pathD}
        stroke={COLORS.primary} strokeWidth="2" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      {points.map((p, i) => (
        <motion.circle
          key={i} cx={p.x} cy={p.y} r="4"
          fill="#0a0a0a" stroke={COLORS.primary} strokeWidth="2"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
        />
      ))}
    </svg>
  )
}
