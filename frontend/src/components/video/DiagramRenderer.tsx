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
import { SentenceTreeSVG, MindMapSVG, GrammarFlowSVG } from "./assets/EnglishAssets"
import { AnimationWrapper, StaggerItem } from "./AnimationWrapper"

function renderMathDiagram(visual: VisualData, animated: boolean) {
  const kw = visual.keywords?.join(" ") || ""
  const objs = visual.objects?.join(" ") || ""
  const all = (kw + " " + objs).toLowerCase()
  const accent = getSubjectAccent(visual.keywords)

  if (/triangle/.test(all)) return <TriangleSVG size={100} />
  if (/circle/.test(all)) return <CircleSVG size={90} />
  if (/rectangle/.test(all)) return <RectangleSVG size={100} />
  if (/square/.test(all)) return <SquareSVG size={90} />
  if (/number line|numberline/.test(all)) return <NumberLineSVG size={160} />
  if (/coordinate|graph.*axis/.test(all)) return <CoordinatePlaneSVG size={140} />
  if (/pie/.test(all)) return <PieChartSVG size={100} />
  if (/fraction/.test(all)) return <FractionCirclesSVG size={120} />

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <motion.circle cx="60" cy="60" r="40"
        fill="rgba(96,165,250,0.06)" stroke={accent} strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <text x="60" y="65" textAnchor="middle" fontSize="11" fill={accent} opacity={0.7}>
        {visual.description?.slice(0, 20) || "Diagram"}
      </text>
    </svg>
  )
}

function renderScienceDiagram(visual: VisualData, animated: boolean) {
  const kw = visual.keywords?.join(" ") || ""
  const objs = visual.objects?.join(" ") || ""
  const all = (kw + " " + objs).toLowerCase()

  if (/atom/.test(all)) return <AtomSVG size={120} animated={animated} />
  if (/plant.*cell/.test(all)) return <PlantCellSVG size={140} />
  if (/animal.*cell/.test(all)) return <AnimalCellSVG size={140} />
  if (/heart/.test(all)) return <HeartSVG size={120} />
  if (/leaf/.test(all)) return <LeafSVG size={100} />
  if (/volcano/.test(all)) return <VolcanoSVG size={140} />
  if (/solar/.test(all)) return <SolarSystemSVG size={140} animated={animated} />
  if (/water.*cycle/.test(all)) return <WaterCycleSVG size={150} />
  if (/food.*chain/.test(all)) return <FoodChainSVG size={150} />
  if (/circuit/.test(all)) return <ElectricCircuitSVG size={140} />

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <motion.rect x="20" y="20" width="80" height="80" rx="12"
        fill="rgba(74,222,128,0.06)" stroke={COLORS.accent.green} strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <text x="60" y="55" textAnchor="middle" fontSize="10" fill={COLORS.accent.green} opacity={0.7}>
        {visual.description?.slice(0, 25) || "Science"}
      </text>
    </svg>
  )
}

function renderEnglishDiagram(visual: VisualData) {
  const kw = visual.keywords?.join(" ") || ""
  if (/sentence.*tree|grammar.*tree/.test(kw)) return <SentenceTreeSVG size={140} />
  if (/mind.*map/.test(kw)) return <MindMapSVG size={140} />
  if (/grammar|flow/.test(kw)) return <GrammarFlowSVG size={150} />
  return <MindMapSVG size={130} />
}

export function DiagramRenderer({
  visual,
  animations,
  speaking,
}: {
  visual: VisualData
  animations: AnimationData
  speaking: boolean
}) {
  const kw = visual.keywords?.join(" ") || ""
  const isMath = /math|number|geometry|algebra|fraction|graph|chart/.test(kw)
  const isScience = /science|bio|chem|phys|cell|plant|animal|heart|leaf|atom|circuit|volcano/.test(kw)
  const isEnglish = /english|grammar|sentence|noun|verb/.test(kw)

  const diagram = useMemo(() => {
    if (isMath) return renderMathDiagram(visual, speaking)
    if (isScience) return renderScienceDiagram(visual, speaking)
    if (isEnglish) return renderEnglishDiagram(visual)
    return renderScienceDiagram(visual, speaking)
  }, [isMath, isScience, isEnglish, visual, speaking])

  return (
    <AnimationWrapper config={animations} slideKey={visual.description || "diagram"} className="w-full h-full">
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-4">
        <div className="flex-shrink-0">{diagram}</div>
        {visual.description && (
          <p className="text-xs text-center text-white/50 max-w-[90%] leading-relaxed">
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
