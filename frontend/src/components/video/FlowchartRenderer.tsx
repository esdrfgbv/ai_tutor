import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { VisualData, AnimationData } from "./RendererUtils"
import { COLORS } from "./RendererUtils"
import { AnimationWrapper } from "./AnimationWrapper"

interface FlowNode {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  type: "start" | "process" | "decision" | "end"
}

export function FlowchartRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const nodes = useMemo(() => {
    const items = visual.objects?.length ? visual.objects : visual.keywords || []
    return items.slice(0, 6).map((item, i) => ({
      id: `n${i}`,
      label: item,
      x: 10,
      y: i * 50 + 5,
      width: 80,
      height: 36,
      type: (i === 0 ? "start" : i === items.length - 1 ? "end" : "process") as FlowNode["type"],
    }))
  }, [visual])

  const [activeStep, setActiveStep] = useState(-1)

  useEffect(() => {
    if (!speaking) {
      setActiveStep(-1)
      return
    }
    setActiveStep(0)
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= nodes.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 2200)
    return () => clearInterval(interval)
  }, [speaking, nodes.length])

  const svgHeight = Math.max(100, nodes.length * 50 + 15)

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "flowchart"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
        {visual.description && (
          <p className="text-xs text-white/50 mb-3 text-center">{visual.description}</p>
        )}
        <svg width="100%" viewBox={`0 0 100 ${svgHeight}`} preserveAspectRatio="xMidYMid meet" className="max-w-[200px]">
          {nodes.map((node, i) => {
            const isActive = speaking && i <= activeStep
            const isPrev = speaking && i < activeStep
            return (
              <g key={node.id}>
                {i > 0 && (
                  <motion.line
                    x1={50} y1={nodes[i - 1].y + nodes[i - 1].height}
                    x2={50} y2={node.y}
                    stroke={isPrev ? COLORS.primary : "rgba(255,255,255,0.1)"}
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: isPrev ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                <motion.g
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: isActive ? 1 : 0.4,
                    scale: isActive ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                >
                  <rect
                    x={node.x} y={node.y}
                    width={node.width} height={node.height} rx="8"
                    fill={isActive ? "rgba(173,255,68,0.12)" : "rgba(255,255,255,0.03)"}
                    stroke={isActive ? COLORS.primary : "rgba(255,255,255,0.12)"}
                    strokeWidth={isActive ? 2 : 1}
                  />
                  <text
                    x={node.x + node.width / 2}
                    y={node.y + node.height / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7"
                    fill={isActive ? "rgba(173,255,68,0.9)" : "rgba(255,255,255,0.4)"}
                  >
                    {node.label.length > 12 ? node.label.slice(0, 11) + "..." : node.label}
                  </text>
                </motion.g>
              </g>
            )
          })}
        </svg>
      </div>
    </AnimationWrapper>
  )
}
