import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, MessageSquare, BarChart3, ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../api/client";
import AIOrb from "../components/AIOrb.jsx";

export default function ChapterDetailPage() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chapterId) return;
    setError("");
    api.get(`/learning/chapters/${chapterId}`)
      .then((r) => setChapter(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load chapter."));
  }, [chapterId]);

  if (error) return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}>
        {error}
      </div>
      <button className="btn-ghost" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} /> Go back
      </button>
    </div>
  );

  if (!chapter) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(173,255,68,0.3)", borderTopColor: "#adff44" }} />
        <p className="text-sm" style={{ color: "#8a8a8a" }}>Loading chapter...</p>
      </div>
    </div>
  );

  const actions = [
    {
      icon: MessageSquare,
      title: "Ask AI Tutor",
      desc: "Get instant answers about this chapter",
      color: "#adff44",
      onClick: () => navigate(`/doubts?chapter=${encodeURIComponent(chapter.title)}&subject=${chapter.subject}`),
    },
    {
      icon: BarChart3,
      title: "Take Quiz",
      desc: "Test your understanding with adaptive questions",
      color: "#adff44",
      onClick: () => navigate(`/quiz?chapter=${chapter.id}&subject=${chapter.subject}`),
    },
    {
      icon: BookOpen,
      title: "Next Chapter",
      desc: "Continue to the next topic",
      color: "#adff44",
      onClick: () => navigate("/chapters"),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="btn-ghost text-sm"
      >
        <ArrowLeft size={14} /> Back to Chapters
      </motion.button>

      {/* Chapter Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl p-7 relative overflow-hidden"
        style={{
          background: "rgba(17,17,17,0.95)",
          border: "1px solid rgba(173,255,68,0.12)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(173,255,68,0.08) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-4" style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)", color: "#adff44" }}>
          Chapter {chapter.chapter_number}
        </span>
        <h1 className="font-display font-black text-3xl text-white mb-3">{chapter.title}</h1>
        <p className="leading-relaxed" style={{ color: "#8a8a8a" }}>{chapter.description}</p>
      </motion.div>

      {/* Action Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid gap-3 md:grid-cols-3"
      >
        {actions.map(({ icon: Icon, title, desc, color, onClick }, i) => (
          <motion.button
            key={title}
            onClick={onClick}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl p-5 text-left transition-all duration-200 group"
            style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}>
              <Icon size={18} style={{ color: "#adff44" }} />
            </div>
            <h3 className="font-display font-bold text-white mb-1">{title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#8a8a8a" }}>{desc}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: "#adff44" }}>
              Go <ChevronRight size={11} />
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Study Tips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-5"
        style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <h2 className="font-display font-bold text-white mb-4">Study Tips</h2>
        <div className="space-y-3">
          {[
            "Read through the chapter content carefully",
            "Use AI Tutor to clarify concepts you don't understand",
            "Practice with the adaptive quiz to test your knowledge",
            "Review weak topics before moving to the next chapter",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}>
                <span className="text-[9px] font-bold" style={{ color: "#adff44" }}>✓</span>
              </div>
              <p className="text-sm" style={{ color: "#bdbdbd" }}>{tip}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
