import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Activity, BookOpen, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/client";

export default function AdminStakeholderPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/admin/stakeholder")
      .then(({ data: d }) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl skeleton" /><div className="h-72 rounded-2xl skeleton" />
      </div>
    </div>
  );

  if (!data) return <div className="p-6 text-neutral-400">No data available.</div>;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
          <p className="text-xs font-semibold text-white/60 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm" style={{ color: p.color || "#adff44" }}>
              {p.name}: <span className="font-bold">{p.value}{p.name.includes("rate") || p.name.includes("Accuracy") ? "%" : p.name === "hours" ? "h" : ""}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-3xl font-display font-black">Stakeholder Analytics</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(173,255,68,0.1)" }}>
              <Users size={20} style={{ color: "#adff44" }} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{data.total_students}</p>
          <p className="text-xs text-neutral-400 mt-1">Total Students</p>
        </div>
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
              <Activity size={20} style={{ color: "#3b82f6" }} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{data.total_attempts}</p>
          <p className="text-xs text-neutral-400 mt-1">Total Quiz Attempts</p>
        </div>
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.1)" }}>
              <Clock size={20} style={{ color: "#fbbf24" }} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{data.total_study_hours}</p>
          <p className="text-xs text-neutral-400 mt-1">Total Study Hours</p>
        </div>
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.1)" }}>
              <BarChart3 size={20} style={{ color: "#ec4899" }} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{data.chapter_completion_avg}%</p>
          <p className="text-xs text-neutral-400 mt-1">Avg Chapter Completion</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Trend */}
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#adff44" }} /> Daily Active Users (7 days)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.dau_trend}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#adff44" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#adff44" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#8a8a8a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8a8a8a", fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total_active" stroke="#adff44" fill="url(#dauGrad)" strokeWidth={2} name="Active Users" />
              <Area type="monotone" dataKey="quiz_users" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Quiz Users" />
              <Area type="monotone" dataKey="session_users" stroke="#fbbf24" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Session Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Study Hours Trend */}
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={16} style={{ color: "#fbbf24" }} /> Study Hours (7 days)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.hours_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#8a8a8a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8a8a8a", fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" fill="#adff44" radius={[6, 6, 0, 0]} name="hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion by Grade */}
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen size={16} style={{ color: "#adff44" }} /> Performance by Grade
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.completion_by_grade}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="grade" tick={{ fill: "#8a8a8a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8a8a8a", fontSize: 12 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_completion" fill="#adff44" radius={[6, 6, 0, 0]} name="Completion rate" />
              <Bar dataKey="avg_accuracy" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Avg Accuracy" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Metrics */}
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} style={{ color: "#ec4899" }} /> Subject Metrics
          </h2>
          <div className="space-y-3">
            {data.subject_metrics.map((s) => (
              <div key={s.subject} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div>
                  <p className="text-sm font-medium text-white capitalize">{s.subject}</p>
                  <p className="text-xs text-neutral-400">{s.attempts} attempts</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "#adff44" }}>{s.avg_accuracy}%</p>
                  <p className="text-xs text-neutral-400">avg accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Growth */}
      {data.student_growth?.length > 0 && (
        <div className="bg-neutral-900 rounded-2xl p-5 border border-white/10">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#adff44" }} /> Student Registrations
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.student_growth}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#adff44" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#adff44" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#8a8a8a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8a8a8a", fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="new_students" stroke="#adff44" fill="url(#growthGrad)" strokeWidth={2} name="New Students" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
