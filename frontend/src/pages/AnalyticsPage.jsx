import {
  AlertCircle, AlertTriangle, BarChart3, BookOpen, CheckCircle2,
  ClipboardList, Clock, Flame, Target, TrendingDown, TrendingUp, Trophy
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import api from "../api/client";
import EmptyState from "../components/EmptyState.jsx";
import StatCard from "../components/StatCard.jsx";
import ProgressRing from "../components/ProgressRing.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(17,17,17,0.98)",
        border: "1px solid rgba(173,255,68,0.2)",
        borderRadius: 10,
        padding: "10px 14px",
        backdropFilter: "blur(20px)",
      }}>
        <p style={{ color: "#adff44", fontWeight: 700, fontSize: 11 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
            {p.value}{typeof p.value === "number" && p.value <= 100 ? "%" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/analytics/student")
      .then((r) => setStats(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load analytics."));
  }, []);

  if (error) return (
    <div className="rounded-2xl p-6" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)" }}>
      <div className="flex gap-3">
        <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
        <p className="text-sm text-white">{error}</p>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-2xl skeleton" />)}
    </div>
  );

  const weakTopics = stats.weak_topics || [];
  const strongTopics = stats.strong_topics || [];
  const topicMastery = stats.topic_mastery || [];
  const mockSummary = stats.mock_test_summary || [];
  const subjectPerf = stats.subject_performance || [];
  const dailyProgress = stats.daily_progress || [];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-black text-2xl text-white mb-1">Analytics</h1>
        <p className="text-sm" style={{ color: "#8a8a8a" }}>Track your performance, identify weak areas, and improve faster</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-4"
      >
        <StatCard icon={Target} label="Overall Accuracy" value={cap(stats.accuracy)} suffix="%" glow />
        <StatCard icon={BookOpen} label="Quizzes Taken" value={stats.quizzes_taken} />
        <StatCard icon={Flame} label="Current Streak" value={stats.streak_days} suffix="d" accentColor="#ff6b6b" />
        <StatCard icon={Clock} label="Total Study Time" value={stats.study_minutes} suffix="m" />
      </motion.div>

      {/* Weakness & Strength + Radar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        <div className="rounded-2xl p-5 space-y-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Weaknesses */}
          <div>
            <h3 className="flex items-center gap-2 font-display font-bold mb-3" style={{ color: "#ff6b6b" }}>
              <TrendingDown size={16} /> Focus Areas
            </h3>
            <div className="space-y-3">
              {weakTopics.length > 0 ? weakTopics.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{t.topic}</span>
                    <span className="font-bold" style={{ color: "#ff6b6b" }}>{cap(t.accuracy)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cap(t.accuracy)}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: "#ff6b6b", boxShadow: "0 0 8px rgba(255,107,107,0.4)" }}
                    />
                  </div>
                </div>
              )) : <EmptyState title="No weak areas yet — keep practicing!" />}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h3 className="flex items-center gap-2 font-display font-bold mb-3" style={{ color: "#adff44" }}>
              <TrendingUp size={16} /> Strongest Topics
            </h3>
            <div className="space-y-3">
              {strongTopics.length > 0 ? strongTopics.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{t.topic}</span>
                    <span className="font-bold" style={{ color: "#adff44" }}>{cap(t.accuracy)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cap(t.accuracy)}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: "#adff44", boxShadow: "0 0 8px rgba(173,255,68,0.4)" }}
                    />
                  </div>
                </div>
              )) : <EmptyState title="No strong areas identified yet." />}
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 380 }}>
          <h2 className="font-display font-bold text-white mb-4">Topic Mastery Radar</h2>
          {topicMastery.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={topicMastery} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: "#8a8a8a", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Mastery" dataKey="mastery" stroke="#adff44" strokeWidth={2} fill="#adff44" fillOpacity={0.2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Take topic quizzes to see your mastery radar." />}
        </div>
      </motion.div>

      {/* Score Trend + Mock Tests */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"
      >
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 300 }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Score Trend</h2>
          </div>
          {stats.trend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#adff44" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#adff44" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#8a8a8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#8a8a8a", fontSize: 10 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area dataKey="accuracy" stroke="#adff44" strokeWidth={2.5} fill="url(#neonGrad)" dot={{ r: 3, fill: "#adff44", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#adff44", filter: "drop-shadow(0 0 6px rgba(173,255,68,0.8))" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Take a quiz to see your score trend." />}
        </div>

        <div className="rounded-2xl p-5 overflow-hidden" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 300 }}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Recent Tests</h2>
          </div>
          {mockSummary.length > 0 ? (
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 240 }}>
              {mockSummary.map((mock, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white text-xs truncate">{mock.quiz}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#8a8a8a" }}>{Math.floor(mock.time_taken_seconds / 60)} min</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold" style={{ color: "#adff44" }}>{cap(mock.accuracy)}%</p>
                    <p className="text-[10px]" style={{ color: "#8a8a8a" }}>{mock.score}pts</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : <EmptyState title="No mock tests taken recently." />}
        </div>
      </motion.div>

      {/* Subject Performance + Daily Time */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 260 }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Subject Performance</h2>
          </div>
          {subjectPerf.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={subjectPerf} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="subject" tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fill: "#8a8a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" fill="#adff44" radius={[6, 6, 0, 0]} style={{ filter: "drop-shadow(0 0 6px rgba(173,255,68,0.3))" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Complete quizzes to see subject performance." />}
        </div>

        <div className="rounded-2xl p-5" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)", minHeight: 260 }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} style={{ color: "#adff44" }} />
            <h2 className="font-display font-bold text-white">Daily Study Time</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#8a8a8a" }}>14-day view</p>
          {dailyProgress.some((d) => d.minutes > 0) ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={dailyProgress} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} tick={{ fill: "#8a8a8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis unit="m" tick={{ fill: "#8a8a8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}m`, "Study time"]} />
                <Bar dataKey="minutes" fill="#adff44" radius={[3, 3, 0, 0]} style={{ filter: "drop-shadow(0 0 4px rgba(173,255,68,0.25))" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Start studying to track daily time." />}
        </div>
      </motion.div>

      {/* Leaderboard Position */}
      {stats.leaderboard_rank && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5"
          style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.12)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy size={24} style={{ color: "#ffd700" }} />
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#8a8a8a" }}>Leaderboard Position</p>
                <p className="font-display font-black text-3xl text-white">#{stats.leaderboard_rank}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs mb-0.5" style={{ color: "#8a8a8a" }}>Percentile</p>
              <p className="font-display font-black text-3xl" style={{ color: "#adff44" }}>{cap(stats.leaderboard_percentile)}%</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
