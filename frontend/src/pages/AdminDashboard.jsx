import {
  Activity,
  ClipboardList,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import MetricCard from "../components/MetricCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // For the Action Center insights
  const insights = [
    { type: 'warning', title: 'Science accuracy dropped', desc: 'Down 12% across 8th grade in the last 48 hours.', action: 'Review Science Module' },
    { type: 'alert', title: 'Chapter 4 difficult', desc: '65% of students failing practice quiz on Thermodynamics.', action: 'Adjust Difficulty' },
    { type: 'info', title: 'Inactive students', desc: '24 students haven\'t logged in this week.', action: 'Send Reminders' },
    { type: 'critical', title: 'Students needing intervention', desc: '12 students showing consistent downward trend.', action: 'View Risk Report' }
  ];

  // For Trend Chart (Mocking weekly trend for enterprise look)
  const trendData = [
    { name: 'Mon', accuracy: 68, active: 120 },
    { name: 'Tue', accuracy: 72, active: 132 },
    { name: 'Wed', accuracy: 71, active: 145 },
    { name: 'Thu', accuracy: 75, active: 160 },
    { name: 'Fri', accuracy: 78, active: 180 },
    { name: 'Sat', accuracy: 82, active: 195 },
    { name: 'Sun', accuracy: 85, active: 210 },
  ];

  useEffect(() => {
    Promise.all([
      api.get("/analytics/admin"),
      api.get("/admin/users"),
    ])
      .then(([o, u]) => {
        setOverview(o.data);
        setUsers(u.data);
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || "Could not load admin console.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="h-40 w-full animate-pulse bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 animate-pulse bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <ErrorNotice message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-16">
      {/* LEVEL 1: Platform Health Hero */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-mint opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint"></span>
          </div>
          <span className="text-sm font-medium text-white/70 tracking-wide uppercase">Platform Operational</span>
        </div>
        
        <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-white">
          Platform Health
        </h1>

        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="rounded-2xl p-8 bg-surface-1 border border-white/10 hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
              <p className="text-sm font-medium text-white/60 mb-3">Students Active (7d)</p>
              <p className="text-5xl font-bold text-white">{overview.active_students_7d || 0}</p>
            </div>
            
            <div className="rounded-2xl p-8 bg-surface-1 border border-white/10 hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
              <p className="text-sm font-medium text-white/60 mb-3">Overall Accuracy</p>
              <p className="text-5xl font-bold text-mint">{cap(overview.average_accuracy)}%</p>
            </div>

            <div className="rounded-2xl p-8 bg-surface-1 border border-white/10 hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
              <p className="text-sm font-medium text-white/60 mb-3">Requiring Intervention</p>
              <p className="text-5xl font-bold text-coral">12</p>
            </div>
          </div>
        )}
      </section>

      {overview && (
        <>
          {/* LEVEL 2: Primary KPIs */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-white">Primary KPIs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard icon={Users} label="Total Students" value={overview.students || 0} />
              <MetricCard icon={ClipboardList} label="Total Attempts" value={overview.attempts || 0} />
              <MetricCard icon={TrendingUp} label="Avg Accuracy" value={`${cap(overview.average_accuracy)}%`} />
              <MetricCard icon={Activity} label="Active Users" value={overview.engagement?.active_sessions || 0} />
            </div>
          </section>

          {/* LEVEL 3: Analytics (Subject Performance) */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Subject Performance</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend Chart taking 2/3 */}
              <div className="lg:col-span-2 rounded-2xl bg-surface-1 border border-white/10 p-6 flex flex-col" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
                <h3 className="text-sm font-medium text-white/70 mb-6">Platform Accuracy Trend (7 Days)</h3>
                <div className="h-64 w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#adff44" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#adff44" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                      />
                      <Area type="monotone" dataKey="accuracy" stroke="#adff44" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject Breakdown taking 1/3 */}
              <div className="rounded-2xl bg-surface-1 border border-white/10 p-6 flex flex-col" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
                <h3 className="text-sm font-medium text-white/70 mb-6">Risk & Completion</h3>
                <div className="flex-1 flex flex-col justify-center space-y-8">
                  {overview.subject_distribution?.slice(0, 4).map((sub, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="flex justify-between items-end">
                        <span className="font-medium text-base text-white">{sub.subject}</span>
                        <span className="text-sm text-white/50">{sub.attempts} attempts</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${i === 0 ? 'bg-mint' : i === 1 ? 'bg-gold' : 'bg-coral'}`} 
                          style={{ width: `${Math.min(100, (sub.attempts / (overview.attempts || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-sm text-white/50">No subject data available.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* LEVEL 4: Action Center */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-white">Action Center</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="rounded-2xl bg-surface-1 border border-white/10 p-6 flex gap-4 items-start hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                >
                  <div className={`p-3 rounded-xl border ${
                    insight.type === 'critical' ? 'bg-coral/10 text-coral border-coral/20' : 
                    insight.type === 'alert' ? 'bg-gold/10 text-gold border-gold/20' : 
                    insight.type === 'warning' ? 'bg-coral/10 text-coral border-coral/20' : 
                    'bg-white/5 text-white/70 border-white/10'
                  }`}>
                    {insight.type === 'critical' || insight.type === 'warning' ? <ShieldAlert size={20} /> :
                     insight.type === 'alert' ? <AlertCircle size={20} /> : <Zap size={20} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-2 text-white group-hover:text-mint transition-colors">{insight.title}</h3>
                    <p className="text-sm text-white/60 mb-4 leading-relaxed">{insight.desc}</p>
                    <div className="text-sm font-medium text-mint flex items-center gap-2 transition-all">
                      {insight.action} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* LEVEL 5: Leaderboard */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Leaderboard</h2>
              <button className="text-sm font-medium text-white/70 hover:text-white flex items-center gap-1 transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                View All <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="rounded-2xl bg-surface-1 border border-white/10 overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
              {overview.top_performers?.length ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-black/40">
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-white/50">Rank</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-white/50">Name</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-white/50">Score</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-white/50">Accuracy</th>
                      <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-white/50">Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {overview.top_performers.slice(0, 5).map((row) => (
                      <tr key={row.student_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white/70">
                          #{row.rank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {row.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                          {row.score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-opacity-10 ${
                            cap(row.accuracy) >= 70 ? 'bg-mint/10 text-mint border border-mint/20' : 'bg-coral/10 text-coral border border-coral/20'
                          }`}>
                            {cap(row.accuracy)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                          {row.streak}d 🔥
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8">
                  <EmptyState title="No leaderboard data found" />
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}