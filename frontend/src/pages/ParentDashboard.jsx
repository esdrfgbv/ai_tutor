import { Award, BookOpen, Calendar, CheckCircle2, Clock, Compass, Flame, Target, TrendingDown, TrendingUp, Video, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/client";
import EmptyState from "../components/EmptyState.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import MetricCard from "../components/MetricCard.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [identifier, setIdentifier] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadChildren = () => {
    return api.get("/parents/children").then((r) => {
      setChildren(r.data);
      const approved = r.data.find((c) => c.status === "approved");
      if (approved) loadStats(approved);
    });
  };

  useEffect(() => {
    loadChildren()
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || "Could not load linked children.");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadStats = (child) => {
    api.get(`/analytics/student/${child.student_id}`)
      .then((r) => {
        setStats({ child, ...r.data });
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || "Could not load child analytics.");
      });
  };

  const link = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/parents/links", { student_identifier: identifier });
      setChildren((items) => items.some((item) => item.link_id === data.link_id) ? items : [...items, data]);
      setIdentifier("");
      if (data.status === "approved") {
        loadStats({ student_id: data.student_id, student_name: data.student_name, status: data.status });
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Could not link child account.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-24 animate-pulse bg-black/5 dark:bg-white/5" />
        <div className="card h-40 animate-pulse bg-black/5 dark:bg-white/5" />
      </div>
    );
  }

  const studyPlan = stats?.study_plan?.length > 0 ? stats.study_plan : stats?.recommendations || [];

  return (
    <div className="space-y-6">
      {/* Link Child Form */}
      <div className="card">
        <h2 className="text-xl font-bold">Child Monitoring</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">Select or link your child to view their progress.</p>
        {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
        <form onSubmit={link} className="mt-4 flex flex-wrap gap-2">
          <input 
            className="input min-w-64" 
            placeholder="Student email or ID" 
            value={identifier} 
            onChange={(e) => setIdentifier(e.target.value)} 
            required 
          />
          <button className="btn-primary">Link child</button>
        </form>
        {children && children.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {children.map((child) => (
              <button 
                key={child.link_id} 
                onClick={() => child.status === "approved" && loadStats(child)} 
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  stats?.child?.student_id === child.student_id 
                    ? "border-mint bg-mint/10 font-bold" 
                    : "border-black/10 dark:border-white/10 hover:border-mint/50"
                }`}
              >
                {child.student_name} · {child.status}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-black/60">No linked children yet.</p>
        )}
      </div>

      {stats ? (
        <>
          {/* Guided Learning Visibility */}
          <div className="card border-2 border-mint/20 bg-mint/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="text-mint" size={24} />
                <h2 className="text-lg font-bold">{stats.child.student_name}'s Active Learning Path</h2>
              </div>
              {stats.leaderboard_rank && (
                <div className="flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
                  <Trophy size={16} /> Rank #{stats.leaderboard_rank}
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Ensure {stats.child.student_name} focuses on these suggested items today.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {studyPlan.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-black/20">
                  <CheckCircle2 className="mt-0.5 flex-shrink-0 text-black/20 dark:text-white/20" size={18} />
                  <p className="text-sm font-medium">{item}</p>
                </div>
              ))}
              {studyPlan.length === 0 && (
                <p className="text-sm text-black/50">Your child is all caught up!</p>
              )}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard icon={Target} label="Accuracy" value={`${cap(stats.accuracy)}%`} />
            <MetricCard icon={BookOpen} label="Quizzes" value={stats.quizzes_taken} accent="bg-coral" />
            <MetricCard icon={Clock} label="Study time" value={`${stats.study_minutes}m`} accent="bg-gold" />
            <MetricCard icon={Flame} label="Current Streak" value={`${stats.streak_days}d`} accent="bg-coral" />
            <MetricCard icon={Award} label="Longest Streak" value={`${stats.longest_streak}d`} accent="bg-ink" />
            <MetricCard icon={Calendar} label="7d Consistency" value={`${stats.weekly_consistency}/7`} accent="bg-mint" />
          </div>

          {/* Weakness & Strength + Topic Mastery */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card space-y-6">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-coral"><TrendingDown size={18} /> Areas Needing Attention</h3>
                <div className="mt-3 space-y-3">
                  {stats.weak_topics?.length > 0 ? stats.weak_topics.map((t, i) => (
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
                <h3 className="flex items-center gap-2 font-bold text-mint"><TrendingUp size={18} /> Strong Areas</h3>
                <div className="mt-3 space-y-3">
                  {stats.strong_topics?.length > 0 ? stats.strong_topics.map((t, i) => (
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
              <h2 className="font-bold">Detailed Topic Mastery</h2>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">Granular view of syllabus coverage and understanding.</p>
              {stats.topic_mastery?.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <RadarChart data={stats.topic_mastery} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Mastery" dataKey="mastery" stroke="#4fb286" fill="#4fb286" fillOpacity={0.5} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Not enough data to map topic mastery." />
              )}
            </div>
          </div>

          {/* Mocks and Sessions */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-bold">Mock Test Readiness</h2>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">Recent full-length test results.</p>
              {stats.mock_test_summary?.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {stats.mock_test_summary.map((mock, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 p-4 dark:border-white/5">
                      <div>
                        <p className="font-medium">{mock.quiz}</p>
                        <p className="text-xs text-black/50 dark:text-white/50">{Math.floor(mock.time_taken_seconds / 60)} mins taken</p>
                      </div>
                      <div className="text-right">
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
            
            <div className="card border-2 border-gold/20 bg-gold/5">
              <h2 className="flex items-center gap-2 font-bold"><Video size={18} className="text-gold" /> Child's Live Sessions</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-black/20">
                  <div>
                    <p className="font-medium">Math Doubt Clearing</p>
                    <p className="text-sm text-black/60 dark:text-white/60">Today, 5:00 PM</p>
                  </div>
                  <span className="text-xs font-semibold text-mint">Scheduled</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-black/20">
                  <div>
                    <p className="font-medium">Science Mock Review</p>
                    <p className="text-sm text-black/60 dark:text-white/60">Tomorrow, 4:00 PM</p>
                  </div>
                  <span className="text-xs font-semibold text-mint">Scheduled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Trends */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card h-72">
              <h3 className="font-bold">Overall Performance Trend</h3>
              {stats.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#4fb286" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No trend data available." />
              )}
            </div>
            <div className="card h-72">
              <h3 className="font-bold">Subject Performance</h3>
              {stats.subject_performance?.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={stats.subject_performance}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="accuracy" fill="#f9735b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No subject performance data yet." />
              )}
            </div>
          </div>

          <div className="card h-72">
            <h3 className="font-bold">Daily Study Time (Active Minutes)</h3>
            <p className="text-xs text-black/50 dark:text-white/50">Verified time spent in modules, quizzes, or mock tests.</p>
            {stats.daily_progress?.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={stats.daily_progress}>
                  <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} />
                  <YAxis unit="m" />
                  <Tooltip formatter={(v) => [`${v} min`, "Study time"]} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="minutes" fill="#4fb286" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No tracked study sessions yet." />
            )}
          </div>
        </>
      ) : (
        <EmptyState title="Link and select an approved child to view live performance." />
      )}
    </div>
  );
}