from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from app.api.deps import get_current_user
from app.models.models import User
from app.core.config import get_settings
from openai import OpenAI

router = APIRouter(prefix="/ai", tags=["ai"])

def _get_groq_client():
    settings = get_settings()
    api_key = settings.groq_api_key
    if not api_key:
        raise HTTPException(503, "AI provider not configured")
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_VIDEO_MODEL = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
EXTRACT_MODEL = "llama-3.3-70b-versatile"
GEN_MODEL = "llama-3.3-70b-versatile"

# ─── Enhanced Video Generation Models ──────────────────────────────

class VisualPlan(BaseModel):
    type: str = "diagram"
    description: str = ""
    style: str = "flat-2d educational"
    keywords: list[str] = Field(default_factory=list)
    objects: list[str] = Field(default_factory=list)

class AnimationPlan(BaseModel):
    entry: str = "fade-in-up"
    highlight: str = "glow"
    exit: str = "fade-out-left"

class SlideOut(BaseModel):
    id: int
    title: str = ""
    display_text: str
    voice_script: str
    learning_goal: str = ""
    visual: VisualPlan = Field(default_factory=VisualPlan)
    animations: AnimationPlan = Field(default_factory=AnimationPlan)
    camera: str = ""
    duration: int = 15

class VideoGenerateOut(BaseModel):
    title: str
    language: str = "english"
    estimated_duration: int = Field(default=0, ge=0)
    slides: list[SlideOut]

    @field_validator("slides")
    @classmethod
    def slides_nonempty(cls, v):
        if not v:
            raise ValueError("At least one slide required")
        return v

# ─── Video Generation ─────────────────────────────────────────────

class VideoGenerateIn(BaseModel):
    question: str
    language: str = "english"
    category: str = "general"
    category_prompt: str | None = None

SYSTEM_PROMPT = """You are a world-class educational instructional designer who creates stunning animated video lessons. Each lesson must feel like a premium educational animation — NOT a PowerPoint presentation.

## EDUCATIONAL PEDAGOGY — Follow this exact story arc:

Hook (capture attention) → Concept introduction → Diagram/Visual explanation → Example → Real-life application → Summary

Never jump directly into definitions. Always start by connecting to what the student already knows.

## SLIDE DESIGN RULES — Every slide:

1. Maximum 5 lines of text — NO paragraphs, NO walls of text
2. Large bold heading (the core idea of this step)
3. Short bullet points (2-4 max) using "- " prefix
4. One concept only per slide — if you need more, add another slide
5. Use **bold** for key terms and important vocabulary only
6. Use LaTeX inside $...$ for inline math and $$...$$ for block equations
7. For chemistry: $H_2O$, $OH^-$, $CO_2$, $H^+ + OH^- \\rightarrow H_2O$
8. Use arrows like $\\rightarrow$, $\\Leftrightarrow$, $\\leftarrow$ for relationships

## VISUAL PLANNING — For EVERY slide, decide what visual helps students understand:

Choose the BEST visual type for the concept:
- Math → number line, pie chart, triangle diagram, coordinate graph, area model
- Science → atom diagram, plant cell, animal cell, heart, circuit, leaf, water cycle, volcano
- English → sentence tree, flowchart, mind map, grammar diagram, comparison table
- Social Studies → timeline, map, kingdom chart, history flow, cause-effect chain
- Geography → map, river diagram, climate chart, globe cross-section
- GK → icons grid, flag chart, country map, comparison cards
- Other → diagram, svg, illustration, icon-grid, flowchart, graph

The "visual" field must include:
- "type": one of "diagram", "svg", "illustration", "timeline", "flowchart", "graph", "map", "icon-grid"
- "description": what the student should see (e.g. "Number line from -5 to 5 with integers marked")
- "objects": list of specific objects/elements that should appear (e.g. ["sun", "leaf", "water drop", "CO2 arrow"])
- "keywords": visual keywords for the renderer

## VOICE SCRIPT — CRITICAL: Do NOT read the slide text verbatim.

The SLIDE shows keywords and bullet points.
The VOICE explains naturally like a teacher.

- 3 to 6 warm, conversational sentences per slide
- Explain the concept in your own words — expand, don't repeat
- For math: spell out "x squared", "a over b", "hydrogen ion", "water"
- NO symbols, NO LaTeX, NO markdown, NO formulas in voice_script
- Only use: letters, numbers, spaces, commas, periods, ? and !

## ANIMATION & CAMERA — Plan how the slide comes alive:

- entry: "fade-in-up", "zoom-in", "slide-from-left", "pop", "typewriter"
- highlight: "glow", "pulse", "bounce", "color-shift", "underline"
- exit: "fade-out-left", "zoom-out", "slide-to-right"
- camera: "zoom-in-on-diagram", "pan-to-text", "wide-shot", "close-up-on-keyword"

## LANGUAGE RULES FOR HINDI:

When language is "hindi":
- Use 100% pure Hindi in Devanagari script — NO Hinglish, NO English letters
- Use standard NCERT Hindi terminology:
  * LCM → लघुत्तम समापवर्त्य, HCF → महत्तम समापवर्तक
  * Fraction → भिन्न, Triangle → त्रिभुज, Rectangle → आयत
  * Addition → योग, Subtraction → घटाव, Multiplication → गुणा, Division → भाग
  * Photosynthesis → प्रकाश संश्लेषण, Respiration → श्वसन
  * All subject terms in pure Hindi
- The voice_script must sound like an NCERT Hindi teacher — NOT YouTube Hinglish
- If no standard Hindi translation exists, only then keep the original term in Devanagari

## OUTPUT JSON SCHEMA — Return STRICTLY valid JSON only:

{
  "title": "Lesson Title",
  "language": "english or hindi",
  "estimated_duration": 90,
  "slides": [
    {
      "id": 1,
      "title": "Slide heading (brief)",
      "display_text": "Formatted text with **bold** and bullets using -",
      "voice_script": "Warm narration — expands on the slide without reading it",
      "learning_goal": "What the student learns in this step",
      "visual": {
        "type": "diagram|svg|illustration|timeline|flowchart|graph|map|icon-grid",
        "description": "Description of the visual",
        "style": "flat-2d educational",
        "keywords": ["concept", "keywords"],
        "objects": ["object1", "object2"]
      },
      "animations": {
        "entry": "fade-in-up",
        "highlight": "glow",
        "exit": "fade-out-left"
      },
      "camera": "zoom-in-on-leaf",
      "duration": 15
    }
  ]
}

Generate 5 to 7 slides following the Hook → Concept → Diagram → Example → Real-life → Summary arc. Every slide must have display_text, voice_script, and a visual plan."""

