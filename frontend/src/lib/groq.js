// groq.js - AI utility library ported from Sparkle
// Direct Groq API client for browser-side AI features

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export const DEFAULT_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// ─── Video Generation Types ─────────────────────────────
export const CATEGORIES = [
  {
    id: "general",
    label: "General",
    desc: "Any subject",
    icon: "📚",
    prompt: "Explain the topic with clear steps using examples suitable for Class 6-9 level.",
  },
  {
    id: "math",
    label: "Mathematics",
    desc: "Formulas, calculations",
    icon: "📐",
    prompt:
      "Teach the math concept with step-by-step calculations. Use LaTeX formulas. Show all working. Use real numbers and verify each step. Tailor to Class 6-9 JNV/Sainik entrance exam level.",
  },
  {
    id: "science",
    label: "Science",
    desc: "Experiments, diagrams",
    icon: "🔬",
    prompt:
      "Explain the science concept with real-world examples and simple diagrams described in text. Include chemical equations where relevant using LaTeX. Tailor to Class 6-9 JNV/Sainik entrance exam level.",
  },
  {
    id: "english",
    label: "English",
    desc: "Grammar, literature",
    icon: "📖",
    prompt:
      "Teach the English topic with clear definitions, examples, and practice sentences. Break grammar rules into simple steps. Tailor to Class 6-9 JNV/Sainik entrance exam level.",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    desc: "Patterns, puzzles",
    icon: "🧩",
    prompt:
      "Explain the reasoning/pattern step by step. Show the pattern rule clearly. Work through each element. Use diagrams described in text. Tailor to Class 6-9 JNV/Sainik entrance exam level.",
  },
];

const SYSTEM_PROMPT = `You are a world-class creative tutor who makes stunning lecture slides. Break the explanation into 5 to 7 logical steps.

For each step return TWO fields:

1. "display_text": visually rich, well-structured lecture-board content. Guidelines:
   - Use **bold** for key terms and important concepts
   - Use "- " for bullet points to create structured lists
   - Use LaTeX inside $...$ for inline math/chemistry and $$...$$ for block equations
   - IMPORTANT: Every slide MUST start with a **bold heading** line that summarizes the step (e.g. "**What is Photosynthesis?**" or "**The Key Formula**")
   - Use sub-headings separated by blank lines for multi-part slides
   - For chemistry use $H_2O$, $OH^-$, $CO_2$, $H^+ + OH^- \\rightarrow H_2O$
   - Use arrows like $\\rightarrow$, $\\Leftrightarrow$, $\\leftarrow$ for relationships
   - Keep each slide 4 to 8 lines, well-spaced and scannable

2. "voice_script": warm, conversational narration for text-to-speech.
   CRITICAL — plain English or Hindi prose ONLY depending on the language requested. NO symbols, LaTeX, markdown, or formulas.
   Rules:
   - Spell out chemicals: "H+" = "hydrogen ion", "OH-" = "hydroxide ion", "H2O" = "water"
   - Spell math: "x^2" = "x squared", "a/b" = "a over b", "->" = "gives" or "produces"
   - Only use: letters, numbers, spaces, commas, periods, ? and !
   - 3 to 6 warm, clear sentences like a teacher explaining one-on-one

Output STRICTLY valid JSON only:
{ "title": "Topic Name", "slides": [ { "display_text": "...", "voice_script": "..." } ] }`;

export async function generateVideo(question, language = "english", category = "general", apiKey) {
  const key = apiKey || DEFAULT_API_KEY;
  const catCfg = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const langInstr =
    language === "hindi"
      ? "\nIMPORTANT: Write ALL voice_script fields in Hindi (Hinglish/Devanagari). Students want Hindi explanation."
      : "\nIMPORTANT: Write ALL voice_script fields in English.";
  const catInstr = "\nCATEGORY: " + catCfg.prompt;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question + langInstr + catInstr },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq error ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error("Invalid response shape from Groq");
  }
  return parsed;
}

export async function chatAboutSlide({ apiKey, title, displayText, voiceScript, doubt }) {
  const key = apiKey || DEFAULT_API_KEY;
  const sys = `You are an AI tutor. The user is watching a video about ${title}. They paused at a slide that says: '${displayText}'. They heard the following explanation: '${voiceScript}'. Based ONLY on this exact context, answer their specific doubt briefly and conversationally.`;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: doubt },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const VISION_SYSTEM = `You are an expert tutor for Sainik School, Navodaya, and JNV exams (Classes 6 & 9). Accuracy is critical.

Follow this EXACT response structure:

**📝 What I see**
One line describing the question or content in the image.

**✅ Step-by-step solution**
- Step 1: ...
- Step 2: ...
- Step 3: ...

**Final Answer:** **your answer here**

---

**💡 Quick Tip:** one memory trick in one line

RULES:
- If image contains notes/solution (not a question): replace the structure with "**📖 What this explains**" then rephrase simply, no steps needed, end with quick tip.
- Use **bold** only for key terms and the final answer
- NEVER invent numbers or values not in image
- If unsure, write "⚠️ I see [what you see] — please verify"`;

export async function analyzeImage(base64Image, apiKey) {
  const key = apiKey || DEFAULT_API_KEY;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image carefully. Read every number, word, shape, and pattern. Do NOT invent or guess.",
            },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq Vision error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Sorry, I couldn't analyze this image.";
}

const SOCRATIC_SYSTEM = `You are a Socratic tutor for Sainik School, Navodaya, and JNV entrance exam students (Classes 6 & 9).

CRITICAL RULES:
1. NEVER give the direct answer — guide the student with hints and questions
2. Break the problem into small steps and ask guiding questions
3. Praise effort and encourage thinking
4. If the student is stuck, give a small hint, not the solution
5. Use simple language and relatable examples
6. Keep responses 2-4 sentences — short and encouraging
7. If the student asks something off-topic, politely redirect`;

export async function askSocratic(question, apiKey) {
  const key = apiKey || DEFAULT_API_KEY;
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SOCRATIC_SYSTEM },
        { role: "user", content: question },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Let me think about this... Could you rephrase your question?";
}
