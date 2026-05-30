// TestEnginePanel.jsx - AI Test Engine: PDF → extract → generate → exam → analytics
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, FileText, Loader2, Sparkles, Brain, CheckCircle2, AlertCircle,
  Clock, ChevronLeft, ChevronRight, BarChart3, BookOpen,
  RotateCcw, Flag, Play, Target, Zap, Maximize2, Minimize2, Layers, List,
} from "lucide-react";
import {
  extractTextFromPDF, extractQuestions, analyzePattern, generateQuestions,
  generateMultipleTests, generateExplanation, saveQuestions, saveTest, saveAttempt,
  getAllQuestionSets, getAllTests, getAllAttempts, deleteQuestionSet,
  parseJSONQuestions, uid,
} from "../../lib/testEngine.js";

// ─── Question Card ─────────────────────────────────────
function QuestionCard({ q, showAnswer, selected, onSelect }) {
  return (
    <div className="p-4 rounded-xl space-y-3" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-white/30 shrink-0">[{(q.type || "MCQ").toUpperCase()}]</span>
        <p className="text-sm text-white/80 leading-relaxed">{q.text}</p>
      </div>
      {q.options.length > 0 && (
        <div className="space-y-1.5">
          {q.options.map((opt, oi) => {
            const isCorrect = showAnswer && oi === q.correct;
            const isWrong = showAnswer && selected === oi && oi !== q.correct;
            const isSelected = selected === oi;
            return (
              <button
                key={oi}
                disabled={showAnswer}
                onClick={() => onSelect?.(oi)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: isCorrect
                    ? "rgba(173,255,68,0.12)"
                    : isWrong
                    ? "rgba(239,68,68,0.12)"
                    : isSelected
                    ? "rgba(173,255,68,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    isCorrect
                      ? "rgba(173,255,68,0.3)"
                      : isWrong
                      ? "rgba(239,68,68,0.3)"
                      : isSelected
                      ? "rgba(173,255,68,0.2)"
                      : "rgba(255,255,255,0.05)"
                  }`,
                  color: isCorrect ? "#ADFF44" : isWrong ? "#fca5a5" : "rgba(255,255,255,0.65)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
      {showAnswer && q.explanation && (
        <div className="text-xs text-white/40 leading-relaxed p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ color: "rgba(173,255,68,0.8)" }} className="font-medium">Explanation: </span>{q.explanation}
        </div>
      )}
    </div>
  );
}

// ─── Timer ─────────────────────────────────────────────
function Timer({ seconds, onEnd }) {
  const [remaining, setRemaining] = useState(seconds);
  const pct = (remaining / seconds) * 100;
  useEffect(() => {
    if (remaining <= 0) { onEnd(); return; }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, onEnd]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4" style={{ color: remaining < 60 ? "#ef4444" : "#ADFF44" }} />
      <span className="font-mono tabular-nums" style={{ color: remaining < 60 ? "#ef4444" : "rgba(255,255,255,0.7)" }}>
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: remaining < 60 ? "#ef4444" : "#ADFF44" }} />
      </div>
    </div>
  );
}

// ─── Progress ──────────────────────────────────────────
function GenProgress({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">Generating tests…</span>
        <span className="font-mono" style={{ color: "#ADFF44" }}>{done}/{total}</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #ADFF44, #8CD430)" }} />
      </div>
      <p className="text-xs text-white/20 text-center">{pct}% complete</p>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────
export function TestEnginePanel() {
  const [tab, setTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [genProgress, setGenProgress] = useState({ done: 0, total: 0 });

  const [questions, setQuestions] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [questionSets, setQuestionSets] = useState([]);

  const [mockCount, setMockCount] = useState(5);
  const [mockTime, setMockTime] = useState(30);
  const [genMode, setGenMode] = useState("exam");
  const [savedTests, setSavedTests] = useState([]);

  const [activeTest, setActiveTest] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [examStarted, setExamStarted] = useState(false);
  const [examEnded, setExamEnded] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const examRef = useRef(null);

  const [attempts, setAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState("");
  const [reviewExplanations, setReviewExplanations] = useState({});
  const [reviewLoading, setReviewLoading] = useState(new Set());

  useEffect(() => {
    getAllQuestionSets().then(setQuestionSets);
    getAllTests().then(setSavedTests);
    getAllAttempts().then(setAttempts);
  }, []);

  const handleFile = async (file) => {
    setLoading(true); setError("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const title = file.name.replace(/\.(pdf|json|txt)$/i, "");
      let qs = [];
      if (ext === "json") {
        const text = await file.text();
        qs = parseJSONQuestions(text);
        if (qs.length === 0) throw new Error("No valid questions found in JSON file.");
      } else if (ext === "txt") {
        const text = await file.text();
        qs = await extractQuestions(text);
      } else {
        const text = await extractTextFromPDF(file);
        qs = await extractQuestions(text);
      }
      const pattern = await analyzePattern(qs);
      setQuestions(qs);
      setPatterns(pattern);
      const qset = { id: uid(), title, source: file.name, uploadedAt: Date.now(), questions: qs, pattern };
      await saveQuestions(qset);
      setQuestionSets((p) => [...p, qset]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleGenerateAll = async () => {
    if (questions.length === 0) { setError("Upload a question paper first."); return; }
    setLoading(true); setError(""); setGenProgress({ done: 0, total: mockCount });
    try {
      const tests = await generateMultipleTests(
        questions, mockCount, questions.length, genMode,
        (done, total) => setGenProgress({ done, total })
      );
      const withDuration = tests.map((t) => ({ ...t, duration: mockTime * 60 }));
      for (const t of withDuration) await saveTest(t);
      setSavedTests((p) => [...p, ...withDuration]);
      setTab("tests");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setGenProgress({ done: 0, total: 0 }); }
  };

  const selectTest = (test) => {
    setActiveTest(test);
    setAnswers(new Array(test.questions.length).fill(null));
    setCurrentQ(0);
    setMarkedForReview(new Set());
    setExamStarted(false);
    setExamEnded(false);
    setShowResult(false);
    setTab("exam");
  };

  const endExam = useCallback(() => {
    setExamEnded(true); setExamStarted(false); setShowResult(true);
    const correct = answers.reduce((acc, ans, i) => acc + (ans === activeTest.questions[i].correct ? 1 : 0), 0);
    const att = {
      id: uid(), testId: activeTest.id, title: activeTest.title,
      startedAt: Date.now(), endedAt: Date.now(),
      answers, correctCount: correct, totalCount: activeTest.questions.length,
      score: correct, percentage: Math.round((correct / activeTest.questions.length) * 100),
      duration: activeTest.duration,
      timePerQuestion: activeTest.questions.map(() => Math.random() * 30 + 15),
    };
    saveAttempt(att).then(() => getAllAttempts().then(setAttempts));
  }, [answers, activeTest]);

  const toggleReview = (i) => {
    setMarkedForReview((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const goFullscreen = async () => {
    if (!document.fullscreenElement) {
      await examRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const loadAttempt = (id) => {
    setSelectedAttempt(id);
    setReviewExplanations({});
    setReviewLoading(new Set());
    const att = attempts.find((a) => a.id === id);
    if (att) {
      const test = savedTests.find((t) => t.id === att.testId);
      if (test) setActiveTest(test);
      setAnswers(att.answers);
    }
  };

  const getExplanation = async (qi) => {
    if (!activeTest) return;
    setReviewLoading((p) => new Set(p).add(qi));
    const q = activeTest.questions[qi];
    const ans = answers[qi] ?? 0;
    try {
      const exp = await generateExplanation(q, ans, q.correct);
      setReviewExplanations((p) => ({ ...p, [qi]: exp }));
    } catch { }
    finally { setReviewLoading((p) => { const n = new Set(p); n.delete(qi); return n; }); }
  };

  const retakeTest = () => {
    if (!activeTest) return;
    setAnswers(new Array(activeTest.questions.length).fill(null));
    setCurrentQ(0); setMarkedForReview(new Set());
    setExamStarted(true); setExamEnded(false); setShowResult(false);
  };

  const neonBtn = {
    background: "linear-gradient(135deg, #ADFF44, #8CD430)",
    color: "#000",
  };

  // ─── TAB: Upload ───────────────────────────────────────
  const tabUpload = (
    <div className="space-y-6 max-w-3xl mx-auto">
      {questions.length === 0 ? (
        <>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white/80 mb-1">Upload Question Paper</h2>
            <p className="text-xs text-white/30">Upload PDF, JSON, or TXT. AI extracts questions, analyzes patterns, and generates mock tests.</p>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => {
              const el = document.createElement("input");
              el.type = "file"; el.accept = ".pdf,.json,.txt";
              el.onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
              el.click();
            }}
            className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all group"
            style={{ borderColor: "rgba(173,255,68,0.2)", background: "rgba(173,255,68,0.02)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)"; }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform" style={{ background: "rgba(173,255,68,0.08)" }}>
              {loading ? <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#ADFF44" }} /> : <Upload className="w-7 h-7" style={{ color: "rgba(173,255,68,0.6)" }} />}
            </div>
            <p className="text-sm text-white/50 mb-1">{loading ? "Extracting & analyzing…" : "Drop file or click to upload"}</p>
            <p className="text-xs text-white/20">PDF · JSON · TXT — PYQs, practice sets, or formatted Q&A</p>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ border: "1px solid rgba(173,255,68,0.12)", background: "rgba(173,255,68,0.05)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(173,255,68,0.15)" }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: "#ADFF44" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80">{questions.length} questions extracted</p>
              <p className="text-xs text-white/30 mt-0.5">{patterns.length} pattern insights · Ready to generate mock tests</p>
            </div>
            <button onClick={() => { setQuestions([]); setPatterns([]); }}
              className="text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}>
              Upload different
            </button>
          </div>

          <div className="p-6 rounded-2xl space-y-5" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <h3 className="text-sm font-medium text-white/70">Mock Test Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Number of mock tests</label>
                <input type="number" min={1} max={50} value={mockCount}
                  onChange={(e) => setMockCount(Math.max(1, Math.min(50, +e.target.value || 1)))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Time per test (minutes)</label>
                <input type="number" min={5} max={180} value={mockTime}
                  onChange={(e) => setMockTime(Math.max(5, Math.min(180, +e.target.value || 5)))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Difficulty</label>
                <select value={genMode} onChange={(e) => setGenMode(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none transition-all"
                  style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="exam">Exam Level</option>
                  <option value="challenge">Challenge</option>
                </select>
              </div>
            </div>

            {genProgress.total > 0 && <GenProgress done={genProgress.done} total={genProgress.total} />}

            <button onClick={handleGenerateAll} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              style={neonBtn}>
              {loading && genProgress.total > 0 ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating {mockCount} tests…</>
              ) : loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Zap className="w-4 h-4" /> Generate {mockCount} Mock Tests</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── TAB: Tests ────────────────────────────────────────
  const tabTests = (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white/80">Mock Tests</h2>
          <p className="text-xs text-white/30">{savedTests.length} tests generated</p>
        </div>
        <button onClick={() => setTab("upload")}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(173,255,68,0.1)", color: "#ADFF44", border: "1px solid rgba(173,255,68,0.2)" }}>
          <Upload className="w-3 h-3" /> Upload & Generate
        </button>
      </div>
      {savedTests.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Layers className="w-10 h-10 text-white/10 mx-auto" />
          <p className="text-sm text-white/30">No mock tests yet</p>
          <p className="text-xs text-white/20">Upload a question paper and generate mock tests to get started.</p>
          <button onClick={() => setTab("upload")} className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-all"
            style={{ background: "rgba(173,255,68,0.1)", color: "#ADFF44", border: "1px solid rgba(173,255,68,0.2)" }}>
            <Upload className="w-3 h-3" /> Upload Paper
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...savedTests].reverse().map((test) => {
            const bestAtt = attempts.filter((a) => a.testId === test.id).sort((a, b) => b.percentage - a.percentage)[0];
            return (
              <button key={test.id} onClick={() => selectTest(test)}
                className="text-left p-4 rounded-xl transition-all group relative overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: "rgba(173,255,68,0.1)" }}>
                    <FileText className="w-4 h-4" style={{ color: "#ADFF44" }} />
                  </div>
                  <p className="text-xs font-medium text-white/70 truncate">{test.title}</p>
                  <p className="text-xs text-white/30">{test.questions.length} Q · {Math.round(test.duration / 60)} min</p>
                  {bestAtt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: bestAtt.percentage >= 70 ? "rgba(173,255,68,0.1)" : "rgba(234,179,8,0.1)", color: bestAtt.percentage >= 70 ? "#ADFF44" : "#fbbf24" }}>
                      <Target className="w-2.5 h-2.5" /> {bestAtt.percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── TAB: Exam ─────────────────────────────────────────
  const tabExam = activeTest && (
    <div ref={examRef} className="max-w-5xl mx-auto">
      {!examStarted && !examEnded && !showResult && (
        <div className="text-center py-12 space-y-4">
          <Brain className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(173,255,68,0.4)" }} />
          <h2 className="text-xl font-semibold text-white/80">{activeTest.title}</h2>
          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <span>{activeTest.questions.length} Questions</span>
            <span>{Math.round(activeTest.duration / 60)} Minutes</span>
            <span>{activeTest.totalMarks} Marks</span>
          </div>
          <button onClick={() => { setExamStarted(true); setExamEnded(false); setShowResult(false); }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-medium transition-all"
            style={neonBtn}>
            <Play className="w-4 h-4" /> Start Exam
          </button>
          <div><button onClick={() => setTab("tests")} className="text-xs text-white/30 hover:text-white/50 underline underline-offset-2">← Back to tests</button></div>
        </div>
      )}

      {examStarted && !examEnded && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-4">
              <Timer seconds={activeTest.duration} onEnd={endExam} />
              <span className="text-xs text-white/30 font-mono">{currentQ + 1}/{activeTest.questions.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleReview(currentQ)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                style={{ background: markedForReview.has(currentQ) ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.05)", color: markedForReview.has(currentQ) ? "#fbbf24" : "rgba(255,255,255,0.4)", border: `1px solid ${markedForReview.has(currentQ) ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <Flag className="w-3 h-3" /> {markedForReview.has(currentQ) ? "Marked" : "Review"}
              </button>
              <button onClick={goFullscreen} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white/40 hover:text-white/70 transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {fullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button onClick={endExam} className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>Submit</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <QuestionCard
                q={activeTest.questions[currentQ]}
                showAnswer={false}
                selected={answers[currentQ] ?? undefined}
                onSelect={(i) => setAnswers((p) => { const n = [...p]; n[currentQ] = i; return n; })}
              />
              <div className="flex justify-between mt-3">
                <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 disabled:opacity-30 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <button onClick={() => setCurrentQ((p) => Math.min(activeTest.questions.length - 1, p + 1))} disabled={currentQ >= activeTest.questions.length - 1}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 disabled:opacity-30 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-xs text-white/40 font-medium mb-3">Question Palette</p>
              <div className="grid grid-cols-5 gap-1.5">
                {activeTest.questions.map((_, i) => {
                  const isAnswered = answers[i] !== null;
                  const isMarked = markedForReview.has(i);
                  const isCurrent = i === currentQ;
                  return (
                    <button key={i} onClick={() => setCurrentQ(i)}
                      className="w-7 h-7 rounded-md text-xs font-mono transition-all"
                      style={{
                        boxShadow: isCurrent ? "0 0 0 2px #ADFF44" : "none",
                        border: isMarked ? "1px solid rgba(234,179,8,0.4)" : "1px solid transparent",
                        background: isAnswered ? "rgba(173,255,68,0.2)" : "rgba(255,255,255,0.05)",
                        color: isAnswered ? "#ADFF44" : "rgba(255,255,255,0.4)",
                      }}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showResult && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#ADFF44" }} />
            <h2 className="text-xl font-semibold text-white/80">Exam Complete!</h2>
            <div className="flex items-center justify-center gap-6 mt-4">
              {[
                { label: "Correct", value: answers.reduce((a, _, i) => a + (answers[i] === activeTest.questions[i].correct ? 1 : 0), 0), color: "#ADFF44" },
                { label: "Accuracy", value: `${Math.round((answers.reduce((a, _, i) => a + (answers[i] === activeTest.questions[i].correct ? 1 : 0), 0) / activeTest.questions.length) * 100)}%`, color: "rgba(255,255,255,0.8)" },
                { label: "Questions", value: activeTest.questions.length, color: "rgba(255,255,255,0.5)" },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-3xl font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-white/30">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={retakeTest} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg text-white/50 hover:text-white/70 transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
              <button onClick={() => setTab("analytics")} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-all" style={{ background: "rgba(173,255,68,0.1)", color: "#ADFF44", border: "1px solid rgba(173,255,68,0.2)" }}>
                <BarChart3 className="w-3 h-3" /> Analytics
              </button>
              <button onClick={() => setTab("tests")} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg text-white/50 hover:text-white/70 transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Layers className="w-3 h-3" /> All Tests
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-white/50">Question Review <span className="text-white/20 font-normal">— click Explain on any question</span></h3>
            {activeTest.questions.map((q, i) => {
              const userAns = answers[i];
              const isCorrect = userAns === q.correct;
              const isExplaining = reviewLoading.has(i);
              const expText = reviewExplanations[i];
              return (
                <div key={i} className="p-4 rounded-xl transition-all" style={{ border: `1px solid ${isCorrect ? "rgba(173,255,68,0.15)" : "rgba(239,68,68,0.15)"}`, background: isCorrect ? "rgba(173,255,68,0.04)" : "rgba(239,68,68,0.04)" }}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs font-mono shrink-0" style={{ color: isCorrect ? "#ADFF44" : "#fca5a5" }}>Q{i + 1}.</span>
                    <p className="text-sm text-white/80">{q.text}</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-white/40">Your answer: <span style={{ color: isCorrect ? "#ADFF44" : "#fca5a5" }}>{q.options[userAns ?? 0] ?? "—"}</span></p>
                    {!isCorrect && <p className="text-white/40">Correct: <span style={{ color: "#ADFF44" }}>{q.options[q.correct]}</span></p>}
                  </div>
                  {expText && (
                    <div className="mt-3 p-3 rounded-lg text-xs text-white/40 leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(173,255,68,0.1)" }}>
                      <span className="font-medium block mb-1" style={{ color: "rgba(173,255,68,0.8)" }}>AI Explanation</span>
                      {expText}
                    </div>
                  )}
                  <button onClick={() => getExplanation(i)} disabled={isExplaining}
                    className="mt-2 text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 transition-all disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
                    {isExplaining ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Explaining…</> : <><Brain className="w-2.5 h-2.5" /> Explain →</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ─── TAB: Analytics ────────────────────────────────────
  const tabAnalytics = (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-white/80">Performance Analytics</h2>
      {attempts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BarChart3 className="w-10 h-10 text-white/10 mx-auto" />
          <p className="text-sm text-white/30">No tests attempted yet</p>
          <button onClick={() => setTab("upload")} className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-all" style={{ background: "rgba(173,255,68,0.1)", color: "#ADFF44", border: "1px solid rgba(173,255,68,0.2)" }}>
            <Upload className="w-3 h-3" /> Upload Paper
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Tests Taken", value: attempts.length, icon: FileText, color: "#ADFF44" },
              { label: "Avg Accuracy", value: `${Math.round(attempts.reduce((a, att) => a + att.percentage, 0) / attempts.length)}%`, icon: Target, color: "#8CD430" },
              { label: "Total Questions", value: attempts.reduce((a, att) => a + att.totalCount, 0), icon: BookOpen, color: "#6BBF00" },
              { label: "Total Correct", value: attempts.reduce((a, att) => a + att.correctCount, 0), icon: CheckCircle2, color: "#ADFF44" },
            ].map((card) => (
              <div key={card.label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  <span className="text-xs text-white/40">{card.label}</span>
                </div>
                <p className="text-2xl font-bold text-white/80">{card.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xs text-white/40 font-medium mb-3">Test History</h3>
            <div className="space-y-2">
              {[...attempts].reverse().map((att) => {
                const pct = att.percentage;
                return (
                  <div key={att.id} onClick={() => loadAttempt(att.id)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                    style={{ border: `1px solid ${selectedAttempt === att.id ? "rgba(173,255,68,0.2)" : "rgba(255,255,255,0.05)"}`, background: selectedAttempt === att.id ? "rgba(173,255,68,0.05)" : "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: pct >= 70 ? "rgba(173,255,68,0.15)" : pct >= 40 ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)", color: pct >= 70 ? "#ADFF44" : pct >= 40 ? "#fbbf24" : "#fca5a5" }}>
                        {pct}%
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white/70 truncate">{att.title}</p>
                        <p className="text-xs text-white/30">{att.correctCount}/{att.totalCount} correct · {new Date(att.endedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 70 ? "#ADFF44" : pct >= 40 ? "#fbbf24" : "#ef4444" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const TABS = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "tests", label: "Tests", icon: Layers },
    { id: "exam", label: "Exam", icon: Play },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === t.id ? "#ADFF44" : "transparent",
              color: tab === t.id ? "#000" : "rgba(255,255,255,0.4)",
            }}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {tab === "upload" && tabUpload}
      {tab === "tests" && tabTests}
      {tab === "exam" && tabExam}
      {tab === "analytics" && tabAnalytics}
    </div>
  );
}
