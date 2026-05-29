import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Brain, Search, ChevronRight, Clock, Star, Zap, Filter } from "lucide-react";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { modulesMap } from "../utils/modules";
import { useAuth } from "../context/AuthContext.jsx";
import SubjectTabs from "../components/SubjectTabs.jsx";

const DIFFICULTY_LABELS = ["Beginner", "Intermediate", "Advanced"];
const ESTIMATED_TIMES = [15, 20, 25, 30, 20, 15, 25, 20, 30, 25, 20, 15, 30, 25, 20, 15, 25, 30];

const SUBJECT_ICONS = {
  maths: "📐",
  science: "🔬",
  english: "📚",
  "mental-ability": "🧩",
};

export default function ChaptersPage() {
  const { user } = useAuth();
  const [userGrade, setUserGrade] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [filters, setFilters] = useState({ subject: "maths" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.role === "student") {
      api.get("/learning/profile").then((res) => setUserGrade(res.data.grade)).catch(() => setUserGrade(9));
    } else {
      setUserGrade(9);
    }
  }, [user]);

  const hasModules = userGrade && modulesMap[userGrade] !== undefined;
  const availableSubjects = hasModules ? Object.keys(modulesMap[userGrade]) : ["maths", "science", "english"];
  const currentModules = hasModules ? modulesMap[userGrade][filters.subject] || [] : [];

  const filteredModules = currentModules.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(filters.subject)) {
      setFilters((prev) => ({ ...prev, subject: availableSubjects[0] }));
    }
  }, [availableSubjects, filters.subject]);

  useEffect(() => {
    if (!userGrade) return;
    if (hasModules) { setChapters([]); return; }
    setError("");
    api.get("/learning/chapters", { params: { ...filters, grade: userGrade } })
      .then((r) => setChapters(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load chapters."));
  }, [filters, hasModules, userGrade]);

  if (!userGrade) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(173,255,68,0.3)", borderTopColor: "#adff44" }} />
          <p className="text-sm" style={{ color: "#8a8a8a" }}>Loading your study modules...</p>
        </div>
      </div>
    );
  }

  const subjectTabItems = availableSubjects.map((s) => ({
    value: s,
    label: `${SUBJECT_ICONS[s] || "📖"} ${s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`,
  }));

  return (
    <div className="space-y-6">
      <ErrorNotice message={error} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display font-black text-2xl text-white">Study Modules</h1>
          <p className="text-sm mt-0.5" style={{ color: "#8a8a8a" }}>
            Class {userGrade} · {filteredModules.length || chapters.length} chapters available
          </p>
        </div>
        <Link to="/doubts" className="btn-primary text-sm flex-shrink-0">
          <Brain size={15} /> Ask AI Tutor
        </Link>
      </motion.div>

      {/* Subject Tabs + Search Row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        <SubjectTabs
          subjects={subjectTabItems}
          value={filters.subject}
          onChange={(v) => setFilters({ ...filters, subject: v })}
        />
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8a8a8a" }} />
          <input
            className="input pl-9 text-sm py-2.5"
            placeholder="Search chapters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Modules Grid */}
      {hasModules ? (
        filteredModules.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredModules.map((module, index) => {
              const difficulty = DIFFICULTY_LABELS[Math.floor(index / (currentModules.length / 3))];
              const estimatedTime = ESTIMATED_TIMES[index % ESTIMATED_TIMES.length];

              return (
                <motion.div
                  key={module.slug}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <Link
                    to={`/study/${filters.subject}/${module.slug}`}
                    className="block rounded-2xl p-5 relative overflow-hidden group transition-all duration-300"
                    style={{
                      background: "rgba(17,17,17,0.9)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(173,255,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
                    }}
                  >
                    {/* Background corner glow */}
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(173,255,68,0.12) 0%, transparent 70%)", transform: "translate(40%, -40%)" }} />

                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)", color: "#adff44" }}
                      >
                        {SUBJECT_ICONS[filters.subject]} Module {index + 1}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: difficulty === "Beginner" ? "rgba(173,255,68,0.08)" : difficulty === "Intermediate" ? "rgba(255,215,0,0.08)" : "rgba(255,107,107,0.08)",
                          color: difficulty === "Beginner" ? "#adff44" : difficulty === "Intermediate" ? "#ffd700" : "#ff6b6b",
                          border: `1px solid ${difficulty === "Beginner" ? "rgba(173,255,68,0.2)" : difficulty === "Intermediate" ? "rgba(255,215,0,0.2)" : "rgba(255,107,107,0.2)"}`,
                        }}
                      >
                        {difficulty}
                      </span>
                    </div>

                    <h2 className="font-display font-bold text-white text-base leading-tight mb-3 group-hover:text-neon transition-colors duration-200">
                      {module.title}
                    </h2>

                    <p className="text-xs leading-relaxed mb-4" style={{ color: "#8a8a8a" }}>
                      Interactive PDF study module for Class {userGrade} {filters.subject.charAt(0).toUpperCase() + filters.subject.slice(1).replace("-", " ")}.
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#8a8a8a" }}>
                        <Clock size={11} />
                        <span>{estimatedTime} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#adff44" }}>
                        Study <ChevronRight size={12} />
                      </div>
                    </div>

                    {/* Progress bar placeholder */}
                    <div className="progress-bar mt-3">
                      <div className="progress-fill" style={{ width: `${(index * 13) % 100}%` }} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <BookOpen size={40} style={{ color: "#8a8a8a" }} className="mb-3" />
            <p className="font-semibold text-white mb-1">
              {search ? "No chapters match your search" : `No modules for Class ${userGrade} ${filters.subject}`}
            </p>
            <p className="text-sm" style={{ color: "#8a8a8a" }}>
              {search ? "Try a different search term" : "Check back soon for new content"}
            </p>
          </div>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {chapters.map((chapter, index) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <Link to={`/chapters/${chapter.id}`} className="block rounded-2xl p-5 transition-all duration-300"
                style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}>
                <p className="text-xs font-bold mb-2" style={{ color: "#adff44" }}>Chapter {chapter.chapter_number}</p>
                <h2 className="font-display font-bold text-white text-lg mb-2">{chapter.title}</h2>
                <p className="text-sm" style={{ color: "#8a8a8a" }}>{chapter.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
