import { useMemo } from "react"
import { motion } from "framer-motion"
import type { VisualData, AnimationData } from "./RendererUtils"
import { AnimationWrapper, StaggerItem } from "./AnimationWrapper"
import { IndiaMapSVG, WorldMapSVG, ContinentMapSVG } from "./assets/MapAssets"

export function MapRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const kw = visual.keywords?.join(" ")?.toLowerCase() || ""
  const objs = visual.objects?.join(" ")?.toLowerCase() || ""
  const all = kw + " " + objs

  const isIndia = /india|भारत/.test(all)
  const isWorld = /world|विश्व|global/.test(all)
  const isContinent = /continent|महाद्वीप|asia|africa|europe|america/.test(all)

  const mapSvg = useMemo(() => {
    if (isIndia) return <IndiaMapSVG size={160} />
    if (isWorld) return <WorldMapSVG size={180} />
    if (isContinent) return <ContinentMapSVG size={160} />
    return <WorldMapSVG size={160} />
  }, [isIndia, isWorld, isContinent])

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "map"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-shrink-0"
        >
          {mapSvg}
        </motion.div>
        {visual.description && (
          <p className="text-xs text-white/50 text-center max-w-[85%]">{visual.description}</p>
        )}
        {visual.objects && visual.objects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {visual.objects.map((obj, i) => (
              <StaggerItem key={obj} index={i}>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(96,165,250,0.08)",
                    border: "1px solid rgba(96,165,250,0.2)",
                    color: "rgba(96,165,250,0.7)",
                  }}
                >
                  {obj}
                </span>
              </StaggerItem>
            ))}
          </div>
        )}
      </div>
    </AnimationWrapper>
  )
}
