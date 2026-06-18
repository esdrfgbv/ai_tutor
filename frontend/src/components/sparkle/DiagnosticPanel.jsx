import { useState } from "react";
import { BarChart3, BookOpen, FileText, Clock, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import api from "../../api/client";

const SUBJECTS = [
  { id: "math", label: "Mathematics", icon: "📐", color: "#ADFF44", questions: 15, time: "20 min" },
  { id: "english", label: "English", icon: "📖", color: "#adff44", questions: 15, time: "20 min" },
  { id: "reasoning", label: "Reasoning", icon: "🧩", color: "rgba(173,255,68,0.7)", questions: 15, time: "20 min" },
  { id: "science", label: "Science", icon: "🔬", color: "#ADFF44", questions: 15, time: "20 min" },
];

export function DiagnosticPanel() {
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [answered, setAnswered] = useState(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const questions = quiz?.questions || [];
  const q = questions[qIdx];

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/diagnostic/start", { subject });
      setQuiz(data);
      setStartTime(Date.now());
      setQIdx(0);
      setAnswers({});
      setAnswered(null);
      setFinished(false);
      setResult(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start diagnostic test.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (selected) => {
    if (answered !== null) return;
    setAnswered(selected);
    const qid = String(q.id);
    setAnswers((prev) => ({ ...prev, [qid]: selected }));
    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx((i) => i + 1);
        setAnswered(null);
      } else {
        submitQuiz();
      }
    }, 800);
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const { data } = await api.post("/diagnostic/submit", {
        quiz_id: quiz.quiz_id,
        answers,
        time_taken_seconds: timeTaken,
      });
      setResult(data);
      setFinished(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit diagnostic.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSubject(null);
    setQuiz(null);
    setFinished(false);
    setResult(null);
    setQIdx(0);
    setAnswers({});
    setAnswered(null);
    setError(null);
  };

  if (loading && !finished) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#ADFF44" }} />
        <span className="ml-3 text-sm text-white/50">Loading diagnostic...</span>
      </div>
    );
  }

  if (finished && result) {
    const pct = Math.round(result.accuracy);
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#ADFF44" }} />
        <h3 className="text-lg font-semibold text-white/80 mb-2">Assessment Complete!</h3>
        <p className="text-4xl font-bold mb-1" style={{ color: "#ADFF44" }}>{result.score}/{result.total}</p>
        <p className="text-sm text-white/40 mb-2">Score: {pct}%</p>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm mb-4"
          style={{
            background: pct >= 70 ? "rgba(173,255,68,0.1)" : pct >= 40 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
            color: pct >= 70 ? "#ADFF44" : pct >= 40 ? "#fbbf24" : "#ff6b6b",
            border: `1px solid ${pct >= 70 ? "rgba(173,255,68,0.2)" : pct >= 40 ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          {pct >= 70 ? "🏆 Excellent!" : pct >= 40 ? "📈 Keep practicing!" : "💪 Needs more revision"}
        </div>

        <div className="max-w-xs mx-auto space-y-2 mb-6 text-left">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Difficulty Breakdown</p>
          {result.difficulty_breakdown?.map((d) => (
            <div key={d.difficulty} className="flex items-center justify-between text-xs text-white/60 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="capitalize">{d.difficulty}</span>
              <span>{d.correct}/{d.total}</span>
            </div>
          ))}
        </div>

        <div className="max-w-xs mx-auto space-y-1.5 mb-6 text-left">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Recommendations</p>
          {result.recommendations?.map((rec, i) => (
            <p key={i} className="text-xs text-white/50 leading-relaxed">• {rec}</p>
          ))}
        </div>

        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "#ADFF44", color: "#000" }}
        >
          Try Another Subject
        </button>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (quiz && q) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm capitalize text-white/50">{quiz.subject}</span>
          <span className="text-xs text-white/20 ml-auto">Q {qIdx + 1}/{questions.length}</span>
        </div>
        <div className="w-full h-1 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((qIdx + 1) / questions.length) * 100}%`, background: "#ADFF44" }}
          />
        </div>
        <p className="text-base text-white/80 mb-4 font-medium">{q.prompt}</p>
        <div className="space-y-2">
          {q.options?.map((opt, i) => {
            const isSelected = answered === opt;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={answered !== null}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300"
                style={{
                  border: `1px solid ${
                    answered === null
                      ? "rgba(255,255,255,0.08)"
                      : isSelected
                      ? "rgba(173,255,68,0.4)"
                      : "rgba(255,255,255,0.04)"
                  }`,
                  background:
                    answered === null
                      ? "rgba(255,255,255,0.02)"
                      : isSelected
                      ? "rgba(173,255,68,0.1)"
                      : "rgba(255,255,255,0.01)",
                  color:
                    answered === null
                      ? "rgba(255,255,255,0.65)"
                      : isSelected
                      ? "#ADFF44"
                      : "rgba(255,255,255,0.25)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 mb-4">Select a subject to begin your diagnostic test</p>
      {SUBJECTS.map((s) => (
        <button
          key={s.id}
          onClick={() => setSubject(s.id === subject ? null : s.id)}
          className="w-full flex items-center gap-3 p-4 rounded-xl transition-all"
          style={{
            border: `1px solid ${subject === s.id ? "rgba(173,255,68,0.2)" : "rgba(255,255,255,0.05)"}`,
            background: subject === s.id ? "rgba(173,255,68,0.05)" : "rgba(255,255,255,0.02)",
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {s.icon}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-medium text-white/70">{s.label}</div>
            <div className="flex items-center gap-3 text-xs text-white/30 mt-0.5">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{s.questions} Qs</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.time}</span>
            </div>
          </div>
          {subject === s.id && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStart(); }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#ADFF44", color: "#000" }}
            >
              {loading ? "Starting..." : <>Start <ArrowRight className="w-3 h-3" /></>}
            </button>
          )}
        </button>
      ))}
    </div>
  );
}
