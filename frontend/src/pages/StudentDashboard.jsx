import { Award, BookOpen, Clock, Target, Flame, Calendar, Brain, ClipboardList, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import MetricCard from "../components/MetricCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      console.warn("[StudentDashboard] User not loaded from context yet");
      return;
    }
    
    console.log("[StudentDashboard] Fetching analytics...", { userId: user.id });
    setLoading(true);
    
    Promise.all([
      api.get("/analytics/student"),
      api.get("/leaderboard")
    ])
      .then(([statsResponse, leaderboardResponse]) => {
        console.log("[StudentDashboard] Data loaded successfully", {
          statsKeys: Object.keys(statsResponse.data),
          leaderboardLength: leaderboardResponse.data.length,
        });
        setStats(statsResponse.data);
        setLeaderboard(leaderboardResponse.data);
        setError("");
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.detail || err.message || "Could not load dashboard";
        console.error("[StudentDashboard] Failed to load data", { error: errorMsg, fullError: err });
        setError(errorMsg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);
  
  if (!user) {
    return <ErrorNotice message="User not authenticated" />;
  }
  
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorNotice message={error} />
        <div className="card border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <div className="flex gap-3">
            <AlertCircle className="mt-1 flex-shrink-0 text-yellow-600 dark:text-yellow-400" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">Debug Info:</p>
              <p className="mt-1 font-mono text-yellow-700 dark:text-yellow-200">{error}</p>
              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                API URL: {api.defaults.baseURL}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="card h-24 animate-pulse bg-black/5 dark:bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card h-32 animate-pulse bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Welcome + quick actions */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-black/55 dark:text-white/55">Welcome back 👋</p>
          <h1 className="text-2xl font-black">{user.full_name}</h1>
          {stats.streak_days > 0 && (
            <p className="mt-1 text-sm text-mint font-semibold">🔥 {stats.streak_days}-day streak · Keep going!</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/chapters" className="btn-primary flex items-center gap-1.5 text-sm">
            <BookOpen size={15} /> Study Modules
          </Link>
          <Link to="/quiz" className="btn-soft flex items-center gap-1.5 text-sm">
            <ClipboardList size={15} /> Take a Test
          </Link>
          <Link to="/doubts" className="btn-soft flex items-center gap-1.5 text-sm">
            <Brain size={15} /> Ask AI
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={Target} label="Accuracy" value={`${cap(stats.accuracy)}%`} />
        <MetricCard icon={BookOpen} label="Quizzes" value={stats.quizzes_taken} accent="bg-coral" />
        <MetricCard icon={Clock} label="Study time" value={`${stats.study_minutes}m`} accent="bg-gold" />
        <MetricCard icon={Flame} label="Current Streak" value={`${stats.streak_days}d`} accent="bg-coral" />
        <MetricCard icon={Award} label="Longest Streak" value={`${stats.longest_streak}d`} accent="bg-ink" />
        <MetricCard icon={Calendar} label="7d Consistency (15m+)" value={`${stats.weekly_consistency}/7`} accent="bg-mint" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <div className="card h-80">
          <h2 className="font-bold">Score trends</h2>
          {stats.trend && stats.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="88%">
              <AreaChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area dataKey="accuracy" stroke="#4fb286" fill="#4fb28633" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Take a quiz to start your trend." />
          )}
        </div>
        <div className="card">
          <h2 className="font-bold">Study plan</h2>
          <div className="mt-4 space-y-3">
            {(stats.study_plan && stats.study_plan.length > 0
              ? stats.study_plan
              : stats.recommendations || []
            ).map((item, idx) => (
              <p key={idx} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                {item}
              </p>
            ))}
          </div>
          {stats.leaderboard_rank && (
            <p className="mt-4 text-sm text-mint">
              Leaderboard rank #{stats.leaderboard_rank} · {cap(stats.leaderboard_percentile)} percentile
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-72">
          <h2 className="font-bold">Subject performance</h2>
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
        <div className="card h-72">
          <h2 className="font-bold">Daily study time (tracked sessions)</h2>
          <p className="text-xs text-black/50 dark:text-white/50">Streak counts days with 15+ minutes of real activity.</p>
          {stats.daily_progress && stats.daily_progress.length > 0 ? (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={stats.daily_progress}>
                <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} />
                <YAxis unit="m" />
                <Tooltip formatter={(v, name) => [name === "minutes" ? `${v} min` : v, name === "minutes" ? "Study time" : name]} />
                <Bar dataKey="minutes" fill="#4fb286" name="minutes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No study sessions recorded yet." />
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-72">
          <h2 className="font-bold">Subject Time Distribution (minutes)</h2>
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
          <h2 className="font-bold">Active Learning Time by Activity (minutes)</h2>
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
      <div className="card overflow-auto">
        <h2 className="font-bold">Leaderboard</h2>
        {leaderboard && leaderboard.length > 0 ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-black/50">
                <th className="py-2">Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Time</th>
                <th>Percentile</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.student_id} className="border-t border-black/10 dark:border-white/10">
                  <td className="py-2">#{row.rank}</td>
                  <td>{row.name}</td>
                  <td>{row.score}</td>
                  <td>{cap(row.accuracy)}%</td>
                  <td>{row.time_taken_seconds}s</td>
                  <td>{cap(row.percentile)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No leaderboard data available." />
        )}
      </div>
    </div>
  );
}
  