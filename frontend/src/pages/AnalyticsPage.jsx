import { AlertCircle, AlertTriangle, BarChart3, BookOpen, CheckCircle2, ClipboardList, Clock, Flame, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import EmptyState from "../components/EmptyState.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

const COLORS = ["#4fb286", "#f9735b", "#f4b942", "#6366f1", "#ec4899", "#14b8a6"];

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-mint" />
      <h2 className="font-bold text-lg">{children}</h2>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/analytics/student")
      .then((r) => setStats(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load analytics."));
  }, []);

  if (error) return <ErrorNotice message={error} />;
  if (!stats) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse h-48" />
      ))}
    </div>
  );

  const weakTopics = stats.weak_topics || [];
  const strongTopics = stats.strong_topics || [];
  const topicMastery = stats.topic_mastery || [];
  const mockSummary = stats.mock_test_summary || [];
  const subjectPerf = stats.subject_performance || [];
  const dailyProgress = stats.daily_progress || [];

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="card text-center">
          <Target size={22} className="mx-auto text-mint" />
          <p className="mt-2 text-2xl font-black">{cap(stats.accuracy)}%</p>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">Overall Accuracy</p>
        </div>
        <div className="card text-center">
          <BookOpen size={22} className="mx-auto text-coral" />
          <p className="mt-2 text-2xl font-black">{stats.quizzes_taken}</p>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">Quizzes Taken</p>
        </div>
        <div className="card text-center">
          <Flame size={22} className="mx-auto text-gold" />
          <p className="mt-2 text-2xl font-black">{stats.streak_days}d</p>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">Current Streak</p>
        </div>
        <div className="card text-center">
          <Clock size={22} className="mx-auto text-purple-500" />
          <p className="mt-2 text-2xl font-black">{stats.study_minutes}m</p>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">Study Time</p>
        </div>
      </div>

      {/* Weakness & Strength + Topic Mastery */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-6">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-coral"><TrendingDown size={18} /> Focus Areas (Weaknesses)</h3>
            <div className="mt-3 space-y-3">
              {weakTopics.length > 0 ? weakTopics.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <span>{t.topic}</span>
                    <span className="font-mono text-coral">{cap(t.accuracy)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                    <div className="h-full bg-coral" style={{ width: `${cap(t.accuracy)}%` }} />
                  </div>
                </div>
              )) : <EmptyState title="No weak areas identified yet!" />}
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-bold text-mint"><TrendingUp size={18} /> Strongest Topics</h3>
            <div className="mt-3 space-y-3">
              {strongTopics.length > 0 ? strongTopics.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <span>{t.topic}</span>
                    <span className="font-mono text-mint">{cap(t.accuracy)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                    <div className="h-full bg-mint" style={{ width: `${cap(t.accuracy)}%` }} />
                  </div>
                </div>
              )) : <EmptyState title="No strong areas identified yet." />}
            </div>
          </div>
        </div>

        <div className="card h-[400px]">
          <h2 className="font-bold mb-4">Topic Mastery Analysis</h2>
          {topicMastery.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <RadarChart data={topicMastery} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid strokeOpacity={0.2} />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: 'currentColor' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Mastery" dataKey="mastery" stroke="#4fb286" fill="#4fb286" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Take topic quizzes to see your mastery radar." />
          )}
        </div>
      </div>

      {/* Mock Tests + Score Trend */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="card h-80">
          <SectionTitle icon={TrendingUp}>Score Trend (Last 12 Attempts)</SectionTitle>
          {stats.trend?.length ? (
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4fb286" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4fb286" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, "Accuracy"]} />
                <Area dataKey="accuracy" stroke="#4fb286" strokeWidth={2} fill="url(#trendGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Take a quiz to see your score trend." />
          )}
        </div>
        
        <div className="card h-80 overflow-auto">
          <SectionTitle icon={ClipboardList}>Recent Mock Tests</SectionTitle>
          {mockSummary.length > 0 ? (
            <div className="space-y-3">
              {mockSummary.map((mock, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 p-4 dark:border-white/5">
                  <div>
                    <p className="font-medium truncate max-w-[150px] sm:max-w-xs">{mock.quiz}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">{Math.floor(mock.time_taken_seconds / 60)} mins taken</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gold">{mock.score} pts</p>
                    <p className="text-sm font-medium">{cap(mock.accuracy)}% Accuracy</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No mock tests taken recently." />
          )}
        </div>
      </div>

      {/* Subject Performance & Daily Time */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-64">
          <SectionTitle icon={BarChart3}>Subject Performance</SectionTitle>
          {subjectPerf.length ? (
            <ResponsiveContainer width="100%" height="78%">
              <BarChart data={subjectPerf} barSize={32}>
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, "Accuracy"]} />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {subjectPerf.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Complete quizzes to see subject performance." />
          )}
        </div>

        <div className="card h-64">
          <SectionTitle icon={Clock}>Daily Study Time (14 Days)</SectionTitle>
          {dailyProgress.some((d) => d.minutes > 0) ? (
            <ResponsiveContainer width="100%" height="78%">
              <BarChart data={dailyProgress} barSize={16}>
                <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} tick={{ fontSize: 10 }} />
                <YAxis unit="m" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} min`, "Study time"]} labelFormatter={(d) => d} />
                <Bar dataKey="minutes" fill="#4fb286" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Start studying to track daily time." />
          )}
        </div>
      </div>

      {/* Leaderboard position */}
      {stats.leaderboard_rank && (
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-black/55 dark:text-white/55">Your leaderboard position</p>
            <p className="mt-1 text-2xl font-black">#{stats.leaderboard_rank}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-black/55 dark:text-white/55">Percentile</p>
            <p className="mt-1 text-2xl font-black text-mint">{cap(stats.leaderboard_percentile)}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
