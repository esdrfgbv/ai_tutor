import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, Clock, Trophy, RotateCcw,
  BookOpen, Flag, ChevronLeft, ChevronRight, Target,
  Zap, Star, AlertCircle
} from "lucide-react";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useStudySession } from "../context/StudySessionContext.jsx";
import SubjectTabs from "../components/SubjectTabs.jsx";
import ProgressRing from "../components/ProgressRing.jsx";

const TIMER_KEY = "preporbit_quiz_timer";
const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SUBJECTS = [
  { value: "maths", label: "📐 Maths" },
  { value: "science", label: "🔬 Science" },
  { value: "english", label: "📚 English" },
  { value: "mental-ability", label: "🧩 Mental Ability" },
];

export default function QuizPage() {
  const { user } = useAuth();
  const { startSession, endSession } = useStudySession();
  const [params] = useSearchParams();
  const [quiz, setQuiz] = useState(null);
  const [mockTests, setMockTests] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(params.get("subject") || "maths");
  const [userGrade, setUserGrade] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [flagged, setFlagged] = useState(new Set());
  const [showPalette, setShowPalette] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (user?.role === "student") {
      api.get("/learning/profile").then((res) => {
        const grade = res.data.grade;
        setUserGrade(grade);
        if (grade === 6 && (!params.get("subject") || params.get("subject") === "science")) {
           setSubject("mental-ability");
        }
      }).catch(() => setUserGrade(9));
    }
  }, [user, params]);

  const availableSubjects = SUBJECTS.filter(s => {
    if (userGrade === 6) {
      return s.value !== "science";
    }
    return s.value !== "mental-ability";
  });

  const persistTimer = useCallback((quizId, seconds) => {
    localStorage.setItem(TIMER_KEY, JSON.stringify({ quizId, remaining: seconds, startedAt: Date.now() }));
    api.post("/quizzes/timer/sync", { quiz_id: quizId, remaining_seconds: seconds }).catch(() => {});
  }, []);

  const loadQuiz = async () => {
    setLoading(true); setError(""); setResult(null); setAnswers({});
    try {
      const mode = params.get("mode");
      const chapter = Number(params.get("chapter") || 1);
      let data;
      if (mode === "module") {
        const r = await api.post("/quizzes/module", { grade: 9, subject, chapter: String(chapter), question_count: 5, duration_minutes: 15, quiz_type: "module" }, { params: { chapter_number: chapter } });
        data = r.data;
      } else if (params.get("test")) {
        const r = await api.post("/quizzes/mock", { grade: 9, subject, question_count: 20, duration_minutes: 45, quiz_type: "mock" }, { params: { test_name: params.get("test") } });
        data = r.data;
      } else { setLoading(false); return; }
      setQuiz(data);
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "{}");
      const initial = saved.quizId === data.id ? saved.remaining : data.duration_minutes * 60;
      setRemaining(initial);
      startedAt.current = Date.now();
      setCurrentQuestion(0);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load quiz.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (user.role !== "student") return;
    api.get(`/quizzes/subjects/${subject}/modules`).then((r) => setMockTests(r.data)).catch(() => {});
    if (params.get("mode") || params.get("test")) loadQuiz();
  }, [user.role, params, subject]);

  useEffect(() => {
    if (!quiz) return;
    const mode = params.get("mode");
    const type = mode === "module" ? "quiz" : "mock_test";
    const chapterVal = mode === "module" ? params.get("chapter") : params.get("test");
    startSession(type, subject, chapterVal);
    return () => endSession();
  }, [quiz, subject, params]);

  const submit = async (auto = false) => {
    if (!quiz?.questions?.length) return;
    if (!auto && Object.keys(answers).length < quiz.questions.length) {
      setError(`Please answer all ${quiz.questions.length} questions before submitting.`);
      return;
    }
    setError(""); setSubmitting(true);
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      const { data } = await api.post("/quizzes/attempts", { quiz_id: quiz.id, answers, time_taken_seconds: elapsed });
      setResult(data);
      localStorage.removeItem(TIMER_KEY);
      endSession();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit this quiz.");
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (!quiz || result || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((v) => {
        const next = Math.max(0, v - 1);
        if (next % 30 === 0) persistTimer(quiz.id, next);
        if (next === 0) submit(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, result, remaining]);

  if (user.role !== "student") return <EmptyState title="Quiz attempts are available from student accounts." />;

  // ── RESULT SCREEN ──────────────────────────────────────────
  if (result && quiz) {
    const total = quiz.questions.length;
    const correct = Math.round((result.accuracy / 100) * total);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 max-w-3xl mx-auto"
      >
        {/* Trophy Card */}
        <div
          className="rounded-3xl p-8 text-center relative overflow-hidden"
          style={{ background: "rgba(17,17,17,0.95)", border: "1px solid rgba(173,255,68,0.15)" }}
        >
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: "radial-gradient(ellipse at center top, rgba(173,255,68,0.06) 0%, transparent 60%)" }} />
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="text-6xl mb-4"
          >
            {cap(result.accuracy) >= 80 ? "🏆" : cap(result.accuracy) >= 60 ? "🥈" : "📖"}
          </motion.div>
          <h2 className="font-display font-black text-4xl text-white mb-1">
            {correct}/{total}
          </h2>
          <p className="mb-6" style={{ color: "#8a8a8a" }}>{quiz.title}</p>

          <div className="flex justify-center gap-8 mb-8">
            {[
              { label: "Accuracy", value: `${cap(result.accuracy)}%`, color: "#adff44" },
              { label: "Score", value: result.score, color: "#fff" },
              { label: "Time", value: result.time_taken_seconds < 60 ? `${result.time_taken_seconds}s` : `${Math.floor(result.time_taken_seconds / 60)}m ${result.time_taken_seconds % 60}s`, color: "#ffd700" },
            ].map(({ label, value, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="font-display font-black text-2xl" style={{ color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#8a8a8a" }}>{label}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/analytics" className="btn-primary">View Analytics</Link>
            <Link to="/chapters" className="btn-ghost">Back to Modules</Link>
            <button className="btn-ghost flex items-center gap-1.5" onClick={() => { setQuiz(null); setResult(null); setAnswers({}); }}>
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        </div>

        {/* Question Review */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-display font-bold text-white mb-4">Question Review</h3>
          <div className="space-y-3">
            {quiz.questions.map((q, i) => {
              const submitted = String(answers[q.id] || "").trim().toLowerCase();
              const expected = String(q.correct_answer).trim().toLowerCase();
              const isCorrect = submitted === expected || (expected.length === 1 && submitted.startsWith(`${expected})`)) || (submitted && submitted[0] === expected[0]);
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl p-4"
                  style={{
                    background: isCorrect ? "rgba(173,255,68,0.04)" : "rgba(255,107,107,0.04)",
                    border: `1px solid ${isCorrect ? "rgba(173,255,68,0.15)" : "rgba(255,107,107,0.15)"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {isCorrect
                      ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#adff44" }} />
                      : <XCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#ff6b6b" }} />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Q{i + 1}. {q.prompt}</p>
                      {!isCorrect && (
                        <div className="mt-2 space-y-1 text-xs">
                          <p style={{ color: "#ff6b6b" }}>Your answer: {answers[q.id] || "Not answered"}</p>
                          <p style={{ color: "#adff44", fontWeight: 700 }}>Correct: {q.correct_answer}</p>
                        </div>
                      )}
                      {q.textbook_explanation && q.textbook_explanation !== "Refer to the chapter PDF for this concept." && (
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: "#8a8a8a" }}>{q.textbook_explanation}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── QUIZ SELECTION / IN PROGRESS ──────────────────────────
  return (
    <div className="space-y-5">
      <ErrorNotice message={error} />

      {/* Header */}
      {!quiz && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display font-black text-2xl text-white">Tests & Quizzes</h1>
            <p className="text-sm mt-0.5" style={{ color: "#8a8a8a" }}>Module quizzes and full mock tests</p>
          </div>
          <div className="flex items-center gap-3">
            <SubjectTabs
              subjects={availableSubjects}
              value={subject}
              onChange={setSubject}
            />
            <Link to="/chapters" className="btn-ghost text-sm">
              <BookOpen size={14} /> Modules
            </Link>
          </div>
        </motion.div>
      )}

      {/* Mock Test Selection */}
      {!quiz && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {mockTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Target size={40} style={{ color: "#8a8a8a" }} className="mb-3" />
              <p className="font-semibold text-white mb-1">No mock tests available</p>
              <p className="text-sm mb-4" style={{ color: "#8a8a8a" }}>No mock tests found for {subject}</p>
              <Link to="/chapters" className="btn-primary text-sm">Browse Study Modules</Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#8a8a8a" }}>Academic Modules</p>
              <div className="space-y-6">
                {mockTests.map((mod, modIdx) => (
                  <div key={mod.module_name} className="space-y-3">
                    <h3 className="font-display font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ background: "rgba(173,255,68,0.1)", color: "#adff44", border: "1px solid rgba(173,255,68,0.2)" }}>
                        {mod.module_order < 999 ? mod.module_order : "•"}
                      </span>
                      {mod.module_name}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {mod.quizzes.map((test, i) => (
                        <motion.a
                          key={test.raw_test_name}
                          href={`/quiz?test=${encodeURIComponent(test.raw_test_name)}&subject=${subject}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (modIdx * 0.1) + (i * 0.05) }}
                          whileHover={{ y: -2 }}
                          className="block rounded-2xl p-4 transition-all duration-200 group"
                          style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-display font-bold text-white group-hover:text-neon transition-colors">{test.display_name}</h4>
                            <span className="badge badge-neon flex-shrink-0">Practice</span>
                          </div>
                          <p className="text-xs" style={{ color: "#8a8a8a" }}>
                            {test.question_count} questions · Adaptive
                          </p>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-48 rounded-xl skeleton" />
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}
        </div>
      )}

      {/* Active Quiz */}
      {quiz && !result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Quiz Header (sticky) */}
          <div
            className="sticky top-16 z-10 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
            style={{
              background: "rgba(10,10,10,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-white truncate text-sm">{quiz.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs" style={{ color: "#8a8a8a" }}>
                  {Object.keys(answers).length}/{quiz.questions.length} answered
                </p>
                <div className="progress-bar flex-1 max-w-24">
                  <div className="progress-fill" style={{ width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Floating Timer */}
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-2xl font-display font-black text-lg tabular-nums"
                style={{
                  background: remaining < 60 ? "rgba(255,107,107,0.12)" : "rgba(173,255,68,0.08)",
                  border: `1px solid ${remaining < 60 ? "rgba(255,107,107,0.3)" : "rgba(173,255,68,0.2)"}`,
                  color: remaining < 60 ? "#ff6b6b" : remaining < 300 ? "#ffd700" : "#adff44",
                  animation: remaining < 60 ? "glow-pulse 1s ease-in-out infinite" : "none",
                }}
              >
                <Clock size={16} />
                {formatTime(remaining)}
              </div>

              {/* Question Palette toggle */}
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="btn-ghost text-xs px-3 py-2"
              >
                Palette
              </button>

              {/* Submit */}
              <button
                className="btn-primary text-sm"
                disabled={submitting}
                onClick={() => submit(false)}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          {/* Question Palette */}
          <AnimatePresence>
            {showPalette && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-4 overflow-hidden"
                style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#8a8a8a" }}>Question Palette</p>
                <div className="flex flex-wrap gap-2">
                  {quiz.questions.map((q, i) => {
                    const isAnswered = !!answers[q.id];
                    const isFlagged = flagged.has(q.id);
                    const isCurrent = i === currentQuestion;
                    return (
                      <button
                        key={q.id}
                        onClick={() => { setCurrentQuestion(i); setShowPalette(false); document.querySelector(`[data-q="${q.id}"]`)?.scrollIntoView({ behavior: "smooth" }); }}
                        className="w-9 h-9 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: isCurrent ? "#adff44" : isAnswered ? "rgba(173,255,68,0.15)" : isFlagged ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${isCurrent ? "#adff44" : isAnswered ? "rgba(173,255,68,0.3)" : isFlagged ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                          color: isCurrent ? "#000" : isAnswered ? "#adff44" : isFlagged ? "#ffd700" : "#8a8a8a",
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3">
                  {[
                    { color: "#adff44", border: "rgba(173,255,68,0.3)", label: "Answered" },
                    { color: "#ffd700", border: "rgba(255,215,0,0.3)", label: "Flagged" },
                    { color: "#8a8a8a", border: "rgba(255,255,255,0.08)", label: "Unattempted" },
                  ].map(({ color, border, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "#8a8a8a" }}>
                      <div className="w-3 h-3 rounded" style={{ background: `${color}20`, border: `1px solid ${border}` }} />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Questions */}
          {quiz.questions.map((q, index) => (
            <motion.div
              key={q.id}
              data-q={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl p-5"
              style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(173,255,68,0.1)", color: "#adff44", border: "1px solid rgba(173,255,68,0.2)" }}>
                  Q{index + 1}
                </span>
                <div className="flex items-center gap-2">
                  {answers[q.id] && <span className="badge badge-neon text-[10px]">✓ Answered</span>}
                  <button
                    onClick={() => setFlagged((prev) => { const next = new Set(prev); if (next.has(q.id)) next.delete(q.id); else next.add(q.id); return next; })}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: flagged.has(q.id) ? "#ffd700" : "#8a8a8a" }}
                  >
                    <Flag size={14} fill={flagged.has(q.id) ? "#ffd700" : "none"} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-white leading-relaxed mb-4">{q.prompt}</h3>

              <div className="grid gap-2 sm:grid-cols-2">
                {(q.options || []).map((option) => {
                  const isSelected = answers[q.id] === option;
                  return (
                    <motion.button
                      key={option}
                      onClick={() => setAnswers({ ...answers, [q.id]: option })}
                      whileTap={{ scale: 0.98 }}
                      className="quiz-option text-left"
                      style={isSelected ? {
                        borderColor: "#adff44",
                        background: "rgba(173,255,68,0.08)",
                        color: "#adff44",
                        boxShadow: "0 0 12px rgba(173,255,68,0.15)",
                      } : {}}
                    >
                      {option}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Final Submit button */}
          <div className="flex justify-center pt-2 pb-6">
            <motion.button
              className="btn-primary px-10 py-4 text-base font-bold"
              disabled={submitting}
              onClick={() => submit(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {submitting ? "Submitting..." : `Submit Test (${Object.keys(answers).length}/${quiz.questions.length} answered)`}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