@router.post("/video-generate", response_model=VideoGenerateOut)
def video_generate(payload: VideoGenerateIn, _: User = Depends(get_current_user)):
    cat_instr = ""
    if payload.category_prompt:
        cat_instr = "\nCATEGORY: " + payload.category_prompt
    lang_instr = (
        (
            "\n\nCRITICAL LANGUAGE INSTRUCTION — The topic is in Hindi.\n"
            "You MUST follow these rules STRICTLY:\n"
            "1. display_text: Write in Hindi using ONLY Devanagari script (हिंदी). "
            "Use pure NCERT Hindi terminology. NO English letters. NO Hinglish.\n"
            "   - LCM → लघुत्तम समापवर्त्य, HCF → महत्तम समापवर्तक\n"
            "   - Fraction → भिन्न, Triangle → त्रिभुज, Rectangle → आयत\n"
            "   - Addition → योग, Subtraction → घटाव, Multiplication → गुणा, Division → भाग\n"
            "   - Photosynthesis → प्रकाश संश्लेषण, Respiration → श्वसन\n"
            "2. voice_script: Pure Hindi narration in Devanagari. "
            "Sound like an NCERT Hindi teacher, NOT YouTube Hinglish.\n"
            "3. All visual.description, learning_goal, keywords, objects titles in pure Hindi.\n"
            "4. If no standard Hindi translation exists, write the term in Devanagari phonetically."
        )
        if payload.language == "hindi"
        else "\n\nIMPORTANT: Write all content in English. Use standard English educational terminology."
    )
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_VIDEO_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Create a video lesson explaining: {payload.question}" + lang_instr + cat_instr},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
        max_tokens=8192,
    )
    content = response.choices[0].message.content
    if not content:
        raise HTTPException(502, "AI returned empty response")
    import json
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI returned malformed JSON")
    return _parse_video_response(parsed)

# ─── Response Parser & Validator ───────────────────────────────────

