from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
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
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
EXTRACT_MODEL = "llama-3.3-70b-versatile"
GEN_MODEL = "llama-3.3-70b-versatile"

# ─── Video Generation ─────────────────────────────────────────────

class VideoGenerateIn(BaseModel):
    question: str
    language: str = "english"
    category: str = "general"
    category_prompt: str | None = None

SYSTEM_PROMPT = """You are a world-class creative tutor who makes stunning lecture slides. Break the explanation into 5 to 7 logical steps.

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
{ "title": "Topic Name", "slides": [ { "display_text": "...", "voice_script": "..." } ] }"""

@router.post("/video-generate")
def video_generate(payload: VideoGenerateIn, _: User = Depends(get_current_user)):
    cat_instr = ""
    if payload.category_prompt:
        cat_instr = "\nCATEGORY: " + payload.category_prompt
    lang_instr = (
        "\nIMPORTANT: Write ALL voice_script fields in Hindi (Hinglish/Devanagari). Students want Hindi explanation."
        if payload.language == "hindi"
        else "\nIMPORTANT: Write ALL voice_script fields in English."
    )
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": payload.question + lang_instr + cat_instr},
        ],
        response_format={"type": "json_object"},
        temperature=0.5,
    )
    content = response.choices[0].message.content
    if not content:
        raise HTTPException(502, "AI returned empty response")
    import json
    parsed = json.loads(content)
    if not parsed.get("slides") or not isinstance(parsed["slides"], list):
        raise HTTPException(502, "Invalid response shape from AI")
    return parsed

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
