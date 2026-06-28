import { useMemo, useState, useEffect } from "react"
import { motion } from "framer-motion"
import type { VisualData, AnimationData } from "./RendererUtils"
import { AnimationWrapper, StaggerItem } from "./AnimationWrapper"

interface Milestone {
  label: string
  year?: string
  active?: boolean
}

export function TimelineRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const milestones: Milestone[] = useMemo(() => {
    const objs = visual.objects || []
    if (objs.length >= 2) {
      return objs.map((o) => ({ label: o, year: "" }))
    }
    const kw = visual.keywords || []
    return kw.map((k) => ({ label: k, year: "" }))
  }, [visual])

  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (!speaking) {
      setActiveIndex(-1)
      return
    }
    setActiveIndex(0)
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= milestones.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [speaking, milestones.length])

  const orientation = milestones.length > 4 ? "vertical" : "horizontal"

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "timeline"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
        {visual.description && (
          <p className="text-xs text-white/50 mb-3 text-center">{visual.description}</p>
        )}
        <div
          className={`flex ${orientation === "horizontal" ? "flex-row items-center gap-0" : "flex-col items-start gap-3"} w-full max-w-[90%]`}
        >
          {orientation === "horizontal" ? (
            <div className="relative w-full flex items-center py-4">
              <div className="absolute left-0 right-0 h-0.5" style={{ background: "rgba(173,255,68,0.2)" }} />
              {milestones.map((m, i) => {
                const isActive = speaking && i <= activeIndex
                return (
                  <motion.div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 relative z-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                  >
                    <motion.div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: isActive ? "#ADFF44" : "rgba(173,255,68,0.15)",
                        border: `2px solid ${isActive ? "#ADFF44" : "rgba(173,255,68,0.3)"}`,
                        boxShadow: isActive ? "0 0 12px rgba(173,255,68,0.4)" : "none",
                      }}
                      animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                    />
                    <span
                      className="text-[10px] text-center leading-tight px-1"
                      style={{ color: isActive ? "rgba(173,255,68,0.9)" : "rgba(255,255,255,0.4)" }}
                    >
                      {m.label}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="relative pl-6 border-l-2" style={{ borderColor: "rgba(173,255,68,0.2)" }}>
              {milestones.map((m, i) => {
                const isActive = speaking && i <= activeIndex
                return (
                  <StaggerItem key={i} index={i} className="mb-4">
                    <div className="flex items-start gap-3">
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full mt-1 -ml-[1.35rem] flex-shrink-0"
                        style={{
                          background: isActive ? "#ADFF44" : "rgba(173,255,68,0.15)",
                          border: `2px solid ${isActive ? "#ADFF44" : "rgba(173,255,68,0.3)"}`,
                        }}
                        animate={isActive ? { scale: [1, 1.4, 1] } : {}}
                        transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                      />
                      <span
                        className="text-xs leading-relaxed"
                        style={{ color: isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}
                      >
                        {m.label}
                      </span>
                    </div>
                  </StaggerItem>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AnimationWrapper>
  )
}
