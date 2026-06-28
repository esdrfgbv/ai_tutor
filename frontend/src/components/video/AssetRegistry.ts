export interface AssetEntry {
  id: string
  keywords: string[]
  category: string
  priority: number
}

const registry: AssetEntry[] = [
  // Mathematics
  { id: "triangle", keywords: ["triangle", "त्रिभुज"], category: "math", priority: 1 },
  { id: "circle", keywords: ["circle", "वृत्त"], category: "math", priority: 1 },
  { id: "rectangle", keywords: ["rectangle", "आयत"], category: "math", priority: 1 },
  { id: "square", keywords: ["square", "वर्ग"], category: "math", priority: 1 },
  { id: "number_line", keywords: ["number line", "संख्या रेखा"], category: "math", priority: 1 },
  { id: "coordinate_plane", keywords: ["coordinate", "graph", "axis", "निर्देशांक"], category: "math", priority: 1 },
  { id: "pie_chart", keywords: ["pie chart", "pie", "वृत्त आरेख"], category: "math", priority: 2 },
  { id: "fraction_circles", keywords: ["fraction", "भिन्न"], category: "math", priority: 2 },

  // Science
  { id: "atom", keywords: ["atom", "परमाणु"], category: "science", priority: 1 },
  { id: "plant_cell", keywords: ["plant cell", "पादप कोशिका"], category: "science", priority: 1 },
  { id: "animal_cell", keywords: ["animal cell", "जंतु कोशिका"], category: "science", priority: 1 },
  { id: "heart", keywords: ["heart", "हृदय"], category: "science", priority: 1 },
  { id: "leaf", keywords: ["leaf", "पत्ती"], category: "science", priority: 1 },
  { id: "flower", keywords: ["flower", "पुष्प"], category: "science", priority: 2 },
  { id: "water_cycle", keywords: ["water cycle", "जल चक्र"], category: "science", priority: 1 },
  { id: "food_chain", keywords: ["food chain", "खाद्य श्रृंखला"], category: "science", priority: 2 },
  { id: "electric_circuit", keywords: ["electric circuit", "विद्युत परिपथ"], category: "science", priority: 2 },
  { id: "volcano", keywords: ["volcano", "ज्वालामुखी"], category: "science", priority: 2 },
  { id: "solar_system", keywords: ["solar system", "सौर मंडल"], category: "science", priority: 2 },
  { id: "digestive_system", keywords: ["digestive", "पाचन"], category: "science", priority: 3 },
  { id: "respiratory_system", keywords: ["respiratory", "श्वसन"], category: "science", priority: 3 },

  // English
  { id: "sentence_tree", keywords: ["sentence tree", "grammar tree"], category: "english", priority: 2 },
  { id: "mind_map", keywords: ["mind map", "माइंड मैप"], category: "english", priority: 2 },

  // Social Studies
  { id: "timeline", keywords: ["timeline", "समय रेखा"], category: "social", priority: 1 },
  { id: "india_map", keywords: ["india map", "भारत का नक्शा", "india"], category: "social", priority: 1 },
  { id: "world_map", keywords: ["world map", "विश्व का नक्शा", "world"], category: "social", priority: 2 },

  // Geography
  { id: "continents", keywords: ["continents", "महाद्वीप"], category: "geography", priority: 2 },
  { id: "rivers", keywords: ["river", "नदी"], category: "geography", priority: 2 },
  { id: "climate", keywords: ["climate", "जलवायु"], category: "geography", priority: 3 },
  { id: "mountains", keywords: ["mountain", "पर्वत"], category: "geography", priority: 2 },
]

export function findAsset(keywords: string[], objects: string[]): AssetEntry | null {
  const allTerms = [...keywords, ...objects].map((t) => t.toLowerCase().trim())
  let best: AssetEntry | null = null
  let bestScore = 0

  for (const entry of registry) {
    let score = 0
    for (const term of allTerms) {
      for (const kw of entry.keywords) {
        if (term.includes(kw) || kw.includes(term)) {
          score += entry.priority === 1 ? 3 : entry.priority === 2 ? 2 : 1
        }
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore > 0 ? best : null
}

export function getAssetIdsByCategory(category: string): string[] {
  return registry
    .filter((e) => e.category === category)
    .sort((a, b) => a.priority - b.priority)
    .map((e) => e.id)
}
