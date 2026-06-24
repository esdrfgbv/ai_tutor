// testEngine.js - AI Test Engine library ported from Sparkle
// Provides: PDF extraction, AI question generation, IndexedDB persistence

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

// ─── Backend API helper ──────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

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

export async function extractQuestions(text) {
  const cleaned = cleanExtractedText(text).slice(0, 25000);
  const res = await fetch(`${API_BASE}/extract-questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text: cleaned }),
  });
  if (!res.ok) throw new Error(`Extract failed (${res.status})`);
  const data = await res.json();
  const arr = data.questions || [];
  return filterQuestions(arr);
}

// ─── Pattern Analysis ─────────────────────────────────
export async function analyzePattern(questions) {
  const summary = questions
    .map((q) => `${q.subject}/${q.topic}: ${q.text.slice(0, 60)}`)
    .join("\n");
  const res = await fetch(`${API_BASE}/analyze-pattern`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ summary }),
  });
  if (!res.ok) throw new Error(`Pattern analysis failed (${res.status})`);
  const data = await res.json();
  const result = data.patterns || [];
  return Array.isArray(result) ? result : [];
}

// ─── AI Question Generation ───────────────────────────
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
  const res = await fetch(`${API_BASE}/generate-questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      reference_sample: refSample,
      used_text: usedText,
      count,
      mode,
    }),
  });
  if (!res.ok) throw new Error(`Question generation failed (${res.status})`);
  const data = await res.json();
  const result = data.questions || [];
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
  const res = await fetch(`${API_BASE}/generate-explanation`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      question_text: question.text,
      question_options: question.options,
      correct_answer: question.options[correctAnswer],
      selected_answer: question.options[selectedAnswer],
    }),
  });
  if (!res.ok) throw new Error(`Explanation generation failed (${res.status})`);
  const data = await res.json();
  return data.answer || "";
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
