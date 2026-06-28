import { normalizeType, type VisualData, type VisualType } from "./RendererUtils"

export interface RendererConfig {
  type: VisualType
  scale: number
  animated: boolean
  showLabels: boolean
  showGrid: boolean
  colorScheme: "mono" | "accent" | "full"
  highlightFirst: string | null
}

export function getRendererConfig(
  visual: VisualData,
  speaking: boolean
): RendererConfig {
  const vt = normalizeType(visual.type)
  const kw = visual.keywords?.join(" ")?.toLowerCase() || ""
  const objs = visual.objects || []

  const isDetailed = objs.length > 3 || visual.description.length > 40

  return {
    type: vt,
    scale: 1,
    animated: speaking,
    showLabels: true,
    showGrid: vt === "graph",
    colorScheme: kw.includes("math") || kw.includes("number")
      ? "mono"
      : isDetailed
        ? "full"
        : "accent",
    highlightFirst: objs.length > 0 ? objs[0] : null,
  }
}
