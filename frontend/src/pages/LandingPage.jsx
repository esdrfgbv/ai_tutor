import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fbf9] text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <div className="font-bold">PrepOrbit AI</div>
        <Link to="/auth" className="btn-primary">Start learning <ArrowRight size={16} /></Link>
      </nav>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(79,178,134,.28),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(249,115,91,.22),transparent_30%)]" />
        <div className="relative mx-auto grid min-h-[76vh] max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_.95fr]">
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-soft"><Sparkles size={16} /> AI-powered preparation</p>
            <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">JNV and Sainik School mastery, guided by textbook-grounded AI.</h1>
            <p className="mt-6 max-w-2xl text-lg text-black/65">Learn from NCERT chapters, solve PYQ-style adaptive tests, ask doubts, and track progress across student, parent, and admin dashboards.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth?role=student" className="btn-primary">Student portal <ArrowRight size={18} /></Link>
              <Link to="/auth?role=parent" className="btn-soft">Parent portal</Link>
              <Link to="/auth?role=admin" className="btn-soft">Admin portal</Link>
            </div>
          </motion.div>
          <motion.div initial={false} animate={{ opacity: 1, scale: 1 }} className="glass rounded-lg p-5 shadow-soft">
            <div className="grid gap-4">
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm font-semibold text-mint">AI explanation demo</p>
                <p className="mt-2 text-2xl font-bold">Fractions become visual, PYQ-linked, and practice-ready.</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  {["Textbook", "AI", "PYQ"].map((item) => <div key={item} className="rounded-lg bg-skyglass p-3 font-semibold">{item}</div>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-ink p-4 text-white"><Brain /> <p className="mt-4 text-3xl font-bold">RAG</p><p className="text-sm opacity-70">semantic retrieval</p></div>
                <div className="rounded-lg bg-coral p-4 text-white"><BarChart3 /> <p className="mt-4 text-3xl font-bold">92%</p><p className="text-sm opacity-80">accuracy trend</p></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {["NCERT + PYQ retrieval", "Adaptive quiz engine", "Parent and admin analytics"].map((title) => (
            <div key={title} className="card"><CheckCircle2 className="text-mint" /><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 text-black/60">Production APIs, RBAC, dashboards, and ingestion pipeline built for real study workflows.</p></div>
          ))}
        </div>
      </section>
      <footer className="border-t border-black/10 px-4 py-8 text-center text-sm text-black/55">PrepOrbit AI for focused entrance exam preparation.</footer>
    </div>
  );
}
