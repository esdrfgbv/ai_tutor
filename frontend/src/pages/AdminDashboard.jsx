import {
  Activity, ClipboardList, Users, TrendingUp,
  AlertCircle, ArrowRight, ChevronRight, ShieldAlert,
  Zap, BookOpen, Flame, Target, Brain, CheckCircle2
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import EmptyState from "../components/EmptyState.jsx";

// ─── utilities ────────────────────────────────────────────────────────────────
const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ to, suffix = "", duration = 1.4 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const target = Number(to) || 0;
    if (target === 0) { setCount(0); return; }
    let current = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [to, inView, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Framer Motion variants ────────────────────────────────────────────────────
const page = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Premium card wrapper ──────────────────────────────────────────────────────
function Card({ children, className = "", style = {}, onClick }) {
  return (
    <motion.div
      variants={item}
      whileHover={{
        y: -5,
        boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(173,255,68,0.14)",
        transition: { duration: 0.22, ease: "easeOut" },
      }}
      onClick={onClick}
      className={`rounded-2xl border border-white/[0.065] ${className}`}
      style={{
        background: "linear-gradient(150deg, #101010 0%, #0a0a0a 100%)",
        boxShadow: "0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Custom chart tooltip ──────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#111", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 10, padding: "10px 14px",
    }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 5 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#adff44", fontWeight: 600, fontSize: 14 }}>
          {p.value}{p.name === "accuracy" ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

// ─── Rank medal ───────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  if (medals[rank]) return <span className="text-xl">{medals[rank]}</span>;
  return <span className="text-sm font-semibold text-white/35">#{rank}</span>;
}

// ─── Insight config ───────────────────────────────────────────────────────────
const INSIGHT = {
  critical: { Icon: ShieldAlert, bg: "rgba(255,107,107,0.08)", border: "rgba(255,107,107,0.22)", text: "#ff6b6b", tag: "Critical" },
  warning:  { Icon: AlertCircle, bg: "rgba(255,215,0,0.08)",   border: "rgba(255,215,0,0.22)",   text: "#ffd700", tag: "Warning"  },
  alert:    { Icon: Zap,         bg: "rgba(255,215,0,0.08)",   border: "rgba(255,215,0,0.22)",   text: "#ffd700", tag: "Alert"    },
  info:     { Icon: Brain,       bg: "rgba(173,255,68,0.06)",  border: "rgba(173,255,68,0.18)",  text: "#adff44", tag: "Insight"  },
};

// ─── Skeleton pulse ───────────────────────────────────────────────────────────
function Skel({ className }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "linear-gradient(90deg,#0f0f0f 25%,#161616 50%,#0f0f0f 75%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.6s infinite linear",
      }}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers]       = useState([]);
  const [links, setLinks]       = useState([]);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);

  // ── AI insights (static display, no backend) ──────────────────────────────
  const insights = [
    { type: "warning",  title: "Science accuracy dropped",       desc: "Down 12% across 8th grade in the last 48 hours.", action: "Review Science Module" },
    { type: "alert",    title: "Chapter 4 is very difficult",    desc: "65% of students failing practice quiz on Thermodynamics.", action: "Adjust Difficulty" },
    { type: "critical", title: "Students needing intervention",  desc: "12 students show a consistent downward accuracy trend.", action: "View Risk Report" },
    { type: "info",     title: "24 students inactive this week", desc: "No login activity recorded. Send nudge reminders.", action: "Send Reminders" },
  ];

  // ── Weekly trend scaffold ─────────────────────────────────────────────────
  const trendData = [
    { name: "Mon", accuracy: 68 }, { name: "Tue", accuracy: 72 },
    { name: "Wed", accuracy: 71 }, { name: "Thu", accuracy: 75 },
    { name: "Fri", accuracy: 78 }, { name: "Sat", accuracy: 82 },
    { name: "Sun", accuracy: 85 },
  ];

  // ── Approve parent link (preserved) ──────────────────────────────────────
  const approve = async (linkId) => {
    try {
      await api.post(`/admin/parent-links/${linkId}/approve`);
      setLinks((prev) => prev.map((l) => l.link_id === linkId ? { ...l, status: "approved" } : l));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not approve link");
    }
  };

  // ── Fetch all data (all existing endpoints preserved) ─────────────────────
  useEffect(() => {
    Promise.all([
      api.get("/analytics/admin"),
      api.get("/admin/users"),
      api.get("/admin/parent-links"),
    ])
      .then(([o, u, l]) => {
        setOverview(o.data);
        setUsers(u.data);
        setLinks(l.data);
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || "Could not load admin console.");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 pt-2">
        <Skel className="h-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[0,1,2,3].map(i => <Skel key={i} className="h-36" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <Skel className="lg:col-span-2 h-72" />
          <Skel className="h-72" />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {[0,1,2,3].map(i => <Skel key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="max-w-7xl mx-auto pb-12 pt-4">
        <ErrorNotice message={error} />
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const avgAcc   = cap(overview?.average_accuracy);
  const students = overview?.students || 0;
  const attempts = overview?.attempts || 0;
  const active7d = overview?.active_students_7d || 0;
  const sessions = overview?.engagement?.active_sessions || 0;

  const subjectData = (overview?.subject_distribution || []).slice(0, 6).map((s, i) => ({
    ...s, color: ["#adff44","#ff6b6b","#ffd700"][i % 3],
  }));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={page}
      initial="hidden"
      animate="show"
      className="space-y-10 max-w-7xl mx-auto pb-16 pt-2"
    >
      {error && <ErrorNotice message={error} />}

      {/* ══════════════════════════════════════════════════════════════════
          LEVEL 1 ── HERO  (Platform Health)
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section variants={item}>
        <div
          className="relative rounded-3xl overflow-hidden p-8 lg:p-12"
          style={{
            background: "linear-gradient(150deg, #0d0d0d 0%, #050505 100%)",
            border: "1px solid rgba(255,255,255,0.065)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.045)",
          }}
        >
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div style={{
              position: "absolute", top: "-20%", right: "-10%",
              width: 480, height: 480, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(173,255,68,0.055) 0%, transparent 70%)",
            }} />
          </div>

          <div className="relative z-10">
            {/* Status pill */}
            <div
              className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full"
              style={{ background: "rgba(173,255,68,0.07)", border: "1px solid rgba(173,255,68,0.18)" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#adff44" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#adff44" }} />
              </span>
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "#adff44" }}>
                Platform Operational
              </span>
            </div>

            {/* Hero heading */}
            <h1
              className="font-display font-bold text-white leading-none mb-2"
              style={{ fontSize: "clamp(38px, 5.5vw, 56px)" }}
            >
              Admin Intelligence
            </h1>
            <p className="text-white/35 font-medium mb-10" style={{ fontSize: 15 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>

            {/* 3 hero metric blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
              {[
                { label: "Students Active (7d)", value: active7d, suffix: "",  color: "#fff",    sub: "past 7 days" },
                { label: "Platform Accuracy",    value: avgAcc,   suffix: "%", color: "#adff44", sub: "avg across subjects" },
                { label: "Need Intervention",    value: 12,       suffix: "",  color: "#ff6b6b", sub: "students at risk" },
              ].map((m, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 lg:p-8"
                  style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.065)" }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35 mb-4">{m.label}</p>
                  <p
                    className="font-display font-bold leading-none mb-2"
                    style={{ fontSize: "clamp(44px, 5vw, 56px)", color: m.color }}
                  >
                    <AnimatedCounter to={m.value} suffix={m.suffix} />
                  </p>
                  <p className="text-xs text-white/25">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════════════
          LEVEL 2 ── PRIMARY KPIs (4 cards)
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <motion.p variants={item} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-5">
          Key Metrics
        </motion.p>
        <motion.div variants={page} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {[
            { Icon: Users,         label: "Total Students",  value: students, suffix: "",  accent: "#adff44" },
            { Icon: ClipboardList, label: "Total Attempts",  value: attempts, suffix: "",  accent: "#ff6b6b" },
            { Icon: TrendingUp,    label: "Avg Accuracy",    value: avgAcc,   suffix: "%", accent: "#adff44" },
            { Icon: Activity,      label: "Active Sessions", value: sessions, suffix: "",  accent: "#ffd700" },
          ].map(({ Icon, label, value, suffix, accent }, i) => (
            <Card key={i} className="p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}10`, border: `1px solid ${accent}1f` }}
                >
                  <Icon size={22} style={{ color: accent }} />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}
                >
                  Live
                </span>
              </div>
              <div>
                <p className="font-display font-bold text-white leading-none mb-1.5" style={{ fontSize: 40 }}>
                  <AnimatedCounter to={value} suffix={suffix} />
                </p>
                <p className="text-sm text-white/40 font-medium">{label}</p>
              </div>
            </Card>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LEVEL 3 ── ANALYTICS
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <motion.p variants={item} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-5">
          Analytics
        </motion.p>
        <motion.div variants={page} className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

          {/* Accuracy Area Chart ─ 2/3 */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-base font-semibold text-white mb-1">Platform Accuracy Trend</p>
                <p className="text-xs text-white/30">7-day rolling average</p>
              </div>
              <span
                className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ background: "rgba(173,255,68,0.08)", color: "#adff44", border: "1px solid rgba(173,255,68,0.15)" }}
              >
                +17% ↑
              </span>
            </div>
            <div style={{ height: 228 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#adff44" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#adff44" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.28)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.28)" }} tickLine={false} axisLine={false} domain={[60,100]} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "rgba(173,255,68,0.1)", strokeWidth: 1 }} />
                  <Area
                    type="monotone" dataKey="accuracy" stroke="#adff44" strokeWidth={2.5}
                    fill="url(#gradAcc)" dot={false}
                    activeDot={{ r: 5, fill: "#adff44", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Subject bar chart ─ 1/3 */}
          <Card className="p-6">
            <p className="text-base font-semibold text-white mb-1">Subject Performance</p>
            <p className="text-xs text-white/30 mb-6">Attempts by subject</p>
            {subjectData.length ? (
              <div style={{ height: 228 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectData} barSize={18} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.28)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.28)" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
                    <Bar dataKey="attempts" radius={[5,5,0,0]}>
                      {subjectData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[228px] flex items-center justify-center">
                <p className="text-sm text-white/25">No subject data yet.</p>
              </div>
            )}
          </Card>

          {/* Engagement strip ─ full width */}
          {[
            { Icon: BookOpen,      label: "Study Sessions",   value: overview?.engagement?.study_sessions || 0, accent: "#adff44", suffix: ""  },
            { Icon: Flame,         label: "Study Hours (7d)", value: overview?.engagement?.study_hours_7d  || 0, accent: "#ff6b6b", suffix: "h" },
            { Icon: ClipboardList, label: "Mock Attempts",    value: overview?.engagement?.mock_attempts   || 0, accent: "#ffd700", suffix: ""  },
            { Icon: Target,        label: "Avg Completion",   value: cap(overview?.chapter_completion_avg),     accent: "#adff44", suffix: "%" },
          ].map(({ Icon, label, value, accent, suffix }, i) => (
            <Card key={i} className="p-5 flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: `${accent}0e`, border: `1px solid ${accent}1c` }}
              >
                <Icon size={20} style={{ color: accent }} />
              </div>
              <div>
                <p className="font-display font-bold text-white text-xl leading-tight">
                  <AnimatedCounter to={value} suffix={suffix} />
                </p>
                <p className="text-xs text-white/35 mt-0.5">{label}</p>
              </div>
            </Card>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LEVEL 4 ── AI ACTION CENTER
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <motion.div variants={item} className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-1">Action Center</p>
            <p className="text-base font-semibold text-white">AI‑Generated Insights</p>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: "rgba(173,255,68,0.07)", color: "#adff44", border: "1px solid rgba(173,255,68,0.16)" }}
          >
            {insights.length} Active
          </span>
        </motion.div>

        <motion.div variants={page} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, idx) => {
            const cfg = INSIGHT[ins.type] || INSIGHT.info;
            const { Icon } = cfg;
            return (
              <Card key={idx} className="p-5 flex gap-4 items-start cursor-pointer group">
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <Icon size={19} style={{ color: cfg.text }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest mb-2 block"
                    style={{ color: cfg.text }}
                  >
                    {cfg.tag}
                  </span>
                  <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-mint transition-colors duration-200">
                    {ins.title}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed mb-3">{ins.desc}</p>
                  <button
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "#adff44" }}
                  >
                    {ins.action}
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                </div>
              </Card>
            );
          })}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LEVEL 5 ── COMPACT LEADERBOARD (Top 5)
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <motion.div variants={item} className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-1">Leaderboard</p>
            <p className="text-base font-semibold text-white">Top Performers</p>
          </div>
          <Link
            to="/admin/leaderboard"
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            View All <ChevronRight size={14} />
          </Link>
        </motion.div>

        <Card className="overflow-hidden p-0">
          {overview?.top_performers?.length ? (
            <div>
              {/* Header row */}
              <div
                className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-white/[0.04]"
                style={{ background: "rgba(0,0,0,0.35)" }}
              >
                {["Rank","Student","Score","Accuracy","Streak"].map((h, i) => (
                  <span
                    key={h}
                    className={`text-[10px] font-semibold uppercase tracking-widest text-white/25 ${i === 0 ? "col-span-1" : i === 1 ? "col-span-5" : "col-span-2 text-center"}`}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Top 5 rows */}
              {overview.top_performers.slice(0, 5).map((row, idx) => {
                const isTop3 = row.rank <= 3;
                return (
                  <motion.div
                    key={row.student_id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.06, duration: 0.4, ease: "easeOut" }}
                    className="grid grid-cols-12 gap-3 items-center px-6 py-4 border-b border-white/[0.03] hover:bg-white/[0.025] transition-colors duration-200 group"
                  >
                    {/* Rank */}
                    <div className="col-span-1"><RankBadge rank={row.rank} /></div>

                    {/* Avatar + Name */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: isTop3 ? "#adff44" : "rgba(255,255,255,0.08)",
                          color: isTop3 ? "#000" : "rgba(255,255,255,0.5)",
                          boxShadow: isTop3 ? "0 0 14px rgba(173,255,68,0.32)" : "none",
                        }}
                      >
                        {(row.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white truncate group-hover:text-mint transition-colors duration-200">
                        {row.name}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-semibold text-white/60">{row.score}</span>
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-2 flex justify-center">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={cap(row.accuracy) >= 70
                          ? { background: "rgba(173,255,68,0.09)", color: "#adff44", borderColor: "rgba(173,255,68,0.22)" }
                          : { background: "rgba(255,107,107,0.09)", color: "#ff6b6b", borderColor: "rgba(255,107,107,0.22)" }
                        }
                      >
                        {cap(row.accuracy)}%
                      </span>
                    </div>

                    {/* Streak */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm text-white/40">{row.streak}d 🔥</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-10"><EmptyState title="No leaderboard data found" /></div>
          )}
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          BONUS ── ALL USERS (preserved functionality)
      ══════════════════════════════════════════════════════════════════ */}
      {users.length > 0 && (
        <section>
          <motion.div variants={item} className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-1">Users</p>
              <p className="text-base font-semibold text-white">All Registered Users</p>
            </div>
            <span className="text-xs text-white/25 font-medium">{users.length} total</span>
          </motion.div>
          <Card className="overflow-auto p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.04]" style={{ background: "rgba(0,0,0,0.35)" }}>
                  {["ID","Email","Name","Role","Status"].map(h => (
                    <th key={h} className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.035]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-xs text-white/30 font-mono">{u.id}</td>
                    <td className="px-6 py-3 text-sm text-white/55">{u.email}</td>
                    <td className="px-6 py-3 text-sm font-medium text-white">{u.full_name}</td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded capitalize" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${u.is_active ? "text-mint" : "text-white/25"}`}>
                        <CheckCircle2 size={12} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BONUS ── PARENT LINKS (preserved functionality)
      ══════════════════════════════════════════════════════════════════ */}
      {links.length > 0 && (
        <section>
          <motion.div variants={item} className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/25 mb-1">Parent Links</p>
              <p className="text-base font-semibold text-white">Parent‑Child Connections</p>
            </div>
            <span className="text-xs text-white/25 font-medium">
              {links.filter(l => l.status === "pending").length} pending
            </span>
          </motion.div>
          <Card className="overflow-auto p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.04]" style={{ background: "rgba(0,0,0,0.35)" }}>
                  {["Parent","Child","Status","Action"].map(h => (
                    <th key={h} className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.035]">
                {links.map(link => (
                  <tr key={link.link_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-white">{link.parent_name || "N/A"}</td>
                    <td className="px-6 py-3 text-sm text-white/55">{link.student_name}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          link.status === "approved" ? "text-mint border-mint/20 bg-mint/10"   :
                          link.status === "pending"  ? "text-gold border-gold/20 bg-gold/10"   :
                                                       "text-coral border-coral/20 bg-coral/10"
                        }`}
                      >
                        {link.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {link.status === "pending" && (
                        <button
                          onClick={() => approve(link.link_id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                          style={{ background: "rgba(173,255,68,0.1)", color: "#adff44", border: "1px solid rgba(173,255,68,0.2)" }}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </motion.div>
  );
}
