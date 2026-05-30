import { Award, BookOpen, Clock, Target, Flame, Calendar, Brain, ClipboardList, AlertCircle, TrendingUp, Trophy, Star, Zap, ChevronRight, Video, Camera, Layers, Heart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import StatCard from "../components/StatCard.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import AIOrb from "../components/AIOrb.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

const SUBJECTS = [
  { label: "Mathematics", key: "maths", color: "#adff44" },
  { label: "Science", key: "science", color: "#adff44" },
  { label: "English", key: "english", color: "#adff44" },
  { label: "Mental Ability", key: "mental-ability", color: "#adff44" },
];

function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-36 rounded-3xl skeleton" />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl skeleton" />
        <div className="h-72 rounded-2xl skeleton" />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(17,17,17,0.95)",
        border: "1px solid rgba(173,255,68,0.2)",
        borderRadius: 12,
        padding: "10px 14px",
        backdropFilter: "blur(20px)",
      }}>
        <p style={{ color: "#adff44", fontWeight: 700, fontSize: 12 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{p.value}{p.name === "accuracy" ? "%" : "m"}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userGrade, setUserGrade] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([api.get("/analytics/student"), api.get("/leaderboard"), api.get("/learning/profile")])
      .then(([s, l, p]) => { setStats(s.data); setLeaderboard(l.data); setUserGrade(p.data.grade); setError(""); })
      .catch((err) => setError(err.response?.data?.detail || err.message || "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;
  if (loading) return <SkeletonDashboard />;

  if (error) return (
    <div className="rounded-2xl p-6" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)" }}>
      <div className="flex gap-3">
        <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold text-white">Could not load dashboard</p>
          <p className="text-sm mt-1" style={{ color: "#ff6b6b" }}>{error}</p>
          <p className="text-xs mt-2" style={{ color: "#8a8a8a" }}>API: {api.defaults.baseURL}</p>
        </div>
      </div>
    </div>
  );

  const subjectPerf = stats?.subject_performance || [];
  
  const availableSubjects = SUBJECTS.filter(s => {
    if (userGrade === 6) return s.key !== "science";
    return s.key !== "mental-ability";
  });

  return (
    <div className="space-y-6 pb-6">
      {/* ══ HERO SECTION ══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: "linear-gradient(135deg, rgba(17,17,17,0.95) 0%, rgba(26,26,26,0.95) 100%)",
          border: "1px solid rgba(173,255,68,0.1)",
          boxShadow: "0 0 40px rgba(173,255,68,0.04)",
        }}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "#adff44", transform: "translate(40%, -40%)" }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AIOrb size={56} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "#8a8a8a" }}>Welcome back 👋</p>
              <h1 className="font-display font-black text-2xl text-white">{user.full_name}</h1>
              {stats?.streak_days > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Flame size={14} style={{ color: "#ff6b6b" }} />
                  <span className="text-sm font-bold" style={{ color: "#ff6b6b" }}>{stats.streak_days}-day streak</span>
                  <span className="text-xs" style={{ color: "#8a8a8a" }}>· Keep it going!</span>
                </div>
              )}
            </div>
          </div>

          {/* XP Progress */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs mb-2" style={{ color: "#8a8a8a" }}>Daily Goal</p>
              <ProgressRing value={cap(stats?.accuracy || 0)} max={100} size={72} strokeWidth={5} label={`${cap(stats?.accuracy || 0)}%`} sublabel="accuracy" />
            </div>
            {stats?.leaderboard_rank && (
              <div className="text-center">
                <p className="text-xs mb-2" style={{ color: "#8a8a8a" }}>Rank</p>
                <ProgressRing value={cap(stats?.leaderboard_percentile || 0)} max={100} size={72} strokeWidth={5} label={`#${stats.leaderboard_rank}`} sublabel="position" />
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Link to="/chapters" className="btn-primary text-sm">
              <BookOpen size={15} /> Study Now
            </Link>
            <Link to="/quiz" className="btn-ghost text-sm">
              <ClipboardList size={15} /> Take Test
            </Link>
            <Link to="/doubts" className="btn-ghost text-sm">
              <Brain size={15} /> Ask AI
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ══ METRICS GRID ══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
      >
        <StatCard icon={Target} label="Accuracy" value={cap(stats?.accuracy || 0)} suffix="%" glow />
        <StatCard icon={BookOpen} label="Quizzes Taken" value={stats?.quizzes_taken || 0} />
        <StatCard icon={Clock} label="Study Time" value={stats?.study_minutes || 0} suffix="m" />
        <StatCard icon={Flame} label="Current Streak" value={stats?.streak_days || 0} suffix="d" accentColor="#ff6b6b" />
        <StatCard icon={Award} label="Best Streak" value={stats?.longest_streak || 0} suffix="d" accentColor="#ffd700" />
        <StatCard icon={Calendar} label="7d Consistency" value={`${stats?.weekly_consistency || 0}/7`} animate={false} />
      </motion.div>

      {/* ══ AI POWER TOOLS ══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-2xl p-5"
        style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(173,255,68,0.12)", boxShadow: "0 0 30px rgba(173,255,68,0.03)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">AI Power Tools</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(173,255,68,0.1)", color: "rgba(173,255,68,0.7)", border: "1px solid rgba(173,255,68,0.15)" }}>NEW</span>
          </div>
          <span className="text-xs text-white/25">Powered by Groq AI</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { to: "/ai-video", icon: Video, label: "AI Video Tutor", desc: "Topic → Narrated slides", color: "#ADFF44" },
            { to: "/image-analysis", icon: Camera, label: "Image Analysis", desc: "Photo → AI solution", color: "#8CD430" },
            { to: "/ai-test-engine", icon: Layers, label: "AI Test Engine", desc: "PDF → Mock tests", color: "#6BBF00" },
            { to: "/adaptive", icon: Target, label: "Adaptive Learning", desc: "Skill graph + diagnostic", color: "#ADFF44" },
            { to: "/wellness", icon: Heart, label: "Wellness & Goals", desc: "Calm · Inspire · Plan", color: "#8CD430" },
          ].map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group flex flex-col gap-2 p-4 rounded-xl transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(173,255,68,0.05)"; e.currentTarget.style.borderColor = "rgba(173,255,68,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: "rgba(173,255,68,0.08)" }}>
                <tool.icon size={17} style={{ color: tool.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors truncate">{tool.label}</p>
                <p className="text-xs text-white/30 mt-0.5 truncate">{tool.desc}</p>
              </div>
              <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors mt-auto" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ══ CHARTS ROW ══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]"
      >
        {/* Score Trend */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 300 }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Score Trends</h2>
          </div>
          {stats?.trend && stats.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#adff44" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#adff44" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area dataKey="accuracy" stroke="#adff44" strokeWidth={2.5} fill="url(#neonGrad)" dot={{ r: 3, fill: "#adff44", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#adff44", filter: "drop-shadow(0 0 6px rgba(173,255,68,0.8))" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Brain size={36} style={{ color: "#8a8a8a" }} />
              <p className="text-sm" style={{ color: "#8a8a8a" }}>Take a quiz to start your trend</p>
              <Link to="/quiz" className="btn-primary text-xs">Take Quiz Now</Link>
            </div>
          )}
        </div>

        {/* Study Plan */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">AI Study Plan</h2>
          </div>
          <div className="space-y-2">
            {((stats?.study_plan?.length > 0 ? stats.study_plan : stats?.recommendations) || []).slice(0, 5).map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-1 h-4 rounded-full mt-0.5 flex-shrink-0" style={{ background: "#adff44" }} />
                <p className="text-xs leading-relaxed" style={{ color: "#bdbdbd" }}>{item}</p>
              </motion.div>
            ))}
            {(!stats?.study_plan?.length && !stats?.recommendations?.length) && (
              <p className="text-sm text-center py-8" style={{ color: "#8a8a8a" }}>Complete quizzes to get AI recommendations</p>
            )}
          </div>
          {stats?.leaderboard_rank && (
            <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Trophy size={14} style={{ color: "#ffd700" }} />
              <p className="text-xs font-semibold" style={{ color: "#adff44" }}>
                Rank #{stats.leaderboard_rank} · Top {cap(100 - stats.leaderboard_percentile)}%
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ══ SUBJECT PERFORMANCE + DAILY TIME ══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        {/* Subject Performance */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 280 }}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Subject Performance</h2>
          </div>
          {subjectPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectPerf} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="subject" tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" fill="#adff44" radius={[6, 6, 0, 0]} style={{ filter: "drop-shadow(0 0 6px rgba(173,255,68,0.3))" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm" style={{ color: "#8a8a8a" }}>No data yet. Take subject quizzes!</p>
              <Link to="/quiz" className="btn-soft text-xs">Go to Tests</Link>
            </div>
          )}
        </div>

        {/* Daily Study Time */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 280 }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Daily Study Time</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#8a8a8a" }}>Streak = days with 15+ minutes of real activity</p>
          {stats?.daily_progress?.some((d) => d.minutes > 0) ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={stats.daily_progress} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} tick={{ fill: "#8a8a8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis unit="m" tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}m`, "Study time"]} />
                <Bar dataKey="minutes" fill="#adff44" radius={[4, 4, 0, 0]} style={{ filter: "drop-shadow(0 0 4px rgba(173,255,68,0.25))" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm" style={{ color: "#8a8a8a" }}>No study sessions recorded yet</p>
              <Link to="/chapters" className="btn-soft text-xs">Start Studying</Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* ══ ACTIVITY BREAKDOWN ══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          { label: "PDF Reading", key: "pdf_reading", color: "#adff44", icon: BookOpen },
          { label: "Quiz Time", key: "quiz", color: "#adff44", icon: ClipboardList },
          { label: "Mock Tests", key: "mock_test", color: "#adff44", icon: Trophy },
        ].map(({ label, key, color, icon: Icon }) => (
          <div key={key} className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}>
                <Icon size={15} style={{ color }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "#bdbdbd" }}>{label}</span>
            </div>
            <p className="font-display font-black text-3xl text-white">{stats?.active_learning_time?.[key] || 0}<span className="text-base font-medium ml-1" style={{ color: "#8a8a8a" }}>min</span></p>
          </div>
        ))}
      </motion.div>

      {/* ══ LEADERBOARD ══ */}
      {leaderboard && leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl p-5 overflow-hidden"
          style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={16} style={{ color: "#ffd700" }} />
              <h2 className="font-display font-bold text-white">Leaderboard</h2>
            </div>
            <Link to="/analytics" className="flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: "#8a8a8a" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#adff44"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#8a8a8a"}>
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((row, i) => {
              const isTop3 = i < 3;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <motion.div
                  key={row.student_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: isTop3 ? "rgba(173,255,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isTop3 ? "rgba(173,255,68,0.1)" : "rgba(255,255,255,0.05)"}`,
                  }}
                >
                  <span className="w-6 text-center text-sm font-bold" style={{ color: isTop3 ? "#adff44" : "#8a8a8a" }}>
                    {isTop3 ? medals[i] : `#${row.rank}`}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-white truncate">{row.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(173,255,68,0.1)", color: "#adff44" }}>{cap(row.accuracy)}%</span>
                  <span className="text-xs" style={{ color: "#8a8a8a" }}>{row.score}pts</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}