def _parse_video_response(raw: dict) -> dict:
    """Robustly parse and validate AI video response with fallbacks for every field.

    Returns a dict that conforms to VideoGenerateOut schema while being
    resilient to partial or malformed AI output.
    """
    result = {
        "title": raw.get("title", "Untitled Lesson"),
        "language": raw.get("language", "english"),
        "estimated_duration": raw.get("estimated_duration", 0),
        "slides": [],
    }

    raw_slides = raw.get("slides", [])
    if not raw_slides or not isinstance(raw_slides, list):
        raw_slides = [{
            "display_text": raw.get("display_text", "No content could be generated. Please try again."),
            "voice_script": raw.get("voice_script", ""),
        }]

    for i, s in enumerate(raw_slides):
        if not isinstance(s, dict):
            s = {}
        vis = s.get("visual", {}) or {}
        anim = s.get("animations", {}) or {}
        slide = {
            "id": s.get("id", i + 1),
            "title": s.get("title", ""),
            "display_text": s.get("display_text", ""),
            "voice_script": s.get("voice_script", ""),
            "learning_goal": s.get("learning_goal", ""),
            "visual": {
                "type": vis.get("type", "diagram"),
                "description": vis.get("description", ""),
                "style": vis.get("style", "flat-2d educational"),
                "keywords": vis.get("keywords", []),
                "objects": vis.get("objects", []),
            },
            "animations": {
                "entry": anim.get("entry", "fade-in-up"),
                "highlight": anim.get("highlight", "glow"),
                "exit": anim.get("exit", "fade-out-left"),
            },
            "camera": s.get("camera", ""),
            "duration": s.get("duration", 15),
        }
        # Ensure backward-compat fields are never empty
        if not slide["display_text"]:
            slide["display_text"] = f"Step {i + 1}"
        if not slide["voice_script"]:
            slide["voice_script"] = f"Let us understand this concept step by step."
        result["slides"].append(slide)

    return result

# ─── Chat About Slide ─────────────────────────────────────────────

class ChatSlideIn(BaseModel):
    title: str
    display_text: str
    voice_script: str
    doubt: str

@router.post("/chat-slide")
def chat_slide(payload: ChatSlideIn, _: User = Depends(get_current_user)):
    sys = f"You are an AI tutor. The user is watching a video about {payload.title}. They paused at a slide that says: '{payload.display_text}'. They heard the following explanation: '{payload.voice_script}'. Based ONLY on this exact context, answer their specific doubt briefly and conversationally."
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": payload.doubt},
        ],
        temperature=0.4,
    )
    content = response.choices[0].message.content
    return {"answer": content or ""}

# ─── Image Analysis ───────────────────────────────────────────────

class AnalyzeImageIn(BaseModel):
    image: str

VISION_SYSTEM = """You are an expert tutor for Sainik School, Navodaya, and JNV exams (Classes 6 & 9). Accuracy is critical.

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
- If unsure, write "⚠️ I see [what you see] — please verify" """

@router.post("/analyze-image")
def analyze_image(payload: AnalyzeImageIn, _: User = Depends(get_current_user)):
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {"role": "system", "content": VISION_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image carefully. Read every number, word, shape, and pattern. Do NOT invent or guess."},
                    {"type": "image_url", "image_url": {"url": payload.image}},
                ],
            },
        ],
        temperature=0.2,
        max_tokens=2048,
    )
    content = response.choices[0].message.content
    return {"answer": content or "Sorry, I couldn't analyze this image."}

# ─── Socratic Tutor ───────────────────────────────────────────────

class SocraticIn(BaseModel):
    question: str

SOCRATIC_SYSTEM = """You are a Socratic tutor for Sainik School, Navodaya, and JNV entrance exam students (Classes 6 & 9).

CRITICAL RULES:
1. NEVER give the direct answer — guide the student with hints and questions
2. Break the problem into small steps and ask guiding questions
3. Praise effort and encourage thinking
4. If the student is stuck, give a small hint, not the solution
5. Use simple language and relatable examples
6. Keep responses 2-4 sentences — short and encouraging
7. If the student asks something off-topic, politely redirect"""

@router.post("/socratic")
def socratic(payload: SocraticIn, _: User = Depends(get_current_user)):
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SOCRATIC_SYSTEM},
            {"role": "user", "content": payload.question},
        ],
        temperature=0.7,
        max_tokens=300,
    )
    content = response.choices[0].message.content
    return {"answer": content or "Let me think about this... Could you rephrase your question?"}

# ─── Question Extraction ──────────────────────────────────────────

class ExtractQuestionsIn(BaseModel):
    text: str

EXTRACT_SYSTEM = """You are a precise exam question extractor for Sainik/Navodaya/JNV papers.

Your job: Find ALL MCQ questions in the text and return them in this EXACT JSON structure:
{
  "questions": [
    {
      "type": "mcq",
      "text": "the complete question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": -1,
      "explanation": "",
      "subject": "",
      "topic": ""
    }
  ]
}

RULES:
- Only extract text that is a REAL question WITH answer options (A/B/C/D or 1/2/3/4)
- Include the FULL question text — do not truncate
- Include ALL 4 options for each question
- If you see an answer key elsewhere in the text, try to match it and fill the "correct" index (0-based)
- Skip: section headers, instructions to students, answer key lists, page numbers, marks indicators, "Answer:" lines
- Include EVERY real question you find — do not skip any valid question
- If a question has no options attached, skip it"""

