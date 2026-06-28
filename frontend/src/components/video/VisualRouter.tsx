import { useMemo } from "react"
import type { VisualData, AnimationData } from "./RendererUtils"
import { normalizeType, type VisualType } from "./RendererUtils"
import { DiagramRenderer } from "./DiagramRenderer"
import { SVGRenderer } from "./SVGRenderer"
import { TimelineRenderer } from "./TimelineRenderer"
import { FlowchartRenderer } from "./FlowchartRenderer"
import { GraphRenderer } from "./GraphRenderer"
import { MapRenderer } from "./MapRenderer"
import { IllustrationRenderer } from "./IllustrationRenderer"

interface VisualRouterProps {
  visual: VisualData
  animations: AnimationData
  camera?: string
  speaking: boolean
  className?: string
}

const rendererMap: Record<VisualType, React.FC<{ visual: VisualData; animations: AnimationData; speaking: boolean }>> = {
  diagram: DiagramRenderer,
  svg: SVGRenderer,
  timeline: TimelineRenderer,
  flowchart: FlowchartRenderer,
  graph: GraphRenderer,
  map: MapRenderer,
  illustration: IllustrationRenderer,
  "icon-grid": DiagramRenderer,
}

export function VisualRouter({
  visual,
  animations,
  speaking,
  className = "",
}: VisualRouterProps) {
  const vt = normalizeType(visual.type)
  const Renderer = rendererMap[vt] || DiagramRenderer

  const aspectRatioClass = useMemo(() => {
    switch (vt) {
      case "timeline":
      case "flowchart":
        return "aspect-[3/2]"
      case "map":
        return "aspect-[4/3]"
      case "graph":
        return "aspect-[4/3]"
      case "illustration":
        return "aspect-[4/3]"
      case "icon-grid":
        return "aspect-square"
      default:
        return "aspect-[4/3]"
    }
  }, [vt])

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl ${aspectRatioClass} ${className}`}
      style={{
        background: "rgba(173,255,68,0.02)",
        border: "1px solid rgba(173,255,68,0.08)",
      }}
    >
      <Renderer
        visual={visual}
        animations={animations}
        speaking={speaking}
      />
    </div>
  )
}
