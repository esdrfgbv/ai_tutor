import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";import api from "../api/client";
import EmptyState from "../components/EmptyState.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { Award, BookOpen, Clock, Target, Flame, Calendar } from "lucide-react";

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [identifier, setIdentifier] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadChildren = () => {
    console.log("[ParentDashboard] Loading children...");
    return api.get("/parents/children").then((r) => {
      console.log("[ParentDashboard] Children loaded:", r.data);
      setChildren(r.data);
      const approved = r.data.find((c) => c.status === "approved");
      if (approved) loadStats(approved);
    }).catch(err => {
      console.error("[ParentDashboard] Failed to load children:", err);
      throw err;
    });
  };

  useEffect(() => {
    loadChildren()
      .catch((err) => {
        const errorMsg = err.response?.data?.detail || err.message || "Could not load linked children.";
        console.error("[ParentDashboard] Error:", errorMsg);
        setError(errorMsg);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadStats = (child) => {
    console.log("[ParentDashboard] Loading stats for child:", child.student_id);
    api.get(`/analytics/student/${child.student_id}`)
      .then((r) => {
        console.log("[ParentDashboard] Stats loaded successfully");
        setStats({ child, ...r.data });
        setError("");
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.detail || err.message || "Could not load child analytics.";
        console.error("[ParentDashboard] Failed to load stats:", errorMsg);
        setError(errorMsg);
      });
  };

  const link = async (event) => {
    event.preventDefault();
    setError("");
    console.log("[ParentDashboard] Linking child with identifier:", identifier);
    try {
      const { data } = await api.post("/parents/links", { student_identifier: identifier });
      console.log("[ParentDashboard] Child linked successfully:", data);
      setChildren((items) => items.some((item) => item.link_id === data.link_id) ? items : [...items, data]);
      setIdentifier("");
      if (data.status === "approved") {
        loadStats({ student_id: data.student_id, student_name: data.student_name, status: data.status });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Could not link child account.";
      console.error("[ParentDashboard] Link failed:", errorMsg);
      setError(errorMsg);
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

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold">Child Monitoring</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">Link your child with their student email or student ID.</p>
        {error && (
          <div className="mt-4">
            <ErrorNotice message={error} />
          </div>
        )}
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
                    ? "border-mint bg-mint/10" 
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
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard icon={Target} label="Accuracy" value={`${Math.min(100, stats.accuracy)}%`} />
            <MetricCard icon={BookOpen} label="Quizzes" value={stats.quizzes_taken} accent="bg-coral" />
            <MetricCard icon={Clock} label="Study time" value={`${stats.study_minutes}m`} accent="bg-gold" />
            <MetricCard icon={Flame} label="Current Streak" value={`${stats.streak_days}d`} accent="bg-coral" />
            <MetricCard icon={Award} label="Longest Streak" value={`${stats.longest_streak}d`} accent="bg-ink" />
            <MetricCard icon={Calendar} label="7d Consistency (15m+)" value={`${stats.weekly_consistency}/7`} accent="bg-mint" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card h-72">
              <h3 className="font-bold">{stats.child?.student_name || "Student"} - Performance trend</h3>
              {stats.trend && stats.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={stats.trend}>
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line dataKey="accuracy" stroke="#4fb286" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No trend data available." />
              )}
            </div>
            <div className="card h-72">
              <h3 className="font-bold">Subject performance</h3>
              {stats.subject_performance && stats.subject_performance.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={stats.subject_performance}>
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#f9735b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No subject performance data yet." />
              )}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card h-72">
              <h3 className="font-bold">Subject Time Distribution (minutes)</h3>
              {stats.subject_time_distribution && stats.subject_time_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={stats.subject_time_distribution}>
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="minutes" fill="#f4b942" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No study time recorded yet." />
              )}
            </div>
            <div className="card h-72">
              <h3 className="font-bold">Active Learning Time by Activity (minutes)</h3>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
                  <p className="text-xs text-black/55 dark:text-white/60">PDF Reading</p>
                  <p className="mt-2 text-2xl font-bold text-mint">{stats.active_learning_time?.pdf_reading || 0}m</p>
                </div>
                <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
                  <p className="text-xs text-black/55 dark:text-white/60">Quizzes</p>
                  <p className="mt-2 text-2xl font-bold text-coral">{stats.active_learning_time?.quiz || 0}m</p>
                </div>
                <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
                  <p className="text-xs text-black/55 dark:text-white/60">Mock Tests</p>
                  <p className="mt-2 text-2xl font-bold text-gold">{stats.active_learning_time?.mock_test || 0}m</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card h-72">
            <h3 className="font-bold">{stats.child?.student_name || "Student"} - Daily study time</h3>
            <p className="text-xs text-black/50 dark:text-white/50">From live PDF, quiz, and mock-test sessions (not estimates).</p>
            {stats.daily_progress && stats.daily_progress.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={stats.daily_progress}>
                  <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} />
                  <YAxis unit="m" />
                  <Tooltip formatter={(v) => [`${v} min`, "Study time"]} />
                  <Bar dataKey="minutes" fill="#4fb286" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No tracked study sessions yet." />
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="font-bold">Strengths</h3>
              {stats.strong_topics && stats.strong_topics.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {stats.strong_topics.map((t) => (
                    <p key={t.topic} className="text-sm">
                      {t.topic} - {Math.min(100, t.accuracy)}%
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyState title="No strong topics yet." />
              )}
            </div>
            <div className="card">
              <h3 className="font-bold">Weak areas</h3>
              {stats.weak_topics && stats.weak_topics.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {stats.weak_topics.map((t) => (
                    <p key={t.topic} className="text-sm">
                      {t.topic} - {Math.min(100, t.accuracy)}%
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyState title="No weak areas identified yet." />
              )}
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold">Study plan</h3>
            {stats.study_plan && stats.study_plan.length > 0 ? (
              <div className="mt-3 space-y-2">
                {stats.study_plan.map((item, idx) => (
                  <p key={idx} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                    {item}
                  </p>
                ))}
              </div>
            ) : stats.recommendations && stats.recommendations.length > 0 ? (
              <div className="mt-3 space-y-2">
                {stats.recommendations.map((item, idx) => (
                  <p key={idx} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <EmptyState title="No study plan available yet." />
            )}
          </div>
        </>
      ) : (
        <EmptyState title="Link and select an approved child to view live performance." />
      )}
    </div>
  );
}

  