import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, BookOpen, Brain, BarChart3, Trophy, Flame, Target, CheckCircle2, Star, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import AIOrb from "../components/AIOrb.jsx";

const STATS = [
  { value: "50,000+", label: "Students Enrolled" },
  { value: "98%", label: "Accuracy Rate" },
  { value: "2M+", label: "Questions Solved" },
  { value: "4.9★", label: "Student Rating" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Textbook-Grounded AI",
    desc: "Answers sourced directly from NCERT textbooks using RAG. No hallucinations, only facts.",
  },
  {
    icon: Target,
    title: "Adaptive Quiz Engine",
    desc: "PYQ-style questions that adapt to your level. Every test gets smarter as you improve.",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    desc: "Track weak topics, daily streaks, and performance trends. Know exactly what to study next.",
  },
  {
    icon: Trophy,
    title: "Leaderboard & Streaks",
    desc: "Compete with peers, earn XP, and maintain daily streaks. Learning becomes a game.",
  },
  {
    icon: BookOpen,
    title: "Study Modules",
    desc: "Structured PDF study modules with AI-powered doubt solving for every chapter.",
  },
  {
    icon: Users,
    title: "Parent Dashboard",
    desc: "Parents track their child's progress in real time with detailed performance insights.",
  },
];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  animDelay: `${Math.random() * 8}s`,
  animDuration: `${6 + Math.random() * 8}s`,
  size: 2 + Math.random() * 3,
}));

export default function LandingPage() {
  const [currentStat, setCurrentStat] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrentStat((s) => (s + 1) % STATS.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#000" }}>
      {/* Particle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left,
              bottom: 0,
              width: p.size,
              height: p.size,
              background: "rgba(173,255,68,0.4)",
              animation: `particle-float ${p.animDuration} ${p.animDelay} infinite ease-out`,
            }}
          />
        ))}
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "#adff44" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl" style={{ background: "#adff44" }} />
      </div>

      {/* ── NAVBAR ── */}
      <nav
        className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5"
      >
        <div className="flex items-center gap-3">
          <AIOrb size={32} />
          <div>
            <span className="font-display font-bold text-white">Prep100</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(173,255,68,0.15)", color: "#adff44", border: "1px solid rgba(173,255,68,0.25)" }}>BETA</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth?role=student" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/auth" className="btn-primary text-sm">Get Started <ArrowRight size={14} /></Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-sm font-semibold"
            style={{
              background: "rgba(173,255,68,0.1)",
              border: "1px solid rgba(173,255,68,0.25)",
              color: "#adff44",
            }}
          >
            <Zap size={14} fill="#adff44" />
            AI-powered JNV & Sainik School preparation
          </motion.div>

          {/* Headline */}
          <h1
            className="font-display font-black leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.02em" }}
          >
            <span className="text-white">Master every chapter.</span>
            <br />
            <span style={{ color: "#adff44", textShadow: "0 0 40px rgba(173,255,68,0.4)" }}>
              Guided by intelligent AI.
            </span>
          </h1>

          <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "#bdbdbd", lineHeight: 1.7 }}>
            Learn from NCERT chapters, solve PYQ-style adaptive tests, ask doubts in seconds, and track your
            progress with smart analytics — all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link to="/auth?role=student" className="btn-primary px-8 py-3.5 text-base font-bold">
              Start Learning Free <ArrowRight size={16} />
            </Link>
            <Link to="/auth?role=parent" className="btn-ghost px-8 py-3.5 text-base">
              Parent Portal
            </Link>
          </div>

          {/* Rotating Stats */}
          <div className="flex flex-wrap justify-center gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="text-center"
              >
                <p className="font-display font-black text-2xl" style={{ color: "#adff44" }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#8a8a8a" }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-20 mx-auto max-w-4xl"
        >
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: "rgba(17,17,17,0.9)",
              border: "1px solid rgba(173,255,68,0.15)",
              boxShadow: "0 0 60px rgba(173,255,68,0.08), 0 40px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Mock chat interface */}
            <div className="flex items-center gap-3 mb-6">
              <AIOrb size={40} />
              <div>
                <p className="font-display font-bold text-white text-sm">Prep100 AI Tutor</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
                  <p className="text-xs" style={{ color: "#8a8a8a" }}>Online · Ready to teach</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div
                  className="max-w-xs px-4 py-3 rounded-2xl rounded-br-sm text-sm"
                  style={{ background: "#fff", color: "#000", fontWeight: 500 }}
                >
                  Explain the laws of motion in simple terms 🙏
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3 justify-start">
                <AIOrb size={32} pulse={false} />
                <div
                  className="max-w-md px-4 py-3 rounded-2xl rounded-bl-sm text-sm"
                  style={{
                    background: "rgba(173,255,68,0.06)",
                    border: "1px solid rgba(173,255,68,0.15)",
                    color: "#e0e0e0",
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: "#adff44" }}>Newton's Laws of Motion</strong> describe the relationship between forces and motion:
                  <br /><br />
                  🔹 <strong style={{ color: "#fff" }}>1st Law</strong> — An object stays still or moving unless a force acts on it.<br />
                  🔹 <strong style={{ color: "#fff" }}>2nd Law</strong> — Force = Mass × Acceleration (F = ma)<br />
                  🔹 <strong style={{ color: "#fff" }}>3rd Law</strong> — Every action has an equal & opposite reaction.
                </div>
              </div>

              {/* Action chips */}
              <div className="flex gap-2 pl-11 flex-wrap">
                {["💡 Hint", "🔄 Explain Simpler", "✏️ Try Yourself", "🎯 Similar Question"].map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#bdbdbd",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display font-black text-4xl text-white mb-4">
            Everything you need to crack the exam
          </h2>
          <p style={{ color: "#8a8a8a" }}>Built for JNV and Sainik School aspirants. Powered by textbook-accurate AI.</p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 cursor-default group"
              style={{
                background: "rgba(17,17,17,0.9)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                style={{
                  background: "rgba(173,255,68,0.1)",
                  border: "1px solid rgba(173,255,68,0.2)",
                }}
              >
                <f.icon size={22} style={{ color: "#adff44" }} />
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#8a8a8a" }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-12 mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl p-10 text-center relative overflow-hidden"
          style={{
            background: "rgba(173,255,68,0.06)",
            border: "1px solid rgba(173,255,68,0.2)",
          }}
        >
          <div className="absolute inset-0 rounded-3xl" style={{ background: "radial-gradient(ellipse at center, rgba(173,255,68,0.08) 0%, transparent 70%)" }} />
          <div className="relative">
            <AIOrb size={56} className="mx-auto mb-6" />
            <h2 className="font-display font-black text-3xl text-white mb-3">
              Ready to transform your preparation?
            </h2>
            <p className="mb-8 max-w-xl mx-auto" style={{ color: "#8a8a8a" }}>
              Join thousands of students who are already acing their exams with Prep100.
            </p>
            <Link to="/auth?role=student" className="btn-primary px-10 py-4 text-base font-bold inline-flex">
              Start for Free Today <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t text-center py-8 text-sm" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#8a8a8a" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <AIOrb size={20} pulse={false} />
          <span className="font-display font-semibold text-white">Prep100</span>
        </div>
        <p>© 2026 Prep100 · Focused entrance exam preparation for JNV & Sainik Schools</p>
      </footer>
    </div>
  );
}
