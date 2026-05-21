import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Trophy, RotateCcw, BookOpen } from "lucide-react";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useStudySession } from "../context/StudySessionContext.jsx";

const TIMER_KEY = "preporbit_quiz_timer";
const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
  const [remaining, setRemaining] = useState(0);
  const startedAt = useRef(Date.now());

  const persistTimer = useCallback((quizId, seconds) => {
    localStorage.setItem(TIMER_KEY, JSON.stringify({ quizId, remaining: seconds, startedAt: Date.now() }));
    api.post("/quizzes/timer/sync", { quiz_id: quizId, remaining_seconds: seconds }).catch(() => {});
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswers({});
    try {
      const mode = params.get("mode");
      const chapter = Number(params.get("chapter") || 1);
      let data;
      if (mode === "module") {
        const r = await api.post(
          "/quizzes/module",
          { grade: 9, subject, chapter: String(chapter), question_count: 5, duration_minutes: 15, quiz_type: "module" },
          { params: { chapter_number: chapter } }
        );
        data = r.data;
      } else if (params.get("test")) {
        const r = await api.post(
          "/quizzes/mock",
          { grade: 9, subject, question_count: 20, duration_minutes: 45, quiz_type: "mock" },
          { params: { test_name: params.get("test") } }
        );
        data = r.data;
      } else {
        setLoading(false);
        return;
      }
      setQuiz(data);
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "{}");
      const initial = saved.quizId === data.id ? saved.remaining : data.duration_minutes * 60;
      setRemaining(initial);
      startedAt.current = Date.now();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load quiz.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role !== "student") return;
    api.get("/quizzes/mock-tests", { params: { subject } })
      .then((r) => setMockTests(r.data))
      .catch(() => {});
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
    setError("");
    setSubmitting(true);
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      const { data } = await api.post("/quizzes/attempts", {
        quiz_id: quiz.id,
        answers,
        time_taken_seconds: elapsed,
      });
      setResult(data);
      localStorage.removeItem(TIMER_KEY);
      endSession();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit this quiz.");
    } finally {
      setSubmitting(false);
    }
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

  // ── Result screen ──────────────────────────────────────────────
  if (result && quiz) {
    const total = quiz.questions.length;
    const correct = Math.round((result.accuracy / 100) * total);
    return (
      <div className="space-y-6">
        {/* Score Card */}
        <div className="card text-center">
          <Trophy size={40} className="mx-auto text-gold" />
          <h2 className="mt-3 text-3xl font-black">
            {correct}/{total}
          </h2>
          <p className="mt-1 text-black/60 dark:text-white/60">{quiz.title}</p>
          <div className="mt-4 flex justify-center gap-8">
            <div>
              <p className="text-2xl font-bold text-mint">{cap(result.accuracy)}%</p>
              <p className="text-xs text-black/50">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{result.score}</p>
              <p className="text-xs text-black/50">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-coral">
                {result.time_taken_seconds < 60
                  ? `${result.time_taken_seconds}s`
                  : `${Math.floor(result.time_taken_seconds / 60)}m ${result.time_taken_seconds % 60}s`}
              </p>
              <p className="text-xs text-black/50">Time</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/analytics" className="btn-primary">View Analytics</Link>
            <Link to="/chapters" className="btn-soft">Back to Modules</Link>
            <button className="btn-soft flex items-center gap-1" onClick={() => { setQuiz(null); setResult(null); }}>
              <RotateCcw size={15} /> Retry
            </button>
          </div>
        </div>

        {/* Per-question review */}
        <div className="card">
          <h3 className="font-bold mb-4">Question Review</h3>
          <div className="space-y-4">
            {quiz.questions.map((q, i) => {
              const submitted = String(answers[q.id] || "").trim().toLowerCase();
              const expected = String(q.correct_answer).trim().toLowerCase();
              const isCorrect = submitted === expected ||
                (expected.length === 1 && submitted.startsWith(`${expected})`)) ||
                (submitted && submitted[0] === expected[0]);
              return (
                <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? "border-mint/40 bg-mint/5" : "border-coral/40 bg-coral/5"}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect
                      ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-mint" />
                      : <XCircle size={18} className="mt-0.5 flex-shrink-0 text-coral" />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Q{i + 1}. {q.prompt}</p>
                      {!isCorrect && (
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-coral">Your answer: {answers[q.id] || "Not answered"}</p>
                          <p className="text-mint font-semibold">Correct: {q.correct_answer}</p>
                        </div>
                      )}
                      {q.textbook_explanation && q.textbook_explanation !== "Refer to the chapter PDF for this concept." && (
                        <p className="mt-2 text-xs text-black/55 dark:text-white/50">{q.textbook_explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz selection / in-progress ──────────────────────────────
  return (
    <div className="space-y-4">
      <ErrorNotice message={error} />

      {/* Header */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tests</h1>
          <p className="text-sm text-black/60 dark:text-white/60">Module quizzes and full mock tests</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input max-w-40" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="maths">Mathematics</option>
            <option value="science">Science</option>
            <option value="english">English</option>
          </select>
          <Link to="/chapters" className="btn-soft hidden sm:flex items-center gap-1 text-sm">
            <BookOpen size={15} /> Modules
          </Link>
        </div>
      </div>

      {/* Mock test list */}
      {!quiz && !loading && (
        <div className="space-y-3">
          {mockTests.length === 0 ? (
            <EmptyState title="No mock tests found for this subject." />
          ) : (
            <>
              <p className="text-sm font-semibold text-black/50 dark:text-white/40 uppercase tracking-wide">Select a Mock Test</p>
              <div className="grid gap-3 md:grid-cols-2">
                {mockTests.map((test) => (
                  <a
                    key={test.test_name}
                    href={`/quiz?test=${encodeURIComponent(test.test_name)}&subject=${subject}`}
                    className="card block hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                  >
                    <h3 className="font-bold">{test.test_name}</h3>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                      {test.question_count} questions · Timed mock test
                    </p>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="card animate-pulse">
          <div className="h-6 w-48 rounded bg-black/10 dark:bg-white/10 mb-4" />
          {[1, 2, 3].map((i) => <div key={i} className="mb-3 h-20 rounded-xl bg-black/5 dark:bg-white/5" />)}
        </div>
      )}

      {/* Active quiz */}
      {quiz && !result && (
        <>
          {/* Timer + quiz header */}
          <div className="card flex items-center justify-between sticky top-16 z-10 bg-white/90 dark:bg-[#111816]/90 backdrop-blur">
            <div>
              <h2 className="font-bold">{quiz.title}</h2>
              <p className="text-xs text-black/50">{quiz.questions.length} questions · {Object.keys(answers).length} answered</p>
            </div>
            <div className={`flex items-center gap-2 text-xl font-black tabular-nums ${remaining < 60 ? "text-coral animate-pulse" : remaining < 300 ? "text-gold" : "text-mint"}`}>
              <Clock size={20} />
              {formatTime(remaining)}
            </div>
          </div>

          {/* Questions */}
          {quiz.questions.map((q, index) => (
            <div className="card" key={q.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-mint">
                  Q{index + 1}
                </p>
                {answers[q.id] && (
                  <span className="text-xs rounded-full bg-mint/10 text-mint px-2 py-0.5">Answered</span>
                )}
              </div>
              <h3 className="mt-2 font-semibold leading-relaxed">{q.prompt}</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(q.options || []).map((option) => (
                  <button
                    key={option}
                    onClick={() => setAnswers({ ...answers, [q.id]: option })}
                    className={`rounded-xl border p-3 text-left text-sm transition-all duration-100 ${
                      answers[q.id] === option
                        ? "border-mint bg-mint/10 font-semibold"
                        : "border-black/10 hover:border-mint/40 hover:bg-mint/5 dark:border-white/10"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              className="btn-primary"
              disabled={submitting}
              onClick={() => submit(false)}
            >
              {submitting ? "Submitting..." : `Submit Test (${Object.keys(answers).length}/${quiz.questions.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
