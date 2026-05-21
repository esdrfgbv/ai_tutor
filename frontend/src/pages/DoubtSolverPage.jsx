import { Send, ArrowLeft, Brain, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import Markdown from "../components/Markdown.jsx";

export default function DoubtSolverPage() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "maths";
  const slug = searchParams.get("slug") || "";
  const chapter = searchParams.get("chapter") || "";
  const paramGrade = searchParams.get("grade");

  const [grade, setGrade] = useState(9);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const resolvedGrade = paramGrade ? Number(paramGrade) : grade;

  useEffect(() => {
    api
      .get("/learning/profile")
      .then((r) => setGrade(r.data.grade || 9))
      .catch(() => {});
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const contextLabel = [
    `Class ${resolvedGrade}`,
    subject.charAt(0).toUpperCase() + subject.slice(1),
    chapter,
  ]
    .filter(Boolean)
    .join(" · ");

  const ask = async (e) => {
    if (e) e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setQuestion("");
    setError("");
    setLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: q }]);

    try {
      const { data } = await api.post("/learning/doubts", {
        question: q,
        grade: resolvedGrade,
        subject,
        chapter: chapter || null,
        slug: slug || null,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: data.answer,
          source: data.source,
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not reach the AI Tutor. Check your connection."
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] md:h-[calc(100vh-110px)] max-w-3xl mx-auto">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/8">
        <div className="flex items-center gap-2.5 min-w-0">
          <Brain size={18} className="text-mint flex-shrink-0" />
          <span className="text-sm font-bold text-ink dark:text-white truncate">
            {contextLabel}
          </span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {slug && (
            <Link
              to={`/viewer/${subject}/${slug}`}
              className="btn-soft text-xs py-1.5 px-2.5"
            >
              Textbook
            </Link>
          )}
          <Link
            to="/chapters"
            className="btn-soft text-xs py-1.5 px-2.5 flex items-center gap-1"
          >
            <ArrowLeft size={12} /> Back
          </Link>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <Brain size={36} className="text-mint" />
            <p className="text-sm text-black/50 dark:text-white/50 max-w-xs">
              Ask any doubt about{" "}
              <span className="font-semibold text-ink dark:text-white">
                {chapter || subject}
              </span>
              . Get a concise, textbook-grounded answer.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[80%] bg-mint text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed shadow-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[90%] space-y-2">
                <div className="bg-white dark:bg-[#1a2422] border border-black/6 dark:border-white/8 px-4 py-3.5 rounded-2xl rounded-bl-md shadow-sm">
                  <Markdown text={msg.text} />
                </div>
                {msg.source && (
                  <p className="text-[10px] text-black/35 dark:text-white/35 pl-1 font-medium">
                    📄 {msg.source}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#1a2422] border border-black/6 dark:border-white/8 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2">
              <Loader2 size={14} className="text-mint animate-spin" />
              <span className="text-xs text-black/50 dark:text-white/50">
                Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-black/8 dark:border-white/8">
        <form onSubmit={ask} className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-4 py-3 rounded-xl border border-black/12 dark:border-white/12 bg-white dark:bg-[#121918] text-sm focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/30 placeholder:text-black/30 dark:placeholder:text-white/30"
            placeholder="Ask a doubt..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="p-3 rounded-xl bg-mint hover:bg-mint/90 text-white disabled:opacity-30 transition-all flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
