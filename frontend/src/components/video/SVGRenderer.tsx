import { useMemo } from "react"
import { motion } from "framer-motion"
import type { VisualData, AnimationData } from "./RendererUtils"
import { COLORS, getSubjectAccent } from "./RendererUtils"
import { findAsset } from "./AssetRegistry"
import {
  TriangleSVG, CircleSVG, RectangleSVG, SquareSVG,
  NumberLineSVG, CoordinatePlaneSVG, PieChartSVG, FractionCirclesSVG,
} from "./assets/MathAssets"
import {
  AtomSVG, PlantCellSVG, AnimalCellSVG, HeartSVG, LeafSVG,
  VolcanoSVG, SolarSystemSVG, WaterCycleSVG, FoodChainSVG, ElectricCircuitSVG,
} from "./assets/ScienceAssets"
import { SentenceTreeSVG, MindMapSVG } from "./assets/EnglishAssets"
import { AnimationWrapper, StaggerItem, DrawPath } from "./AnimationWrapper"

const assetMap: Record<string, React.FC<{ size?: number; animated?: boolean }>> = {
  triangle: (p) => <TriangleSVG size={p.size} />,
  circle: (p) => <CircleSVG size={p.size} />,
  rectangle: (p) => <RectangleSVG size={p.size} />,
  square: (p) => <SquareSVG size={p.size} />,
  number_line: (p) => <NumberLineSVG size={p.size || 160} />,
  coordinate_plane: (p) => <CoordinatePlaneSVG size={p.size || 140} />,
  pie_chart: (p) => <PieChartSVG size={p.size} />,
  fraction_circles: (p) => <FractionCirclesSVG size={p.size || 120} />,
  atom: (p) => <AtomSVG size={p.size} animated={p.animated} />,
  plant_cell: (p) => <PlantCellSVG size={p.size || 140} />,
  animal_cell: (p) => <AnimalCellSVG size={p.size || 140} />,
  heart: (p) => <HeartSVG size={p.size} />,
  leaf: (p) => <LeafSVG size={p.size} />,
  volcano: (p) => <VolcanoSVG size={p.size || 140} />,
  solar_system: (p) => <SolarSystemSVG size={p.size || 140} animated={p.animated} />,
  water_cycle: (p) => <WaterCycleSVG size={p.size || 150} />,
  food_chain: (p) => <FoodChainSVG size={p.size || 150} />,
  electric_circuit: (p) => <ElectricCircuitSVG size={p.size || 140} />,
  sentence_tree: (p) => <SentenceTreeSVG size={p.size || 140} />,
  mind_map: (p) => <MindMapSVG size={p.size || 140} />,
  timeline: (p) => <TimelineSVG size={p.size || 150} milestones={["A", "B", "C"]} />,
  india_map: (p) => <IndiaMapSVG size={p.size || 150} />,
  world_map: (p) => <WorldMapSVG size={p.size || 150} />,
}

import { TimelineSVG } from "./assets/GeneralAssets"
import { IndiaMapSVG, WorldMapSVG } from "./assets/MapAssets"

export function SVGRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const asset = useMemo(() => findAsset(visual.keywords, visual.objects), [visual])

  const renderedAsset = useMemo(() => {
    if (asset && assetMap[asset.id]) {
      const Comp = assetMap[asset.id]
      return <Comp size={140} animated={speaking} />
    }

    const accent = getSubjectAccent(visual.keywords)
    return (
      <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
        <motion.rect x="10" y="10" width="120" height="120" rx="16"
          fill="rgba(173,255,68,0.03)" stroke={accent} strokeWidth="1.5" strokeDasharray="6 3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} />
        <motion.circle cx="70" cy="55" r="20"
          fill="rgba(173,255,68,0.06)" stroke={accent} strokeWidth="1.5"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
        <text x="70" y="60" textAnchor="middle" fontSize="9" fill={accent} opacity={0.8}>SVG</text>
        <text x="70" y="108" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">
          {visual.description?.slice(0, 30) || "Asset"}
        </text>
      </svg>
    )
  }, [asset, visual, speaking])

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "svg"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-4">
        <div className="flex-shrink-0">{renderedAsset}</div>
        {visual.description && (
          <p className="text-xs text-center text-white/50 max-w-[85%] leading-relaxed">
            {visual.description}
          </p>
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
