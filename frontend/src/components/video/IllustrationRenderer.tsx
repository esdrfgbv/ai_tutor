import React, { useMemo } from "react"
import { motion } from "framer-motion"
import type { VisualData, AnimationData } from "./RendererUtils"
import { COLORS, getSubjectAccent } from "./RendererUtils"
import { AnimationWrapper, StaggerItem } from "./AnimationWrapper"
import { findAsset } from "./AssetRegistry"
import { AtomSVG, PlantCellSVG, AnimalCellSVG, VolcanoSVG, WaterCycleSVG, SolarSystemSVG } from "./assets/ScienceAssets"
import { IndiaMapSVG, WorldMapSVG } from "./assets/MapAssets"
import { SentenceTreeSVG, MindMapSVG } from "./assets/EnglishAssets"

const illustrationAssets: Record<string, React.FC<{ size?: number }>> = {
  atom: (p) => <AtomSVG size={p.size || 140} />,
  plant_cell: (p) => <PlantCellSVG size={p.size || 150} />,
  animal_cell: (p) => <AnimalCellSVG size={p.size || 150} />,
  volcano: (p) => <VolcanoSVG size={p.size || 150} />,
  water_cycle: (p) => <WaterCycleSVG size={p.size || 160} />,
  solar_system: (p) => <SolarSystemSVG size={p.size || 150} />,
  india_map: (p) => <IndiaMapSVG size={p.size || 160} />,
  world_map: (p) => <WorldMapSVG size={p.size || 170} />,
  sentence_tree: (p) => <SentenceTreeSVG size={p.size || 150} />,
  mind_map: (p) => <MindMapSVG size={p.size || 150} />,
}

export function IllustrationRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const asset = useMemo(() => findAsset(visual.keywords, visual.objects), [visual])

  const hasLocalAsset = asset && illustrationAssets[asset.id]

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "illustration"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-4">
        {hasLocalAsset ? (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex-shrink-0"
          >
            {React.createElement(illustrationAssets[asset!.id], { size: 160 })}
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center rounded-2xl w-full max-w-[180px] aspect-[4/3]"
            style={{
              background: "linear-gradient(135deg, rgba(173,255,68,0.04), rgba(173,255,68,0.01))",
              border: "1px solid rgba(173,255,68,0.1)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-4xl mb-2 opacity-40">🎨</div>
            <p className="text-[10px] text-white/30 text-center px-4 leading-relaxed">
              {visual.description || "Educational illustration"}
            </p>
            <div
              className="mt-3 text-[9px] px-3 py-1 rounded-full"
              style={{
                background: "rgba(173,255,68,0.06)",
                color: "rgba(173,255,68,0.4)",
                border: "1px solid rgba(173,255,68,0.1)",
              }}
            >
              AI illustration pending
            </div>
          </motion.div>
        )}
        {visual.description && (
          <p className="text-xs text-white/50 text-center max-w-[85%] leading-relaxed">{visual.description}</p>
        )}
        {visual.objects && visual.objects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {visual.objects.map((obj, i) => (
              <StaggerItem key={obj} index={i}>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(173,255,68,0.06)",
                    border: "1px solid rgba(173,255,68,0.12)",
                    color: "rgba(173,255,68,0.6)",
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
