import { Send, BookOpen, Lightbulb, FileText, HelpCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";

const SUBJECTS = ["maths", "science", "english"];

export default function DoubtSolverPage() {
  const [question, setQuestion] = useState("");
  const [grade, setGrade] = useState(9);
  const [subject, setSubject] = useState("maths");
  const [chapter, setChapter] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/learning/profile").then((r) => setGrade(r.data.grade || 9)).catch(() => {});
  }, []);

  const ask = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/learning/doubts", {
        question,
        grade,
        subject,
        chapter: chapter || null,
      });
      setAnswer(data);
      setHistory((prev) => [{ question, subject, answer: data }, ...prev.slice(0, 4)]);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not solve this doubt right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reuseQuestion = (item) => {
    setQuestion(item.question);
    setSubject(item.subject);
    setAnswer(item.answer);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">AI Doubt Solver</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Ask any doubt from your Class 9 syllabus and get a textbook-backed explanation.
          </p>
        </div>
        <Link to="/chapters" className="btn-soft flex items-center gap-1 text-sm">
          <ArrowLeft size={15} /> Modules
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.42fr_.58fr]">
        {/* Question form */}
        <div className="space-y-4">
          <form onSubmit={ask} className="card space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-black/50 dark:text-white/50">Class</label>
                <select className="input w-full" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                  <option value={9}>Class 9</option>
                  <option value={6}>Class 6</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-black/50 dark:text-white/50">Subject</label>
                <select className="input w-full" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-black/50 dark:text-white/50">Chapter</label>
                <input
                  className="input w-full"
                  placeholder="Optional"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-black/50 dark:text-white/50">Your doubt</label>
              <textarea
                className="input min-h-36 w-full resize-y"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`e.g. "Explain the difference between acids and bases" or "What is the formula for area of a circle?"`}
              />
            </div>

            <ErrorNotice message={error} />

            <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Thinking...
                </>
              ) : (
                <><Send size={16} /> Ask AI Tutor</>
              )}
            </button>
          </form>

          {/* Recent questions */}
          {history.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-3">Recent Questions</p>
              <div className="space-y-2">
                {history.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => reuseQuestion(item)}
                    className="w-full rounded-lg bg-black/4 p-2.5 text-left text-sm hover:bg-black/8 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <p className="font-medium truncate">{item.question}</p>
                    <p className="text-xs text-black/40 dark:text-white/40 mt-0.5 capitalize">{item.subject}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Answer panel */}
        <div>
          {answer ? (
            <div className="space-y-4">
              {/* Confidence */}
              <div className="card flex items-center justify-between py-3">
                <span className="text-sm font-semibold">AI Confidence</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        answer.confidence >= 0.7 ? "bg-mint" : answer.confidence >= 0.4 ? "bg-gold" : "bg-coral"
                      }`}
                      style={{ width: `${Math.round((answer.confidence || 0) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${answer.confidence >= 0.7 ? "text-mint" : answer.confidence >= 0.4 ? "text-gold" : "text-coral"}`}>
                    {Math.round((answer.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Textbook explanation */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={16} className="text-mint" />
                  <h3 className="font-bold">Textbook Explanation</h3>
                </div>
                <p className="text-sm leading-relaxed text-black/75 dark:text-white/75 whitespace-pre-wrap">
                  {answer.textbook_explanation}
                </p>
              </div>

              {/* Simplified */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-gold" />
                  <h3 className="font-bold">Simple Explanation</h3>
                </div>
                <p className="text-sm leading-relaxed text-black/75 dark:text-white/75 whitespace-pre-wrap">
                  {answer.simplified_explanation}
                </p>
              </div>

              {/* Examples */}
              {answer.examples?.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle size={16} className="text-coral" />
                    <h3 className="font-bold">Examples</h3>
                  </div>
                  <ul className="space-y-2">
                    {answer.examples.map((ex, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-0.5 flex-shrink-0 font-bold text-coral">{i + 1}.</span>
                        <span className="text-black/75 dark:text-white/75">{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formulas */}
              {answer.formulas?.length > 0 && (
                <div className="card bg-mint/5 border border-mint/20">
                  <h3 className="font-bold mb-2 text-mint">Key Formulas</h3>
                  {answer.formulas.map((f, i) => (
                    <p key={i} className="font-mono text-sm bg-white/50 dark:bg-black/20 rounded px-3 py-2 mt-2">{f}</p>
                  ))}
                </div>
              )}

              {/* Practice tips */}
              {answer.practice_tips?.length > 0 && (
                <div className="card">
                  <h3 className="font-bold mb-3">Practice Tips</h3>
                  <ul className="space-y-2">
                    {answer.practice_tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 rounded-lg bg-black/4 p-2.5 text-sm dark:bg-white/5">
                        <span className="text-mint font-bold">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Citations */}
              {answer.citations?.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-black/50" />
                    <h3 className="font-bold">Sources</h3>
                  </div>
                  <div className="space-y-2">
                    {answer.citations.map((c, i) => (
                      <div key={i} className="rounded-lg bg-black/4 px-3 py-2 text-xs dark:bg-white/5">
                        <span className="font-semibold">{c.source}</span>
                        {c.chapter && <span className="text-black/50 dark:text-white/40"> · {c.chapter}</span>}
                        {c.page_number && <span className="text-black/50 dark:text-white/40"> · p.{c.page_number}</span>}
                        {c.score != null && (
                          <span className="ml-2 rounded-full bg-mint/15 px-1.5 py-0.5 text-mint">
                            {Math.round(c.score * 100)}% match
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card flex h-full min-h-64 flex-col items-center justify-center text-center">
              <HelpCircle size={40} className="text-black/15 dark:text-white/15" />
              <p className="mt-4 font-semibold text-black/40 dark:text-white/40">Your answer will appear here</p>
              <p className="mt-2 text-sm text-black/30 dark:text-white/30">
                Select grade, subject, and type your doubt. Adding a chapter helps find better textbook matches.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
