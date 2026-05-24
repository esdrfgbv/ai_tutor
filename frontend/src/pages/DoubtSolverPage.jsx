import {
  Send, ArrowLeft, Brain, Loader2, Lightbulb, RefreshCw,
  PenLine, Target, Video, ChevronLeft, ChevronRight,
  BookOpen, Clock, Flame, Zap, Search, X
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/client";
import Markdown from "../components/Markdown.jsx";
import AIOrb from "../components/AIOrb.jsx";
import { modulesMap } from "../utils/modules";
import { useAuth } from "../context/AuthContext.jsx";

const ACTION_CHIPS = [
  { id: "hint", icon: Lightbulb, label: "💡 Hint", prompt: "Give me a hint to solve this" },
  { id: "simpler", icon: RefreshCw, label: "🔄 Explain Simpler", prompt: "Explain this in even simpler terms" },
  { id: "try", icon: PenLine, label: "✏️ Try Yourself", prompt: "Give me a practice problem on this topic" },
  { id: "similar", icon: Target, label: "🎯 Similar Question", prompt: "Give me a similar question to practice" },
];

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <AIOrb size={32} pulse={false} />
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(173,255,68,0.15)" }}
      >
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

export default function DoubtSolverPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const subject = searchParams.get("subject") || "maths";
  const slug = searchParams.get("slug") || "";
  const chapter = searchParams.get("chapter") || "";
  const paramGrade = searchParams.get("grade");

  const [grade, setGrade] = useState(9);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState(subject);
  const [chapterSearch, setChapterSearch] = useState("");

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const resolvedGrade = paramGrade ? Number(paramGrade) : grade;

  useEffect(() => {
    api.get("/learning/profile").then((r) => setGrade(r.data.grade || 9)).catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Session timer
  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const contextLabel = [`Class ${resolvedGrade}`, subject.charAt(0).toUpperCase() + subject.slice(1), chapter].filter(Boolean).join(" · ");

  // Available chapters for left panel
  const availableModules = (modulesMap[resolvedGrade]?.[selectedSubject] || []).filter((m) =>
    m.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  const ask = async (questionText) => {
    const q = (questionText || question).trim();
    if (!q || loading) return;

    const userMessage = { id: Date.now(), role: "user", text: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/learning/doubts", {
        question: q,
        grade: resolvedGrade,
        subject,
        chapter: chapter || null,
        slug: slug || null,
      });

      const answer = response.data?.answer || "No response returned from AI";
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "ai", text: answer, source: response.data?.source || "AI Tutor" },
      ]);
    } catch (err) {
      const backendMessage = err.response?.data?.detail;
      setError(backendMessage || "Backend connection failed. Check API server and API key.");
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "ai", text: "Failed to get response from AI service. Check backend logs and API key configuration.", source: "System" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleChip = (chip, lastUserText) => {
    const prompt = `${chip.prompt}${lastUserText ? ` for: "${lastUserText}"` : ""}`;
    ask(prompt);
  };

  return (
    <div
      className="flex rounded-3xl overflow-hidden relative"
      style={{
        height: "calc(100vh - 100px)",
        background: "rgba(10,10,10,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ═══════════════════════════════════════════
          LEFT PANEL — Chapter Navigator
      ═══════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {leftOpen && (
          <motion.aside
            key="left-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-shrink-0 flex flex-col overflow-hidden"
            style={{
              background: "rgba(10,10,10,0.95)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#8a8a8a" }}>Study Navigator</p>
              {/* Subject tabs */}
              <div className="flex gap-1 p-0.5 rounded-xl mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {Object.keys(modulesMap[resolvedGrade] || { maths: [], science: [], english: [] }).slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSubject(s)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: selectedSubject === s ? "#adff44" : "transparent",
                      color: selectedSubject === s ? "#000" : "#8a8a8a",
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1, 3)}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8a8a8a" }} />
                <input
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-xs outline-none"
                  placeholder="Search topics..."
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#fff",
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {availableModules.length > 0 ? (
                availableModules.map((mod, i) => (
                  <Link
                    key={mod.slug}
                    to={`/viewer/${selectedSubject}/${mod.slug}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group"
                    style={{
                      color: chapter === mod.title ? "#adff44" : "#bdbdbd",
                      background: chapter === mod.title ? "rgba(173,255,68,0.08)" : "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = chapter === mod.title ? "rgba(173,255,68,0.08)" : "transparent"; e.currentTarget.style.color = chapter === mod.title ? "#adff44" : "#bdbdbd"; }}
                  >
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#8a8a8a" }}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate leading-tight">{mod.title}</span>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "#8a8a8a" }}>No chapters found</p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          CENTER PANEL — AI Chat
      ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "#8a8a8a" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8a8a"; e.currentTarget.style.background = "transparent"; }}
            >
              {leftOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <AIOrb size={32} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">Prep100 Tutor</p>
              <p className="text-xs truncate" style={{ color: "#8a8a8a" }}>{contextLabel}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hidden sm:flex"
              style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
              <span className="text-xs font-semibold" style={{ color: "#adff44" }}>Online</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {slug && (
              <Link to={`/viewer/${subject}/${slug}`} className="btn-soft text-xs py-1.5 px-3 hidden sm:flex">
                <BookOpen size={12} /> Textbook
              </Link>
            )}
            <Link to="/chapters" className="btn-soft text-xs py-1.5 px-3 flex items-center gap-1">
              <ArrowLeft size={12} /> Back
            </Link>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="hidden lg:flex p-1.5 rounded-lg transition-all"
              style={{ color: "#8a8a8a" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8a8a"; e.currentTarget.style.background = "transparent"; }}
            >
              {rightOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {messages.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12"
            >
              <AIOrb size={72} />
              <div>
                <h3 className="font-display font-bold text-xl text-white mb-2">Your AI Tutor is Ready</h3>
                <p className="text-sm max-w-xs" style={{ color: "#8a8a8a" }}>
                  Ask any doubt about{" "}
                  <span className="font-semibold text-white">{chapter || subject}</span>.
                  I'll explain it clearly using your textbook.
                </p>
              </div>
              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-sm">
                {[
                  "Explain the concept simply",
                  "Give me key formulas",
                  "What are common mistakes?",
                  "Create a practice question",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuestion(s); setTimeout(() => ask(s), 100); }}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#bdbdbd",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.3)"; e.currentTarget.style.color = "#adff44"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#bdbdbd"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const lastUserMsg = messages.slice(0, idx).filter((m) => m.role === "user").pop();
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    <div
                      className="max-w-[75%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed font-medium"
                      style={{
                        background: "#ffffff",
                        color: "#000000",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      {msg.text}
                    </div>
                  ) : (
                    <div className="max-w-[85%] space-y-3">
                      <div className="flex gap-3 items-start">
                        <AIOrb size={32} pulse={false} />
                        <div
                          className="flex-1 px-4 py-4 rounded-2xl rounded-bl-sm"
                          style={{
                            background: "rgba(17,17,17,0.95)",
                            border: "1px solid rgba(173,255,68,0.15)",
                            boxShadow: "0 0 20px rgba(173,255,68,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
                          }}
                        >
                          <Markdown text={msg.text} />
                          {msg.source && msg.source !== "System" && (
                            <p className="text-[10px] mt-3 pt-2 font-medium" style={{ color: "#8a8a8a", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              📄 Source: {msg.source}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action chips */}
                      {idx === messages.length - 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex gap-2 pl-11 flex-wrap"
                        >
                          {ACTION_CHIPS.map((chip) => (
                            <button
                              key={chip.id}
                              onClick={() => {
                                const lastUser = messages.filter((m) => m.role === "user").pop();
                                handleChip(chip, lastUser?.text);
                              }}
                              disabled={loading}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#bdbdbd",
                              }}
                              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = "rgba(173,255,68,0.35)"; e.currentTarget.style.color = "#adff44"; e.currentTarget.style.background = "rgba(173,255,68,0.06)"; } }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#bdbdbd"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TypingIndicator />
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-2 px-4 py-3 rounded-xl text-xs flex items-center justify-between"
              style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}
            >
              <span>{error}</span>
              <button onClick={() => setError("")}><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                className="w-full rounded-2xl px-4 py-3 pr-4 text-sm outline-none resize-none overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  minHeight: 48,
                  maxHeight: 120,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                placeholder="Ask your doubt... (e.g. Explain Newton's 2nd law)"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(173,255,68,0.4)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(173,255,68,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
              />
              {/* Context chip */}
              {chapter && (
                <div
                  className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(173,255,68,0.1)", color: "#adff44", border: "1px solid rgba(173,255,68,0.2)" }}
                >
                  {chapter}
                </div>
              )}
            </div>
            <motion.button
              type="submit"
              disabled={loading || !question.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: "#adff44", color: "#000" }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </motion.button>
          </form>
          <p className="text-center text-[10px] mt-2" style={{ color: "#8a8a8a" }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT PANEL — Live Stats
      ═══════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {rightOpen && (
          <motion.aside
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-shrink-0 overflow-hidden hidden lg:flex flex-col"
            style={{
              background: "rgba(10,10,10,0.95)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8a8a8a" }}>Session Stats</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Timer */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} style={{ color: "#adff44" }} />
                  <span className="text-xs font-semibold" style={{ color: "#8a8a8a" }}>Session Time</span>
                </div>
                <p className="font-display font-black text-2xl text-white">{formatTime(sessionTime)}</p>
              </div>

              {/* Questions asked */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} style={{ color: "#adff44" }} />
                  <span className="text-xs font-semibold" style={{ color: "#8a8a8a" }}>Questions Asked</span>
                </div>
                <p className="font-display font-black text-2xl text-white">
                  {messages.filter((m) => m.role === "user").length}
                </p>
              </div>

              {/* Streak */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} style={{ color: "#ff6b6b" }} />
                  <span className="text-xs font-semibold" style={{ color: "#8a8a8a" }}>Daily Streak</span>
                </div>
                <p className="font-display font-black text-2xl" style={{ color: "#ff6b6b" }}>🔥 Active</p>
              </div>

              {/* XP earned */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(173,255,68,0.06)", border: "1px solid rgba(173,255,68,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} style={{ color: "#adff44" }} />
                  <span className="text-xs font-semibold" style={{ color: "#8a8a8a" }}>XP Earned</span>
                </div>
                <p className="font-display font-black text-2xl" style={{ color: "#adff44" }}>
                  +{messages.filter((m) => m.role === "user").length * 10}
                </p>
              </div>

              {/* Quick actions */}
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#8a8a8a" }}>Quick Actions</p>
                <div className="space-y-2">
                  {slug && (
                    <Link to={`/viewer/${subject}/${slug}`} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all w-full"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#bdbdbd" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.3)"; e.currentTarget.style.color = "#adff44"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#bdbdbd"; }}>
                      <BookOpen size={13} /> Open Textbook
                    </Link>
                  )}
                  <Link to={`/quiz?subject=${subject}`} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all w-full"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#bdbdbd" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.3)"; e.currentTarget.style.color = "#adff44"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#bdbdbd"; }}>
                    <Target size={13} /> Take a Quiz
                  </Link>
                  <button onClick={() => setMessages([])} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#bdbdbd" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,107,107,0.3)"; e.currentTarget.style.color = "#ff6b6b"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#bdbdbd"; }}>
                    <RefreshCw size={13} /> Clear Chat
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
