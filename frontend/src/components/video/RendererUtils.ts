export interface VisualData {
  type: string
  description: string
  style: string
  keywords: string[]
  objects: string[]
}

export interface AnimationData {
  entry: string
  highlight: string
  exit: string
}

export interface SlideVisual {
  visual: VisualData
  animations: AnimationData
  camera: string
  display_text: string
  voice_script: string
}

export type VisualType =
  | "diagram"
  | "svg"
  | "timeline"
  | "flowchart"
  | "graph"
  | "map"
  | "illustration"
  | "icon-grid"

export function normalizeType(raw: string): VisualType {
  const t = raw?.toLowerCase().trim() || "diagram"
  const valid: VisualType[] = [
    "diagram", "svg", "timeline", "flowchart",
    "graph", "map", "illustration", "icon-grid",
  ]
  return valid.includes(t as VisualType) ? (t as VisualType) : "diagram"
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1)
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}

export const COLORS = {
  primary: "#ADFF44",
  primaryDim: "rgba(173,255,68,0.15)",
  primaryGlow: "rgba(173,255,68,0.3)",
  surface: "#0a0a0a",
  surface2: "#111111",
  surface3: "#1a1a1a",
  text: "#ffffff",
  textSecondary: "#bdbdbd",
  textMuted: "#8a8a8a",
  accent: {
    blue: "#60a5fa",
    red: "#f87171",
    yellow: "#fbbf24",
    purple: "#a78bfa",
    cyan: "#22d3ee",
    orange: "#fb923c",
    pink: "#f472b6",
    green: "#4ade80",
  },
} as const

export function getSubjectAccent(keywords: string[]): string {
  const kw = keywords.join(" ").toLowerCase()
  if (/math|number|geometry|algebra|calc/i.test(kw)) return COLORS.accent.blue
  if (/bio|cell|plant|animal|heart|leaf|dna|gene/i.test(kw)) return COLORS.accent.green
  if (/chem|atom|molecule|reaction|element/i.test(kw)) return COLORS.accent.purple
  if (/phys|force|energy|circuit|light|sound/i.test(kw)) return COLORS.accent.cyan
  if (/geo|map|river|mountain|climate|continent/i.test(kw)) return COLORS.accent.orange
  if (/hist|timeline|kingdom|freedom|war|revolution/i.test(kw)) return COLORS.accent.yellow
  if (/grammar|noun|verb|sentence|english/i.test(kw)) return COLORS.accent.pink
  return COLORS.primary
}

export function splitLayout(visualType: VisualType): "left" | "right" | "full" | "top" | "bottom" {
  switch (visualType) {
    case "timeline":
    case "flowchart":
    case "map":
      return "top"
    case "graph":
    case "diagram":
    case "svg":
      return "left"
    case "illustration":
    case "icon-grid":
      return "full"
    default:
      return "left"
  }
}
