import { useRef, useEffect } from "react";
import {
  Send, Loader2, Lightbulb, RefreshCw, PenLine, Target,
  BookmarkPlus, X, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyWorkspace } from "../../context/StudyWorkspaceContext";
import Markdown from "../Markdown.jsx";
import AIOrb from "../AIOrb.jsx";
import AiLandingState from "./AiLandingState";

const ACTION_CHIPS = [
  { id: "hint", icon: Lightbulb, label: "💡 Hint", prompt: "Give me a hint to solve this" },
  { id: "simpler", icon: RefreshCw, label: "🔄 Simpler", prompt: "Explain this in even simpler terms" },
  { id: "try", icon: PenLine, label: "✏️ Practice", prompt: "Give me a practice problem on this topic" },
  { id: "similar", icon: Target, label: "🎯 Similar", prompt: "Give me a similar question to practice" },
];

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <AIOrb size={28} pulse={false} />
      <div className="atp-typing">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

export default function AiTutorPanel() {
  const {
    messages, sendMessage, loading, aiError, setAiError,
    addNote, currentPage, chapterTitle, subject,
    aiPanelOpen, setAiPanelOpen,
  } = useStudyWorkspace();

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const questionRef = useRef("");
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (aiPanelOpen) inputRef.current?.focus();
  }, [aiPanelOpen]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const q = questionRef.current.trim();
    if (!q || loading) return;
    sendMessage(q);
    questionRef.current = "";
    if (textareaRef.current) textareaRef.current.value = "";
  };

  const handleChip = (chip) => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const prompt = `${chip.prompt}${lastUserMsg ? ` for: "${lastUserMsg.text}"` : ""}`;
    sendMessage(prompt);
  };

  const handleSaveNote = (msg) => {
    addNote(msg.text, msg.selectedText, msg.pageNumber || currentPage);
  };

  const contextLabel = [subject?.charAt(0).toUpperCase() + subject?.slice(1), chapterTitle]
    .filter(Boolean)
    .join(" · ");

  if (!aiPanelOpen) return null;

  return (
    <div className="ai-tutor-panel">
      {/* ── Header ── */}
      <div className="atp-header">
        <div className="atp-header-left">
          <AIOrb size={28} />
          <div className="atp-header-info">
            <p className="atp-header-title">AI Tutor</p>
            <p className="atp-header-context">{contextLabel || "Ready to help"}</p>
          </div>
          <div className="atp-status-badge">
            <div className="atp-status-dot" />
            <span>Online</span>
          </div>
        </div>
        <button
          onClick={() => setAiPanelOpen(false)}
          className="atp-close-btn"
          title="Close AI Panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="atp-messages">
        {messages.length === 0 && !loading && (
          <AiLandingState />
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`atp-msg ${msg.role === "user" ? "atp-msg-user" : "atp-msg-ai"}`}
            >
              {msg.role === "user" ? (
                <div className="atp-msg-user-bubble">
                  {msg.selectedText && (
                    <div className="atp-msg-selected-text">
                      📎 "{msg.selectedText.slice(0, 80)}{msg.selectedText.length > 80 ? "..." : ""}"
                    </div>
                  )}
                  {msg.text}
                </div>
              ) : (
                <div className="atp-msg-ai-wrap">
                  <div className="atp-msg-ai-row">
                    <AIOrb size={24} pulse={false} />
                    <div className="atp-msg-ai-bubble">
                      <Markdown text={msg.text} />
                      {msg.pageNumber && (
                        <div className="atp-msg-citation">
                          📄 Source: Page {msg.pageNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Save Note + Action Chips (only on last AI message) */}
                  <div className="atp-msg-actions">
                    <button
                      onClick={() => handleSaveNote(msg)}
                      className="atp-save-note-btn"
                      title="Save as note"
                    >
                      <BookmarkPlus size={12} />
                      <span>Save as Note</span>
                    </button>
                    {idx === messages.length - 1 && (
                      <>
                        {ACTION_CHIPS.map((chip) => (
                          <button
                            key={chip.id}
                            onClick={() => handleChip(chip)}
                            disabled={loading}
                            className="atp-chip"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TypingIndicator />
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Error ── */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="atp-error"
          >
            <span>{aiError}</span>
            <button onClick={() => setAiError("")}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <div className="atp-input-area">
        <form onSubmit={handleSubmit} className="atp-input-form">
          <textarea
            ref={(el) => { textareaRef.current = el; inputRef.current = el; }}
            rows={1}
            className="atp-input"
            placeholder="Ask your doubt..."
            onChange={(e) => {
              questionRef.current = e.target.value;
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="atp-send-btn"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </motion.button>
        </form>
        <p className="atp-input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
