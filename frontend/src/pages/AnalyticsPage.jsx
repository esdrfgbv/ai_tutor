import { BarChart3, Target, BookOpen, Flame, Clock, Trophy, TrendingUp, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
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

function StatBar({ label, value, max = 100, color = "bg-mint" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="truncate pr-2 text-black/70 dark:text-white/70">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
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

      {/* Score Trend */}
      <div className="card h-72">
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

      {/* Subject Performance */}
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

        {/* Daily Study Time */}
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

      {/* Weak & Strong Topics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <SectionTitle icon={AlertTriangle}>Weak Topics (Need Revision)</SectionTitle>
          {weakTopics.length ? (
            <div className="space-y-3">
              {weakTopics.map((t) => (
                <StatBar
                  key={t.topic}
                  label={t.topic}
                  value={cap(t.accuracy)}
                  color="bg-coral"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No weak topics identified yet. Keep quizzing!</p>
          )}
        </div>

        <div className="card">
          <SectionTitle icon={CheckCircle2}>Strong Topics (Well Mastered)</SectionTitle>
          {strongTopics.length ? (
            <div className="space-y-3">
              {strongTopics.map((t) => (
                <StatBar
                  key={t.topic}
                  label={t.topic}
                  value={cap(t.accuracy)}
                  color="bg-mint"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No strong topics yet. Take more quizzes to identify strengths.</p>
          )}
        </div>
      </div>

      {/* Topic Mastery Table */}
      {topicMastery.length > 0 && (
        <div className="card overflow-auto">
          <SectionTitle icon={Trophy}>Topic-Wise Mastery</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-black/50 dark:text-white/40">
                <th className="pb-3">Topic</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3">Attempts</th>
                <th className="pb-3">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {topicMastery.map((t) => (
                <tr key={t.topic} className="border-t border-black/8 dark:border-white/8">
                  <td className="py-2 pr-4">{t.topic}</td>
                  <td className="py-2">
                    <span className={`font-semibold ${cap(t.accuracy) >= 80 ? "text-mint" : cap(t.accuracy) >= 60 ? "text-gold" : "text-coral"}`}>
                      {cap(t.accuracy)}%
                    </span>
                  </td>
                  <td className="py-2 text-black/60 dark:text-white/50">{t.attempts}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-mint"
                          style={{ width: `${cap(t.mastery)}%` }}
                        />
                      </div>
                      <span className="text-xs text-black/50">{cap(t.mastery)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mock Test History */}
      {mockSummary.length > 0 && (
        <div className="card overflow-auto">
          <SectionTitle icon={ClipboardList}>Mock Test Performance</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-black/50 dark:text-white/40">
                <th className="pb-3">Test</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {mockSummary.map((m, i) => (
                <tr key={i} className="border-t border-black/8 dark:border-white/8">
                  <td className="py-2 pr-4 max-w-[200px] truncate">{m.quiz}</td>
                  <td className="py-2 font-semibold">{m.score}</td>
                  <td className="py-2">
                    <span className={cap(m.accuracy) >= 70 ? "text-mint font-semibold" : "text-coral font-semibold"}>
                      {cap(m.accuracy)}%
                    </span>
                  </td>
                  <td className="py-2 text-black/60 dark:text-white/50">
                    {m.time_taken_seconds < 60
                      ? `${m.time_taken_seconds}s`
                      : `${Math.floor(m.time_taken_seconds / 60)}m ${m.time_taken_seconds % 60}s`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Study Plan */}
      <div className="card">
        <SectionTitle icon={BookOpen}>Personalised Study Plan</SectionTitle>
        <div className="space-y-2">
          {(stats.study_plan?.length ? stats.study_plan : stats.recommendations || []).map((item, i) => (
            <div key={i} className="flex gap-3 rounded-lg bg-black/4 p-3 dark:bg-white/5">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-mint text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm">{item}</p>
            </div>
          ))}
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
