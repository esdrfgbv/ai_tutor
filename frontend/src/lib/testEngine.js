// testEngine.js - AI Test Engine library ported from Sparkle
// Provides: PDF extraction, AI question generation, IndexedDB persistence

import { DEFAULT_API_KEY } from "./groq.js";

// ─── Types (as JSDoc) ─────────────────────────────────
/**
 * @typedef {{ id: string, type: string, text: string, options: string[], correct: number, explanation: string, subject?: string, topic?: string, difficulty?: string }} Question
 * @typedef {{ id: string, title: string, source: string, uploadedAt: number, questions: Question[], pattern?: PatternInsight[] }} QuestionSet
 * @typedef {{ topic: string, frequency: number, weightage: number, insight: string }} PatternInsight
 * @typedef {{ id: string, title: string, createdAt: number, questions: Question[], duration: number, totalMarks: number }} MockTest
 * @typedef {{ id: string, testId: string, title: string, startedAt: number, endedAt: number, answers: (number|null)[], correctCount: number, totalCount: number, score: number, percentage: number, duration: number, timePerQuestion: number[] }} TestAttempt
 */

// ─── IndexedDB persistence ────────────────────────────
const DB_NAME = "test-engine-v1";
const DB_VER = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("questionSets")) {
        db.createObjectStore("questionSets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("mockTests")) {
        db.createObjectStore("mockTests", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("attempts")) {
        db.createObjectStore("attempts", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeOp(storeName, mode, fn) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const req = fn(tx.objectStore(storeName));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export const saveQuestions = (qs) => storeOp("questionSets", "readwrite", (s) => s.put(qs));
export const saveTest = (test) => storeOp("mockTests", "readwrite", (s) => s.put(test));
export const saveAttempt = (att) => storeOp("attempts", "readwrite", (s) => s.put(att));
export const getAllQuestionSets = () => storeOp("questionSets", "readonly", (s) => s.getAll());
export const getAllTests = () => storeOp("mockTests", "readonly", (s) => s.getAll());
export const getAllAttempts = () => storeOp("attempts", "readonly", (s) => s.getAll());
export const deleteQuestionSet = (id) => storeOp("questionSets", "readwrite", (s) => s.delete(id));

// ─── Unique ID ────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── PDF text extraction ──────────────────────────────
export async function extractTextFromPDF(file) {
  const arrayBuf = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjs.getDocument({ data: arrayBuf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push(text);
  }
  return pages.join("\n\n---PAGE BREAK---\n\n");
}

// ─── Text preprocessing ───────────────────────────────
function cleanExtractedText(raw) {
  let t = raw
    .replace(/\f/g, "\n")
    .replace(/Page\s*\d+\s*(of|\/)?\s*\d*/gi, "")
    .replace(/_{3,}/g, "")
    .replace(/-{3,}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  t = t
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      if (!s) return false;
      if (/^\d{1,2}\s*$/.test(s)) return false;
      return true;
    })
    .join("\n");
  return t;
}

function filterQuestions(qs) {
  return qs.filter((q) => {
    const t = q.text.trim();
    if (t.length < 8) return false;
    if (/^(answer|solution|explanation|page|section|note|instruction|direction|marks)/i.test(t)) return false;
    if (/^\d{1,2}\s*\.?\s*$/.test(t)) return false;
    if (q.options.length > 0 && q.options.length < 2) return false;
    return true;
  });
}

const EXTRACT_MODEL = "llama-3.3-70b-versatile";

const EXTRACT_SYSTEM = `You are a precise exam question extractor for Sainik/Navodaya/JNV papers.

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
- If a question has no options attached, skip it`;

export async function extractQuestions(text) {
  const cleaned = cleanExtractedText(text).slice(0, 25000);
  const body = JSON.stringify({
    model: EXTRACT_MODEL,
    messages: [
      { role: "system", content: EXTRACT_SYSTEM },
      {
        role: "user",
        content: `Extract ALL MCQ questions from this exam paper. Return them as a JSON object with a "questions" array:\n\n${cleaned}`,
      },
    ],
    temperature: 0.05,
    response_format: { type: "json_object" },
    max_tokens: 8192,
  });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEFAULT_API_KEY}`, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  const content = JSON.parse(raw);
  let arr = content.questions || content.data || content.results || content.exam || content.mcq || null;
  if (!Array.isArray(arr)) {
    if (content.text || content.question) {
      arr = [content];
    } else if (Array.isArray(content)) {
      arr = content;
    } else {
      arr = Object.values(content).find((v) => Array.isArray(v)) || [];
    }
  }
  return filterQuestions(arr);
}

// ─── Pattern Analysis ─────────────────────────────────
export async function analyzePattern(questions) {
  const summary = questions
    .map((q) => `${q.subject}/${q.topic}: ${q.text.slice(0, 60)}`)
    .join("\n");
  const body = JSON.stringify({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are an exam pattern analyst. Analyze these questions and return JSON array of { topic, frequency, weightage, insight } objects. Return ONLY JSON.",
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEFAULT_API_KEY}`, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  const result = parsed.insights || parsed.patterns || parsed;
  return Array.isArray(result) ? result : [];
}

// ─── AI Question Generation ───────────────────────────
const GEN_MODEL = "llama-3.3-70b-versatile";

const GEN_SYSTEM = `You are a world-class exam question generator for Sainik School, Navodaya, and JNV entrance exams (Classes 6 & 9).

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

Return JSON object: { "questions": [{ "text": "...", "options": ["A) ...","B) ...","C) ...","D) ..."], "correct": 0, "explanation": "why this is correct", "subject": "...", "topic": "...", "difficulty": "easy|medium|hard" }] }`;

export async function generateQuestions(referenceQuestions, count, mode = "exam", alreadyUsed = []) {
  const refSample = referenceQuestions
    .slice(0, 12)
    .map((q) => `[${q.subject}] ${q.text}\n${q.options.join("\n")}`)
    .join("\n\n");
  const usedText =
    alreadyUsed.length > 0
      ? "\n\nALREADY-USED questions (DO NOT repeat these):\n" +
        alreadyUsed
          .slice(-50)
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")
      : "";
  const body = JSON.stringify({
    model: GEN_MODEL,
    messages: [
      { role: "system", content: GEN_SYSTEM },
      {
        role: "user",
        content: `Reference questions:\n${refSample}${usedText}\n\nGenerate ${count} completely new, creative MCQ questions in "${mode}" mode. Every question must be 100% unique — none should resemble any already-used question. Return JSON.`,
      },
    ],
    temperature: 0.9,
    response_format: { type: "json_object" },
    max_tokens: 8192,
  });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEFAULT_API_KEY}`, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  const content = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  const result = content.questions || content;
  return Array.isArray(result) ? result : [];
}

// ─── Batch mock test generation ───────────────────────
export async function generateMultipleTests(
  referenceQuestions,
  testCount,
  questionsPerTest,
  mode = "exam",
  onProgress
) {
  const tests = [];
  const allUsedTexts = [];
  for (let i = 0; i < testCount; i++) {
    const qs = await generateQuestions(referenceQuestions, questionsPerTest, mode, allUsedTexts);
    for (const q of qs) {
      allUsedTexts.push(q.text.slice(0, 100));
    }
    tests.push({
      id: uid(),
      title: `Mock Test ${i + 1}`,
      createdAt: Date.now(),
      questions: qs,
      duration: 0,
      totalMarks: qs.length,
    });
    onProgress?.(i + 1, testCount);
  }
  return tests;
}

// ─── AI Explanation ───────────────────────────────────
export async function generateExplanation(question, selectedAnswer, correctAnswer) {
  const body = JSON.stringify({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are an exam tutor. Explain why the correct answer is correct and why the selected answer (if wrong) is wrong. Be clear and concise for a Class 6-9 student.",
      },
      {
        role: "user",
        content: `Question: ${question.text}\nOptions: ${question.options.join("\n")}\nCorrect: ${question.options[correctAnswer]}\nStudent chose: ${question.options[selectedAnswer]}\n\nExplain:`,
      },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEFAULT_API_KEY}`, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Multi-format question parser ─────────────────────
function normalizeQuestion(raw, idx) {
  if (!raw || typeof raw !== "object") return null;
  const text = raw.text || raw.question || raw.q || raw.stem || "";
  if (!text) return null;
  const options = raw.options || raw.choices || raw.opts || [];
  const correct = raw.correct ?? raw.answer ?? raw.ans ?? raw.right ?? -1;
  return {
    id: `q_${idx}_${uid()}`,
    type: raw.type || "mcq",
    text,
    options: Array.isArray(options) ? options.map(String) : [],
    correct: typeof correct === "number" ? correct : -1,
    explanation: raw.explanation || raw.exp || raw.solution || raw.reasoning || "",
    subject: raw.subject || raw.sub || "",
    topic: raw.topic || "",
    difficulty: raw.difficulty || raw.diff || "medium",
  };
}

export function parseJSONQuestions(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed.map(normalizeQuestion).filter(Boolean);
    const arr = parsed.questions || parsed.data || parsed.results || parsed.items || [];
    if (Array.isArray(arr)) return arr.map(normalizeQuestion).filter(Boolean);
    const single = normalizeQuestion(parsed, 0);
    return single ? [single] : [];
  } catch {
    return [];
  }
}