@router.post("/extract-questions")
def extract_questions(payload: ExtractQuestionsIn, _: User = Depends(get_current_user)):
    cleaned = payload.text[:25000]
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=EXTRACT_MODEL,
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM},
            {"role": "user", "content": f"Extract ALL MCQ questions from this exam paper. Return them as a JSON object with a \"questions\" array:\n\n{cleaned}"},
        ],
        temperature=0.05,
        response_format={"type": "json_object"},
        max_tokens=8192,
    )
    content = response.choices[0].message.content
    if not content:
        return {"questions": []}
    import json
    parsed = json.loads(content)
    arr = parsed.get("questions") or parsed.get("data") or parsed.get("results") or []
    return {"questions": arr if isinstance(arr, list) else []}

# ─── Pattern Analysis ─────────────────────────────────────────────

class AnalyzePatternIn(BaseModel):
    summary: str

@router.post("/analyze-pattern")
def analyze_pattern(payload: AnalyzePatternIn, _: User = Depends(get_current_user)):
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are an exam pattern analyst. Analyze these questions and return JSON array of { topic, frequency, weightage, insight } objects. Return ONLY JSON."},
            {"role": "user", "content": payload.summary},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    content = response.choices[0].message.content
    if not content:
        return {"patterns": []}
    import json
    parsed = json.loads(content)
    result = parsed.get("insights") or parsed.get("patterns") or parsed
    return {"patterns": result if isinstance(result, list) else []}

# ─── Question Generation ──────────────────────────────────────────

class GenerateQuestionsIn(BaseModel):
    reference_sample: str
    used_text: str = ""
    count: int = Field(default=10, ge=1, le=50)
    mode: str = "exam"

GEN_SYSTEM = """You are a world-class exam question generator for Sainik School, Navodaya, and JNV entrance exams (Classes 6 & 9).

You will receive:
1. Reference questions (style/topic/difficulty to match)
2. A list of ALREADY-USED questions (you must NEVER repeat these)

Your job: generate COMPLETELY NEW, CREATIVE, and UNIQUE questions that:
- Match the exam style and difficulty of reference questions
- Cover the SAME topics but from different angles
- Have realistic distractors (wrong options that seem plausible)
- Are appropriate for Class 6 or Class 9 students
- Have CLEAR, UNAMBIGUOUS correct answers

CRITICAL RULES:
- NEVER repeat or rephrase any question from the "already-used" list
- Each question must test a DIFFERENT concept or sub-topic
- Be creative — use real-world scenarios, diagrams in text, calculations, logical puzzles
- Every question MUST have exactly 4 options with A) B) C) D) prefix
- The correct answer must be UNEQUIVOCALLY correct
- Wrong options must be PLAUSIBLE but clearly wrong

Return JSON object: { "questions": [{ "text": "...", "options": ["A) ...","B) ...","C) ...","D) ..."], "correct": 0, "explanation": "why this is correct", "subject": "...", "topic": "...", "difficulty": "easy|medium|hard" }] }"""

@router.post("/generate-questions")
def generate_questions(payload: GenerateQuestionsIn, _: User = Depends(get_current_user)):
    user_content = f"Reference questions:\n{payload.reference_sample}"
    if payload.used_text:
        user_content += f"\n\nALREADY-USED questions (DO NOT repeat these):\n{payload.used_text}"
    user_content += f"\n\nGenerate {payload.count} completely new, creative MCQ questions in \"{payload.mode}\" mode. Every question must be 100% unique — none should resemble any already-used question. Return JSON."

    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GEN_MODEL,
        messages=[
            {"role": "system", "content": GEN_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        temperature=0.9,
        response_format={"type": "json_object"},
        max_tokens=8192,
    )
    content = response.choices[0].message.content
    if not content:
        return {"questions": []}
    import json
    parsed = json.loads(content)
    result = parsed.get("questions") or parsed
    return {"questions": result if isinstance(result, list) else []}

# ─── Generate Explanation ─────────────────────────────────────────

class GenerateExplanationIn(BaseModel):
    question_text: str
    question_options: list[str]
    correct_answer: str
    selected_answer: str

@router.post("/generate-explanation")
def generate_explanation(payload: GenerateExplanationIn, _: User = Depends(get_current_user)):
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are an exam tutor. Explain why the correct answer is correct and why the selected answer (if wrong) is wrong. Be clear and concise for a Class 6-9 student."},
            {"role": "user", "content": f"Question: {payload.question_text}\nOptions: {chr(10).join(payload.question_options)}\nCorrect: {payload.correct_answer}\nStudent chose: {payload.selected_answer}\n\nExplain:"},
        ],
        temperature=0.4,
        max_tokens=500,
    )
    content = response.choices[0].message.content
    return {"answer": content or ""}
